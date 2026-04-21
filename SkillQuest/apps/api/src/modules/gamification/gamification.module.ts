/**
 * Gamification Module — 段位 / 每日任务 / AI 导师 / Boss 关结算
 *
 * 对外暴露 /gamification/* 路由，供前端 BossHealthBar / RankBadge / DailyQuests / TutorBubble 消费。
 */

import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { AuthModule } from '../auth/auth.module';
import { AIModule } from '../ai/ai.module';

import { RankService } from './rank.service';
import { DailyQuestService } from './daily-quest.service';
import { AiTutorService } from './ai-tutor.service';
import { BossService } from './boss.service';
import { GamificationController } from './gamification.controller';

@Module({
  imports: [AuthModule, AIModule],
  providers: [PrismaService, RankService, DailyQuestService, AiTutorService, BossService],
  controllers: [GamificationController],
  exports: [RankService, DailyQuestService, AiTutorService, BossService],
})
export class GamificationModule {}
