/**
 * Feedback Module — 学员反馈 + 课程质量
 */

import { Module } from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { FeedbackController } from './feedback.controller';
import { PrismaService } from '../../prisma.service';

@Module({
  providers: [FeedbackService, PrismaService],
  controllers: [FeedbackController],
  exports: [FeedbackService],
})
export class FeedbackModule {}
