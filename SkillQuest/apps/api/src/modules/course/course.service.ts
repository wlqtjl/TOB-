/**
 * Course Service — 课程、关卡、题目、进度、地图数据
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import type { LevelMapData, LevelMapNode, LevelMapEdge } from '@skillquest/types';

@Injectable()
export class CourseService {
  constructor(private readonly prisma: PrismaService) {}

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
    return levels.map((l) => ({ levelId: l.id, type: l.type, ...(l.content as object) }));
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
}
