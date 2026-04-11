/**
 * Course Controller — 课程、关卡、地图、进度 API
 */

import {
  Controller, Get, Post, Param, Query, Body,
  UseInterceptors, UploadedFile, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CourseService } from './course.service';

@Controller('courses')
export class CourseController {
  constructor(private readonly courses: CourseService) {}

  /** 获取课程列表 */
  @Get()
  findAll(@Query('tenantId') tenantId?: string) {
    return this.courses.findAll(tenantId);
  }

  /** 获取课程详情 */
  @Get(':courseId')
  findById(@Param('courseId') courseId: string) {
    return this.courses.findById(courseId);
  }

  /** 创建课程 */
  @Post()
  create(
    @Body()
    body: {
      tenantId: string;
      title: string;
      description: string;
      vendor: string;
      category: 'NETWORK' | 'VIRTUALIZATION' | 'STORAGE' | 'SECURITY' | 'CLOUD';
    },
  ) {
    return this.courses.create(body);
  }

  /** 获取闯关地图数据 */
  @Get(':courseId/map')
  getMapData(
    @Param('courseId') courseId: string,
    @Query('userId') userId?: string,
  ) {
    return this.courses.getMapData(courseId, userId);
  }

  /** 获取关卡列表 */
  @Get(':courseId/levels')
  getLevels(@Param('courseId') courseId: string) {
    return this.courses.getLevels(courseId);
  }

  /** 获取关卡题目数据 */
  @Get(':courseId/questions')
  getLevelQuestions(@Param('courseId') courseId: string) {
    return this.courses.getLevelQuestions(courseId);
  }

  /** 按类型获取游戏内容 */
  @Get(':courseId/play/:type')
  getPlayContentByType(
    @Param('courseId') courseId: string,
    @Param('type') type: string,
  ) {
    return this.courses.getPlayContentByType(courseId, type);
  }

  /** 获取关卡详情/游戏内容 */
  @Get('levels/:levelId')
  getLevel(@Param('levelId') levelId: string) {
    return this.courses.getPlayContent(levelId);
  }

  /** 创建关卡 */
  @Post(':courseId/levels')
  createLevel(
    @Param('courseId') courseId: string,
    @Body()
    body: {
      sortOrder: number;
      title: string;
      type: 'QUIZ' | 'ORDERING' | 'MATCHING' | 'TOPOLOGY' | 'TERMINAL' | 'SCENARIO' | 'VM_PLACEMENT';
      description?: string;
      timeLimitSec?: number;
      prerequisites?: string[];
      positionX?: number;
      positionY?: number;
      content?: unknown;
    },
  ) {
    return this.courses.createLevel({ ...body, courseId });
  }

  /** 获取用户进度 */
  @Get(':courseId/progress/:userId')
  getUserProgress(
    @Param('courseId') courseId: string,
    @Param('userId') userId: string,
  ) {
    return this.courses.getUserProgress(userId, courseId);
  }

  /** 更新用户进度 */
  @Post(':courseId/progress/:userId/:levelId')
  updateProgress(
    @Param('userId') userId: string,
    @Param('levelId') levelId: string,
    @Body() body: { status: 'LOCKED' | 'UNLOCKED' | 'IN_PROGRESS' | 'PASSED' | 'FAILED'; stars?: number; bestScore?: number },
  ) {
    return this.courses.updateProgress(userId, levelId, body);
  }

  // ─── 文档导入 ─────────────────────────────────────────────────────

  /**
   * POST /api/courses/import
   * 接收文档文件（PDF / DOCX / TXT），启动 AI 课程生成任务
   * 表单字段: file (multipart), tenantId (text), hint (text, 可选)
   * 返回: { jobId }
   */
  @Post('import')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 30 * 1024 * 1024 }, // 30 MB
  }))
  startImport(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() body: { tenantId?: string; hint?: string },
  ) {
    if (!file) throw new BadRequestException('请上传文档文件（file 字段）');
    const tenantId = body.tenantId ?? 'default-tenant';
    const jobId = this.courses.startImport({
      buffer: file.buffer,
      mimetype: file.mimetype,
      originalname: file.originalname,
      tenantId,
      hint: body.hint,
    });
    return { jobId };
  }

  /**
   * GET /api/courses/import/status/:jobId
   * 轮询导入任务进度
   */
  @Get('import/status/:jobId')
  getImportStatus(@Param('jobId') jobId: string) {
    const job = this.courses.getImportJob(jobId);
    if (!job) throw new BadRequestException('任务不存在');
    return job;
  }
}
