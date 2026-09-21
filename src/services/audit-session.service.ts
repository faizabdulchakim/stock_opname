import prisma from '../config/prisma';
import { CreateSessionInput } from '../schemas/audit-session.schema';
import { AppError } from '../middlewares/error.middleware';
import { SessionStatus } from '@prisma/client';

export class AuditSessionService {
  /**
   * Tahap 1: Inisiasi sesi audit & snapshot baseline stok
   */
  async createSession(managerId: string, input: CreateSessionInput) {
    // 1. Cek keunikan sessionCode
    const existingCode = await prisma.auditSession.findUnique({
      where: { sessionCode: input.sessionCode },
    });

    if (existingCode) {
      throw new AppError(`Kode sesi audit '${input.sessionCode}' sudah digunakan`, 409);
    }

    // 2. Ambil data produk yang dipilih untuk di-snapshot
    const products = await prisma.product.findMany({
      where: { id: { in: input.productIds } },
    });

    if (products.length !== input.productIds.length) {
      throw new AppError('Satu atau lebih produk yang dipilih tidak ditemukan dalam sistem', 404);
    }

    // 3. Susun items dengan mengunci snapshotStock dari currentStock saat ini
    const itemsToSnapshot = products.map((product) => ({
      productId: product.id,
      snapshotStock: product.currentStock, // <-- KUNCI SNAPSHOT BASELINE
      countedStock: null,                  // Belum diisi (menunggu staf)
      variance: null,                      // Belum dihitung
    }));

    // 4. Simpan ke database dalam 1 transaksi
    return prisma.auditSession.create({
      data: {
        sessionCode: input.sessionCode,
        notes: input.notes,
        status: SessionStatus.INITIATED,
        createdById: managerId,
        items: {
          create: itemsToSnapshot,
        },
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true, role: true },
        },
        items: {
          include: {
            product: {
              select: { id: true, sku: true, name: true, unit: true },
            },
          },
        },
      },
    });
  }

  /**
   * Mengambil daftar semua sesi audit (Bisa difilter status)
   */
  async findAllSessions(status?: SessionStatus) {
    return prisma.auditSession.findMany({
      where: status ? { status } : undefined,
      include: {
        createdBy: {
          select: { id: true, name: true, email: true, role: true },
        },
        submittedBy: {
          select: { id: true, name: true, email: true, role: true },
        },
        approvedBy: {
          select: { id: true, name: true, email: true, role: true },
        },
        _count: {
          select: { items: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Mengambil detail sesi audit berdasarkan ID
   */
  async findSessionById(id: string) {
    const session = await prisma.auditSession.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true, role: true },
        },
        submittedBy: {
          select: { id: true, name: true, email: true, role: true },
        },
        approvedBy: {
          select: { id: true, name: true, email: true, role: true },
        },
        items: {
          include: {
            product: {
              select: { id: true, sku: true, name: true, unit: true, currentStock: true },
            },
          },
        },
      },
    });

    if (!session) {
      throw new AppError('Sesi audit tidak ditemukan', 404);
    }

    return session;
  }
}

export default new AuditSessionService();
