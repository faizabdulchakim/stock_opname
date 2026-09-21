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
    const session = await prisma.auditSession.findUnique({
      where: { id: sessionId },
      include: { items: true },
    });

    if (!session) {
      throw new AppError('Sesi audit tidak ditemukan', 404);
    }

    if (session.status !== SessionStatus.INITIATED) {
      throw new AppError(
        `Tidak dapat mengirimkan hitungan: Sesi audit berada dalam status '${session.status}', bukan 'INITIATED'`,
        400
      );
    }

    const itemMap = new Map(session.items.map((item) => [item.productId, item]));

    for (const submittedItem of input.items) {
      if (!itemMap.has(submittedItem.productId)) {
        throw new AppError(
          `Produk dengan ID '${submittedItem.productId}' tidak termasuk dalam daftar audit sesi ini`,
          400
        );
      }
    }

    return prisma.$transaction(async (tx) => {
      for (const submittedItem of input.items) {
        const existingItem = itemMap.get(submittedItem.productId)!;
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
   * Tahap 3: Approval & Async Reconciliation oleh Manager
   * Fast Non-blocking Endpoint & Idempotent Guard
   */
  async approveSession(managerId: string, sessionId: string) {
    const session = await prisma.auditSession.findUnique({
      where: { id: sessionId },
      include: { items: true },
    });

    if (!session) {
      throw new AppError('Sesi audit tidak ditemukan', 404);
    }

    // Idempotency: Jika sudah pernah diapprove atau sedang dalam proses, kembalikan status aman tanpa duplikasi
    if (session.status === SessionStatus.APPROVED) {
      return {
        sessionId: session.id,
        sessionCode: session.sessionCode,
        status: SessionStatus.APPROVED,
        message: 'Sesi audit sudah disetujui sebelumnya (Idempotent: tidak ada penyesuaian ganda)',
      };
    }

    if (session.status === SessionStatus.RECONCILING) {
      return {
        sessionId: session.id,
        sessionCode: session.sessionCode,
        status: SessionStatus.RECONCILING,
        message: 'Sesi audit sedang dalam proses rekonsiliasi asinkron di background',
      };
    }

    if (session.status !== SessionStatus.COUNT_SUBMITTED) {
      throw new AppError(
        `Hanya sesi berstatus 'COUNT_SUBMITTED' yang dapat disetujui (Status saat ini: '${session.status}')`,
        400
      );
    }

    // 1. Kunci status ke RECONCILING secara instan (Atomic Lock)
    const updatedSession = await prisma.auditSession.update({
      where: { id: sessionId },
      data: {
        status: SessionStatus.RECONCILING,
        approvedById: managerId,
        approvedAt: new Date(),
      },
    });

    // 2. Jalankan background worker async (Non-blocking)
    setImmediate(async () => {
      try {
        await this.executeReconciliation(sessionId, managerId);
      } catch (err) {
        console.error(`[Async Reconciler Error] Gagal merekonsiliasi sesi ${sessionId}:`, err);
      }
    });

    // 3. Return cepat (HTTP 202 Accepted)
    return {
      sessionId: updatedSession.id,
      sessionCode: updatedSession.sessionCode,
      status: SessionStatus.RECONCILING,
      message: 'Sesi audit telah disetujui. Proses rekonsiliasi stok dan pencatatan audit log sedang berjalan di background.',
    };
  }

  /**
   * Background Async Worker: Melakukan kalkulasi rekonsiliasi stok dan pencatatan durable audit log
   */
  async executeReconciliation(sessionId: string, managerId: string) {
    const session = await prisma.auditSession.findUnique({
      where: { id: sessionId },
      include: {
        items: {
          include: { product: true },
        },
      },
    });

    if (!session || session.items.length === 0) return;

    // Transaksi database atomic untuk memastikan seluruh produk & log tersimpan utuh
    await prisma.$transaction(async (tx) => {
      for (const item of session.items) {
        if (item.variance === null || item.countedStock === null) continue;

        const currentOfficialStock = item.product.currentStock;
        // Rekonsiliasi: Stok resmi baru disesuaikan dengan variance (atau countedStock)
        const newStock = currentOfficialStock + item.variance;

        // 1. Update stok resmi di tabel master products
        await tx.product.update({
          where: { id: item.productId },
          data: { currentStock: newStock },
        });

        // 2. Buat catatan Durable Audit Log
        await tx.inventoryAuditLog.create({
          data: {
            productId: item.productId,
            sessionId: session.id,
            beforeStock: currentOfficialStock,
            afterStock: newStock,
            changeQty: item.variance,
            reason: `STOCK_OPNAME_RECONCILIATION: Sesi [${session.sessionCode}]`,
            actionByUserId: managerId,
          },
        });
      }

      // 3. Finalisasi status sesi menjadi APPROVED
      await tx.auditSession.update({
        where: { id: sessionId },
        data: {
          status: SessionStatus.APPROVED,
        },
      });
    });

    console.log(`✅ [Async Reconciler] Sesi '${session.sessionCode}' berhasil direkonsiliasi secara penuh!`);
  }

  /**
   * Reject Sesi Audit oleh Manager
   */
  async rejectSession(managerId: string, sessionId: string, reason?: string) {
    const session = await prisma.auditSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new AppError('Sesi audit tidak ditemukan', 404);
    }

    if (session.status === SessionStatus.APPROVED || session.status === SessionStatus.RECONCILING) {
      throw new AppError(
        `Tidak dapat menolak sesi yang sudah dalam status '${session.status}'`,
        400
      );
    }

    return prisma.auditSession.update({
      where: { id: sessionId },
      data: {
        status: SessionStatus.REJECTED,
        rejectedAt: new Date(),
        notes: reason ? `${session.notes || ''} | Alasan Penolakan: ${reason}` : session.notes,
      },
      include: {
        createdBy: true,
        submittedBy: true,
      },
    });
  }

  /**
   * Mengambil riwayat Durable Inventory Audit Logs
   */
  async getAuditLogs(productId?: string, sessionId?: string) {
    return prisma.inventoryAuditLog.findMany({
      where: {
        ...(productId && { productId }),
        ...(sessionId && { sessionId }),
      },
      include: {
        product: {
          select: { id: true, sku: true, name: true, unit: true },
        },
        actionByUser: {
          select: { id: true, name: true, email: true, role: true },
        },
        session: {
          select: { id: true, sessionCode: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Mengambil daftar semua sesi audit
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
