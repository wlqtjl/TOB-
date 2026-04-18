/**
 * AI Settings Controller — AI 模型配置管理 API
 *
 * Endpoints:
 *   GET    /api/ai/providers         — 获取所有 Provider 状态（是否已配置 Key）
 *   GET    /api/ai/settings          — 获取当前租户 AI 设置
 *   PUT    /api/ai/settings          — 更新 AI 设置（选择生成器/校验器/动画模型）
 *   POST   /api/ai/key/:provider     — 写入 API Key（仅存 .env，不入库）
 *   POST   /api/ai/test/:provider    — 测试 Provider 连接
 */

import {
  Controller,
  Get,
  Put,
  Post,
  Param,
  Body,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { TenantGuard } from '../auth/tenant.guard';
import { AISettingsService, type AISettingsDto } from './ai-settings.service';
import { PROVIDER_KEYS, type ProviderKey } from './providers.config';

@Controller('ai')
@UseGuards(AuthGuard, TenantGuard, RolesGuard)
@Roles('ADMIN')
export class AISettingsController {
  constructor(private readonly aiSettings: AISettingsService) {}

  /** 获取所有 Provider 状态（是否已配置 Key） */
  @Get('providers')
  getProviders() {
    return this.aiSettings.getProviderStatuses();
  }

  /** 获取当前租户 AI 设置 */
  @Get('settings')
  getSettings(@Req() req: { tenantId: string }) {
    return this.aiSettings.getSettings(req.tenantId);
  }

  /** 更新 AI 设置 */
  @Put('settings')
  updateSettings(
    @Req() req: { tenantId: string },
    @Body() body: AISettingsDto,
  ) {
    this.validateProviderKey(body.generatorProvider);
    this.validateProviderKey(body.validatorProvider);
    if (body.animationProvider) {
      this.validateProviderKey(body.animationProvider);
    }
    return this.aiSettings.updateSettings(req.tenantId, body);
  }

  /** 写入 API Key */
  @Post('key/:provider')
  writeKey(
    @Param('provider') provider: string,
    @Body() body: { apiKey: string },
  ) {
    this.validateProviderKey(provider);
    if (!body.apiKey || typeof body.apiKey !== 'string' || body.apiKey.trim().length === 0) {
      throw new BadRequestException('apiKey 不能为空');
    }
    this.aiSettings.writeEnvKey(provider as ProviderKey, body.apiKey.trim());
    return { ok: true, message: `${provider} API Key 已配置` };
  }

  /** 测试 Provider 连接 */
  @Post('test/:provider')
  testConnection(@Param('provider') provider: string) {
    this.validateProviderKey(provider);
    return this.aiSettings.testConnection(provider as ProviderKey);
  }

  private validateProviderKey(key: string): void {
    if (!PROVIDER_KEYS.includes(key as ProviderKey)) {
      throw new BadRequestException(
        `无效的 Provider: ${key}。可选: ${PROVIDER_KEYS.join(', ')}`,
      );
    }
  }
}
