import request from 'supertest';
import app from '../src/app';
import prisma from '../src/config/prisma';
import { Role, SessionStatus } from '@prisma/client';
import { signToken } from '../src/utils/jwt';

jest.mock('../src/config/prisma', () => ({
  __esModule: true,
  default: {
    product: {
      findMany: jest.fn(),
    },
    auditSession: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    $disconnect: jest.fn(),
  },
}));

describe('Audit Session - Stage 1: Initiation & Snapshotting Tests', () => {
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

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/audit-sessions (Initiation & Snapshotting)', () => {
    it('should reject non-manager users (Staff getting 403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/audit-sessions')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          sessionCode: 'AUD-2026-001',
          productIds: ['a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'],
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
      const mockProduct1 = {
        id: '11111111-1111-4111-8111-111111111111',
        sku: 'PRD-INDOMIE-001',
        name: 'Indomie Goreng Original',
        currentStock: 120, // <-- Stok saat ini 120
      };
      const mockProduct2 = {
        id: '22222222-2222-4222-8222-222222222222',
        sku: 'PRD-BEARBRAND-002',
        name: 'Susu Bear Brand 189ml',
        currentStock: 85,  // <-- Stok saat ini 85
      };

      (prisma.auditSession.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.product.findMany as jest.Mock).mockResolvedValue([mockProduct1, mockProduct2]);
      (prisma.auditSession.create as jest.Mock).mockResolvedValue({
        id: 'session-uuid-1',
        sessionCode: 'AUD-2026-001',
        status: SessionStatus.INITIATED,
        notes: 'Monthly Audit',
        createdById: 'user-mgr-uuid-1',
        items: [
          {
            id: 'item-1',
            productId: mockProduct1.id,
            snapshotStock: 120,
            countedStock: null,
            variance: null,
            product: mockProduct1,
          },
          {
            id: 'item-2',
            productId: mockProduct2.id,
            snapshotStock: 85,
            countedStock: null,
            variance: null,
            product: mockProduct2,
          },
        ],
      });

      const res = await request(app)
        .post('/api/audit-sessions')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          sessionCode: 'AUD-2026-001',
          notes: 'Monthly Audit',
          productIds: [mockProduct1.id, mockProduct2.id],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(SessionStatus.INITIATED);
      
      // Verifikasi bahwa snapshotStock tersimpan sesuai stok saat itu
      expect(res.body.data.items[0].snapshotStock).toBe(120);
      expect(res.body.data.items[0].countedStock).toBeNull();
      expect(res.body.data.items[1].snapshotStock).toBe(85);
      expect(res.body.data.items[1].countedStock).toBeNull();
    });
  });

  describe('GET /api/audit-sessions', () => {
    it('should allow both manager and staff to view audit sessions', async () => {
      (prisma.auditSession.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'session-uuid-1',
          sessionCode: 'AUD-2026-001',
          status: SessionStatus.INITIATED,
          _count: { items: 2 },
        },
      ]);

      const res = await request(app)
        .get('/api/audit-sessions')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });
});
