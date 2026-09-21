import { Request, Response, NextFunction } from 'express';
import productService from '../services/product.service';
import { sendCreated, sendSuccess } from '../utils/response';

export class ProductController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const product = await productService.create(req.body);
      sendCreated(res, 'Produk berhasil ditambahkan', product);
    } catch (error) {
      next(error);
    }
  }

  async findAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const search = req.query.search as string | undefined;
      const products = await productService.findAll(search);
      sendSuccess(res, 'Daftar produk berhasil diambil', products);
    } catch (error) {
      next(error);
    }
  }

  async findById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const product = await productService.findById(req.params.id);
      sendSuccess(res, 'Detail produk berhasil diambil', product);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const updated = await productService.update(req.params.id, req.body);
      sendSuccess(res, 'Produk berhasil diperbarui', updated);
    } catch (error) {
      next(error);
    }
  }
}

export default new ProductController();
