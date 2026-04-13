/**
 * Badge Controller — 徽章 + 等级 API
 */

import { Controller, Get, Post, Param } from '@nestjs/common';
import { BadgeService } from './badge.service';

@Controller('badges')
export class BadgeController {
  constructor(private readonly badges: BadgeService) {}

  /** 获取所有徽章 */
  @Get()
  getAllBadges() {
    return this.badges.getAllBadges();
  }

  /** 获取用户徽章 */
  @Get('user/:userId')
  getUserBadges(@Param('userId') userId: string) {
    return this.badges.getUserBadges(userId);
  }

  /** 检查并授予徽章 */
  @Post('check/:userId')
  checkAndAwardBadges(@Param('userId') userId: string) {
    return this.badges.checkAndAwardBadges(userId);
  }

  /** 获取玩家等级 */
  @Get('level/:userId')
  getPlayerLevel(@Param('userId') userId: string) {
    return this.badges.getPlayerLevel(userId);
  }

  /** 初始化默认徽章 */
  @Post('seed')
  seedDefaultBadges() {
    return this.badges.seedDefaultBadges();
  }
}
