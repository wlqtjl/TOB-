/**
 * AI Budget Service — AI 使用量追踪 + 预算控制
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class AIBudgetService {
  constructor(private readonly prisma: PrismaService) {}

  /** 获取租户预算 */
  async getBudget(tenantId: string) {
    const budget = await this.prisma.aIBudget.upsert({
      where: { tenantId },
      update: {},
      create: { tenantId },
    });
    const usagePercent = budget.monthlyBudgetUsd > 0
      ? Math.round((budget.currentSpendUsd / budget.monthlyBudgetUsd) * 100)
      : 0;
    return { ...budget, usagePercent };
  }

  /** 记录 AI 使用 */
  async recordUsage(data: { tenantId: string; userId: string; api: string; inputTokens: number; outputTokens: number; costUsd: number; modelVersion?: string }) {
    await this.prisma.aIUsageLog.create({
      data: {
        tenantId: data.tenantId,
        userId: data.userId,
        api: data.api,
        inputTokens: data.inputTokens,
        outputTokens: data.outputTokens,
        costUsd: data.costUsd,
        modelVersion: data.modelVersion ?? '',
      },
    });
    await this.prisma.aIBudget.upsert({
      where: { tenantId: data.tenantId },
      update: { currentSpendUsd: { increment: data.costUsd } },
      create: { tenantId: data.tenantId, currentSpendUsd: data.costUsd },
    });
    return { recorded: true };
  }

  /** 检查预算 */
  async checkBudget(tenantId: string) {
    const budget = await this.getBudget(tenantId);
    return {
      allowed: budget.currentSpendUsd < budget.monthlyBudgetUsd,
      usagePercent: budget.usagePercent,
      remaining: Math.max(0, budget.monthlyBudgetUsd - budget.currentSpendUsd),
    };
  }

  /** 获取使用历史 */
  async getUsageHistory(tenantId: string, days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    return this.prisma.aIUsageLog.findMany({
      where: { tenantId, createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** 更新预算 */
  async updateBudget(tenantId: string, monthlyBudgetUsd: number) {
    return this.prisma.aIBudget.upsert({
      where: { tenantId },
      update: { monthlyBudgetUsd },
      create: { tenantId, monthlyBudgetUsd },
    });
  }
}
