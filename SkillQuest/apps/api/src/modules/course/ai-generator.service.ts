/**
 * AiGeneratorService — 使用 OpenAI GPT-4o 将文档文本转化为7种题型关卡
 *
 * 输入：文档全文 + 用户描述
 * 输出：完整的 CourseImportResult（课程元信息 + 关卡内容 JSON 数组）
 */

import { Injectable, InternalServerErrorException } from '@nestjs/common';
import OpenAI from 'openai';

// ─── 生成结果的内部类型 ────────────────────────────────────────────

export interface GeneratedLevel {
  sortOrder: number;
  title: string;
  type: 'QUIZ' | 'ORDERING' | 'MATCHING' | 'TOPOLOGY' | 'TERMINAL' | 'SCENARIO' | 'VM_PLACEMENT';
  description: string;
  timeLimitSec: number;
  positionX: number;
  positionY: number;
  content: Record<string, unknown>;
}

export interface CourseImportResult {
  title: string;
  vendor: string;
  category: 'NETWORK' | 'VIRTUALIZATION' | 'STORAGE' | 'SECURITY' | 'CLOUD';
  description: string;
  levels: GeneratedLevel[];
}

// ─── 布局辅助 ────────────────────────────────────────────────────

/** 将关卡自动排布为波浪形地图布局（最多10个关卡） */
function layoutPosition(sortOrder: number): { x: number; y: number } {
  const col = (sortOrder - 1) % 3;
  const row = Math.floor((sortOrder - 1) / 3);
  const xBase = 200 + col * 250;
  const yOffset = col === 1 ? 60 : 0;
  return { x: xBase, y: 100 + row * 200 + yOffset };
}

// ─── System Prompt ────────────────────────────────────────────────

