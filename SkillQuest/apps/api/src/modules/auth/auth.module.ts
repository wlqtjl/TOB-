/**
 * Auth Module — JWT 认证 (注册/登录/守卫)
 *
 * 提供全局 AuthGuard — 所有路由默认需要认证，@Public() 豁免
 */

import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { PrismaService } from '../../prisma.service';
import { TenantContextMiddleware } from '../../common/middleware/tenant-context.middleware';

@Module({
  providers: [
    AuthService,
    AuthGuard,
    PrismaService,
    // 全局默认鉴权守卫
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
  controllers: [AuthController],
  exports: [AuthService, AuthGuard],
})
export class AuthModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantContextMiddleware).forRoutes('*');
  }
}
