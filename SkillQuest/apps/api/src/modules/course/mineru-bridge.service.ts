/**
 * MineruBridgeService — MinerU 2.5 Python 进程管理 + HTTP 桥接
 *
 * 职责:
 *   1. 以子进程方式启动 Python FastAPI 服务 (services/ai-engine)
 *   2. 健康检查 + 自动重启
 *   3. 提供 HTTP 客户端方法供 DocumentParserService 调用
 *   4. NestJS 生命周期管理 (启动/关闭)
 *
 * 设计原则:
 *   - "代码层面集成" — Python 服务作为 Node.js 的托管子进程，同部署
 *   - 延迟启动 — 首次解析请求时才启动 Python 进程 (节省资源)
 *   - 优雅降级 — Python 服务不可用时返回 null，由调用方 fallback
 *
 * 环境变量:
 *   AI_ENGINE_PORT     — Python 服务端口 (默认 8000)
 *   AI_ENGINE_HOST     — Python 服务地址 (默认 127.0.0.1)
 *   MINERU_ENABLED     — 是否启用 MinerU (默认 true)
 *   PYTHON_EXECUTABLE  — Python 解释器路径 (默认 python3)
 */

import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnApplicationShutdown,
} from '@nestjs/common';
import { ChildProcess, spawn } from 'child_process';
import * as http from 'http';
import * as path from 'path';

// ── 类型定义 ──────────────────────────────────────────────────────────

/** 解析请求超时 (5 分钟, 大文件 + OCR 需要较长时间) */
const PARSE_TIMEOUT_MS = 5 * 60 * 1_000;

export interface MineruParseResult {
  markdown: string;
  plain_text: string;
  images: Array<{ path: string; page: number; caption: string }>;
  tables: Array<{ html: string; page: number; caption: string }>;
  page_count: number;
  parser_used: string;
  metadata: Record<string, unknown>;
}

export interface MineruHealthResult {
  status: string;
  service: string;
  mineru_available: boolean;
  supported_formats: string[];
}

// ── Service ──────────────────────────────────────────────────────────

@Injectable()
export class MineruBridgeService implements OnModuleDestroy, OnApplicationShutdown {
  private readonly logger = new Logger(MineruBridgeService.name);
  private pythonProcess: ChildProcess | null = null;
  private starting = false;
  private ready = false;

  private readonly host: string;
  private readonly port: number;
  private readonly enabled: boolean;
  private readonly pythonExe: string;
  private readonly aiEnginePath: string;

  constructor() {
    this.host = process.env['AI_ENGINE_HOST'] ?? '127.0.0.1';
    this.port = parseInt(process.env['AI_ENGINE_PORT'] ?? '8000', 10);
    this.enabled = (process.env['MINERU_ENABLED'] ?? 'true').toLowerCase() !== 'false';
    this.pythonExe = process.env['PYTHON_EXECUTABLE'] ?? 'python3';

    // services/ai-engine 相对于 apps/api 的路径
    this.aiEnginePath = path.resolve(__dirname, '..', '..', '..', '..', 'services', 'ai-engine');
  }

  // ── 公共 API ──────────────────────────────────────────────────────

  /**
   * 是否启用 MinerU 解析
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * 解析文档 — 调用 Python AI Engine 的 /parse 端点
   *
   * @returns 解析结果，如果服务不可用返回 null
   */
  async parseDocument(
    buffer: Buffer,
    filename: string,
    mimetype: string,
  ): Promise<MineruParseResult | null> {
    if (!this.enabled) return null;

    // 确保 Python 服务已启动
    const ok = await this.ensureRunning();
    if (!ok) return null;

    try {
      return await this.callParse(buffer, filename, mimetype);
    } catch (err) {
      this.logger.warn(`MinerU 解析调用失败: ${(err as Error).message}`);
      return null;
    }
  }

  /**
   * 健康检查 — 获取 Python 服务状态和能力
   */
  async healthCheck(): Promise<MineruHealthResult | null> {
    try {
      const data = await this.httpGet('/health');
      return JSON.parse(data) as MineruHealthResult;
    } catch {
      return null;
    }
  }

  // ── Python 进程管理 ───────────────────────────────────────────────

  /**
   * 确保 Python 服务已启动并就绪
   */
  private async ensureRunning(): Promise<boolean> {
    if (this.ready) {
      // 快速健康检查
      const health = await this.healthCheck();
      if (health?.status === 'ok') return true;
      // 服务挂了，需要重启
      this.ready = false;
      this.logger.warn('Python AI Engine 无响应，尝试重启…');
    }

    if (this.starting) {
      // 等待另一个启动流程完成
      return this.waitForReady(30_000);
    }

    return this.startPythonProcess();
  }

