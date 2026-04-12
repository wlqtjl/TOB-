/**
 * QuestionValidatorService — 多 Agent 博弈校验 (Generator & Solver)
 *
 * 实现逻辑:
 * 1. Agent A (Generator): 生成题目 JSON (含 source_quote + reasoning_chain)
 * 2. Agent B (Solver): 不看答案, 独立解题 (输出 confidence + ambiguity_flags)
 * 3. 比对: 答案一致 + confidence ≥ 0.8 → PENDING (待人工审核)
 * 4. 不一致 → 生成 Refining_Order → 回传 Agent A 重新生成 (最多 3 轮)
 * 5. 3 轮仍不一致 → NEEDS_REVISION + 记录所有歧义点
 */

import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';

// ─── 类型定义 ──────────────────────────────────────────────────────

export interface RagChunk {
  content: string;
  chapter_title: string;
  score: number;
  metadata: Record<string, unknown>;
}

export interface GeneratedQuestion {
  type: string;
  content: string;
  options: { id: string; text: string; reasoning?: string }[];
  correctOptionIds: string[];
  explanation: string;
  sourceQuotes: { quote: string; chapterTitle: string }[];
  reasoningChain: string[];
  difficulty: string;
  knowledgePointTags: string[];
}

export interface SolverResult {
  selectedAnswer: string;
  confidence: number;
  ambiguityFlags: string[];
  reasoning: string;
}

export interface ValidationRound {
  round: number;
  generatorOutput: GeneratedQuestion;
  solverOutput: SolverResult;
  verdict: 'match' | 'mismatch' | 'ambiguous';
  refiningOrder?: string;
}

export interface ValidationResult {
  finalQuestion: GeneratedQuestion | null;
  rounds: ValidationRound[];
  finalVerdict: 'approved' | 'needs_revision';
  totalRounds: number;
}

// ─── Prompt 模板 ──────────────────────────────────────────────────

const GENERATOR_SYSTEM_PROMPT = `你是一位资深IT基础设施架构师，同时也是专业的培训课程出题专家。
你的任务是基于提供的技术文档原文，构造一道高质量的考察题目。

强制要求:
1. 必须从提供的文档原文中检索"技术指标"、"操作阈值"或"架构逻辑"
2. 构造包含"前提条件-故障现象-底层原理"的排查题
3. 必须引用原文中的具体参数（如: "IO 延迟 > 50ms", "3副本"等）
4. 每个选项必须有 reasoning 字段，解释为什么对/错
5. 必须包含 source_quote 字段，标注出题依据的文档原话

输出严格 JSON 格式:
{
  "type": "single_choice",
  "content": "题干(包含前提条件+故障现象)",
  "options": [
    {"id": "a", "text": "选项", "reasoning": "对/错的原因"},
    {"id": "b", "text": "选项", "reasoning": "对/错的原因"},
    {"id": "c", "text": "选项", "reasoning": "对/错的原因"},
    {"id": "d", "text": "选项", "reasoning": "对/错的原因"}
  ],
  "correctOptionIds": ["a"],
  "explanation": "完整解析(引用文档原理)",
  "sourceQuotes": [{"quote": "文档原文片段", "chapterTitle": "章节标题"}],
  "reasoningChain": ["推理步骤1", "推理步骤2", "推理步骤3"],
  "difficulty": "intermediate",
  "knowledgePointTags": ["标签1", "标签2"]
}`;

const SOLVER_SYSTEM_PROMPT = `你是一位经验丰富的IT工程师。
你将看到一道技术考题（题干+选项），但不会看到标准答案。

请:
1. 仔细分析题干中的技术场景
2. 逐一分析每个选项的合理性
3. 选出你认为最正确的答案
4. 评估题目质量，指出任何歧义

输出严格 JSON 格式:
{
  "selectedAnswer": "你选择的选项id",
  "confidence": 0.95,
  "ambiguityFlags": [],
  "reasoning": "你的分析过程"
}

confidence 评分标准:
- 1.0: 完全确定, 只有一个正确答案
- 0.8-0.9: 高度确定, 但需要一定推理
- 0.6-0.8: 有一定歧义, 但倾向某个答案
- < 0.6: 严重歧义, 多个选项可能正确

ambiguityFlags 示例:
- "选项A和C在特定条件下都可能正确"
- "题干未明确指定系统版本, 不同版本答案不同"
- "缺少足够上下文判断最佳操作"`;

// ─── Service ──────────────────────────────────────────────────────

@Injectable()
export class QuestionValidatorService {
  private readonly logger = new Logger(QuestionValidatorService.name);
  private openai: OpenAI | null = null;

  private getClient(): OpenAI {
    if (!this.openai) {
      const apiKey = process.env['OPENAI_API_KEY'];
      if (!apiKey) {
        throw new Error('OPENAI_API_KEY 未配置');
      }
      this.openai = new OpenAI({ apiKey });
    }
    return this.openai;
  }

