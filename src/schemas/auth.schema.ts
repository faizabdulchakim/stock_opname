import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    name: z.string({ required_error: 'Nama wajib diisi' }).min(2, 'Nama minimal 2 karakter'),
    email: z.string({ required_error: 'Email wajib diisi' }).email('Format email tidak valid'),
    password: z.string({ required_error: 'Password wajib diisi' }).min(6, 'Password minimal 6 karakter'),
    role: z.enum(['ADMIN', 'USER']).optional().default('USER'),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string({ required_error: 'Email wajib diisi' }).email('Format email tidak valid'),
    password: z.string({ required_error: 'Password wajib diisi' }).min(1, 'Password wajib diisi'),
  }),
});

export type RegisterInput = z.infer<typeof registerSchema>['body'];
export type LoginInput = z.infer<typeof loginSchema>['body'];
