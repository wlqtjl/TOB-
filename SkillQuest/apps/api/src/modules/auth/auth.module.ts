/**
 * Auth Module — JWT 认证 (注册/登录/守卫)
 */

import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { RolesGuard } from './roles.guard';
import { TenantGuard } from './tenant.guard';
import { PrismaService } from '../../prisma.service';

@Module({
  providers: [AuthService, AuthGuard, RolesGuard, TenantGuard, PrismaService],
  controllers: [AuthController],
  exports: [AuthService, AuthGuard, RolesGuard, TenantGuard],
})
export class AuthModule {}
