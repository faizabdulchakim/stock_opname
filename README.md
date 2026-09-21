# 📦 Stock Opname & Async Inventory Reconciliation REST API

Backend API service untuk manajemen siklus hidup **Stock Opname** dan **Rekonsiliasi Stok Asinkron** yang dibangun menggunakan **Node.js, Express, TypeScript, PostgreSQL, Prisma ORM, JWT Authentication, Zod Validation, Swagger (OpenAPI 3.0), dan Jest Unit Testing**.

---

## 🛠️ Tech Stack & Fitur Utama

- ⚡ **Express.js & TypeScript**: Type-safety penuh dengan arsitektur modular (Routes, Controllers, Services, Middlewares).
- 🗄️ **PostgreSQL & Prisma ORM**: Relasi database terstruktur dengan transaksi atomic (ACID).
- 🔐 **Role-Based Access Control (RBAC)**: Otentikasi JWT dengan role `WAREHOUSE_STAFF` dan `WAREHOUSE_MANAGER`.
- 📊 **3-Stage Stock Opname Lifecycle**:
  1. **Initiation**: Snapshot baseline stok saat sesi dibuka (Manager Only).
  2. **Count Submission**: Pengiriman batch hasil hitungan fisik oleh staf tanpa mengubah stok master.
  3. **Approval & Async Reconciliation**: Fast Non-blocking response (`HTTP 202 Accepted`) dengan background worker dan proteksi idempotensi.
- 🛡️ **Durable Inventory Audit Trail**: Mencatat seluruh riwayat mutasi stok pada tabel `inventory_audit_logs`.
- 🛡️ **Modul Validasi Terpusat (Zod)**: Validasi ketat request body/params dengan proteksi anti-duplikasi batch.
- 📚 **Swagger UI Interactive Documentation**: Dokumentasi interaktif OpenAPI 3.0 di `/api-docs`.
- 🧪 **Comprehensive Unit Testing**: Suite pengujian Jest & Supertest (19 test cases passed).

---

## 📁 Struktur Direktori

```
stock_opname/
├── prisma/
│   ├── schema.prisma            # PostgreSQL Schema
│   └── seed.ts                  # Seeder akun Manager, Staff, & Master Produk
├── src/
│   ├── config/
│   │   ├── env.ts               # Environment variables
│   │   ├── prisma.ts            # Prisma client singleton
│   │   └── swagger.ts           # Swagger OpenAPI config
│   ├── controllers/
│   │   ├── auth.controller.ts   # Auth handlers
│   │   ├── product.controller.ts# Master product handlers
│   │   └── audit-session.controller.ts # Lifecycle Stock Opname handlers
│   ├── middlewares/
│   │   ├── auth.middleware.ts   # JWT Guard & Role RBAC
│   │   ├── error.middleware.ts  # Centralized Error Handler (Zod, Prisma, HTTP)
│   │   └── validate.middleware.ts # Zod Schema Validator
│   ├── routes/
│   │   ├── auth.routes.ts       # /api/auth routes
│   │   ├── product.routes.ts    # /api/products routes
│   │   ├── audit-session.routes.ts # /api/audit-sessions routes
│   │   └── index.ts             # Route aggregator
│   ├── schemas/
│   │   ├── auth.schema.ts       # Zod Auth schemas
│   │   ├── product.schema.ts    # Zod Product schemas
│   │   └── audit-session.schema.ts # Zod Audit Session & Batch Submission schemas
│   ├── services/
│   │   ├── auth.service.ts      # Auth logic
│   │   ├── product.service.ts   # Product logic
│   │   └── audit-session.service.ts # Core Opname & Async Reconciler logic
│   ├── utils/
│   │   ├── jwt.ts               # Sign & verify JWT token
│   │   └── response.ts          # Response JSON helper
│   ├── app.ts                   # Express app instance
│   └── server.ts                # Server entry point
├── tests/
│   ├── auth.test.ts             # Auth & JWT unit tests
│   └── audit-session.test.ts    # Full Lifecycle & Async Reconciliation tests
├── .env.example
├── .gitignore
├── jest.config.ts
├── NOTES.md                     # Technical Assessment Answers & Design Notes
├── package.json
├── README.md
└── tsconfig.json
```

---

## 🚀 Cara Menjalankan Aplikasi

### 1. Setup Environment
Salin `.env.example` ke `.env` dan sesuaikan koneksi database PostgreSQL Anda:
```env
PORT=3000
NODE_ENV=development
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/stock_opname_db?schema=public"
JWT_SECRET="supersecret_jwt_key_stock_opname_2026"
JWT_EXPIRES_IN="1d"
```

### 2. Migrasi Database & Seeding Data Awal
```bash
# 1. Push schema ke PostgreSQL
npx prisma db push

# 2. Generate Prisma Client
npm run prisma:generate

# 3. Jalankan Database Seeder (Membuat user Manager, Staff, dan 5 Produk awal)
npm run prisma:seed
```

### 3. Akun Default Hasil Seeder
| Role | Email | Password |
|---|---|---|
| **Warehouse Manager** | `manager@warehouse.com` | `password123` |
| **Warehouse Staff** | `staff@warehouse.com` | `password123` |

### 4. Menjalankan Server Development
```bash
npm run dev
```
Aplikasi akan berjalan di `http://localhost:3000`.

---

## 📖 Dokumentasi Swagger UI

Akses antarmuka dokumentasi API interaktif di:
👉 **`http://localhost:3000/api-docs`**

---

## 🧪 Menjalankan Pengujian (Unit Tests)

Jalankan seluruh 19 skenario pengujian dengan Jest:
```bash
npm test
```

---

## 📝 Jawaban Asesmen Teknis
Rincian jawaban teknis mengenai alur approval, asumsi arsitektur, penanganan *edge cases*, dan *added value* dapat dibaca pada file **[`NOTES.md`](./NOTES.md)**.
