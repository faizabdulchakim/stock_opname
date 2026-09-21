import request from 'supertest';
import app from '../src/app';
import prisma from '../src/config/prisma';
import { Role, SessionStatus } from '@prisma/client';
import { signToken } from '../src/utils/jwt';

jest.mock('../src/config/prisma', () => {
  const mockPrisma: any = {
    product: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    auditSession: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    auditSessionItem: {
      update: jest.fn(),
    },
    inventoryAuditLog: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
    $disconnect: jest.fn(),
  };
  return {
    __esModule: true,
    default: mockPrisma,
  };
});

describe('Audit Session - Full Lifecycle Tests (Stage 1, 2, 3)', () => {
  const managerToken = signToken({
    id: 'user-mgr-uuid-1',
    name: 'Budi Santoso',
    email: 'manager@warehouse.com',
    role: Role.WAREHOUSE_MANAGER,
  });

  const staffToken = signToken({
    id: 'user-staff-uuid-1',
    name: 'Agus Prasetyo',
    email: 'staff@warehouse.com',
    role: Role.WAREHOUSE_STAFF,
  });

  const prodId1 = '11111111-1111-4111-8111-111111111111';
  const prodId2 = '22222222-2222-4222-8222-222222222222';
  const sessionId = 'session-uuid-1';

  beforeEach(() => {
    (prisma.$transaction as jest.Mock).mockImplementation(async (callback: any) => {
      if (typeof callback === 'function') {
        return await callback(prisma);
      }
      return Promise.all(callback);
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/audit-sessions (Stage 1: Initiation & Snapshotting)', () => {
    it('should reject non-manager users (Staff getting 403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/audit-sessions')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          sessionCode: 'AUD-2026-001',
          productIds: [prodId1],
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('WAREHOUSE_MANAGER');
    });

    it('should fail validation with 422 if productIds array is empty', async () => {
      const res = await request(app)
        .post('/api/audit-sessions')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          sessionCode: 'AUD-2026-001',
          productIds: [],
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toBeDefined();
    });

    it('should successfully create session and snapshot stock levels accurately', async () => {
      const mockProduct1 = { id: prodId1, sku: 'PRD-INDOMIE-001', name: 'Indomie', currentStock: 120 };
      const mockProduct2 = { id: prodId2, sku: 'PRD-BEARBRAND-002', name: 'Bear Brand', currentStock: 85 };

      (prisma.auditSession.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.product.findMany as jest.Mock).mockResolvedValue([mockProduct1, mockProduct2]);
      (prisma.auditSession.create as jest.Mock).mockResolvedValue({
        id: sessionId,
        sessionCode: 'AUD-2026-001',
        status: SessionStatus.INITIATED,
        createdById: 'user-mgr-uuid-1',
        items: [
          { id: 'item-1', productId: prodId1, snapshotStock: 120, countedStock: null, variance: null },
          { id: 'item-2', productId: prodId2, snapshotStock: 85, countedStock: null, variance: null },
        ],
      });

      const res = await request(app)
        .post('/api/audit-sessions')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          sessionCode: 'AUD-2026-001',
          productIds: [prodId1, prodId2],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(SessionStatus.INITIATED);
      expect(res.body.data.items[0].snapshotStock).toBe(120);
    });
  });

  describe('POST /api/audit-sessions/:id/submit-counts (Stage 2: Count Submission)', () => {
    it('should reject batch with duplicate productIds in the same request', async () => {
      const res = await request(app)
        .post(`/api/audit-sessions/${sessionId}/submit-counts`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          items: [
            { productId: prodId1, countedStock: 100 },
            { productId: prodId1, countedStock: 105 },
          ],
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.errors[0].message).toContain('duplikasi productId');
    });

    it('should calculate variance accurately and set status to COUNT_SUBMITTED', async () => {
      (prisma.auditSession.findUnique as jest.Mock).mockResolvedValue({
        id: sessionId,
        status: SessionStatus.INITIATED,
        items: [
          { id: 'item-1', productId: prodId1, snapshotStock: 120 },
          { id: 'item-2', productId: prodId2, snapshotStock: 85 },
        ],
      });

      (prisma.auditSessionItem.update as jest.Mock).mockResolvedValue({});
      (prisma.auditSession.update as jest.Mock).mockResolvedValue({
        id: sessionId,
        status: SessionStatus.COUNT_SUBMITTED,
        submittedById: 'user-staff-uuid-1',
        submittedAt: new Date(),
        items: [
          { id: 'item-1', productId: prodId1, snapshotStock: 120, countedStock: 115, variance: -5 },
          { id: 'item-2', productId: prodId2, snapshotStock: 85, countedStock: 90, variance: 5 },
        ],
      });

      const res = await request(app)
        .post(`/api/audit-sessions/${sessionId}/submit-counts`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          items: [
            { productId: prodId1, countedStock: 115, notes: '5 hilang' },
            { productId: prodId2, countedStock: 90, notes: '5 bonus' },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(SessionStatus.COUNT_SUBMITTED);
      expect(res.body.data.items[0].variance).toBe(-5);
      expect(res.body.data.items[1].variance).toBe(5);
    });
  });

  describe('POST /api/audit-sessions/:id/approve (Stage 3: Approval & Async Reconcile)', () => {
    it('should reject non-manager users from approving', async () => {
      const res = await request(app)
        .post(`/api/audit-sessions/${sessionId}/approve`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should return HTTP 202 Accepted with fast non-blocking response and set status to RECONCILING', async () => {
      (prisma.auditSession.findUnique as jest.Mock).mockResolvedValue({
        id: sessionId,
        sessionCode: 'AUD-2026-001',
        status: SessionStatus.COUNT_SUBMITTED,
        items: [
          {
            id: 'item-1',
            productId: prodId1,
            snapshotStock: 120,
            countedStock: 115,
            variance: -5,
            product: { id: prodId1, currentStock: 120 },
          },
        ],
      });

      (prisma.auditSession.update as jest.Mock).mockResolvedValue({
        id: sessionId,
        sessionCode: 'AUD-2026-001',
        status: SessionStatus.RECONCILING,
      });

      const res = await request(app)
        .post(`/api/audit-sessions/${sessionId}/approve`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(202);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(SessionStatus.RECONCILING);
      expect(res.body.message).toContain('background');
    });

    it('should handle idempotency safely when session was already APPROVED', async () => {
      (prisma.auditSession.findUnique as jest.Mock).mockResolvedValue({
        id: sessionId,
        sessionCode: 'AUD-2026-001',
        status: SessionStatus.APPROVED,
        items: [],
      });

      const res = await request(app)
        .post(`/api/audit-sessions/${sessionId}/approve`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(202);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(SessionStatus.APPROVED);
      expect(res.body.data.message).toContain('Idempotent');
    });
  });

  describe('POST /api/audit-sessions/:id/reject & Audit Logs History', () => {
    it('should reject session and change status to REJECTED', async () => {
      (prisma.auditSession.findUnique as jest.Mock).mockResolvedValue({
        id: sessionId,
        status: SessionStatus.COUNT_SUBMITTED,
      });

      (prisma.auditSession.update as jest.Mock).mockResolvedValue({
        id: sessionId,
        status: SessionStatus.REJECTED,
      });

      const res = await request(app)
        .post(`/api/audit-sessions/${sessionId}/reject`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ reason: 'Hitungan tidak valid' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(SessionStatus.REJECTED);
    });

    it('should retrieve durable inventory audit logs history', async () => {
      (prisma.inventoryAuditLog.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'log-1',
          productId: prodId1,
          beforeStock: 120,
          afterStock: 115,
          changeQty: -5,
          reason: 'STOCK_OPNAME_RECONCILIATION: Sesi [AUD-2026-001]',
        },
      ]);

      const res = await request(app)
        .get('/api/audit-sessions/logs/audit-history')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });
});
