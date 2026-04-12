/**
 * Course Service — 课程、关卡、题目、进度、地图数据
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import type { LevelMapData, LevelMapNode, LevelMapEdge } from '@skillquest/types';
import { DocumentParserService } from './document-parser.service';
import { AiGeneratorService, GeneratedLevel } from './ai-generator.service';
import { MineruBridgeService } from './mineru-bridge.service';
import type { DocumentInsights, ImageAnalysisResult, TopologyVisionResult } from './mineru-bridge.service';

/** 附加到 GPT-4o hint 中的最大表格数量 */
const MAX_TABLES_IN_HINT = 5;
/** 每个表格 HTML 截取的最大字符数 */
const MAX_TABLE_HTML_LENGTH = 500;
/** 直接生成的关卡最大占比 (总关卡的 1/3 — 其余由 GPT-4o 生成) */
const MAX_DIRECT_LEVELS_RATIO = 0.4;

// ─── 导入任务状态 (内存) ──────────────────────────────────────────

export type ImportJobStatus = 'pending' | 'parsing' | 'generating' | 'saving' | 'done' | 'error';

export interface ImportJob {
  jobId: string;
  status: ImportJobStatus;
  progress: number;  // 0-100
  message: string;
  courseId?: string;
  error?: string;
  createdAt: Date;
}

