/**
 * SkillQuest API — NestJS 后端入口
 *
 * 企业安全加固:
 * - CORS 白名单
 * - Helmet 安全头
 * - 全局 ValidationPipe (class-validator)
 * - Graceful Shutdown (SIGTERM/SIGINT)
 */

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  // ── 环境变量强校验 ──
  const requiredEnvVars = ['JWT_SECRET', 'DATABASE_URL'];
  for (const key of requiredEnvVars) {
    if (!process.env[key]) {
      throw new Error(`环境变量 ${key} 未设置！生产环境必须配置。`);
    }
  }
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET 长度至少 32 字符');
  }

  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  // ── 安全头 ──
  app.use(helmet());

  // ── CORS 白名单 ──
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
    : ['http://localhost:3000'];

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // ── 全局输入验证 ──
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  app.setGlobalPrefix('api');

  // ── Graceful Shutdown ──
  app.enableShutdownHooks();

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  logger.log(`SkillQuest API running on port ${port}`);
}

bootstrap();
