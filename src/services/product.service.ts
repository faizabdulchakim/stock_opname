import prisma from '../config/prisma';
import { CreateProductInput, UpdateProductInput } from '../schemas/product.schema';
import { AppError } from '../middlewares/error.middleware';

export class ProductService {
  async create(input: CreateProductInput) {
    const existing = await prisma.product.findUnique({
      where: { sku: input.sku },
    });

    if (existing) {
      throw new AppError(`Produk dengan SKU '${input.sku}' sudah ada dalam sistem`, 409);
    }

    return prisma.product.create({
      data: {
        sku: input.sku,
        name: input.name,
        currentStock: input.currentStock,
        unit: input.unit || 'PCS',
      },
    });
  }

  async findAll(search?: string) {
    return prisma.product.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { sku: { contains: search, mode: 'insensitive' } },
            ],
          }
        : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new AppError('Produk tidak ditemukan', 404);
    }

    return product;
  }

  async update(id: string, input: UpdateProductInput) {
    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new AppError('Produk tidak ditemukan', 404);
    }

    return prisma.product.update({
      where: { id },
      data: input,
    });
  }
}

export default new ProductService();
