import { Router } from 'express';
import authRoutes from './auth.routes';

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
    service: 'api_service',
  });
});

router.use('/auth', authRoutes);

export default router;
