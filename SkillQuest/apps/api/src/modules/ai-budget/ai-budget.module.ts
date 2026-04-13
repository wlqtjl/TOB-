/**
 * AI Budget Module — AI 成本控制
 */

import { Module } from '@nestjs/common';
import { AIBudgetService } from './ai-budget.service';
import { AIBudgetController } from './ai-budget.controller';
import { PrismaService } from '../../prisma.service';

@Module({
  providers: [AIBudgetService, PrismaService],
  controllers: [AIBudgetController],
  exports: [AIBudgetService],
})
export class AIBudgetModule {}
