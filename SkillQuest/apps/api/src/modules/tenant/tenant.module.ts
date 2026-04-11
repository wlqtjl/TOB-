/**
 * Tenant Module — 多租户管理
 */

import { Module } from '@nestjs/common';
import { TenantService } from './tenant.service';
import { TenantController } from './tenant.controller';
import { PrismaService } from '../../prisma.service';

@Module({
  providers: [TenantService, PrismaService],
  controllers: [TenantController],
  exports: [TenantService],
})
export class TenantModule {}
