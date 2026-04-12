/**
 * AiGeneratorService — 使用 OpenAI GPT-4o 将文档文本转化为8种题型关卡
 *
 * 增强功能 (v2):
 * - RAG-aware: 支持传入检索到的文档片段,强制引用原文参数
 * - source_quote: 每个生成的关卡包含出题依据的文档原话
 * - 多 Agent 校验集成: 生成后可提交给 QuestionValidatorService 验证
 *
 * 输入：文档全文 / RAG 片段 + 用户描述
 * 输出：完整的 CourseImportResult（课程元信息 + 关卡内容 JSON 数组）
 */

import { Injectable, InternalServerErrorException } from '@nestjs/common';
import OpenAI from 'openai';

// ─── 生成结果的内部类型 ────────────────────────────────────────────

export interface GeneratedLevel {
  sortOrder: number;
  title: string;
  type: 'QUIZ' | 'ORDERING' | 'MATCHING' | 'TOPOLOGY' | 'TERMINAL' | 'SCENARIO' | 'VM_PLACEMENT' | 'FLOW_SIM';
  description: string;
  timeLimitSec: number;
  positionX: number;
  positionY: number;
  content: Record<string, unknown>;
  /** RAG 引用的原文片段 */
  sourceQuotes?: { quote: string; chapterTitle: string; relevanceScore: number }[];
}

export interface CourseImportResult {
  title: string;
  vendor: string;
  category: 'NETWORK' | 'VIRTUALIZATION' | 'STORAGE' | 'SECURITY' | 'CLOUD';
  description: string;
  levels: GeneratedLevel[];
}

/** RAG 检索结果片段 */
export interface RagChunk {
  content: string;
  chapter_title: string;
  score: number;
  metadata: Record<string, unknown>;
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
- FLOW_SIM：数据流向仿真，将系统内部物理不可见的流程（如ZBS元数据写路径、Raft选举、iSCSI块读取、Ceph CRUSH分布）可视化为粒子动画关卡，玩家在决策节点选择正确下一跳。优先为分布式存储/超融合/共识算法文档生成此类型。

重要要求 — RAG 溯源:
1. 每个关卡的 content 中必须包含 source_quote 字段，标注出题依据的文档原话。
2. 对于 QUIZ/SCENARIO 类型，必须引用文档中的具体参数（如 "IO 延迟 > 50ms"、"3副本"等）。
3. 每个选项应有充分的 reasoning 字段，解释为什么对/错。

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
        "source_quote": "出题依据的文档原话（必填）"
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
}

