import { Response, NextFunction } from 'express';
import auditSessionService from '../services/audit-session.service';
import { sendCreated, sendSuccess } from '../utils/response';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { SessionStatus } from '@prisma/client';

export class AuditSessionController {
  /**
   * Handler inisiasi sesi audit baru (Manager Only)
   */
  async createSession(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const managerId = req.user!.id;
      const session = await auditSessionService.createSession(managerId, req.body);
      sendCreated(res, 'Sesi audit berhasil diinisiasi & baseline stok berhasil di-snapshot', session);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handler daftar semua sesi audit
   */
  async findAllSessions(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const status = req.query.status as SessionStatus | undefined;
      const sessions = await auditSessionService.findAllSessions(status);
      sendSuccess(res, 'Daftar sesi audit berhasil diambil', sessions);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handler detail sesi audit
   */
  async findSessionById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const session = await auditSessionService.findSessionById(req.params.id);
      sendSuccess(res, 'Detail sesi audit berhasil diambil', session);
    } catch (error) {
      next(error);
    }
  }
}

export default new AuditSessionController();
