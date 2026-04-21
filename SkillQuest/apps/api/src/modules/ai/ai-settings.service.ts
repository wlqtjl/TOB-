/**
 * AISettingsService — AI 设置管理 + API Key 安全写入
 *
 * - 管理各租户的 AI Provider 偏好（生成器、校验器、动画模型）
 * - API Key 绝不存入数据库，仅写入服务器 .env 文件并同步 process.env
 * - 提供连接测试能力
 */

import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../../prisma.service';
import { UnifiedAIService } from './unified-ai.service';
import { AI_PROVIDERS, PROVIDER_KEYS, type ProviderKey } from './providers.config';

// ─── Types ─────────────────────────────────────────────────────────────

export interface AISettingsDto {
  generatorProvider: ProviderKey;
  generatorModel?: string;
  validatorProvider: ProviderKey;
  validatorModel?: string;
  animationProvider?: ProviderKey;
  animationModel?: string;
}

export interface ProviderStatusInfo {
  key: ProviderKey;
  name: string;
  configured: boolean;
  defaultModel: string;
}

// ─── Service ──────────────────────────────────────────────────────────

@Injectable()
export class AISettingsService {
  private readonly logger = new Logger(AISettingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly unifiedAI: UnifiedAIService,
  ) {}

  // ─── Settings CRUD ─────────────────────────────────────────────────

  async getSettings(tenantId: string) {
    const settings = await this.prisma.aISettings.findUnique({
      where: { tenantId },
    });
    if (!settings) {
      // Return defaults
      return {
        tenantId,
        generatorProvider: 'openai' as ProviderKey,
        generatorModel: 'gpt-4o',
        validatorProvider: 'openai' as ProviderKey,
        validatorModel: 'gpt-4o-mini',
        animationProvider: 'gemini' as ProviderKey,
        animationModel: 'gemini-2.0-flash',
      };
    }
    return settings;
  }

  async updateSettings(tenantId: string, dto: AISettingsDto) {
    return this.prisma.aISettings.upsert({
      where: { tenantId },
      create: {
        tenantId,
        generatorProvider: dto.generatorProvider,
        generatorModel: dto.generatorModel ?? AI_PROVIDERS[dto.generatorProvider].defaultModel,
        validatorProvider: dto.validatorProvider,
        validatorModel: dto.validatorModel ?? AI_PROVIDERS[dto.validatorProvider].defaultModel,
        animationProvider: dto.animationProvider ?? 'gemini',
        animationModel: dto.animationModel ?? AI_PROVIDERS.gemini.defaultModel,
      },
      update: {
        generatorProvider: dto.generatorProvider,
        generatorModel: dto.generatorModel ?? AI_PROVIDERS[dto.generatorProvider].defaultModel,
        validatorProvider: dto.validatorProvider,
        validatorModel: dto.validatorModel ?? AI_PROVIDERS[dto.validatorProvider].defaultModel,
        animationProvider: dto.animationProvider ?? 'gemini',
        animationModel: dto.animationModel ?? AI_PROVIDERS.gemini.defaultModel,
      },
    });
  }

  // ─── Provider Status ───────────────────────────────────────────────

  getProviderStatuses(): ProviderStatusInfo[] {
    return PROVIDER_KEYS.map((key) => ({
      key,
      name: AI_PROVIDERS[key].name,
      configured: !!process.env[AI_PROVIDERS[key].envKey],
      defaultModel: AI_PROVIDERS[key].defaultModel,
    }));
  }

  // ─── API Key Management (env-only, never stored in DB) ─────────────

  /**
   * Writes an API key to the server .env file and syncs to process.env.
   * The key is never stored in the database.
   */
  async writeEnvKey(providerKey: ProviderKey, apiKey: string): Promise<void> {
    const config = AI_PROVIDERS[providerKey];
    const envVarName = config.envKey;

    // Update process.env immediately
    process.env[envVarName] = apiKey;

    // Persist to .env file
    const envPath = path.resolve(process.cwd(), '.env');
    try {
      let envContent = '';
      if (fs.existsSync(envPath)) {
        envContent = await fs.promises.readFile(envPath, 'utf-8');
      }

      const regex = new RegExp(`^${envVarName}=.*$`, 'm');
      const newLine = `${envVarName}=${apiKey}`;

      if (regex.test(envContent)) {
        envContent = envContent.replace(regex, newLine);
      } else {
        envContent = envContent.trimEnd() + '\n' + newLine + '\n';
      }

      await fs.promises.writeFile(envPath, envContent, 'utf-8');
      this.logger.log(`API Key for ${config.name} written to .env`);
    } catch (err) {
      this.logger.warn(`Failed to write .env file: ${(err as Error).message}. Key is set in process.env only.`);
    }
  }

  /**
   * Check if a provider has an API key configured.
   */
  isKeyConfigured(providerKey: ProviderKey): boolean {
    const config: (typeof AI_PROVIDERS)[ProviderKey] & { optionalApiKey?: boolean } =
      AI_PROVIDERS[providerKey];
    if (config.optionalApiKey) return true;
    return !!process.env[config.envKey];
  }

  // ─── Connection Test ───────────────────────────────────────────────

  async testConnection(providerKey: ProviderKey) {
    return this.unifiedAI.testConnection(providerKey);
  }
}
