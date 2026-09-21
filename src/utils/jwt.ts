import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { Role } from '@prisma/client';

export interface JwtPayload {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export const signToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn as any,
  });
};

export const verifyToken = (token: string): JwtPayload => {
  return jwt.verify(token, config.jwtSecret) as JwtPayload;
};
