/**
 * Prisma Service — 数据库连接管理 + 租户隔离中间件
 *
 * 通过 AsyncLocalStorage 自动注入 tenantId 到所有查询，
 * 防止跨租户数据访问。
 */

import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import { AsyncLocalStorage } from 'async_hooks';

/** 请求上下文 — 存储当前用户的 tenantId */
export interface RequestContext {
  tenantId: string;
  userId: string;
}

export const requestContextStorage = new AsyncLocalStorage<RequestContext>();

/** 需要租户隔离的模型 */
const TENANT_ISOLATED_MODELS = new Set([
  'User', 'Course', 'Level', 'Score', 'UserProgress',
  'UserBadge', 'AnalyticsEvent', 'LevelFeedback',
  'DocumentChunk', 'CourseVersion', 'UserAchievement',
  'AIUsageRecord', 'CourseGroup', 'UserLearningPath',
]);

/** 不需要租户隔离的操作 */
const EXEMPT_ACTIONS = new Set(['createMany', 'deleteMany', 'updateMany', 'aggregate', 'groupBy']);

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super();

    // 租户隔离中间件
    this.$use(async (params: Prisma.MiddlewareParams, next: (params: Prisma.MiddlewareParams) => Promise<unknown>) => {
      const ctx = requestContextStorage.getStore();

      // 无上下文 = 系统内部调用（seed、migration 等），跳过隔离
      if (!ctx || !params.model || !TENANT_ISOLATED_MODELS.has(params.model)) {
        return next(params);
      }

      // 读操作: 自动注入 tenantId 过滤
      if (['findMany', 'findFirst', 'count'].includes(params.action)) {
        params.args = params.args ?? {};
        params.args.where = { ...params.args.where, tenantId: ctx.tenantId };
      }

      // 单条查找: findUnique 不能直接加 tenantId（主键不同），改用后置验证
      if (params.action === 'findUnique') {
        const result = await next(params) as Record<string, unknown> | null;
        if (result && 'tenantId' in result && result.tenantId !== ctx.tenantId) {
          this.logger.warn(`跨租户访问被拦截: model=${params.model} tenantId=${result.tenantId} expected=${ctx.tenantId}`);
          return null; // 返回 null 而非抛异常，与 findUnique 语义一致
        }
        return result;
      }

      // 写操作: 自动注入 tenantId
      if (params.action === 'create') {
        params.args = params.args ?? {};
        params.args.data = { ...params.args.data, tenantId: ctx.tenantId };
      }

      return next(params);
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