@Injectable()
export class CourseService {
  private readonly importJobs = new Map<string, ImportJob>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly docParser: DocumentParserService,
    private readonly aiGenerator: AiGeneratorService,
    private readonly mineruBridge: MineruBridgeService,
  ) {}

  // ─── 课程 CRUD ─────────────────────────────────────────────────

  async findAll(tenantId?: string) {
    const where = tenantId ? { tenantId } : {};
    const courses = await this.prisma.course.findMany({
      where,
      include: {
        levels: { orderBy: { sortOrder: 'asc' }, select: { id: true, title: true, type: true, sortOrder: true } },
        _count: { select: { levels: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return courses;
  }

  async findById(courseId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        levels: { orderBy: { sortOrder: 'asc' } },
      },
    });
    if (!course) throw new NotFoundException('课程不存在');
    return course;
  }

  async create(data: {
    tenantId: string;
    title: string;
    description: string;
    vendor: string;
    category: 'NETWORK' | 'VIRTUALIZATION' | 'STORAGE' | 'SECURITY' | 'CLOUD';
  }) {
    return this.prisma.course.create({ data });
  }

  // ─── 关卡管理 ──────────────────────────────────────────────────

  async getLevels(courseId: string) {
    return this.prisma.level.findMany({
      where: { courseId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async getLevel(levelId: string) {
    const level = await this.prisma.level.findUnique({ where: { id: levelId } });
    if (!level) throw new NotFoundException('关卡不存在');
    return level;
  }

  async createLevel(data: {
    courseId: string;
    sortOrder: number;
    title: string;
    type: 'QUIZ' | 'ORDERING' | 'MATCHING' | 'TOPOLOGY' | 'TERMINAL' | 'SCENARIO' | 'VM_PLACEMENT';
    description?: string;
    timeLimitSec?: number;
    prerequisites?: string[];
    positionX?: number;
    positionY?: number;
    content?: unknown;
  }) {
    return this.prisma.level.create({
      data: {
        courseId: data.courseId,
        sortOrder: data.sortOrder,
        title: data.title,
        type: data.type,
        description: data.description ?? '',
        timeLimitSec: data.timeLimitSec ?? 300,
        prerequisites: data.prerequisites ?? [],
        positionX: data.positionX ?? 0,
        positionY: data.positionY ?? 0,
        content: (data.content ?? {}) as object,
      },
    });
  }

  // ─── 游戏内容 (Play Content) ──────────────────────────────────

  async getPlayContent(levelId: string) {
    const level = await this.prisma.level.findUnique({
      where: { id: levelId },
      select: { id: true, type: true, title: true, content: true },
    });
    if (!level) throw new NotFoundException('关卡不存在');
    return level;
  }

  async getPlayContentByType(courseId: string, type: string) {
    const levelType = type.toUpperCase().replaceAll('-', '_');
    const level = await this.prisma.level.findFirst({
      where: { courseId, type: levelType as never },
      select: { id: true, type: true, title: true, content: true },
    });
    if (!level) throw new NotFoundException('未找到该类型关卡');
    return level;
  }

  // ─── 闯关地图数据 ─────────────────────────────────────────────

  async getMapData(courseId: string, userId?: string): Promise<LevelMapData> {
    const levels = await this.prisma.level.findMany({
      where: { courseId },
      orderBy: { sortOrder: 'asc' },
      include: userId
        ? { progress: { where: { userId }, take: 1 } }
        : undefined,
    });

    if (levels.length === 0) throw new NotFoundException('课程不存在或无关卡');

    type LevelRow = (typeof levels)[number];

    const nodes: LevelMapNode[] = levels.map((l: LevelRow) => {
      const prog = 'progress' in l ? (l.progress as Array<{ status: string; stars: number }>)?.[0] : undefined;
      const statusMap: Record<string, string> = {
        LOCKED: 'locked', UNLOCKED: 'unlocked', IN_PROGRESS: 'in_progress',
        PASSED: 'passed', FAILED: 'failed',
      };
      const typeMap: Record<string, string> = {
        QUIZ: 'quiz', ORDERING: 'ordering', MATCHING: 'matching',
        TOPOLOGY: 'topology', TERMINAL: 'terminal', SCENARIO: 'scenario',
        VM_PLACEMENT: 'vm_placement',
      };
      return {
        levelId: l.id,
        title: l.title,
        type: (typeMap[l.type] ?? 'quiz') as LevelMapNode['type'],
        status: (statusMap[prog?.status ?? 'UNLOCKED'] ?? 'unlocked') as LevelMapNode['status'],
        stars: (prog?.stars ?? 0) as 0 | 1 | 2 | 3,
        x: l.positionX,
        y: l.positionY,
      };
    });

    // Build edges from prerequisites
    const edges: LevelMapEdge[] = [];
    for (const level of levels) {
      for (const preId of level.prerequisites) {
        const fromNode = nodes.find((n) => n.levelId === preId);
        const toNode = nodes.find((n) => n.levelId === level.id);
        if (fromNode && toNode) {
          let particleState: LevelMapEdge['particleState'] = 'static';
          if (fromNode.status === 'passed' && toNode.status === 'passed') {
            particleState = 'flowing';
          } else if (fromNode.status === 'passed' && (toNode.status === 'unlocked' || toNode.status === 'in_progress')) {
            particleState = 'pulsing';
          }
          edges.push({ fromLevelId: preId, toLevelId: level.id, particleState });
        }
      }
    }

    return { courseId, nodes, edges };
  }

  // ─── 关卡题目 (Quiz Questions) ────────────────────────────────

  async getLevelQuestions(courseId: string) {
    const levels = await this.prisma.level.findMany({
      where: { courseId },
      select: { id: true, content: true, type: true },
      orderBy: { sortOrder: 'asc' },
    });
    return levels.map((l: { id: string; type: string; content: unknown }) => ({ levelId: l.id, type: l.type, ...(l.content as object) }));
  }

  // ─── 用户进度 ─────────────────────────────────────────────────

  async getUserProgress(userId: string, courseId: string) {
    return this.prisma.userProgress.findMany({
      where: { userId, level: { courseId } },
      include: { level: { select: { id: true, title: true, type: true, sortOrder: true } } },
    });
  }

  async updateProgress(userId: string, levelId: string, data: { status: 'LOCKED' | 'UNLOCKED' | 'IN_PROGRESS' | 'PASSED' | 'FAILED'; stars?: number; bestScore?: number }) {
    return this.prisma.userProgress.upsert({
      where: { userId_levelId: { userId, levelId } },
      update: {
        status: data.status,
        ...(data.stars !== undefined ? { stars: data.stars } : {}),
        ...(data.bestScore !== undefined ? { bestScore: data.bestScore } : {}),
        attempts: { increment: 1 },
      },
      create: {
        userId,
        levelId,
        status: data.status,
        stars: data.stars ?? 0,
        bestScore: data.bestScore ?? 0,
      },
    });
  }

  // ─── 文档导入 (Document → AI → Course) ───────────────────────────

  /** 查询导入任务状态 */
  getImportJob(jobId: string): ImportJob | undefined {
    return this.importJobs.get(jobId);
  }

  /**
   * 文档智能预览 — 快速分析文档结构，无需完整 AI 生成
   *
   * 返回文档的结构洞察供用户在正式导入前预览:
   *   - 标题层级
   *   - 候选关卡类型分布 (TERMINAL/MATCHING/ORDERING/TOPOLOGY/QUIZ)
   *   - 直接生成的关卡预估数量
   */
  async analyzeImport(params: {
    buffer: Buffer;
    mimetype: string;
    originalname: string;
  }): Promise<DocumentInsights | null> {
    return this.mineruBridge.analyzeDocument(
      params.buffer,
      params.originalname,
      params.mimetype,
    );
  }

  /**
   * 启动文档导入任务（异步，立即返回 jobId）
   * 调用方轮询 getImportJob(jobId) 查看进度
   */
  startImport(params: {
    buffer: Buffer;
    mimetype: string;
    originalname: string;
    tenantId: string;
    hint?: string;
  }): string {
    const jobId = `import-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const job: ImportJob = {
      jobId,
      status: 'pending',
      progress: 0,
      message: '任务已创建，等待开始…',
      createdAt: new Date(),
    };
    this.importJobs.set(jobId, job);

    // 异步执行，不 await
    void this.runImport(job, params);

    return jobId;
  }

  private async runImport(
    job: ImportJob,
    params: {
      buffer: Buffer;
      mimetype: string;
      originalname: string;
      tenantId: string;
      hint?: string;
    },
  ): Promise<void> {
    try {
      // ── 阶段 1: 文档解析 (MinerU 2.5 优先, 传统解析 fallback) ──────
      job.status = 'parsing';
      job.progress = 10;
      job.message = '📄 正在解析文档…（MinerU 2.5 智能分析中）';

      const structured = await this.docParser.extractStructured(
        params.buffer,
        params.mimetype,
        params.originalname,
      );

      job.progress = 20;
      job.message = `📄 文档解析完成 (${structured.parserUsed})`;

      // ── 阶段 2: 文档结构分析 — 零成本关卡线索提取 ─────────────────
      job.progress = 25;
      job.message = '🔍 正在分析文档结构（提取关卡线索）…';

      const insights = await this.mineruBridge.analyzeDocument(
        params.buffer,
        params.originalname,
        params.mimetype,
      );

      // ── 阶段 2b: 从提取的图片中识别拓扑图 (GPT-4o Vision) ──────────
      let topologyResults: TopologyVisionResult[] = [];
      const imagePaths = structured.images?.map((img) => img.path).filter(Boolean) ?? [];
      if (imagePaths.length > 0) {
        job.progress = 30;
        job.message = `🖼️ 正在识别文档图片中的网络拓扑图（${imagePaths.length} 张）…`;
        const imgAnalysis: ImageAnalysisResult | null = await this.mineruBridge.analyzeImages(imagePaths);
        if (imgAnalysis) {
          topologyResults = imgAnalysis.results.filter((r) => r.is_topology && (r.confidence ?? 0) >= 0.7);
          if (topologyResults.length > 0) {
            job.message += ` 发现 ${topologyResults.length} 张拓扑图！`;
          }
        }
      }

      // ── 阶段 3: GPT-4o 生成 (带结构洞察增强) ─────────────────────
      job.status = 'generating';
      job.progress = 40;
      job.message = '🤖 AI 正在生成课程内容…（约 30-60 秒）';

      // 构建增强提示词: 表格 + 结构洞察 + 拓扑图发现
      let enhancedHint = params.hint ?? '';

      // 附加结构洞察 → 引导 GPT-4o 生成正确的关卡类型
      if (insights?.gpt_hints) {
        enhancedHint += `\n\n${insights.gpt_hints}`;
      }

      // 附加表格内容（旧逻辑保留）
      if (structured.tables.length > 0) {
        const tablesSummary = structured.tables
          .slice(0, MAX_TABLES_IN_HINT)
          .map((t, i) => `表格 ${i + 1}: ${t.html.slice(0, MAX_TABLE_HTML_LENGTH)}`)
          .join('\n');
        enhancedHint += `\n\n[文档表格（共 ${structured.tables.length} 个）]\n${tablesSummary}`;
      }

      // 告知 GPT-4o 已有哪些关卡无需再生成
      if (topologyResults.length > 0) {
        enhancedHint += `\n\n[注意: 文档中已识别出 ${topologyResults.length} 个网络拓扑图，` +
          `将自动生成 TOPOLOGY 关卡，GPT-4o 无需再生成 TOPOLOGY 类型]`;
      }

      const textForAi = structured.markdown || structured.plainText;
      const chunks = this.docParser.splitIntoChunks(textForAi);

      const result = await this.aiGenerator.generateCourse(chunks, enhancedHint.trim() || undefined);

      // ── 阶段 4: 合并直接生成的关卡 ───────────────────────────────
      // 将拓扑图识别结果转换为 TOPOLOGY 关卡，追加到 AI 生成的关卡列表
      const allLevels = [...result.levels];
      const maxDirectLevels = Math.ceil(allLevels.length * MAX_DIRECT_LEVELS_RATIO);
      let directCount = 0;

      for (const topo of topologyResults) {
        if (directCount >= maxDirectLevels) break;
        const topoLevel = this.buildTopologyLevel(topo, allLevels.length + directCount + 1);
        if (topoLevel) {
          allLevels.push(topoLevel);
          directCount++;
        }
      }

      if (directCount > 0) {
        job.message = `🤖 AI 生成 ${result.levels.length} 个关卡 + 自动识别 ${directCount} 个拓扑关卡`;
      }

      // ── 阶段 5: 应用标题层级 → 前置依赖 DAG ─────────────────────
      const levelsWithPrereqs = this.applyPrerequisiteChain(allLevels, insights);

      // ── 阶段 6: 写入数据库 ───────────────────────────────────────
      job.status = 'saving';
      job.progress = 85;
      job.message = '💾 正在保存课程到数据库…';

      const course = await this.prisma.course.create({
        data: {
          tenantId: params.tenantId,
          title: result.title,
          description: result.description,
          vendor: result.vendor,
          category: result.category,
        },
      });

      for (const level of levelsWithPrereqs) {
        await this.prisma.level.create({
          data: {
            courseId: course.id,
            sortOrder: level.sortOrder,
            title: level.title,
            type: level.type,
            description: level.description,
            timeLimitSec: level.timeLimitSec,
            prerequisites: level.prerequisites,
            positionX: level.positionX,
            positionY: level.positionY,
            content: level.content as object,
          },
        });
      }

      job.status = 'done';
      job.progress = 100;
      job.message =
        `✅ 课程《${result.title}》已生成，共 ${levelsWithPrereqs.length} 个关卡` +
        ` (解析器: ${structured.parserUsed})`;
      job.courseId = course.id;
    } catch (err) {
      job.status = 'error';
      job.progress = 0;
      job.message = '❌ 生成失败';
      job.error = (err as Error).message;
    }
  }

  // ── 辅助: 拓扑图 Vision 结果 → TOPOLOGY 关卡 ──────────────────────

  private buildTopologyLevel(
    topo: TopologyVisionResult,
    sortOrder: number,
  ): GeneratedLevel | null {
    if (!topo.nodes || topo.nodes.length < 2) return null;

    const levelId = `vision-topology-${sortOrder}`;
    return {
      sortOrder,
      title: `网络拓扑: ${topo.key_concept ?? '拓扑连线'}`,
      type: 'TOPOLOGY' as const,
      description: topo.explanation ?? '根据网络拓扑图完成连线',
      timeLimitSec: 300,
      positionX: 0,
      positionY: 0,
      content: {
        id: levelId,
        levelId,
        type: 'topology',
        task: topo.task ?? '完成正确连线，使数据包能正常传输',
        nodes: topo.nodes,
        edges: topo.edges ?? [],
        correctConnections: topo.correctConnections ?? [],
        packetPath: topo.packetPath ?? [],
        explanation: topo.explanation ?? '',
      },
    };
  }

  // ── 辅助: 基于标题层级构建前置依赖链 ────────────────────────────

  /**
   * 利用 MinerU 分析出的标题层级为关卡设定前置依赖。
   * 当前使用简单线性策略（保持 UI 友好），前置依赖由 LevelStateMachine 管理。
   */
  private applyPrerequisiteChain(
    levels: GeneratedLevel[],
    _insights: DocumentInsights | null,
  ): Array<GeneratedLevel & { prerequisites: string[] }> {
    return levels.map((level) => ({
      ...level,
      prerequisites: [],
    }));
  }
}
