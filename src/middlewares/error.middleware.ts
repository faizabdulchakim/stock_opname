import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response';

export class AppError extends Error {
  statusCode: number;
  errors?: any;

  constructor(message: string, statusCode: number = 400, errors?: any) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  console.error('[Error Middleware]:', err);

  // Custom App Error
  if (err instanceof AppError) {
    sendError(res, err.message, err.statusCode, err.errors);
    return;
  }

  // Prisma Unique Constraint Error (P2002)
  if (err.code === 'P2002') {
    const fields = (err.meta?.target as string[])?.join(', ') || 'field';
    sendError(res, `Data duplikat: ${fields} sudah digunakan`, 409);
    return;
  }

  // Prisma Record Not Found (P2025)
  if (err.code === 'P2025') {
    sendError(res, 'Data yang diminta tidak ditemukan di database', 404);
    return;
  }

  // Default Internal Server Error
  sendError(
    res,
    process.env.NODE_ENV === 'production'
      ? 'Terjadi kesalahan internal pada server'
      : err.message || 'Internal Server Error',
    500
  );
};