  /**
   * 完整的多 Agent 校验流程
   *
   * @param ragChunks RAG 检索到的相关文档片段
   * @param chapterHint 目标章节提示
   * @param vendor 厂商名称
   * @param maxRounds 最大校验轮次 (默认 3)
   */
  async validateQuestion(
    ragChunks: RagChunk[],
    chapterHint: string,
    vendor: string,
    maxRounds = 3,
  ): Promise<ValidationResult> {
    const rounds: ValidationRound[] = [];
    let lastQuestion: GeneratedQuestion | null = null;
    let refiningFeedback = '';

    for (let round = 1; round <= maxRounds; round++) {
      this.logger.log(`校验轮次 ${round}/${maxRounds}`);

      // ── Agent A: 生成题目 ──
      const question = await this.generateQuestion(
        ragChunks,
        chapterHint,
        vendor,
        refiningFeedback,
      );

      if (!question) {
        this.logger.warn(`轮次 ${round}: Agent A 生成失败`);
        continue;
      }

      lastQuestion = question;

      // ── Agent B: 独立解题 ──
      const solverResult = await this.solveQuestion(question);

      if (!solverResult) {
        this.logger.warn(`轮次 ${round}: Agent B 解题失败`);
        continue;
      }

      // ── 比对逻辑 ──
      const verdict = this.compareResults(question, solverResult);

      const roundResult: ValidationRound = {
        round,
        generatorOutput: question,
        solverOutput: solverResult,
        verdict,
      };

      if (verdict === 'match') {
        rounds.push(roundResult);
        this.logger.log(`轮次 ${round}: 共识达成 ✓`);
        return {
          finalQuestion: question,
          rounds,
          finalVerdict: 'approved',
          totalRounds: round,
        };
      }

      // 生成 Refining_Order
      refiningFeedback = this.generateRefiningOrder(question, solverResult);
      roundResult.refiningOrder = refiningFeedback;
      rounds.push(roundResult);

      this.logger.log(`轮次 ${round}: 分歧, 发送 Refining_Order`);
    }

    return {
      finalQuestion: lastQuestion,
      rounds,
      finalVerdict: 'needs_revision',
      totalRounds: maxRounds,
    };
  }

  /**
   * Agent A: 从 RAG 片段生成题目
   */
  private async generateQuestion(
    ragChunks: RagChunk[],
    chapterHint: string,
    vendor: string,
    refiningFeedback: string,
  ): Promise<GeneratedQuestion | null> {
    const client = this.getClient();

    const ragContext = ragChunks
      .map((c, i) => `[文档片段${i + 1} — ${c.chapter_title}]\n${c.content}`)
      .join('\n\n---\n\n');

    let userMsg = `请作为[${vendor}]资深架构师，检索以下文档中关于[${chapterHint}]的内容。
构造一个包含"前提条件-故障现象-底层原理"的排查题。

---引用开始---
${ragContext}
---引用结束---

要求：必须引用原文中的具体参数。`;

    if (refiningFeedback) {
      userMsg += `\n\n⚠️ 上一轮校验反馈（请据此优化题目）：\n${refiningFeedback}`;
    }

    try {
      const resp = await client.chat.completions.create({
        model: 'gpt-4o',
        temperature: 0.4,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: GENERATOR_SYSTEM_PROMPT },
          { role: 'user', content: userMsg },
        ],
      });

      const raw = resp.choices[0]?.message?.content ?? '';
      return JSON.parse(raw) as GeneratedQuestion;
    } catch (e) {
      this.logger.error(`Agent A 生成失败: ${e}`);
      return null;
    }
  }

  /**
   * Agent B: 独立解题（不看答案）
   */
  private async solveQuestion(
    question: GeneratedQuestion,
  ): Promise<SolverResult | null> {
    const client = this.getClient();

    // 只给 Solver 题干和选项，不给答案
    const questionForSolver = {
      type: question.type,
      content: question.content,
      options: question.options.map(o => ({ id: o.id, text: o.text })),
    };

    try {
      const resp = await client.chat.completions.create({
        model: 'gpt-4o',
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SOLVER_SYSTEM_PROMPT },
          {
            role: 'user',
            content: `请分析以下题目并作答:\n${JSON.stringify(questionForSolver, null, 2)}`,
          },
        ],
      });

      const raw = resp.choices[0]?.message?.content ?? '';
      return JSON.parse(raw) as SolverResult;
    } catch (e) {
      this.logger.error(`Agent B 解题失败: ${e}`);
      return null;
    }
  }

  /**
   * 比对 Generator 和 Solver 的结果
   */
  private compareResults(
    question: GeneratedQuestion,
    solver: SolverResult,
  ): 'match' | 'mismatch' | 'ambiguous' {
    const correctIds = question.correctOptionIds;
    const solverAnswer = solver.selectedAnswer;

    // 答案一致性检查
    const answerMatch = correctIds.includes(solverAnswer);

    // 置信度检查
    const highConfidence = solver.confidence >= 0.8;

    // 歧义检查
    const noAmbiguity = solver.ambiguityFlags.length === 0;

    if (answerMatch && highConfidence && noAmbiguity) {
      return 'match';
    }

    if (!answerMatch) {
      return 'mismatch';
    }

    return 'ambiguous';
  }

  /**
   * 生成 Refining_Order (优化指令)
   */
  private generateRefiningOrder(
    question: GeneratedQuestion,
    solver: SolverResult,
  ): string {
    const parts: string[] = [];

    if (!question.correctOptionIds.includes(solver.selectedAnswer)) {
      parts.push(
        `答案分歧: Generator 认为正确答案是 [${question.correctOptionIds.join(',')}], ` +
        `但 Solver 选择了 [${solver.selectedAnswer}]。Solver 的理由: "${solver.reasoning}"`,
      );
    }

    if (solver.confidence < 0.8) {
      parts.push(`置信度过低 (${solver.confidence}): 题目可能存在歧义, 请让选项区分度更明显。`);
    }

    if (solver.ambiguityFlags.length > 0) {
      parts.push(`歧义点:\n${solver.ambiguityFlags.map(f => `  - ${f}`).join('\n')}`);
    }

    return parts.join('\n\n');
  }
}
