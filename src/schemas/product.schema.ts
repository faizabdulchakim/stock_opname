import { z } from 'zod';

export const createProductSchema = z.object({
  body: z.object({
    sku: z.string({ required_error: 'SKU produk wajib diisi' }).min(2, 'SKU minimal 2 karakter').toUpperCase(),
    name: z.string({ required_error: 'Nama produk wajib diisi' }).min(2, 'Nama minimal 2 karakter'),
    currentStock: z.number({ required_error: 'Stok awal wajib diisi' }).int().min(0, 'Stok tidak boleh negatif'),
    unit: z.string().optional().default('PCS'),
  }),
});

export const updateProductSchema = z.object({
  params: z.object({
    id: z.string({ required_error: 'ID produk wajib diisi' }),
  }),
  body: z.object({
    name: z.string().min(2).optional(),
    currentStock: z.number().int().min(0).optional(),
    unit: z.string().optional(),
  }),
});

export const getProductByIdSchema = z.object({
  params: z.object({
    id: z.string({ required_error: 'ID produk wajib diisi' }),
  }),
});

export type CreateProductInput = z.infer<typeof createProductSchema>['body'];
export type UpdateProductInput = z.infer<typeof updateProductSchema>['body'];
