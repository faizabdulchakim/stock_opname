import { Router } from 'express';
import auditSessionController from '../controllers/audit-session.controller';
import { validate } from '../middlewares/validate.middleware';
import { authenticate, requireRole } from '../middlewares/auth.middleware';
import { createSessionSchema, getSessionByIdSchema } from '../schemas/audit-session.schema';

const router = Router();

// Semua rute membutuhkan autentikasi login
router.use(authenticate);

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

export default router;
