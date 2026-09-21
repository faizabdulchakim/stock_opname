import { Response } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: any;
}

export const sendResponse = <T>(
  res: Response,
  statusCode: number,
  success: boolean,
  message: string,
  data?: T,
  errors?: any
): Response => {
  const payload: ApiResponse<T> = {
    success,
    message,
    ...(data !== undefined && { data }),
    ...(errors !== undefined && { errors }),
  };
  return res.status(statusCode).json(payload);
};

export const sendSuccess = <T>(
  res: Response,
  message: string,
  data?: T,
  statusCode: number = 200
): Response => {
  return sendResponse(res, statusCode, true, message, data);
};

export const sendCreated = <T>(
  res: Response,
  message: string,
  data?: T
): Response => {
  return sendResponse(res, 201, true, message, data);
};

export const sendError = (
  res: Response,
  message: string,
  statusCode: number = 400,
  errors?: any
): Response => {
  return sendResponse(res, statusCode, false, message, undefined, errors);
};
