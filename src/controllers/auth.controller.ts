import { Request, Response, NextFunction } from 'express';
import authService from '../services/auth.service';
import { sendCreated, sendSuccess } from '../utils/response';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.register(req.body);
      sendCreated(res, 'Registrasi berhasil', result);
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.login(req.body);
      sendSuccess(res, 'Login berhasil', result);
    } catch (error) {
      next(error);
    }
  }

  async me(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const profile = await authService.getProfile(req.user!.id);
      sendSuccess(res, 'Data profil berhasil diambil', profile);
    } catch (error) {
      next(error);
    }
  }
}

export default new AuthController();
