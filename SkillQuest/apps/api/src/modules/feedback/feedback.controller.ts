/**
 * Feedback Controller — 学员反馈 API
 */

import { Controller, Get, Post, Param, Query, Body } from '@nestjs/common';
import { FeedbackService } from './feedback.service';

@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedback: FeedbackService) {}

  @Post()
  submitFeedback(@Body() body: { userId: string; levelId: string; difficultyRating?: number; clarityRating?: number; relevanceRating?: number; feedbackText?: string; tag?: string }) {
    return this.feedback.submitFeedback(body);
  }

  @Get('level/:levelId')
  getLevelFeedback(@Param('levelId') levelId: string) {
    return this.feedback.getLevelFeedback(levelId);
  }

  @Get('quality/:levelId')
  getLevelQualityMetrics(@Param('levelId') levelId: string) {
    return this.feedback.getLevelQualityMetrics(levelId);
  }

  @Get('review-queue')
  getReviewQueue(@Query('tenantId') tenantId?: string) {
    return this.feedback.getReviewQueue(tenantId);
  }
}
