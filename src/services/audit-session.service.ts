import prisma from '../config/prisma';
import { CreateSessionInput, SubmitCountsInput } from '../schemas/audit-session.schema';
import { AppError } from '../middlewares/error.middleware';
import { SessionStatus } from '@prisma/client';

export class AuditSessionService {
  /**
   * Tahap 1: Inisiasi sesi audit & snapshot baseline stok
   */
  async createSession(managerId: string, input: CreateSessionInput) {
    const existingCode = await prisma.auditSession.findUnique({
      where: { sessionCode: input.sessionCode },
    });

    if (existingCode) {
      throw new AppError(`Kode sesi audit '${input.sessionCode}' sudah digunakan`, 409);
    }

    const products = await prisma.product.findMany({
      where: { id: { in: input.productIds } },
    });

    if (products.length !== input.productIds.length) {
      throw new AppError('Satu atau lebih produk yang dipilih tidak ditemukan dalam sistem', 404);
    }

    const itemsToSnapshot = products.map((product) => ({
      productId: product.id,
      snapshotStock: product.currentStock,
      countedStock: null,
      variance: null,
    }));

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
   * Tahap 2: Pengiriman Hitungan Fisik Batch oleh Staf Gudang
   */
  async submitCounts(staffId: string, sessionId: string, input: SubmitCountsInput) {
    // 1. Cari sesi audit dan items-nya
    const session = await prisma.auditSession.findUnique({
      where: { id: sessionId },
      include: { items: true },
    });

    if (!session) {
      throw new AppError('Sesi audit tidak ditemukan', 404);
    }

    // 2. Validasi State: hanya boleh disubmit jika statusnya masih INITIATED
    if (session.status !== SessionStatus.INITIATED) {
      throw new AppError(
        `Tidak dapat mengirimkan hitungan: Sesi audit berada dalam status '${session.status}', bukan 'INITIATED'`,
        400
      );
    }

    // 3. Petakan item yang ada di sesi untuk memvalidasi productId dan mengambil snapshotStock
    const itemMap = new Map(session.items.map((item) => [item.productId, item]));

    for (const submittedItem of input.items) {
      if (!itemMap.has(submittedItem.productId)) {
        throw new AppError(
          `Produk dengan ID '${submittedItem.productId}' tidak termasuk dalam daftar audit sesi ini`,
          400
        );
      }
    }

    // 4. Jalankan atomic transaction: Update item fisik & selisih variance, lalu update status sesi
    return prisma.$transaction(async (tx) => {
      for (const submittedItem of input.items) {
        const existingItem = itemMap.get(submittedItem.productId)!;
        
        // Hitung variance: (Stok Fisik yang Dihitung) - (Stok Baseline Snapshot)
        const variance = submittedItem.countedStock - existingItem.snapshotStock;

        await tx.auditSessionItem.update({
          where: { id: existingItem.id },
          data: {
            countedStock: submittedItem.countedStock,
            variance: variance,
            notes: submittedItem.notes,
          },
        });
      }

      // Update status sesi menjadi COUNT_SUBMITTED
      return tx.auditSession.update({
        where: { id: sessionId },
        data: {
          status: SessionStatus.COUNT_SUBMITTED,
          submittedById: staffId,
          submittedAt: new Date(),
        },
        include: {
          createdBy: {
            select: { id: true, name: true, email: true, role: true },
          },
          submittedBy: {
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
