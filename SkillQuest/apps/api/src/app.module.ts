import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { TenantModule } from './modules/tenant/tenant.module';
import { CourseModule } from './modules/course/course.module';
import { GameEngineModule } from './modules/game-engine/game-engine.module';
import { LeaderboardModule } from './modules/leaderboard/leaderboard.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { EnterpriseModule } from './modules/enterprise/enterprise.module';
import { BadgeModule } from './modules/badge/badge.module';
import { LearningPathModule } from './modules/learning-path/learning-path.module';
import { FeedbackModule } from './modules/feedback/feedback.module';
import { AIBudgetModule } from './modules/ai-budget/ai-budget.module';
import { AuditModule } from './modules/audit/audit.module';
import { HealthModule } from './modules/health/health.module';
import { MetricsModule } from './modules/metrics/metrics.module';
import { PrismaService } from './prisma.service';

@Module({
  imports: [
    // ── 环境变量 ──
    ConfigModule.forRoot({ isGlobal: true }),

    // ── 全局速率限制: 每分钟 60 次/IP ──
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]),

    AuthModule,
    TenantModule,
    CourseModule,
    GameEngineModule,
    LeaderboardModule,
    AnalyticsModule,
    EnterpriseModule,
    BadgeModule,
    LearningPathModule,
    FeedbackModule,
    AIBudgetModule,
    AuditModule,
    HealthModule,
    MetricsModule,
  ],
  providers: [
    PrismaService,
    // 全局速率限制守卫
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
  exports: [PrismaService],
})
export class AppModule {}
