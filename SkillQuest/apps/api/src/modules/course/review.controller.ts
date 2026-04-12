/**
 * ReviewController — Human-in-the-Loop 专家校验 API
 *
 * 端点:
 * - GET  /review/pending       获取待审核关卡列表
 * - GET  /review/:levelId      获取关卡审核详情 (含 RAG 原文对比)
 * - POST /review/:levelId/approve   通过审核
 * - POST /review/:levelId/reject    打回修改 (含反馈文字 → Negative Prompt)
 * - POST /review/:levelId/edit      手动修正题目内容
 *
 * 权限: ADMIN / TRAINER 角色
 */

import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

// ─── DTO ──────────────────────────────────────────────────────────

class RejectDto {
  feedback!: string;
}

class EditDto {
  content!: Record<string, unknown>;
  feedback?: string;
}

class PaginationQuery {
  page!: string;
  pageSize!: string;
}

// ─── Controller ───────────────────────────────────────────────────

@Controller('review')
export class ReviewController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 获取待审核的关卡列表
   */
  @Get('pending')
  async getPendingLevels(
    @Query('courseId') courseId?: string,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
  ) {
    const pageNum = Math.max(1, parseInt(page) || 1);
    const pageSizeNum = Math.min(100, Math.max(1, parseInt(pageSize) || 20));
    const skip = (pageNum - 1) * pageSizeNum;
    const take = pageSizeNum;

    const where: Record<string, unknown> = {
      reviewStatus: { in: ['PENDING', 'NEEDS_REVISION'] },
    };
    if (courseId) {
      where['courseId'] = courseId;
    }

    const [levels, total] = await Promise.all([
      this.prisma.level.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { course: { select: { title: true, vendor: true } } },
      }),
      this.prisma.level.count({ where }),
    ]);

    return {
      items: levels,
      total,
      page: pageNum,
      pageSize: pageSizeNum,
      hasMore: skip + take < total,
    };
  }

  /**
   * 获取关卡审核详情 (含 RAG 原文对比)
   */
  @Get(':levelId')
  async getReviewDetail(@Param('levelId') levelId: string) {
    const level = await this.prisma.level.findUniqueOrThrow({
      where: { id: levelId },
      include: { course: true },
    });

    // 获取关联的文档片段 (RAG source quotes)
    const sourceQuotes = level.sourceQuotes as Array<{
      chunkId: string;
      quote: string;
      chapterTitle: string;
      relevanceScore: number;
    }> ?? [];

    // 获取校验日志
    const validationLogs = await this.prisma.questionValidationLog.findMany({
      where: { levelId },
      orderBy: { round: 'asc' },
    });

    return {
      level,
      sourceQuotes,
      validationLogs,
      feedbackLog: level.feedbackLog ?? [],
    };
  }

  /**
   * 通过审核
   */
  @Post(':levelId/approve')
  async approve(
    @Param('levelId') levelId: string,
    @Query('reviewer') reviewer = 'admin',
  ) {
    const level = await this.prisma.level.findUniqueOrThrow({
      where: { id: levelId },
    });

    const feedbackLog = (level.feedbackLog as Array<Record<string, unknown>>) ?? [];
    feedbackLog.push({
      reviewer,
      action: 'approve',
      feedback: '',
      timestamp: new Date().toISOString(),
    });

    const updated = await this.prisma.level.update({
      where: { id: levelId },
      data: {
        reviewStatus: 'APPROVED',
        feedbackLog,
      },
    });

    return { success: true, level: updated };
  }

  /**
   * 打回修改
   * 反馈文字将作为下一轮 AI 生成的 Negative Prompt
   */
  @Post(':levelId/reject')
  async reject(
    @Param('levelId') levelId: string,
    @Body() dto: RejectDto,
    @Query('reviewer') reviewer = 'admin',
  ) {
    const level = await this.prisma.level.findUniqueOrThrow({
      where: { id: levelId },
    });

    const feedbackLog = (level.feedbackLog as Array<Record<string, unknown>>) ?? [];
    feedbackLog.push({
      reviewer,
      action: 'reject',
      feedback: dto.feedback,
      timestamp: new Date().toISOString(),
    });

    const updated = await this.prisma.level.update({
      where: { id: levelId },
      data: {
        reviewStatus: 'NEEDS_REVISION',
        feedbackLog,
      },
    });

    return { success: true, level: updated };
  }

  /**
   * 手动修正题目内容
   */
  @Post(':levelId/edit')
  async edit(
    @Param('levelId') levelId: string,
    @Body() dto: EditDto,
    @Query('reviewer') reviewer = 'admin',
  ) {
    const level = await this.prisma.level.findUniqueOrThrow({
      where: { id: levelId },
    });

    const feedbackLog = (level.feedbackLog as Array<Record<string, unknown>>) ?? [];
    feedbackLog.push({
      reviewer,
      action: 'edit',
      feedback: dto.feedback ?? '手动修正内容',
      timestamp: new Date().toISOString(),
    });

    const updated = await this.prisma.level.update({
      where: { id: levelId },
      data: {
        content: dto.content,
        reviewStatus: 'APPROVED',
        feedbackLog,
      },
    });

    return { success: true, level: updated };
  }
}
