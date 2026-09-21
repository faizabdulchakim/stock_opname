import { Router } from 'express';
import authRoutes from './auth.routes';
import productRoutes from './product.routes';
import auditSessionRoutes from './audit-session.routes';

const router = Router();

/**
 * @openapi
 * /api/health:
 *   get:
 *     summary: Health check service
 *     tags:
 *       - System
 *     responses:
 *       200:
 *         description: Service is healthy
 */
router.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'stock_opname_reconciliation_api',
  });
});

router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/audit-sessions', auditSessionRoutes);

export default router;
