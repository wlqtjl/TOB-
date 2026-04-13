/**
 * AI Budget Controller — AI 成本控制 API
 */

import { Controller, Get, Post, Patch, Param, Query, Body } from '@nestjs/common';
import { AIBudgetService } from './ai-budget.service';

@Controller('ai-budget')
export class AIBudgetController {
  constructor(private readonly budget: AIBudgetService) {}

  @Get(':tenantId')
  getBudget(@Param('tenantId') tenantId: string) {
    return this.budget.getBudget(tenantId);
  }

  @Post('usage')
  recordUsage(@Body() body: { tenantId: string; userId: string; api: string; inputTokens: number; outputTokens: number; costUsd: number; modelVersion?: string }) {
    return this.budget.recordUsage(body);
  }

  @Get(':tenantId/check')
  checkBudget(@Param('tenantId') tenantId: string) {
    return this.budget.checkBudget(tenantId);
  }

  @Get(':tenantId/history')
  getUsageHistory(@Param('tenantId') tenantId: string, @Query('days') days?: string) {
    return this.budget.getUsageHistory(tenantId, days ? parseInt(days, 10) : 30);
  }

  @Patch(':tenantId')
  updateBudget(@Param('tenantId') tenantId: string, @Body() body: { monthlyBudgetUsd: number }) {
    return this.budget.updateBudget(tenantId, body.monthlyBudgetUsd);
  }
}
