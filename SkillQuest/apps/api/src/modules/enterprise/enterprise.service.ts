/**
 * Enterprise Integration Service — WeChat Work + Feishu OAuth & Webhooks
 *
 * Provides:
 * 1. WeChat Work (企业微信) OAuth 2.0 login flow
 * 2. Feishu (飞书) OAuth 2.0 login flow
 * 3. Webhook notifications (level completion, achievements)
 * 4. User directory sync
 *
 * All API keys are read from environment variables.
 * Service gracefully degrades when credentials are not configured.
 */

import { Injectable, Logger } from '@nestjs/common';

// ─── Configuration (from environment) ────────────────────────────────

interface WechatWorkConfig {
  corpId: string;
  agentId: string;
  secret: string;
  redirectUri: string;
  webhookUrl: string;
}

interface FeishuConfig {
  appId: string;
  appSecret: string;
  redirectUri: string;
  webhookUrl: string;
}

function loadWechatWorkConfig(): WechatWorkConfig | null {
  const corpId = process.env.WECHAT_WORK_CORP_ID ?? '';
  const secret = process.env.WECHAT_WORK_SECRET ?? '';
  if (!corpId || !secret) return null;
  return {
    corpId,
    agentId: process.env.WECHAT_WORK_AGENT_ID ?? '',
    secret,
    redirectUri: process.env.WECHAT_WORK_REDIRECT_URI ?? '',
    webhookUrl: process.env.WECHAT_WORK_WEBHOOK_URL ?? '',
  };
}

function loadFeishuConfig(): FeishuConfig | null {
  const appId = process.env.FEISHU_APP_ID ?? '';
  const appSecret = process.env.FEISHU_APP_SECRET ?? '';
  if (!appId || !appSecret) return null;
  return {
    appId,
    appSecret,
    redirectUri: process.env.FEISHU_REDIRECT_URI ?? '',
    webhookUrl: process.env.FEISHU_WEBHOOK_URL ?? '',
  };
}

// ─── Token cache ─────────────────────────────────────────────────────

interface CachedToken {
  token: string;
  expiresAt: number;
}

/** Buffer (ms) before token expiry to trigger refresh — 5 minutes */
const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;

// ─── Service ─────────────────────────────────────────────────────────

@Injectable()
export class EnterpriseService {
  private readonly logger = new Logger(EnterpriseService.name);
  private readonly wechatConfig: WechatWorkConfig | null;
  private readonly feishuConfig: FeishuConfig | null;
  private wechatToken: CachedToken | null = null;
  private feishuTenantToken: CachedToken | null = null;

  constructor() {
    this.wechatConfig = loadWechatWorkConfig();
    this.feishuConfig = loadFeishuConfig();

    if (this.wechatConfig) {
      this.logger.log('WeChat Work integration enabled');
    }
    if (this.feishuConfig) {
      this.logger.log('Feishu integration enabled');
    }
    if (!this.wechatConfig && !this.feishuConfig) {
      this.logger.warn('No enterprise integration configured — set WECHAT_WORK_* or FEISHU_* env vars');
    }
  }

  // ─── Capabilities ──────────────────────────────────────────────────

