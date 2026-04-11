/**
 * Course Module — 课程 + 关卡 + 题目管理
 */

import { Module } from '@nestjs/common';
import { CourseService } from './course.service';
import { CourseController } from './course.controller';
import { PrismaService } from '../../prisma.service';

@Module({
  providers: [CourseService, PrismaService],
  controllers: [CourseController],
  exports: [CourseService],
})
export class CourseModule {}
