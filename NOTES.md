# Implementation Notes & Architectural Decisions

Dokumen ini memuat catatan teknis, penjelasan alur sistem, asumsi arsitektur, penanganan *edge cases*, serta fitur tambahan yang diimplementasikan pada proyek **Stock Opname & Async Inventory Reconciliation**.

---

## 1. Walkthrough: From Manager Approval to Stock Level Update

### 🔄 Alur Eksekusi Langkah-demi-Langkah:
1. **Penerimaan Request (`POST /api/audit-sessions/:id/approve`)**:
   - Manager menekan tombol *Approve*. Request masuk ke Express API dengan membawa JWT Token Manager.
   - Middleware `authenticate` dan `requireRole(['WAREHOUSE_MANAGER'])` memverifikasi identitas dan hak akses.
2. **Validasi Status & Kunci Idempotensi (*State Guard & Atomic Lock*)**:
   - Sistem memeriksa status sesi saat ini di database PostgreSQL.
   - Jika status masih `COUNT_SUBMITTED`, sistem secara instan mengubah status sesi menjadi `RECONCILING` dan mencatat `approvedById` serta `approvedAt`.
3. **Pemberian Respon Cepat Non-Blocking (`HTTP 202 Accepted`)**:
   - Express langsung mengembalikan response `HTTP 202 Accepted` beserta status `RECONCILING` ke client dalam hitungan milidetik. Koneksi HTTP selesai dan client/browser tidak mengalami *blocking/freeze*.
4. **Delegasi ke Asynchronous Background Worker**:
   - Proses rekonsiliasi berat didelegasikan ke *Event Loop* Node.js menggunakan `setImmediate()`.
5. **Eksekusi Transaksi Database Atomic (`prisma.$transaction`)**:
   - Worker mengambil seluruh item pada sesi audit.
   - Untuk setiap item, sistem menghitung stok resmi baru berdasarkan selisih yang dicatat (`newStock = currentStock + variance`).
   - Melakukan update pada tabel `products.currentStock`.
   - Membuat catatan riwayat mutasi pada tabel `inventory_audit_logs` (`beforeStock`, `afterStock`, `changeQty`, `reason`, `actionByUserId`).
   - Mengubah status akhir sesi audit menjadi `APPROVED`.

### ⚠️ Potensi Masalah di Setiap Langkah & Solusi yang Diterapkan:
| Titik Kritis | Potensi Masalah | Solusi & Mitigasi yang Diterapkan |
|---|---|---|
| **Langkah 1 (Auth)** | Staf atau pengguna unauthorized mencoba approve | Divalidasi ketat di middleware RBAC (`HTTP 403 Forbidden`). |
| **Langkah 2 (State)** | Double click / network retry saat proses berjalan | **Idempotency Guard**: Jika sesi sudah `RECONCILING` atau `APPROVED`, request berikutnya langsung dijawab aman tanpa menduplikasi penyesuaian stok. |
| **Langkah 4 (Async)** | Request blocking karena jumlah produk ribuan | Menggunakan **Non-blocking Response (HTTP 202)** + Background Worker. |
| **Langkah 5 (Database)** | Database gagal di tengah-tengah update produk | Dibungkus dalam **`prisma.$transaction` (ACID)**. Jika 1 produk gagal, seluruh perubahan di-rollback total sehingga data tidak korup. |

---

## 2. Assumptions Made (Asumsi Desain Arsitektur)

**Bagian Brief:** Penguncian stok (*Inventory Locking*) selama sesi audit berlangsung.

**Asumsi yang Kami Ambil:**
Kami menerapkan pendekatan **"Point-in-Time Baseline Snapshot"** tanpa membekukan (*hard lock/freeze*) mutasi operasional gudang:
1. **Mengapa?** Di industri ritel dan logistik modern, menghentikan seluruh operasional gudang saat stock opname berjalan sering kali tidak memungkinkan secara bisnis.
2. **Implementasi:** Pada saat sesi diinisiasi (`INITIATED`), nilai stok sistem saat detik itu langsung di-snapshot dan dikunci permanen pada kolom `audit_session_items.snapshot_stock`. Hasil hitungan fisik staf akan selalu dibandingkan secara adil terhadap baseline snapshot tersebut, sementara stok master resmi hanya disesuaikan saat Manager melakukan *Approval*.

---

## 3. Edge Cases & Penanganannya

1. **Duplikasi Produk dalam 1 Batch Submission (Staff Input)**:
   - *Masalah:* Staf tidak sengaja menginput produk yang sama 2 kali dengan angka fisik berbeda dalam 1 payload pengiriman batch.
   - *Solusi:* Menggunakan Zod Schema Validator dengan `.refine()` untuk memastikan semua `productId` dalam array batch bersifat unik sebelum masuk ke database.
2. **Hitungan Fisik Bernilai Nol (`0`)**:
   - *Masalah:* Sistem database sering kali menganggap angka `0` sebagai *falsy/null*.
   - *Solusi:* Membedakan secara tegas tipe data `null` (belum dihitung) dan integer `>= 0` (stok fisik memang habis/nol di lapangan).
3. **Percobaan Submit pada Sesi yang Tidak Valid**:
   - *Masalah:* Staf mencoba submit pada sesi yang sudah `APPROVED`, `REJECTED`, atau sedang `RECONCILING`.
   - *Solusi:* State machine guard yang menolak setiap mutasi yang tidak sesuai dengan alur hidup (`INITIATED` -> `COUNT_SUBMITTED` -> `APPROVED`/`REJECTED`).
4. **Approval Sesi yang Belum Dihitung Fisik**:
   - *Masalah:* Manager tidak sengaja meng-approve sesi yang masih baru dibuat (`INITIATED`).
   - *Solusi:* Sistem melempar `AppError (400)` yang menyatakan bahwa hanya sesi `COUNT_SUBMITTED` yang dapat disetujui.

---

## 4. Fitur Tambahan Penting (*Added Value*)

### 🛡️ **Durable Inventory Audit Trail (`inventory_audit_logs`)** & **Endpoint Riwayat Mutasi**
Kami menambahkan tabel khusus `inventory_audit_logs` dan endpoint `GET /api/audit-sessions/logs/audit-history`.

**Mengapa ini penting?**
Dalam sistem inventori dan akuntansi warehouse, mengubah angka stok tanpa riwayat audit (*audit trail*) adalah pelanggaran tata kelola (*compliance violation*). 

Dengan adanya tabel ini, setiap perubahan stok akibat stock opname tercatat permanen:
- Berapa stok sebelum penyesuaian (`beforeStock`).
- Berapa stok setelah penyesuaian (`afterStock`).
- Berapa delta penyesuaiannya (`changeQty`).
- Sesi opname mana yang menyebabkannya (`sessionId`).
- Siapa Manager yang menyetujuinya (`actionByUserId`).
- Waktu persis terjadinya perubahan (`createdAt`).

Log ini bersifat *immutable* (tidak bisa diedit/dihapus) untuk menjamin transparansi data gudang secara penuh.
