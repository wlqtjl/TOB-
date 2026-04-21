/**
 * AI Tutor Service — 按课程定制的 AI 学习伙伴
 *
 * - 为失败/失分的关卡提供即时点评（流水线：取 AiTutor 人设 → 调 UnifiedAIService → 返回文本）
 * - 未配置课程专属 Tutor 时回落到租户默认人设
 * - 失败（模型报错 / 未配置 Key）返回友好降级文本，不抛异常中断游戏
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { UnifiedAIService, type AIMessage } from '../ai/unified-ai.service';
import { AISettingsService } from '../ai/ai-settings.service';
import { PROVIDER_KEYS, type ProviderKey } from '../ai/providers.config';

export interface TutorFeedbackInput {
  levelId: string;
  tenantId: string;
  /** 玩家最近的答题表现摘要 */
  performance: {
    correct: number;
    total: number;
    durationSec?: number;
    mistakes?: string[];
  };
}

export interface TutorFeedbackResult {
  tutorName: string;
  avatar: string;
  message: string;
  /** 是否使用了降级文本（即未真正调用 LLM） */
  fallback: boolean;
}

const DEFAULT_PERSONALITY =
  '你是一位耐心、鼓励型的技术导师。用不超过 80 个汉字回应学员，先肯定表现，再点出一个具体改进方向。';

@Injectable()
export class AiTutorService {
  private readonly logger = new Logger(AiTutorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: UnifiedAIService,
    private readonly aiSettings: AISettingsService,
  ) {}

  async getFeedback(input: TutorFeedbackInput): Promise<TutorFeedbackResult> {
    const level = await this.prisma.level.findUnique({
      where: { id: input.levelId },
      select: { id: true, title: true, courseId: true },
    });
    if (!level) throw new NotFoundException(`关卡不存在: ${input.levelId}`);

    // 优先取课程专属 Tutor，再回落到租户通用 Tutor
    const tutor =
      (await this.prisma.aiTutor.findFirst({
        where: { tenantId: input.tenantId, courseId: level.courseId },
        orderBy: { updatedAt: 'desc' },
      })) ??
      (await this.prisma.aiTutor.findFirst({
        where: { tenantId: input.tenantId, courseId: null },
        orderBy: { updatedAt: 'desc' },
      }));

    const tutorName = tutor?.name ?? '学习伙伴';
    const avatar = tutor?.avatar ?? '🤖';
    const personality = tutor?.personality?.trim() || DEFAULT_PERSONALITY;

    const { correct, total, durationSec, mistakes = [] } = input.performance;
    const performanceLine = `本关成绩：${correct}/${total} 正确${
      durationSec != null ? `，用时 ${durationSec}s` : ''
    }${mistakes.length > 0 ? `，易错点：${mistakes.slice(0, 3).join('、')}` : ''}。`;

    const messages: AIMessage[] = [
      { role: 'system', content: personality },
      {
        role: 'user',
        content: `关卡：${level.title}\n${performanceLine}\n请给出一段简短点评和下一步练习建议。`,
      },
    ];

    try {
      const settings = await this.aiSettings.getSettings(input.tenantId);
      const rawProvider = settings.validatorProvider;
      const providerKey: ProviderKey = PROVIDER_KEYS.includes(rawProvider as ProviderKey)
        ? (rawProvider as ProviderKey)
        : 'openai';
      const modelOverride = settings.validatorModel ?? undefined;

      const res = await this.ai.chat(providerKey, messages, modelOverride);
      const text = res.content.trim();
      if (!text) return this.fallback(tutorName, avatar, input.performance);

      return { tutorName, avatar, message: text, fallback: false };
    } catch (err) {
      this.logger.warn(`AI Tutor 调用失败，降级返回: ${(err as Error).message}`);
      return this.fallback(tutorName, avatar, input.performance);
    }
  }

  private fallback(
    tutorName: string,
    avatar: string,
    perf: TutorFeedbackInput['performance'],
  ): TutorFeedbackResult {
    const ratio = perf.total > 0 ? perf.correct / perf.total : 0;
    const msg =
      ratio >= 0.8
        ? `干得漂亮！${perf.correct}/${perf.total} 的正确率已经达到熟练水准，下一关继续保持节奏。`
        : ratio >= 0.5
          ? `已经能答对一半了，建议回看错题，梳理对应原理再挑战一次。`
          : `先别灰心，看看题解或找队友组队。基础打牢之后再来，成绩会跃升。`;
    return { tutorName, avatar, message: msg, fallback: true };
  }
}
