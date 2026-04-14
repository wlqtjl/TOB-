/**
 * Leaderboard Controller — REST API
 */

import { Controller, Get, Post, Param, Query, Body, UseGuards } from '@nestjs/common';
import { LeaderboardService } from './leaderboard.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('leaderboard')
@UseGuards(AuthGuard)
export class LeaderboardController {
  constructor(private readonly leaderboard: LeaderboardService) {}

  /** 获取课程排行榜 */
  @Get(':courseId')
  getLeaderboard(
    @Param('courseId') courseId: string,
    @Query('limit') limit?: string,
  ) {
    return this.leaderboard.getLeaderboard(courseId, limit ? parseInt(limit, 10) : 20);
  }

  /** 提交分数 */
  @Post(':courseId/submit')
  submitScore(
    @Param('courseId') courseId: string,
    @Body() body: { userId: string; score: number },
  ) {
    return this.leaderboard.submitScore(courseId, body.userId, body.score);
  }

  /** 获取用户排名 */
  @Get(':courseId/rank/:userId')
  getUserRank(
    @Param('courseId') courseId: string,
    @Param('userId') userId: string,
  ) {
    return this.leaderboard.getUserRank(courseId, userId);
  }
}
