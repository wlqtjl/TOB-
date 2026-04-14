/**
 * Course Controller — 课程、关卡、地图、进度 API
 */

import {
  Controller, Get, Post, Param, Query, Body,
  UseInterceptors, UploadedFile, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CourseService } from './course.service';
import { CreateCourseDto, CreateLevelDto } from './dto/course.dto';

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
  create(@Body() body: CreateCourseDto) {
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

  /** 获取关卡知识普及 (briefing) — 由 Level.preStory JSON 存储 */
  @Get(':courseId/briefing/:levelId')
  async getLevelBriefing(
    @Param('courseId') courseId: string,
    @Param('levelId') levelId: string,
  ) {
    const level = await this.courses.getLevel(levelId);
    if (!level) return null;
    // preStory field contains briefing data as JSON
    const preStory = (level as Record<string, unknown>).preStory;
    if (preStory && typeof preStory === 'object') return preStory;
    // Fallback: generate basic briefing from level metadata
    return {
      levelId: level.id,
      title: level.title,
      summary: level.description,
      knowledgePoints: [],
      objectives: [
        { text: `Complete ${level.title} with 60% or higher accuracy`, primary: true },
      ],
      gameTypeHint: level.type,
      estimatedMinutes: Math.ceil(level.timeLimitSec / 60),
      difficulty: 'beginner',
      tips: [],
    };
  }

  /** 获取关卡剧情 (narrative/preStory) */
  @Get('levels/:levelId/narrative')
  async getLevelNarrative(@Param('levelId') levelId: string) {
    const level = await this.courses.getLevel(levelId);
    if (!level) return null;
    const preStory = (level as Record<string, unknown>).preStory;
    if (preStory && typeof preStory === 'object' && 'channel' in (preStory as Record<string, unknown>)) {
      return preStory;
    }
    // Default narrative for levels without preStory
    return {
      channel: 'terminal',
      title: level.title,
      messages: [
        { role: 'System', text: `New training task: ${level.title}`, style: 'info' },
        { role: 'System', text: level.description || 'Complete this challenge to advance.', style: 'normal' },
      ],
      autoPlayDelayMs: 800,
    };
  }

  /** 创建关卡 */
  @Post(':courseId/levels')
  createLevel(
    @Param('courseId') courseId: string,
    @Body() body: CreateLevelDto,
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
   * POST /api/courses/import/analyze
   * 文档智能预览 — 上传文档并快速分析结构，无需完整 AI 生成
   * 返回: 标题层级、候选关卡类型分布、GPT-4o 提示词增强文本
   */
  @Post('import/analyze')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 30 * 1024 * 1024 }, // 30 MB
  }))
  async analyzeImport(
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (!file) throw new BadRequestException('请上传文档文件（file 字段）');
    const insights = await this.courses.analyzeImport({
      buffer: file.buffer,
      mimetype: file.mimetype,
      originalname: file.originalname,
    });
    if (!insights) {
      return {
        available: false,
        message: 'MinerU AI Engine 未启动，无法进行文档预览。请直接使用 /import 接口。',
      };
    }
    return { available: true, insights };
  }

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