const SYSTEM_PROMPT = `你是一个专业的IT培训课程设计师，专门为数据中心/超融合/网络工程师设计游戏化学习课程。

你的任务是分析用户提供的技术文档，生成一个完整的培训课程，包含8-10个关卡。
关卡类型说明（必须覆盖至少4种不同类型）：
- QUIZ：单选题，考察概念理解
- ORDERING：步骤排序题，考察操作顺序
- MATCHING：连线配对题，考察对应关系
- TOPOLOGY：网络/架构拓扑图连线，考察架构设计
- TERMINAL：命令行填空，考察实际操作命令
- SCENARIO：剧情选择题，考察故障处理/迁移决策
- VM_PLACEMENT：虚拟机资源放置，考察资源规划

请严格按照以下 JSON schema 输出，不要添加任何其他文字：
{
  "title": "课程标题",
  "vendor": "厂商名称（如 SmartX、华为、VMware 等）",
  "category": "VIRTUALIZATION",  // 枚举: NETWORK/VIRTUALIZATION/STORAGE/SECURITY/CLOUD
  "description": "课程简要描述（50字以内）",
  "levels": [
    {
      "sortOrder": 1,
      "title": "关卡标题",
      "type": "QUIZ",
      "description": "关卡说明",
      "timeLimitSec": 300,
      "content": {
        // 根据 type 不同，content 结构不同，详见示例
      }
    }
  ]
}

各 type 对应 content 结构示例：

QUIZ:
{
  "type": "single_choice",
  "content": "问题描述",
  "options": [{"id":"a","text":"选项A"},{"id":"b","text":"选项B"},{"id":"c","text":"选项C"},{"id":"d","text":"选项D"}],
  "correctOptionIds": ["a"],
  "explanation": "解析说明",
  "difficulty": "intermediate",
  "knowledgePointTags": ["标签1","标签2"]
}

ORDERING:
{
  "content": "任务描述",
  "steps": [{"id":"s1","text":"步骤1"},{"id":"s2","text":"步骤2"},{"id":"s3","text":"步骤3"},{"id":"s4","text":"步骤4"}],
  "correctOrder": ["s1","s2","s3","s4"],
  "explanation": "解析说明"
}

MATCHING:
{
  "content": "配对任务描述",
  "leftItems": [{"id":"l1","text":"左侧项目1"},{"id":"l2","text":"左侧项目2"},{"id":"l3","text":"左侧项目3"}],
  "rightItems": [{"id":"r1","text":"右侧项目1"},{"id":"r2","text":"右侧项目2"},{"id":"r3","text":"右侧项目3"}],
  "correctPairs": [["l1","r1"],["l2","r2"],["l3","r3"]],
  "explanation": "解析说明"
}

TOPOLOGY:
{
  "task": "连线任务描述",
  "nodes": [
    {"id":"n1","type":"server","label":"节点1","x":120,"y":150,"ports":[{"id":"n1-p1","label":"eth0"}]},
    {"id":"n2","type":"switch","label":"交换机","x":400,"y":150,"ports":[{"id":"n2-p1","label":"G0/1"},{"id":"n2-p2","label":"G0/2"}]},
    {"id":"n3","type":"server","label":"节点2","x":680,"y":150,"ports":[{"id":"n3-p1","label":"eth0"}]}
  ],
  "edges": [
    {"id":"e1","fromPortId":"n1-p1","toPortId":"n2-p1","visible":true},
    {"id":"e2","fromPortId":"n2-p2","toPortId":"n3-p1","visible":true}
  ],
  "correctConnections": [{"fromPortId":"n1-p1","toPortId":"n2-p1"},{"fromPortId":"n2-p2","toPortId":"n3-p1"}],
  "packetPath": ["n1-p1","n2-p1","n2-p2","n3-p1"],
  "explanation": "解析说明"
}

TERMINAL:
{
  "scenario": "场景描述",
  "terminalLines": [
    {"prompt":"admin@host:~$","command":"ssh admin@192.168.1.1"},
    {"prompt":"admin@node:~$","command":"sudo systemctl status smtxos"}
  ],
  "blankCommands": [
    {"prompt":"admin@node:~$","answer":"smtxctl cluster status","hints":["smtxctl","cluster"],"fuzzyMatch":true}
  ],
  "successOutput": "成功提示信息",
  "explanation": "解析说明"
}

SCENARIO:
{
  "opening": "场景背景描述",
  "steps": [
    {
      "id":"step1",
      "narrative":"步骤描述",
      "choices": [
        {"id":"c1","text":"选项1","resultOutput":"结果描述","nextStepId":"step2","isOptimal":true},
        {"id":"c2","text":"选项2","resultOutput":"结果描述","nextStepId":null,"isOptimal":false}
      ]
    },
    {
      "id":"step2",
      "narrative":"第二步描述",
      "choices": [
        {"id":"c3","text":"选项3","resultOutput":"结果描述","nextStepId":null,"isOptimal":true},
        {"id":"c4","text":"选项4","resultOutput":"结果描述","nextStepId":null,"isOptimal":false}
      ]
    }
  ],
  "optimalPath": ["step1","step2"],
  "explanation": "解析说明"
}

VM_PLACEMENT:
{
  "task": "放置任务描述",
  "clusterNodes": [
    {"id":"n1","label":"Node-1","cpuTotal":32,"cpuUsed":8,"memoryTotalGB":256,"memoryUsedGB":64,"storageTotalTB":10,"storageUsedTB":2,"status":"healthy","x":200,"y":150},
    {"id":"n2","label":"Node-2","cpuTotal":32,"cpuUsed":24,"memoryTotalGB":256,"memoryUsedGB":200,"storageTotalTB":10,"storageUsedTB":8,"status":"warning","x":500,"y":150}
  ],
  "vms": [
    {"id":"vm1","name":"现有VM","cpuCores":4,"memoryGB":16,"storageSizeGB":200,"nodeId":"n1","status":"running"},
    {"id":"vm2","name":"待迁移VM","cpuCores":8,"memoryGB":32,"storageSizeGB":500,"nodeId":"","status":"stopped"}
  ],
  "explanation": "解析说明"
}`;

// ─── Service ──────────────────────────────────────────────────────

@Injectable()
export class AiGeneratorService {
  private openai: OpenAI | null = null;

  private getClient(): OpenAI {
    if (!this.openai) {
      const apiKey = process.env['OPENAI_API_KEY'];
      if (!apiKey) {
        throw new InternalServerErrorException('未配置 OPENAI_API_KEY 环境变量');
      }
      this.openai = new OpenAI({ apiKey });
    }
    return this.openai;
  }

  /**
   * 核心方法：将文档文本片段数组 → 调用 GPT-4o → 解析为 CourseImportResult
   */
  async generateCourse(
    chunks: string[],
    hint?: string,
  ): Promise<CourseImportResult> {
    const client = this.getClient();

    // 将所有 chunk 拼合（取前 4 个避免超 token）
    const docText = chunks.slice(0, 4).join('\n\n---\n\n');
    const userMessage = hint
      ? `用户补充说明：${hint}\n\n以下是文档内容：\n\n${docText}`
      : `以下是文档内容：\n\n${docText}`;

    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? '';

    let parsed: CourseImportResult;
    try {
      parsed = JSON.parse(raw) as CourseImportResult;
    } catch {
      throw new InternalServerErrorException('AI 返回了非法 JSON，请重试');
    }

    // 自动填充布局坐标
    parsed.levels = parsed.levels.map((level, idx) => {
      const pos = layoutPosition(idx + 1);
      return {
        ...level,
        sortOrder: idx + 1,
        timeLimitSec: level.timeLimitSec ?? 300,
        description: level.description ?? '',
        positionX: pos.x,
        positionY: pos.y,
      };
    });

    return parsed;
  }
}
