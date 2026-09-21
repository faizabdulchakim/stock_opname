import request from 'supertest';
import app from '../src/app';
import prisma from '../src/config/prisma';
import bcrypt from 'bcryptjs';
import { signToken, verifyToken } from '../src/utils/jwt';

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

describe('Boilerplate Auth & Validation Tests', () => {
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
    it('should correctly sign and verify a JWT token', () => {
      const payload = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'ADMIN',
      };

      const token = signToken(payload);
      expect(typeof token).toBe('string');

      const decoded = verifyToken(token);
      expect(decoded.id).toBe(payload.id);
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
          name: 'Faiz',
          email: 'faiz@example.com',
          password: '123',
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });

    it('should register a new user successfully', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: 'user-uuid-1',
        name: 'Faiz Abdul',
        email: 'faiz@example.com',
        role: 'USER',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Faiz Abdul',
          email: 'faiz@example.com',
          password: 'password123',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('faiz@example.com');
      expect(res.body.data.token).toBeDefined();
    });
  });

  describe('POST /api/auth/login', () => {
    it('should fail login if email is not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'notfound@example.com',
          password: 'password123',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should login successfully with valid credentials', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-uuid-1',
        name: 'Faiz Abdul',
        email: 'faiz@example.com',
        password: hashedPassword,
        role: 'USER',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'faiz@example.com',
          password: 'password123',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.email).toBe('faiz@example.com');
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
        id: 'user-uuid-1',
        email: 'faiz@example.com',
        role: 'USER',
      });

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-uuid-1',
        name: 'Faiz Abdul',
        email: 'faiz@example.com',
        role: 'USER',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('faiz@example.com');
    });
  });
});
