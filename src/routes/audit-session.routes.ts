import { Router } from 'express';
import auditSessionController from '../controllers/audit-session.controller';
import { validate } from '../middlewares/validate.middleware';
import { authenticate, requireRole } from '../middlewares/auth.middleware';
import {
  createSessionSchema,
  getSessionByIdSchema,
  submitCountsSchema,
} from '../schemas/audit-session.schema';

const router = Router();

// Semua rute membutuhkan autentikasi login
router.use(authenticate);

/**
 * @openapi
 * /api/audit-sessions/logs/audit-history:
 *   get:
 *     summary: Mendapatkan riwayat durable inventory audit logs
 *     tags:
 *       - Stock Opname Lifecycle
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: productId
 *         schema:
 *           type: string
 *         description: Filter riwayat berdasarkan ID Produk
 *       - in: query
 *         name: sessionId
 *         schema:
 *           type: string
 *         description: Filter riwayat berdasarkan ID Sesi Audit
 *     responses:
 *       200:
 *         description: Daftar riwayat mutasi stok
 */
router.get('/logs/audit-history', auditSessionController.getAuditLogs);

/**
 * @openapi
 * /api/audit-sessions:
 *   post:
 *     summary: Inisiasi sesi audit baru & snapshot baseline stok (Manager Only)
 *     tags:
 *       - Stock Opname Lifecycle
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sessionCode
 *               - productIds
 *             properties:
 *               sessionCode:
 *                 type: string
 *                 example: AUD-2026-SEP-001
 *               notes:
 *                 type: string
 *                 example: Stock Opname Rutin Gudang Utama
 *               productIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 example:
 *                   - "f84b65dc-724e-4f1c-8e41-03714b98dfca"
 *     responses:
 *       201:
 *         description: Sesi audit berhasil dibuat & snapshot stok terkunci
 *       403:
 *         description: Forbidden (Hanya Warehouse Manager)
 *       409:
 *         description: Kode sesi duplikat
 *   get:
 *     summary: Mendapatkan daftar semua sesi audit
 *     tags:
 *       - Stock Opname Lifecycle
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [INITIATED, COUNT_SUBMITTED, RECONCILING, APPROVED, REJECTED]
 *         description: Filter berdasarkan status siklus hidup sesi
 *     responses:
 *       200:
 *         description: Daftar sesi audit
 */
router.post(
  '/',
  requireRole(['WAREHOUSE_MANAGER']),
  validate(createSessionSchema),
  auditSessionController.createSession
);
router.get('/', auditSessionController.findAllSessions);

/**
 * @openapi
 * /api/audit-sessions/{id}:
 *   get:
 *     summary: Mendapatkan detail sesi audit dan baseline snapshot
 *     tags:
 *       - Stock Opname Lifecycle
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Detail sesi audit beserta items dan baseline snapshot
 *       404:
 *         description: Sesi audit tidak ditemukan
 */
router.get('/:id', validate(getSessionByIdSchema), auditSessionController.findSessionById);

/**
 * @openapi
 * /api/audit-sessions/{id}/submit-counts:
 *   post:
 *     summary: Submit hitungan fisik batch oleh Staf Gudang (Tahap 2)
 *     tags:
 *       - Stock Opname Lifecycle
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - items
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - productId
 *                     - countedStock
 *                   properties:
 *                     productId:
 *                       type: string
 *                       format: uuid
 *                       example: "f84b65dc-724e-4f1c-8e41-03714b98dfca"
 *                     countedStock:
 *                       type: integer
 *                       example: 115
 *                     notes:
 *                       type: string
 *                       example: "5 unit rusak/pecah"
 *     responses:
 *       200:
 *         description: Hitungan fisik berhasil disimpan & status berubah menjadi COUNT_SUBMITTED
 *       400:
 *         description: Sesi tidak dalam status INITIATED atau format batch tidak valid
 *       404:
 *         description: Sesi audit tidak ditemukan
 */
router.post(
  '/:id/submit-counts',
  requireRole(['WAREHOUSE_STAFF', 'WAREHOUSE_MANAGER']),
  validate(submitCountsSchema),
  auditSessionController.submitCounts
);

/**
 * @openapi
 * /api/audit-sessions/{id}/approve:
 *   post:
 *     summary: Approve sesi audit & trigger rekonsiliasi stok asinkron (Tahap 3 - Manager Only)
 *     tags:
 *       - Stock Opname Lifecycle
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       202:
 *         description: Permintaan diterima (Fast Non-blocking), proses rekonsiliasi stok & audit log berjalan di background
 *       400:
 *         description: Status sesi bukan COUNT_SUBMITTED
 *       403:
 *         description: Forbidden (Hanya Warehouse Manager)
 *       404:
 *         description: Sesi audit tidak ditemukan
 */
router.post(
  '/:id/approve',
  requireRole(['WAREHOUSE_MANAGER']),
  validate(getSessionByIdSchema),
  auditSessionController.approveSession
);

/**
 * @openapi
 * /api/audit-sessions/{id}/reject:
 *   post:
 *     summary: Reject sesi audit (Manager Only)
 *     tags:
 *       - Stock Opname Lifecycle
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 example: "Hitungan fisik tidak konsisten, perlu diulang"
 *     responses:
 *       200:
 *         description: Sesi audit berhasil ditolak (status REJECTED)
 *       403:
 *         description: Forbidden (Hanya Warehouse Manager)
 */
router.post(
  '/:id/reject',
  requireRole(['WAREHOUSE_MANAGER']),
  validate(getSessionByIdSchema),
  auditSessionController.rejectSession
);

export default router;
