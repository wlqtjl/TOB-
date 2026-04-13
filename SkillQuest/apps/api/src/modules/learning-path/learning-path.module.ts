/**
 * Learning Path Module — 学习路径 + 个性化推荐
 */

import { Module } from '@nestjs/common';
import { LearningPathService } from './learning-path.service';
import { LearningPathController } from './learning-path.controller';
import { PrismaService } from '../../prisma.service';

@Module({
  providers: [LearningPathService, PrismaService],
  controllers: [LearningPathController],
  exports: [LearningPathService],
})
export class LearningPathModule {}
