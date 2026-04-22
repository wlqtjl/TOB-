/**
 * Spark Controller — 3DGS reconstruction & scene management REST API
 *
 * Routes:
 *   POST   /spark/reconstruct            — start 3DGS reconstruction job
 *   GET    /spark/reconstruct/:jobId     — get job status
 *   GET    /spark/lod_status/:jobId      — get LoD streaming status
 *   GET    /spark/scenes                 — list scenes
 *   GET    /spark/scenes/:sceneId/hotspots — list hotspots
 *   PATCH  /spark/scenes/:sceneId/hotspots — upsert hotspots
 *   DELETE /spark/scenes/:sceneId/hotspots/:hotspotId — delete hotspot
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { TenantGuard } from '../auth/tenant.guard';
import { SparkService } from './spark.service';
import type { SparkHotspot } from '@skillquest/types';

interface AuthedRequest {
  user: { sub: string };
  tenantId: string;
}

@Controller('spark')
@UseGuards(AuthGuard, TenantGuard)
export class SparkController {
  constructor(private readonly spark: SparkService) {}

  // ── Reconstruction ───────────────────────────────────────────────────

  @Post('reconstruct')
  startReconstruct(
    @Req() req: AuthedRequest,
    @Body() body: { sceneName: string; photoCount: number },
  ) {
    const { sceneName, photoCount } = body;
    if (!sceneName || typeof photoCount !== 'number' || photoCount < 1 || photoCount > 500) {
      throw new BadRequestException('sceneName required, photoCount must be 1-500');
    }
    const job = this.spark.createReconstructJob(req.tenantId, sceneName, photoCount);
    return { jobId: job.id, status: job.status, estimatedSeconds: Math.ceil(photoCount * 0.08) };
  }

  @Get('reconstruct/:jobId')
  getJobStatus(@Param('jobId') jobId: string) {
    return this.spark.getJob(jobId);
  }

  @Get('lod_status/:jobId')
  getLodStatus(@Param('jobId') jobId: string) {
    return this.spark.getLodStatus(jobId);
  }

  // ── Scenes ───────────────────────────────────────────────────────────

  @Get('scenes')
  listScenes(@Req() req: AuthedRequest) {
    return this.spark.listScenes(req.tenantId);
  }

  @Get('scenes/:sceneId')
  getScene(@Param('sceneId') sceneId: string) {
    return this.spark.getScene(sceneId);
  }

  // ── Hotspots ─────────────────────────────────────────────────────────

  @Get('scenes/:sceneId/hotspots')
  listHotspots(@Param('sceneId') sceneId: string) {
    return this.spark.listHotspots(sceneId);
  }

  @Patch('scenes/:sceneId/hotspots')
  upsertHotspots(
    @Param('sceneId') sceneId: string,
    @Body() body: { hotspots: SparkHotspot[] },
  ) {
    if (!Array.isArray(body?.hotspots)) {
      throw new BadRequestException('hotspots array required');
    }
    return this.spark.upsertHotspots(sceneId, body.hotspots);
  }

  @Delete('scenes/:sceneId/hotspots/:hotspotId')
  deleteHotspot(@Param('sceneId') sceneId: string, @Param('hotspotId') hotspotId: string) {
    this.spark.deleteHotspot(sceneId, hotspotId);
    return { success: true };
  }
}
