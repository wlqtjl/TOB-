/**
 * Spark Service — 3DGS reconstruction pipeline & scene management
 *
 * In-memory storage (no Prisma):
 * - jobs: reconstruction pipeline state
 * - scenes: built-in 3 seed scenes (VMware legacy → migration → SmartX)
 * - hotspots: pre-seeded interactive hotspots for each scene
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  SparkReconstructJob,
  SparkScene,
  SparkHotspot,
  SparkJobStatus,
  SparkPhaseType,
} from '@skillquest/types';

@Injectable()
export class SparkService {
  private jobs = new Map<string, SparkReconstructJob>();
  private scenes = new Map<string, SparkScene>();
  private hotspots = new Map<string, SparkHotspot[]>();

  constructor() {
    this.seedScenes();
    this.seedHotspots();
  }

  // ── Reconstruction pipeline ──────────────────────────────────────────

  createReconstructJob(
    tenantId: string,
    sceneName: string,
    photoCount: number,
  ): SparkReconstructJob {
    const id = `job_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const now = new Date().toISOString();
    const job: SparkReconstructJob = {
      id,
      tenantId,
      sceneName,
      photoCount,
      status: 'queued',
      progress: 0,
      createdAt: now,
      updatedAt: now,
    };
    this.jobs.set(id, job);
    return job;
  }

  getJob(jobId: string): SparkReconstructJob {
    const job = this.jobs.get(jobId);
    if (!job) throw new NotFoundException(`Job ${jobId} not found`);

    // Simulate pipeline progression based on elapsed time
    const elapsed = Date.now() - new Date(job.createdAt).getTime();
    const elapsedSec = elapsed / 1000;

    let status: SparkJobStatus = 'queued';
    let progress = Math.min(100, elapsedSec * 12);

    if (elapsedSec < 2) {
      status = 'queued';
      progress = Math.min(progress, 10);
    } else if (elapsedSec < 5) {
      status = 'analyzing';
      progress = Math.min(progress, 30);
    } else if (elapsedSec < 8) {
      status = 'reconstructing';
      progress = Math.min(progress, 70);
    } else if (elapsedSec < 10) {
      status = 'streaming';
      progress = Math.min(progress, 95);
    } else {
      status = 'ready';
      progress = 100;
    }

    // Synthesize radUrl when ready
    if (status === 'ready' && !job.radUrl) {
      job.radUrl = `/assets/3dgs/${job.sceneName.toLowerCase().replace(/\s+/g, '-')}.rad`;
    }

    job.status = status;
    job.progress = progress;
    job.updatedAt = new Date().toISOString();
    this.jobs.set(jobId, job);

    return job;
  }

  getLodStatus(jobId: string) {
    const job = this.getJob(jobId);
    const lod = {
      level: job.progress >= 100 ? 3 : job.progress >= 70 ? 2 : 1,
      pointCount: Math.floor((job.photoCount * 50000 * job.progress) / 100),
      memoryMB: Math.floor((job.photoCount * 80 * job.progress) / 100),
    };
    return { jobId, status: job.status, progress: job.progress, radUrl: job.radUrl, lod };
  }

  // ── Scene management ─────────────────────────────────────────────────

  listScenes(tenantId: string): SparkScene[] {
    // For demo, return all built-in scenes (tenant-agnostic)
    return Array.from(this.scenes.values());
  }

  getScene(sceneId: string): SparkScene {
    const scene = this.scenes.get(sceneId);
    if (!scene) throw new NotFoundException(`Scene ${sceneId} not found`);
    return scene;
  }

  // ── Hotspot management ───────────────────────────────────────────────

  listHotspots(sceneId: string): SparkHotspot[] {
    return this.hotspots.get(sceneId) || [];
  }

  upsertHotspots(sceneId: string, hotspots: SparkHotspot[]): SparkHotspot[] {
    this.hotspots.set(sceneId, hotspots);
    return hotspots;
  }

  deleteHotspot(sceneId: string, hotspotId: string): void {
    const list = this.hotspots.get(sceneId) || [];
    this.hotspots.set(
      sceneId,
      list.filter((h) => h.id !== hotspotId),
    );
  }

  // ── Seed data ────────────────────────────────────────────────────────

  private seedScenes() {
    const now = new Date().toISOString();
    const scenes: SparkScene[] = [
      {
        id: 'vmware-legacy-room',
        name: 'VMware 传统机房',
        description: '老旧的 VMware 服务器机房，设备密集、布线杂乱',
        radUrl: null,
        procedural: true,
        phase: 'legacy',
        createdAt: now,
      },
      {
        id: 'migration-in-progress',
        name: 'V2V 迁移中',
        description: '数据从 vCenter 流向 CloudTower 的粒子流动画',
        radUrl: null,
        procedural: true,
        phase: 'migration',
        createdAt: now,
      },
      {
        id: 'smartx-minimal-rack',
        name: 'SmartX 精简机房',
        description: '三台机架合并为一台 SmartX HCI 节点',
        radUrl: null,
        procedural: true,
        phase: 'smartx',
        createdAt: now,
      },
    ];
    scenes.forEach((s) => this.scenes.set(s.id, s));
  }

  private seedHotspots() {
    const legacyHotspots: SparkHotspot[] = [
      {
        id: 'h-legacy-1',
        sceneId: 'vmware-legacy-room',
        position: { x: -2, y: 1.2, z: 3 },
        kind: 'pain-point',
        label: '陈旧存储阵列',
        description: 'IO 瓶颈：VMFS 磁盘组延迟 >20ms',
        payload: { question: 'VMware 传统存储的痛点是？', options: ['IO瓶颈', '扩展难', '许可证成本', '管理复杂'], correct: [0, 1, 2, 3] },
      },
      {
        id: 'h-legacy-2',
        sceneId: 'vmware-legacy-room',
        position: { x: 0, y: 1.5, z: -2 },
        kind: 'quiz',
        label: 'vCenter 控制台',
        description: '点击查看传统架构问题',
        payload: { question: 'vSphere 许可证按什么收费？', options: ['CPU核数', 'VM数量', '存储容量', 'vCenter实例'], correct: [0] },
      },
      {
        id: 'h-legacy-3',
        sceneId: 'vmware-legacy-room',
        position: { x: 3, y: 0.8, z: 0 },
        kind: 'info',
        label: '扩展瓶颈提示',
        description: '增加一台 ESXi 主机需要购买整套许可证，成本高昂',
      },
    ];

    const migrationHotspots: SparkHotspot[] = [
      {
        id: 'h-migration-1',
        sceneId: 'migration-in-progress',
        position: { x: -3, y: 2, z: 0 },
        kind: 'dragdrop',
        label: 'V2V 映射任务',
        description: '将 VMware 组件映射到 SmartX 对应项',
        payload: {
          pairs: [
            { from: 'VMFS Datastore', to: 'ZBS Volume' },
            { from: 'vMotion', to: 'ELF Live Migration' },
            { from: 'vCenter', to: 'CloudTower' },
            { from: 'ESXi Host', to: 'SMTX OS Node' },
          ],
        },
      },
      {
        id: 'h-migration-2',
        sceneId: 'migration-in-progress',
        position: { x: 0, y: 1.8, z: 2 },
        kind: 'info',
        label: '迁移进度监控',
        description: '当前进度：已迁移 8/12 台虚拟机',
      },
      {
        id: 'h-migration-3',
        sceneId: 'migration-in-progress',
        position: { x: 3, y: 1.2, z: -1 },
        kind: 'quiz',
        label: 'CloudTower API',
        description: '测试迁移知识',
        payload: { question: 'V2V 迁移中，存储数据如何同步？', options: ['实时镜像', '离线拷贝', '增量同步', '快照传输'], correct: [2] },
      },
    ];

    const smartxHotspots: SparkHotspot[] = [
      {
        id: 'h-smartx-1',
        sceneId: 'smartx-minimal-rack',
        position: { x: -1.5, y: 1.5, z: 2 },
        kind: 'comparison',
        label: 'IOPS 对比',
        description: '迁移前后性能对比',
        payload: { before: 12000, after: 68000, metric: 'IOPS' },
      },
      {
        id: 'h-smartx-2',
        sceneId: 'smartx-minimal-rack',
        position: { x: 0, y: 2, z: 0 },
        kind: 'info',
        label: 'SmartX HALO 节点',
        description: '单台 HALO 节点整合原三台机架资源',
      },
      {
        id: 'h-smartx-3',
        sceneId: 'smartx-minimal-rack',
        position: { x: 2, y: 1, z: -2 },
        kind: 'quiz',
        label: 'ZBS 性能测试',
        description: '验证替换成果',
        payload: { question: 'SmartX ZBS 相比 VMFS 的优势？', options: ['全闪架构', '三副本保护', 'EC纠删码', '原生NVMe'], correct: [0, 1, 2, 3] },
      },
      {
        id: 'h-smartx-4',
        sceneId: 'smartx-minimal-rack',
        position: { x: -2, y: 0.5, z: -1 },
        kind: 'info',
        label: '成本节省',
        description: '相比 VMware 方案，年度许可证成本节省 60%',
      },
    ];

    this.hotspots.set('vmware-legacy-room', legacyHotspots);
    this.hotspots.set('migration-in-progress', migrationHotspots);
    this.hotspots.set('smartx-minimal-rack', smartxHotspots);
  }
}
