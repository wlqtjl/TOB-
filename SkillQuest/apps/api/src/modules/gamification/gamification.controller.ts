/**
 * Gamification Controller — 游戏化相关 REST API
 *
 * 所有路由均挂在 /gamification 前缀下，统一需要 AuthGuard + TenantGuard。
 *
 * Routes:
 *   GET    /gamification/rank                    — 当前用户段位摘要
 *   GET    /gamification/rank/leaderboard        — 租户内段位排行榜
 *   GET    /gamification/daily-quest             — 当前用户的今日任务 (不存在则自动生成)
 *   POST   /gamification/daily-quest/:id/complete— 完成今日任务
 *   POST   /gamification/levels/:levelId/tutor-feedback — AI 导师点评
 *   POST   /gamification/levels/:levelId/boss-complete  — Boss 关通关结算
 */

import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { TenantGuard } from '../auth/tenant.guard';
import { RankService } from './rank.service';
import { DailyQuestService } from './daily-quest.service';
import { AiTutorService } from './ai-tutor.service';
import { BossService } from './boss.service';

interface AuthedRequest {
  user: { sub: string };
  tenantId: string;
}

@Controller('gamification')
@UseGuards(AuthGuard, TenantGuard)
export class GamificationController {
  constructor(
    private readonly rank: RankService,
    private readonly daily: DailyQuestService,
    private readonly tutor: AiTutorService,
    private readonly boss: BossService,
  ) {}

  // ── Rank ─────────────────────────────────────────────────────────

  @Get('rank')
  getRank(@Req() req: AuthedRequest) {
    return this.rank.getSummary(req.user.sub);
  }

  @Get('rank/leaderboard')
  getRankLeaderboard(
    @Req() req: AuthedRequest,
    @Query('limit') limit?: string,
  ) {
    const parsed = limit ? parseInt(limit, 10) : 50;
    return this.rank.getLeaderboard(req.tenantId, Number.isFinite(parsed) ? parsed : 50);
  }

  // ── Daily Quest ──────────────────────────────────────────────────

  @Get('daily-quest')
  getDailyQuest(@Req() req: AuthedRequest) {
    return this.daily.getToday(req.user.sub, req.tenantId);
  }

  @Post('daily-quest/:id/complete')
  completeDailyQuest(
    @Param('id') id: string,
    @Req() req: AuthedRequest,
    @Body() body: { stars?: number },
  ) {
    const stars = typeof body?.stars === 'number' ? body.stars : 0;
    return this.daily.complete(id, req.user.sub, stars);
  }

  // ── AI Tutor ─────────────────────────────────────────────────────

  @Post('levels/:levelId/tutor-feedback')
  getTutorFeedback(
    @Param('levelId') levelId: string,
    @Req() req: AuthedRequest,
    @Body()
    body: {
      correct?: number;
      total?: number;
      durationSec?: number;
      mistakes?: string[];
    },
  ) {
    const correct = Number(body?.correct ?? 0);
    const total = Number(body?.total ?? 0);
    if (!Number.isFinite(correct) || !Number.isFinite(total) || total <= 0) {
      throw new BadRequestException('需要提供正确的 correct 和 total (>0)');
    }
    return this.tutor.getFeedback({
      levelId,
      tenantId: req.tenantId,
      performance: {
        correct: Math.max(0, Math.min(total, Math.round(correct))),
        total: Math.round(total),
        durationSec: typeof body.durationSec === 'number' ? body.durationSec : undefined,
        mistakes: Array.isArray(body.mistakes) ? body.mistakes : undefined,
      },
    });
  }

  // ── Boss ─────────────────────────────────────────────────────────

  @Post('levels/:levelId/boss-complete')
  completeBoss(
    @Param('levelId') levelId: string,
    @Req() req: AuthedRequest,
    @Body() body: { accuracy?: number; timeRemainingRatio?: number },
  ) {
    const accuracy = Number(body?.accuracy ?? 0);
    if (!Number.isFinite(accuracy)) {
      throw new BadRequestException('accuracy 必须是数字');
    }
    return this.boss.complete({
      levelId,
      userId: req.user.sub,
      accuracy,
      timeRemainingRatio:
        typeof body?.timeRemainingRatio === 'number' ? body.timeRemainingRatio : undefined,
    });
  }
}
