/**
 * UnifiedAIService — 统一 AI 调用适配层
 *
 * 封装 OpenAI 兼容 SDK 和 Anthropic Claude SDK 的差异，提供统一的 chat() 接口。
 * 支持双 Agent 交叉验证 (dualAgentValidate)。
 */

import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import {
  AI_PROVIDERS,
  type ProviderKey,
  type AIProviderConfig,
} from './providers.config';

// ─── Types ─────────────────────────────────────────────────────────────

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  content: string;
  model: string;
  provider: ProviderKey;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

// ─── Service ──────────────────────────────────────────────────────────

@Injectable()
export class UnifiedAIService {
  private readonly logger = new Logger(UnifiedAIService.name);
  private readonly openaiClients = new Map<ProviderKey, OpenAI>();
  private claudeClient: Anthropic | null = null;

  /**
   * Unified chat interface — routes to the correct SDK based on provider key.
   */
  async chat(
    providerKey: ProviderKey,
    messages: AIMessage[],
    modelOverride?: string,
  ): Promise<AIResponse> {
    const config = AI_PROVIDERS[providerKey];
    const apiKey = process.env[config.envKey];
    if (!apiKey) {
      throw new Error(`${config.name} API Key 未配置 (env: ${config.envKey})`);
    }

    const model = modelOverride ?? config.defaultModel;

    if (providerKey === 'claude') {
      return this.callClaude(apiKey, model, messages);
    }
    return this.callOpenAICompatible(providerKey, config, apiKey, model, messages);
  }

  /**
   * Test a provider's connectivity with a minimal request.
   */
  async testConnection(providerKey: ProviderKey): Promise<{ ok: boolean; message: string; latencyMs: number }> {
    const start = Date.now();
    try {
      const result = await this.chat(providerKey, [
        { role: 'user', content: 'Hi, reply with just "ok".' },
      ]);
      return {
        ok: true,
        message: `${AI_PROVIDERS[providerKey].name} 连接成功 (model: ${result.model})`,
        latencyMs: Date.now() - start,
      };
    } catch (err) {
      return {
        ok: false,
        message: `${AI_PROVIDERS[providerKey].name} 连接失败: ${(err as Error).message}`,
        latencyMs: Date.now() - start,
      };
    }
  }

  /**
   * Dual-agent cross validation — runs generator & validator in parallel.
   */
  async dualAgentValidate(
    genKey: ProviderKey,
    valKey: ProviderKey,
    genMsgs: AIMessage[],
    valMsgs: AIMessage[],
  ): Promise<{ generatorResult: AIResponse; validatorResult: AIResponse }> {
    const [generatorResult, validatorResult] = await Promise.all([
      this.chat(genKey, genMsgs),
      this.chat(valKey, valMsgs),
    ]);
    return { generatorResult, validatorResult };
  }

  // ─── OpenAI Compatible Providers ─────────────────────────────────

  private getOpenAIClient(providerKey: ProviderKey, config: AIProviderConfig, apiKey: string): OpenAI {
    const cached = this.openaiClients.get(providerKey);
    if (cached) return cached;

    const client = new OpenAI({
      apiKey,
      baseURL: config.baseURL,
    });
    this.openaiClients.set(providerKey, client);
    return client;
  }

  private async callOpenAICompatible(
    providerKey: ProviderKey,
    config: AIProviderConfig,
    apiKey: string,
    model: string,
    messages: AIMessage[],
  ): Promise<AIResponse> {
    const client = this.getOpenAIClient(providerKey, config, apiKey);

    this.logger.log(`Calling ${config.name} (model: ${model})`);

    const response = await client.chat.completions.create({
      model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: 0.3,
    });

    const choice = response.choices[0];
    return {
      content: choice?.message?.content ?? '',
      model: response.model ?? model,
      provider: providerKey,
      usage: response.usage
        ? {
            inputTokens: response.usage.prompt_tokens ?? 0,
            outputTokens: response.usage.completion_tokens ?? 0,
          }
        : undefined,
    };
  }

  // ─── Claude (Anthropic SDK) ──────────────────────────────────────

  private getClaudeClient(apiKey: string): Anthropic {
    if (!this.claudeClient) {
      this.claudeClient = new Anthropic({ apiKey });
    }
    return this.claudeClient;
  }

  private async callClaude(
    apiKey: string,
    model: string,
    messages: AIMessage[],
  ): Promise<AIResponse> {
    const client = this.getClaudeClient(apiKey);

    this.logger.log(`Calling Claude (model: ${model})`);

    // Extract system message (Claude handles it separately)
    const systemMsg = messages.find((m) => m.role === 'system')?.content;
    const chatMessages = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    const response = await client.messages.create({
      model,
      max_tokens: 4096,
      ...(systemMsg ? { system: systemMsg } : {}),
      messages: chatMessages,
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    return {
      content: textBlock?.text ?? '',
      model: response.model ?? model,
      provider: 'claude',
      usage: {
        inputTokens: response.usage?.input_tokens ?? 0,
        outputTokens: response.usage?.output_tokens ?? 0,
      },
    };
  }
}
