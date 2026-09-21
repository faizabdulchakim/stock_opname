import { Router } from 'express';
import productController from '../controllers/product.controller';
import { validate } from '../middlewares/validate.middleware';
import { authenticate, requireRole } from '../middlewares/auth.middleware';
import {
  createProductSchema,
  updateProductSchema,
  getProductByIdSchema,
} from '../schemas/product.schema';

const router = Router();

// Semua rute produk membutuhkan autentikasi
router.use(authenticate);

/**
 * @openapi
 * /api/products:
 *   get:
 *     summary: Mendapatkan daftar seluruh produk
 *     tags:
 *       - Products
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Cari berdasarkan Nama atau SKU
 *     responses:
 *       200:
 *         description: Daftar produk
 *   post:
 *     summary: Menambah produk baru (Manager Only)
 *     tags:
 *       - Products
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sku
 *               - name
 *               - currentStock
 *             properties:
 *               sku:
 *                 type: string
 *                 example: PRD-INDOMIE-001
 *               name:
 *                 type: string
 *                 example: Indomie Goreng Original
 *               currentStock:
 *                 type: integer
 *                 example: 120
 *               unit:
 *                 type: string
 *                 example: PCS
 *     responses:
 *       201:
 *         description: Produk berhasil dibuat
 *       403:
 *         description: Forbidden (Hanya Warehouse Manager)
 */
router.get('/', productController.findAll);
router.post(
  '/',
  requireRole(['WAREHOUSE_MANAGER']),
  validate(createProductSchema),
  productController.create
);

/**
 * @openapi
 * /api/products/{id}:
 *   get:
 *     summary: Mendapatkan detail produk berdasarkan ID
 *     tags:
 *       - Products
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
 *         description: Detail produk
 *   put:
 *     summary: Memperbarui data produk (Manager Only)
 *     tags:
 *       - Products
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
 *             properties:
 *               name:
 *                 type: string
 *               currentStock:
 *                 type: integer
 *               unit:
 *                 type: string
 *     responses:
 *       200:
 *         description: Produk berhasil diperbarui
 */
router.get('/:id', validate(getProductByIdSchema), productController.findById);
router.put(
  '/:id',
  requireRole(['WAREHOUSE_MANAGER']),
  validate(updateProductSchema),
  productController.update
);

export default router;
