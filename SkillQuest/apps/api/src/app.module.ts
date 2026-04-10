import { Module } from '@nestjs/common';
import { AuthModule } from './modules/auth/auth.module';
import { TenantModule } from './modules/tenant/tenant.module';
import { CourseModule } from './modules/course/course.module';
import { GameEngineModule } from './modules/game-engine/game-engine.module';
import { LeaderboardModule } from './modules/leaderboard/leaderboard.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';

@Module({
  imports: [
    AuthModule,
    TenantModule,
    CourseModule,
    GameEngineModule,
    LeaderboardModule,
    AnalyticsModule,
  ],
})
export class AppModule {}
