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

// Schema Tahap 2: Batch Count Submission oleh Staf
export const submitCountsSchema = z.object({
  params: z.object({
    id: z.string({ required_error: 'ID sesi audit wajib diisi' }),
  }),
  body: z.object({
    items: z
      .array(
        z.object({
          productId: z.string({ required_error: 'Product ID wajib diisi' }).uuid('Format ID produk tidak valid'),
          countedStock: z
            .number({ required_error: 'Hasil hitungan fisik (countedStock) wajib diisi' })
            .int('Hitungan fisik harus bilangan bulat')
            .min(0, 'Hitungan fisik tidak boleh negatif'),
          notes: z.string().optional(),
        })
      )
      .min(1, 'Harus mengirimkan minimal 1 hasil hitungan fisik produk')
      // Edge Case Validator: Cegah duplikasi productId dalam 1 batch submission
      .refine(
        (items) => {
          const productIds = items.map((i) => i.productId);
          return new Set(productIds).size === productIds.length;
        },
        {
          message: 'Terdapat duplikasi productId dalam satu pengiriman batch hitungan fisik',
        }
      ),
  }),
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>['body'];
export type SubmitCountsInput = z.infer<typeof submitCountsSchema>['body'];