  getCapabilities() {
    return {
      wechatWork: {
        enabled: !!this.wechatConfig,
        oauth: !!this.wechatConfig,
        webhook: !!(this.wechatConfig?.webhookUrl),
      },
      feishu: {
        enabled: !!this.feishuConfig,
        oauth: !!this.feishuConfig,
        webhook: !!(this.feishuConfig?.webhookUrl),
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  // WeChat Work (企业微信)
  // ═══════════════════════════════════════════════════════════════════

  /** Generate WeChat Work OAuth authorization URL */
  getWechatOAuthUrl(state: string): string | null {
    if (!this.wechatConfig) return null;
    const { corpId, redirectUri, agentId } = this.wechatConfig;
    const encodedRedirect = encodeURIComponent(redirectUri);
    return (
      `https://open.weixin.qq.com/connect/oauth2/authorize` +
      `?appid=${corpId}` +
      `&redirect_uri=${encodedRedirect}` +
      `&response_type=code` +
      `&scope=snsapi_privateinfo` +
      `&state=${state}` +
      `&agentid=${agentId}` +
      `#wechat_redirect`
    );
  }

  /** Exchange authorization code for user identity */
  async wechatCodeToUser(code: string): Promise<{ userId: string; name: string; email: string; avatar: string } | null> {
    if (!this.wechatConfig) return null;

    try {
      const token = await this.getWechatAccessToken();
      if (!token) return null;

      // Step 1: Get user ID from code
      const userInfoRes = await fetch(
        `https://qyapi.weixin.qq.com/cgi-bin/auth/getuserinfo?access_token=${token}&code=${code}`,
      );
      const userInfo = (await userInfoRes.json()) as { errcode?: number; userid?: string; UserId?: string };

      if (userInfo.errcode && userInfo.errcode !== 0) {
        this.logger.error(`WeChat Work auth failed: ${JSON.stringify(userInfo)}`);
        return null;
      }

      const userId = userInfo.userid ?? userInfo.UserId ?? '';
      if (!userId) return null;

      // Step 2: Get user details
      const detailRes = await fetch(
        `https://qyapi.weixin.qq.com/cgi-bin/user/get?access_token=${token}&userid=${userId}`,
      );
      const detail = (await detailRes.json()) as {
        errcode?: number;
        name?: string;
        email?: string;
        avatar?: string;
      };

      return {
        userId,
        name: detail.name ?? userId,
        email: detail.email ?? '',
        avatar: detail.avatar ?? '',
      };
    } catch (err) {
      this.logger.error(`WeChat Work code exchange failed: ${(err as Error).message}`);
      return null;
    }
  }

  /** Send webhook notification to WeChat Work group */
  async sendWechatWebhook(content: string): Promise<boolean> {
    if (!this.wechatConfig?.webhookUrl) return false;

    try {
      const res = await fetch(this.wechatConfig.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          msgtype: 'markdown',
          markdown: { content },
        }),
      });
      return res.ok;
    } catch (err) {
      this.logger.error(`WeChat Work webhook failed: ${(err as Error).message}`);
      return false;
    }
  }

