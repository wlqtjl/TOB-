/**
 * AI Providers Configuration — 统一多模型接入配置
 *
 * 所有 OpenAI 兼容的提供商 (DeepSeek / 千问 / 智谱 / Gemini / OpenAI) 共享 OpenAI SDK，
 * Claude 使用独立 SDK (@anthropic-ai/sdk)。
 */

export interface AIProviderConfig {
  readonly name: string;
  readonly baseURL: string;
  readonly envKey: string;
  readonly defaultModel: string;
  /**
   * If true, provider can be used without configuring an API key
   * (e.g. locally-hosted Ollama). A placeholder key is sent to satisfy
   * the OpenAI SDK contract.
   */
  readonly optionalApiKey?: boolean;
}

export const AI_PROVIDERS = {
  deepseek: {
    name: 'DeepSeek',
    baseURL: 'https://api.deepseek.com/v1',
    envKey: 'DEEPSEEK_API_KEY',
    defaultModel: 'deepseek-chat',
  },
  qwen: {
    name: '通义千问',
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    envKey: 'DASHSCOPE_API_KEY',
    defaultModel: 'qwen-max',
  },
  zhipu: {
    name: '智谱 GLM',
    baseURL: 'https://open.bigmodel.cn/api/paas/v4',
    envKey: 'ZHIPU_API_KEY',
    defaultModel: 'glm-4-plus',
  },
  openai: {
    name: 'GPT-4o',
    baseURL: 'https://api.openai.com/v1',
    envKey: 'OPENAI_API_KEY',
    defaultModel: 'gpt-4o',
  },
  gemini: {
    name: 'Gemini',
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai',
    envKey: 'GEMINI_API_KEY',
    defaultModel: 'gemini-2.0-flash',
  },
  claude: {
    name: 'Claude',
    baseURL: 'https://api.anthropic.com',
    envKey: 'ANTHROPIC_API_KEY',
    defaultModel: 'claude-3-5-sonnet-20240620',
  },
  minimax: {
    name: 'MiniMax',
    baseURL: 'https://api.minimaxi.com/v1',
    envKey: 'MINIMAX_API_KEY',
    defaultModel: 'MiniMax-M2.7-highspeed',
  },
  doubao: {
    name: '豆包 (Doubao)',
    baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
    envKey: 'DOUBAO_API_KEY',
    defaultModel: 'doubao-pro-32k',
  },
  ollama: {
    name: 'Ollama (本地)',
    baseURL: process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434/v1',
    envKey: 'OLLAMA_API_KEY',
    defaultModel: 'llama3.1',
    optionalApiKey: true,
  },
} as const satisfies Record<string, AIProviderConfig>;

export type ProviderKey = keyof typeof AI_PROVIDERS;

export const PROVIDER_KEYS = Object.keys(AI_PROVIDERS) as ProviderKey[];
