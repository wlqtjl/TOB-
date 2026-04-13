/**
 * Badge Module — 徽章 + 等级系统
 */

import { Module } from '@nestjs/common';
import { BadgeService } from './badge.service';
import { BadgeController } from './badge.controller';
import { PrismaService } from '../../prisma.service';

@Module({
  providers: [BadgeService, PrismaService],
  controllers: [BadgeController],
  exports: [BadgeService],
})
export class BadgeModule {}
