/**
 * AI Module — 统一 AI 模型接入与设置管理
 */

import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { UnifiedAIService } from './unified-ai.service';
import { AISettingsService } from './ai-settings.service';
import { AISettingsController } from './ai-settings.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [PrismaService, UnifiedAIService, AISettingsService],
  controllers: [AISettingsController],
  exports: [UnifiedAIService, AISettingsService],
})
export class AIModule {}
