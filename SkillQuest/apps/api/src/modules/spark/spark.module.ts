/**
 * Spark Module — 3DGS reconstruction & scene management
 */

import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SparkService } from './spark.service';
import { SparkController } from './spark.controller';

@Module({
  imports: [AuthModule],
  providers: [SparkService],
  controllers: [SparkController],
  exports: [SparkService],
})
export class SparkModule {}