  /** Get or refresh WeChat Work access token */
  private async getWechatAccessToken(): Promise<string | null> {
    if (!this.wechatConfig) return null;

    // Return cached token if still valid (with 5-min buffer)
    if (this.wechatToken && this.wechatToken.expiresAt > Date.now() + TOKEN_REFRESH_BUFFER_MS) {
      return this.wechatToken.token;
    }

    try {
      const { corpId, secret } = this.wechatConfig;
      const res = await fetch(
        `https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${corpId}&corpsecret=${secret}`,
      );
      const data = (await res.json()) as { access_token?: string; expires_in?: number; errcode?: number };

      if (data.errcode && data.errcode !== 0) {
        this.logger.error(`WeChat Work token request failed: ${JSON.stringify(data)}`);
        return null;
      }

      if (data.access_token) {
        this.wechatToken = {
          token: data.access_token,
          expiresAt: Date.now() + (data.expires_in ?? 7200) * 1000,
        };
        return data.access_token;
      }
      return null;
    } catch (err) {
      this.logger.error(`WeChat Work token fetch failed: ${(err as Error).message}`);
      return null;
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // Feishu (飞书)
  // ═══════════════════════════════════════════════════════════════════

  /** Generate Feishu OAuth authorization URL */
  getFeishuOAuthUrl(state: string): string | null {
    if (!this.feishuConfig) return null;
    const { appId, redirectUri } = this.feishuConfig;
    const encodedRedirect = encodeURIComponent(redirectUri);
    return (
      `https://open.feishu.cn/open-apis/authen/v1/authorize` +
      `?app_id=${appId}` +
      `&redirect_uri=${encodedRedirect}` +
      `&state=${state}`
    );
  }

  /** Exchange authorization code for user identity */
  async feishuCodeToUser(code: string): Promise<{ userId: string; name: string; email: string; avatar: string } | null> {
    if (!this.feishuConfig) return null;

    try {
      const tenantToken = await this.getFeishuTenantToken();
      if (!tenantToken) return null;

      // Exchange code for user access token
      const tokenRes = await fetch('https://open.feishu.cn/open-apis/authen/v1/oidc/access_token', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tenantToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          grant_type: 'authorization_code',
          code,
        }),
      });
      const tokenData = (await tokenRes.json()) as {
        code?: number;
        data?: { access_token?: string; name?: string; en_name?: string; email?: string; avatar_url?: string; open_id?: string; user_id?: string };
      };

      if (tokenData.code !== 0 || !tokenData.data) {
        this.logger.error(`Feishu auth failed: ${JSON.stringify(tokenData)}`);
        return null;
      }

      const d = tokenData.data;
      return {
        userId: d.user_id ?? d.open_id ?? '',
        name: d.name ?? d.en_name ?? '',
        email: d.email ?? '',
        avatar: d.avatar_url ?? '',
      };
    } catch (err) {
      this.logger.error(`Feishu code exchange failed: ${(err as Error).message}`);
      return null;
    }
  }

  /** Send webhook notification to Feishu group */
  async sendFeishuWebhook(title: string, content: string): Promise<boolean> {
    if (!this.feishuConfig?.webhookUrl) return false;

    try {
      const res = await fetch(this.feishuConfig.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          msg_type: 'interactive',
          card: {
            header: { title: { tag: 'plain_text', content: title } },
            elements: [{ tag: 'markdown', content }],
          },
        }),
      });
      return res.ok;
    } catch (err) {
      this.logger.error(`Feishu webhook failed: ${(err as Error).message}`);
      return false;
    }
  }

  /** Get or refresh Feishu tenant access token */
  private async getFeishuTenantToken(): Promise<string | null> {
    if (!this.feishuConfig) return null;

    if (this.feishuTenantToken && this.feishuTenantToken.expiresAt > Date.now() + TOKEN_REFRESH_BUFFER_MS) {
      return this.feishuTenantToken.token;
    }

    try {
      const { appId, appSecret } = this.feishuConfig;
      const res = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
      });
      const data = (await res.json()) as { code?: number; tenant_access_token?: string; expire?: number };

      if (data.code !== 0) {
        this.logger.error(`Feishu tenant token request failed: ${JSON.stringify(data)}`);
        return null;
      }

      if (data.tenant_access_token) {
        this.feishuTenantToken = {
          token: data.tenant_access_token,
          expiresAt: Date.now() + (data.expire ?? 7200) * 1000,
        };
        return data.tenant_access_token;
      }
      return null;
    } catch (err) {
      this.logger.error(`Feishu tenant token fetch failed: ${(err as Error).message}`);
      return null;
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // Unified Notification System
  // ═══════════════════════════════════════════════════════════════════

  /** Send achievement/completion notification to all configured platforms */
  async notifyAchievement(params: {
    userName: string;
    levelTitle: string;
    stars: number;
    score: number;
    achievement?: string;
  }): Promise<{ wechat: boolean; feishu: boolean }> {
    const { userName, levelTitle, stars, score, achievement } = params;

    const starEmoji = Array.from({ length: stars }, () => '\u2B50').join('');
    const achievementText = achievement ? `\nAchievement: ${achievement}` : '';

    const wechatContent =
      `### Training Completion\n` +
      `**${userName}** completed **${levelTitle}**\n` +
      `> Score: ${score} ${starEmoji}${achievementText}`;

    const feishuContent =
      `**${userName}** completed **${levelTitle}**\n` +
      `Score: ${score} ${starEmoji}${achievementText}`;

    const [wechat, feishu] = await Promise.all([
      this.sendWechatWebhook(wechatContent),
      this.sendFeishuWebhook('Training Completion', feishuContent),
    ]);

    return { wechat, feishu };
  }
}
