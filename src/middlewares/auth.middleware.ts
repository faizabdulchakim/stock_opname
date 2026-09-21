import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../utils/jwt';
import { sendError } from '../utils/response';

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

export const authenticate = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    sendError(res, 'Akses ditolak: Token autentikasi tidak ditemukan', 401);
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      sendError(res, 'Sesi telah berakhir: Token JWT kadaluarsa', 401);
      return;
    }
    sendError(res, 'Autentikasi gagal: Token JWT tidak valid', 401);
    return;
  }
};

export const authorize = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'Akses tidak diizinkan', 401);
      return;
    }

    if (!roles.includes(req.user.role)) {
      sendError(res, 'Akses ditolak: Anda tidak memiliki izin untuk resource ini', 403);
      return;
    }

    next();
  };
};
