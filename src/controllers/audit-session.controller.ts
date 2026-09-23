import { Response, NextFunction } from 'express';
import auditSessionService from '../services/audit-session.service';
import { sendCreated, sendSuccess, sendResponse } from '../utils/response';
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
   * Handler submit hitungan fisik batch oleh Staf (Tahap 2)
   */
  async submitCounts(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const staffId = req.user!.id;
      const sessionId = req.params.id;
      const result = await auditSessionService.submitCounts(staffId, sessionId, req.body);
      sendSuccess(res, 'Hitungan fisik berhasil dikirimkan dan selisih (variance) berhasil dihitung', result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handler Approval Sesi Audit oleh Manager (Tahap 3 - Fast Non-blocking Response 202 Accepted)
   */
  async approveSession(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const managerId = req.user!.id;
      const sessionId = req.params.id;
      const result = await auditSessionService.approveSession(managerId, sessionId);
      
      // Mengembalikan HTTP 202 Accepted (Non-blocking)
      sendResponse(res, 202, true, result.message, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handler Reject Sesi Audit oleh Manager
   */
  async rejectSession(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const managerId = req.user!.id;
      const sessionId = req.params.id;
      const reason = req.body.reason as string | undefined;
      const result = await auditSessionService.rejectSession(managerId, sessionId, reason);
      sendSuccess(res, 'Sesi audit berhasil ditolak', result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handler melihat Riwayat Durable Audit Log Perubahan Stok
   */
  async getAuditLogs(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const productId = req.query.productId as string | undefined;
      const sessionId = req.query.sessionId as string | undefined;
      const logs = await auditSessionService.getAuditLogs(productId, sessionId);
      sendSuccess(res, 'Riwayat audit log stok berhasil diambil', logs);
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