  /**
   * 启动 Python FastAPI 进程
   */
  private async startPythonProcess(): Promise<boolean> {
    this.starting = true;

    try {
      // 杀掉残留进程
      this.killProcess();

      this.logger.log(`启动 AI Engine: ${this.pythonExe} main.py (${this.aiEnginePath})`);

      this.pythonProcess = spawn(
        this.pythonExe,
        ['main.py'],
        {
          cwd: this.aiEnginePath,
          env: {
            ...process.env,
            AI_ENGINE_HOST: this.host,
            AI_ENGINE_PORT: String(this.port),
            PYTHONUNBUFFERED: '1',
          },
          stdio: ['ignore', 'pipe', 'pipe'],
        },
      );

      // 转发 Python 日志
      this.pythonProcess.stdout?.on('data', (chunk: Buffer) => {
        const lines = chunk.toString().trim().split('\n');
        for (const line of lines) {
          this.logger.log(`[AI Engine] ${line}`);
        }
      });

      this.pythonProcess.stderr?.on('data', (chunk: Buffer) => {
        const lines = chunk.toString().trim().split('\n');
        for (const line of lines) {
          this.logger.warn(`[AI Engine] ${line}`);
        }
      });

      this.pythonProcess.on('exit', (code, signal) => {
        this.logger.warn(`AI Engine 进程退出: code=${code}, signal=${signal}`);
        this.ready = false;
        this.pythonProcess = null;
      });

      // 等待服务就绪 (最多 60 秒)
      const ok = await this.waitForReady(60_000);
      if (ok) {
        this.logger.log(`✅ AI Engine 已就绪 (http://${this.host}:${this.port})`);
      } else {
        this.logger.error('❌ AI Engine 启动超时');
      }
      return ok;
    } catch (err) {
      this.logger.error(`AI Engine 启动失败: ${(err as Error).message}`);
      return false;
    } finally {
      this.starting = false;
    }
  }

  /**
   * 等待 Python 服务健康检查通过
   */
  private async waitForReady(timeoutMs: number): Promise<boolean> {
    const start = Date.now();
    const interval = 500;

    while (Date.now() - start < timeoutMs) {
      const health = await this.healthCheck();
      if (health?.status === 'ok') {
        this.ready = true;
        return true;
      }
      await this.sleep(interval);
    }
    return false;
  }

  // ── HTTP 通信 ─────────────────────────────────────────────────────

  /**
   * 通过 multipart/form-data 调用 /parse 端点
   */
  private callParse(
    buffer: Buffer,
    filename: string,
    mimetype: string,
  ): Promise<MineruParseResult> {
    return new Promise((resolve, reject) => {
      const boundary = `----FormBoundary${Date.now().toString(36)}`;

      // 构建 multipart body
      const parts: Buffer[] = [];

      // file 字段
      parts.push(Buffer.from(
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="file"; filename="${filename}"\r\n` +
        `Content-Type: ${mimetype || 'application/octet-stream'}\r\n\r\n`,
      ));
      parts.push(buffer);
      parts.push(Buffer.from('\r\n'));

      // 结束标记
      parts.push(Buffer.from(`--${boundary}--\r\n`));

      const body = Buffer.concat(parts);

      const req = http.request(
        {
          hostname: this.host,
          port: this.port,
          path: '/parse',
          method: 'POST',
          headers: {
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
            'Content-Length': body.length,
          },
          timeout: PARSE_TIMEOUT_MS,
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (chunk: Buffer) => chunks.push(chunk));
          res.on('end', () => {
            const data = Buffer.concat(chunks).toString('utf-8');
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              try {
                resolve(JSON.parse(data) as MineruParseResult);
              } catch (e) {
                reject(new Error(`解析响应 JSON 失败: ${data.slice(0, 200)}`));
              }
            } else {
              reject(new Error(`AI Engine 返回 ${res.statusCode}: ${data.slice(0, 500)}`));
            }
          });
        },
      );

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`AI Engine 请求超时 (${PARSE_TIMEOUT_MS / 1_000} 秒)`));
      });

      req.write(body);
      req.end();
    });
  }

  /**
   * 简单的 HTTP GET 请求
   */
  private httpGet(urlPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const req = http.get(
        {
          hostname: this.host,
          port: this.port,
          path: urlPath,
          timeout: 5_000,
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (chunk: Buffer) => chunks.push(chunk));
          res.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
        },
      );
      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Health check timeout'));
      });
    });
  }

  // ── 生命周期 ──────────────────────────────────────────────────────

  async onModuleDestroy(): Promise<void> {
    this.killProcess();
  }

  async onApplicationShutdown(): Promise<void> {
    this.killProcess();
  }

  private killProcess(): void {
    if (this.pythonProcess) {
      this.logger.log('关闭 AI Engine 子进程…');
      this.pythonProcess.kill('SIGTERM');
      // 给 2 秒优雅关闭, 否则强杀
      setTimeout(() => {
        if (this.pythonProcess && !this.pythonProcess.killed) {
          this.pythonProcess.kill('SIGKILL');
        }
      }, 2_000);
      this.pythonProcess = null;
      this.ready = false;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
