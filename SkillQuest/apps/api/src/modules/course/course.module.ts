/**
 * Course Module — 课程 + 关卡 + 题目管理 + 文档导入 (MinerU 2.5)
 */

import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CourseService } from './course.service';
import { CourseController } from './course.controller';
import { PrismaService } from '../../prisma.service';
import { DocumentParserService } from './document-parser.service';
import { AiGeneratorService } from './ai-generator.service';
import { MineruBridgeService } from './mineru-bridge.service';

@Module({
  imports: [
    MulterModule.register({ storage: memoryStorage() }),
  ],
  providers: [
    CourseService,
    PrismaService,
    DocumentParserService,
    AiGeneratorService,
    MineruBridgeService,
  ],
  controllers: [CourseController],
  exports: [CourseService],
})
export class CourseModule {}
