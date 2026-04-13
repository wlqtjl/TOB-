/**
 * Learning Path Controller — 学习路径 API
 */

import { Controller, Get, Post, Patch, Param, Query, Body } from '@nestjs/common';
import { LearningPathService } from './learning-path.service';

@Controller('learning-paths')
export class LearningPathController {
  constructor(private readonly lp: LearningPathService) {}

  @Get('groups')
  getCourseGroups(@Query('tenantId') tenantId: string) {
    return this.lp.getCourseGroups(tenantId);
  }

  @Post('groups')
  createCourseGroup(@Body() body: { tenantId: string; name: string; description?: string; targetRole?: string; courseDag?: unknown; difficulty?: string }) {
    return this.lp.createCourseGroup(body);
  }

  @Get('user/:userId')
  getUserLearningPaths(@Param('userId') userId: string) {
    return this.lp.getUserLearningPaths(userId);
  }

  @Post('start')
  startLearningPath(@Body() body: { userId: string; courseGroupId: string }) {
    return this.lp.startLearningPath(body.userId, body.courseGroupId);
  }

  @Get('recommendations/:userId')
  getRecommendations(@Param('userId') userId: string) {
    return this.lp.getRecommendations(userId);
  }

  @Get('profile/:userId')
  getUserProfile(@Param('userId') userId: string) {
    return this.lp.getUserProfile(userId);
  }

  @Patch('profile/:userId')
  updateUserProfile(@Param('userId') userId: string, @Body() body: { jobRole?: string; department?: string; experienceLevel?: string; company?: string; bio?: string }) {
    return this.lp.updateUserProfile(userId, body);
  }
}
