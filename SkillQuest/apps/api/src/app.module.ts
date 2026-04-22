import { Module } from '@nestjs/common';
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
import { AIModule } from './modules/ai/ai.module';
import { GamificationModule } from './modules/gamification/gamification.module';
import { SparkModule } from './modules/spark/spark.module';
import { PrismaService } from './prisma.service';

@Module({
  imports: [
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
    AIModule,
    GamificationModule,
    SparkModule,
  ],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class AppModule {}
