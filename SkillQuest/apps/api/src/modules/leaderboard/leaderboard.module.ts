/**
 * Leaderboard Module — Redis Sorted Set 排行榜 + WebSocket 实时推送
 *
 * 当 Redis 不可用时自动降级为内存排行榜。
 */

import { Module } from '@nestjs/common';
import { LeaderboardService } from './leaderboard.service';
import { LeaderboardController } from './leaderboard.controller';
import { LeaderboardGateway } from './leaderboard.gateway';
import { PrismaService } from '../../prisma.service';

@Module({
  providers: [LeaderboardService, LeaderboardGateway, PrismaService],
  controllers: [LeaderboardController],
  exports: [LeaderboardService],
})
export class LeaderboardModule {}