FLOW_SIM:
{
  "mode": "route",
  "task": "ZBS写请求完整路径: 观察并在关键节点做出正确路由决策",
  "nodes": [
    {"id":"client","label":"客户端","icon":"💻","role":"client","x":80,"y":280,"faultable":false,"annotations":["发起iSCSI写请求"]},
    {"id":"access","label":"Access\n协议网关","icon":"🔀","role":"gateway","x":280,"y":280,"faultable":false,"annotations":["处理iSCSI/NVMe-oF协议","查询元数据缓存","路由到Chunk节点"]},
    {"id":"meta","label":"Meta\n元数据服务","icon":"🗃️","role":"control","x":280,"y":100,"faultable":true,"annotations":["管理块位置映射","分配写入租约","Raft共识保证一致性"]},
    {"id":"chunk1","label":"Chunk-1\n(Primary)","icon":"💾","role":"data","x":520,"y":160,"faultable":true,"annotations":["主副本写入","同步给Replica"]},
    {"id":"chunk2","label":"Chunk-2\n(Replica)","icon":"💾","role":"data","x":700,"y":100,"faultable":true,"annotations":["副本1接收同步写"]},
    {"id":"chunk3","label":"Chunk-3\n(Replica)","icon":"💾","role":"data","x":700,"y":280,"faultable":true,"annotations":["副本2接收同步写"]}
  ],
  "steps": [
    {"id":"s1","from":"client","to":"access","data":"Write(block_id=42, data=4KB)","annotation":"客户端通过iSCSI发起写请求到Access网关","delayMs":0,"color":"#8b5cf6"},
    {"id":"s2","from":"access","to":"meta","data":"GetLease(block_id=42)","annotation":"Access向Meta申请block_id=42的写入租约 — 这是元数据操作的关键步骤","delayMs":300,"color":"#fbbf24"},
    {"id":"s3","from":"meta","to":"access","data":"Lease(chunk_ids=[chunk1,chunk2,chunk3])","annotation":"Meta返回租约: 本次写入的3个副本节点位置","delayMs":600,"color":"#fbbf24"},
    {"id":"s4","from":"access","to":"chunk1","data":"Write(data=4KB)","annotation":"Access将数据写入Primary Chunk节点","delayMs":900,"color":"#22c55e"},
    {"id":"s5","from":"chunk1","to":"chunk2","data":"Sync(data=4KB)","annotation":"Primary同步写副本1 — 保证强一致性","delayMs":1200,"color":"#60a5fa"},
    {"id":"s6","from":"chunk1","to":"chunk3","data":"Sync(data=4KB)","annotation":"Primary同步写副本2","delayMs":1200,"color":"#60a5fa"},
    {"id":"s7","from":"chunk2","to":"chunk1","data":"ACK","annotation":"副本1写入成功确认","delayMs":1600,"color":"#34d399"},
    {"id":"s8","from":"chunk3","to":"chunk1","data":"ACK","annotation":"副本2写入成功确认","delayMs":1600,"color":"#34d399"},
    {"id":"s9","from":"chunk1","to":"access","data":"WriteOK","annotation":"所有副本确认后Primary向Access报告成功","delayMs":2000,"color":"#22c55e"},
    {"id":"s10","from":"access","to":"client","data":"WriteACK","annotation":"Access向客户端返回写入成功确认","delayMs":2300,"color":"#8b5cf6"}
  ],
  "decisions": [
    {
      "id":"d1","afterStepId":"s3",
      "question":"Meta返回了3个Chunk节点ID, Access应该将Write请求发给哪个节点?",
      "options":["chunk1","chunk2","chunk3"],
      "correctOptions":["chunk1"],
      "wrongFeedback":"错误! 写请求应发给Primary节点(chunk1), 由Primary负责同步给Replica",
      "correctFeedback":"正确! Primary节点负责接收写入并同步给所有Replica"
    }
  ],
  "faults": [],
  "playbackSpeed": 1.0,
  "playbackSpeedOptions": [0.1, 0.5, 1, 2, 5, 10],
  "explanation": "ZBS三副本写路径: Client→Access(协议)→Meta(元数据租约)→Chunk-Primary(写入)→Chunk-Replica×2(同步)→ACK链路"
}`;

// ─── Service ──────────────────────────────────────────────────────

@Injectable()
export class AiGeneratorService {
  private openai: OpenAI | null = null;

  private getClient(): OpenAI {
    if (!this.openai) {
      const apiKey = process.env['OPENAI_API_KEY'];
      if (!apiKey) {
        throw new InternalServerErrorException('OPENAI_API_KEY environment variable is not configured');
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

  /**
   * RAG 增强方法：使用检索到的文档片段生成课程 (v2)
   *
   * 与 generateCourse 的区别:
   * - 输入为 RAG 检索的精确文档片段 (非全文 chunk)
   * - 强制 AI 引用原文参数/阈值
   * - 生成的关卡自动包含 sourceQuotes 溯源字段
   * - 初始审核状态为 PENDING (需要人工/多Agent验证)
   */
  async generateCourseWithRag(
    ragChunks: RagChunk[],
    hint?: string,
    negativeFeedback?: string,
  ): Promise<CourseImportResult> {
    const client = this.getClient();

    // 构建 RAG 上下文 (带章节标注)
    const ragContext = ragChunks
      .map((c, i) =>
        `[文档片段${i + 1} — ${c.chapter_title} (相关度: ${(c.score * 100).toFixed(0)}%)]\n${c.content}`,
      )
      .join('\n\n---\n\n');

    let userMessage = `以下是经过语义检索的最相关文档片段 (已按相关度排序):\n\n${ragContext}`;

    if (hint) {
      userMessage = `用户补充说明: ${hint}\n\n${userMessage}`;
    }

    if (negativeFeedback) {
      userMessage += `\n\n⚠️ 专家反馈 (必须在本次生成中修正以下问题):\n${negativeFeedback}`;
    }

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

    // 自动填充布局坐标 + 溯源信息
    parsed.levels = parsed.levels.map((level, idx) => {
      const pos = layoutPosition(idx + 1);
      return {
        ...level,
        sortOrder: idx + 1,
        timeLimitSec: level.timeLimitSec ?? 300,
        description: level.description ?? '',
        positionX: pos.x,
        positionY: pos.y,
        sourceQuotes: ragChunks.map(c => ({
          quote: c.content.substring(0, 200),
          chapterTitle: c.chapter_title,
          relevanceScore: c.score,
        })),
      };
    });

    return parsed;
  }
}
