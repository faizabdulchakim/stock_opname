import request from 'supertest';
import app from '../src/app';
import prisma from '../src/config/prisma';
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { signToken, verifyToken, JwtPayload } from '../src/utils/jwt';

// Mock Prisma Client for Unit Tests
jest.mock('../src/config/prisma', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    $disconnect: jest.fn(),
  },
}));

describe('Auth Module & JWT Unit Tests', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Health Check Endpoint', () => {
    it('should return 200 OK on /api/health', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('OK');
    });
  });

  describe('JWT Utility', () => {
    it('should correctly sign and verify a JWT token with Role and Name', () => {
      const payload: JwtPayload = {
        id: 'user-123',
        name: 'Budi Santoso',
        email: 'budi@warehouse.com',
        role: Role.WAREHOUSE_MANAGER,
      };

      const token = signToken(payload);
      expect(typeof token).toBe('string');

      const decoded = verifyToken(token);
      expect(decoded.id).toBe(payload.id);
      expect(decoded.name).toBe(payload.name);
      expect(decoded.email).toBe(payload.email);
      expect(decoded.role).toBe(payload.role);
    });
  });

  describe('POST /api/auth/register (Zod Validation & Registration)', () => {
    it('should fail validation with 422 when required fields are missing', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({});

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toBeDefined();
    });

    it('should fail validation when password is shorter than 6 characters', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Agus',
          email: 'agus@warehouse.com',
          password: '123',
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });

    it('should register a new warehouse staff successfully', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: 'user-staff-uuid-1',
        name: 'Agus Prasetyo',
        email: 'agus@warehouse.com',
        role: Role.WAREHOUSE_STAFF,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Agus Prasetyo',
          email: 'agus@warehouse.com',
          password: 'password123',
          role: 'WAREHOUSE_STAFF',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('agus@warehouse.com');
      expect(res.body.data.user.role).toBe(Role.WAREHOUSE_STAFF);
      expect(res.body.data.token).toBeDefined();
    });
  });

  describe('POST /api/auth/login', () => {
    it('should fail login if email is not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'unknown@warehouse.com',
          password: 'password123',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should login successfully with valid credentials', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-manager-uuid-1',
        name: 'Budi Santoso',
        email: 'manager@warehouse.com',
        password: hashedPassword,
        role: Role.WAREHOUSE_MANAGER,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'manager@warehouse.com',
          password: 'password123',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.email).toBe('manager@warehouse.com');
      expect(res.body.data.user.role).toBe(Role.WAREHOUSE_MANAGER);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should reject request without Bearer token', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return profile when valid token provided', async () => {
      const token = signToken({
        id: 'user-staff-uuid-1',
        name: 'Agus Prasetyo',
        email: 'staff@warehouse.com',
        role: Role.WAREHOUSE_STAFF,
      });

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-staff-uuid-1',
        name: 'Agus Prasetyo',
        email: 'staff@warehouse.com',
        role: Role.WAREHOUSE_STAFF,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('staff@warehouse.com');
      expect(res.body.data.role).toBe(Role.WAREHOUSE_STAFF);
    });
  });
});
