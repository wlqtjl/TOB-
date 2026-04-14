/**
 * Auth API Integration Tests
 *
 * 测试注册/登录/刷新 Token 流程，使用 mock PrismaService。
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AuthModule } from '../src/modules/auth/auth.module';
import { PrismaService } from '../src/prisma.service';

// 设置测试环境变量
process.env.JWT_SECRET = 'test-jwt-secret-that-is-at-least-32-characters-long';

describe('Auth API (e2e)', () => {
  let app: INestApplication;

  const mockTenant = {
    id: 'tenant-1',
    name: 'Test Corp',
    inviteCode: 'INVITE123',
    allowedDomains: '',
  };

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    passwordHash: '$2b$12$LJ3UlMfv.cN3V3b0OWW4huFkBQCOvbRkpVSiTY4tLdRHnY.tG9sGe', // "Password1"
    tenantId: 'tenant-1',
    role: 'LEARNER',
    displayName: 'Test User',
    avatarUrl: null,
    totalStars: 0,
    loginAttempts: 0,
    lockUntil: null,
  };

  const mockPrisma = {
    tenant: {
      findFirst: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    $on: jest.fn(),
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $use: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AuthModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /auth/register', () => {
    it('should reject invalid email', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'not-an-email', password: 'Password1' })
        .expect(400);
    });

    it('should reject weak password', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'user@test.com', password: '123' })
        .expect(400);
    });

    it('should reject extra fields (forbidNonWhitelisted)', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'user@test.com',
          password: 'Password1',
          tenantId: 'hacker-tenant', // 不允许自选 tenantId
          role: 'ADMIN',
        })
        .expect(400);
    });

    it('should register with valid invite code', async () => {
      mockPrisma.tenant.findFirst.mockResolvedValue(mockTenant);
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        ...mockUser,
        id: 'new-user-1',
        email: 'new@test.com',
      });

      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'new@test.com',
          password: 'StrongPass1',
          inviteCode: 'INVITE123',
        })
        .expect(201);

      expect(res.body).toHaveProperty('access_token');
      expect(res.body).toHaveProperty('refresh_token');
    });
  });

  describe('POST /auth/login', () => {
    it('should reject invalid email format', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'bad', password: 'pass' })
        .expect(400);
    });

    it('should return 401 for non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'nobody@test.com', password: 'Password1' })
        .expect(401);
    });
  });

  describe('GET /auth/me', () => {
    it('should reject unauthenticated request', async () => {
      await request(app.getHttpServer())
        .get('/auth/me')
        .expect(401);
    });
  });
});
