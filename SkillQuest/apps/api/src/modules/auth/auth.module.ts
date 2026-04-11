/**
 * Auth Module — JWT 认证 (注册/登录/守卫)
 */

import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { PrismaService } from '../../prisma.service';

@Module({
  providers: [AuthService, AuthGuard, PrismaService],
  controllers: [AuthController],
  exports: [AuthService, AuthGuard],
})
export class AuthModule {}
