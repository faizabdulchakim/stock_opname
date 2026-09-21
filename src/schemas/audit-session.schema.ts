import { z } from 'zod';

export const createSessionSchema = z.object({
  body: z.object({
    sessionCode: z
      .string({ required_error: 'Kode sesi audit wajib diisi' })
      .min(3, 'Kode sesi minimal 3 karakter')
      .toUpperCase(),
    notes: z.string().optional(),
    productIds: z
      .array(z.string().uuid('Format ID produk harus UUID yang valid'), {
        required_error: 'Daftar produk yang akan diaudit wajib dipilih',
      })
      .min(1, 'Pilih minimal 1 produk untuk diaudit'),
  }),
});

export const getSessionByIdSchema = z.object({
  params: z.object({
    id: z.string({ required_error: 'ID sesi audit wajib diisi' }),
  }),
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>['body'];
