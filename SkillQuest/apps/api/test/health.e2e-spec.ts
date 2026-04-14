/**
 * Health Endpoint Integration Test
 *
 * 验证 /health 端点在不依赖数据库时的基础行为。
 * 完整环境下需要数据库连接才能通过健康检查。
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { HealthModule } from '../src/modules/health/health.module';
import { PrismaService } from '../src/prisma.service';

describe('Health Endpoint (e2e)', () => {
  let app: INestApplication;

  const mockPrisma = {
    $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    $on: jest.fn(),
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $use: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [HealthModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health — 200 when database healthy', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.info).toHaveProperty('database');
    expect(res.body.info.database.status).toBe('up');
  });

  it('GET /health — 503 when database unreachable', async () => {
    mockPrisma.$queryRaw.mockRejectedValueOnce(new Error('Connection refused'));
    const res = await request(app.getHttpServer()).get('/health').expect(503);
    expect(res.body.status).toBe('error');
  });
});
