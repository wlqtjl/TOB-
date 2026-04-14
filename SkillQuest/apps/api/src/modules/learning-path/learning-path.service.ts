/**
 * Learning Path Service — 课程组 + 学习路径 + 用户档案
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class LearningPathService {
  constructor(private readonly prisma: PrismaService) {}

  /** 获取课程组列表 */
  async getCourseGroups(tenantId: string) {
    return this.prisma.courseGroup.findMany({
      where: { tenantId },
      orderBy: { sortOrder: 'asc' },
      include: { learningPaths: { select: { id: true } } },
    });
  }

  /** 创建课程组 */
  async createCourseGroup(data: { tenantId: string; name: string; description?: string; targetRole?: string; courseDag?: unknown; difficulty?: string }) {
    return this.prisma.courseGroup.create({
      data: {
        tenantId: data.tenantId,
        name: data.name,
        description: data.description ?? '',
        targetRole: data.targetRole ?? 'all',
        courseDag: (data.courseDag ?? []) as object,
        difficulty: data.difficulty ?? 'normal',
      },
    });
  }

  /** 获取用户学习路径 */
  async getUserLearningPaths(userId: string) {
    return this.prisma.learningPath.findMany({
      where: { userId },
      include: { courseGroup: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /** 开始学习路径 */
  async startLearningPath(userId: string, courseGroupId: string) {
    return this.prisma.learningPath.upsert({
      where: { userId_courseGroupId: { userId, courseGroupId } },
      update: { updatedAt: new Date() },
      create: { userId, courseGroupId },
      include: { courseGroup: true },
    });
  }

  /** 获取个性化推荐 */
  async getRecommendations(userId: string) {
    const profile = await this.prisma.userProfile.findUnique({ where: { userId } });
    const completedCourses = await this.prisma.userProgress.findMany({
      where: { userId, status: 'PASSED' },
      select: { level: { select: { courseId: true } } },
    });

    const completedCourseIds = new Set(completedCourses.map((p: { level: { courseId: string } }) => p.level.courseId));
    const courses = await this.prisma.course.findMany({ take: 20 });

    return courses
      .filter((c: { id: string }) => !completedCourseIds.has(c.id))
      .slice(0, 5)
      .map((c: { id: string; title: string }, i: number) => ({
        courseId: c.id,
        courseTitle: c.title,
        reason: profile?.jobRole === 'sales' ? 'Recommended for sales role' : 'Based on your learning history',
        priority: i + 1,
        matchScore: Math.round((0.95 - i * 0.1) * 100) / 100,
      }));
  }

  /** 获取用户档案 */
  async getUserProfile(userId: string) {
    return this.prisma.userProfile.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
  }

  /** 更新用户档案 */
  async updateUserProfile(userId: string, data: { jobRole?: string; department?: string; experienceLevel?: string; company?: string; bio?: string }) {
    return this.prisma.userProfile.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
    });
  }
}
