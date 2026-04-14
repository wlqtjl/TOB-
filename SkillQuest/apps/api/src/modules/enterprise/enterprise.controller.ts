/**
 * Enterprise Integration Controller — OAuth callbacks + webhook config
 */

import { Controller, Get, Post, Query, Body, Redirect } from '@nestjs/common';
import { EnterpriseService } from './enterprise.service';
import { Public } from '../../common/decorators/public.decorator';

@Controller('enterprise')
export class EnterpriseController {
  constructor(private readonly enterprise: EnterpriseService) {}

  /** Check which enterprise integrations are enabled */
  @Public()
  @Get('capabilities')
  getCapabilities() {
    return this.enterprise.getCapabilities();
  }

  // ─── WeChat Work OAuth ─────────────────────────────────────────────

  /** Initiate WeChat Work OAuth login */
  @Public()
  @Get('wechat/login')
  wechatLogin(@Query('state') state?: string) {
    const url = this.enterprise.getWechatOAuthUrl(state ?? 'login');
    if (!url) {
      return { error: 'WeChat Work integration not configured', enabled: false };
    }
    return { redirect: url };
  }

  /** WeChat Work OAuth callback */
  @Public()
  @Get('wechat/callback')
  async wechatCallback(@Query('code') code: string, @Query('state') state?: string) {
    if (!code) {
      return { error: 'Missing authorization code' };
    }
    const user = await this.enterprise.wechatCodeToUser(code);
    if (!user) {
      return { error: 'Failed to authenticate with WeChat Work' };
    }
    return { user, state: state ?? 'login' };
  }

  /** Send test notification to WeChat Work webhook */
  @Post('wechat/webhook/test')
  async wechatWebhookTest() {
    const ok = await this.enterprise.sendWechatWebhook(
      '### SkillQuest Test\n> This is a test notification from SkillQuest platform.',
    );
    return { sent: ok };
  }

  // ─── Feishu OAuth ──────────────────────────────────────────────────

  /** Initiate Feishu OAuth login */
  @Public()
  @Get('feishu/login')
  feishuLogin(@Query('state') state?: string) {
    const url = this.enterprise.getFeishuOAuthUrl(state ?? 'login');
    if (!url) {
      return { error: 'Feishu integration not configured', enabled: false };
    }
    return { redirect: url };
  }

  /** Feishu OAuth callback */
  @Public()
  @Get('feishu/callback')
  async feishuCallback(@Query('code') code: string, @Query('state') state?: string) {
    if (!code) {
      return { error: 'Missing authorization code' };
    }
    const user = await this.enterprise.feishuCodeToUser(code);
    if (!user) {
      return { error: 'Failed to authenticate with Feishu' };
    }
    return { user, state: state ?? 'login' };
  }

  /** Send test notification to Feishu webhook */
  @Post('feishu/webhook/test')
  async feishuWebhookTest() {
    const ok = await this.enterprise.sendFeishuWebhook(
      'SkillQuest Test',
      'This is a test notification from SkillQuest platform.',
    );
    return { sent: ok };
  }

  // ─── Unified Notification ──────────────────────────────────────────

  /** Manually trigger achievement notification */
  @Post('notify/achievement')
  async notifyAchievement(
    @Body() body: { userName: string; levelTitle: string; stars: number; score: number; achievement?: string },
  ) {
    return this.enterprise.notifyAchievement(body);
  }
}
