/**
 * DocumentParserService — 文档解析 (MinerU 2.5 + 传统 fallback)
 *
 * 解析策略:
 *   1. MinerU 2.5 (优先) — 通过 MineruBridgeService 调用 Python AI Engine
 *      输出: 结构化 Markdown (含表格/公式/版面), 提取图片, OCR 扫描件
 *   2. pdf-parse / mammoth (fallback) — MinerU 不可用时使用
 *      输出: 纯文本
 *
 * 对外接口保持向后兼容: extractText() 返回纯文本 (供 AiGeneratorService 消费)
 * 新增 extractStructured() 返回富结构 (Markdown + 图片 + 表格)
 */

import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import * as mammoth from 'mammoth';
import { MineruBridgeService, MineruParseResult } from './mineru-bridge.service';

// pdf-parse does not ship complete types for its default export; define the minimum needed shape
type PdfParseResult = { text: string };
type PdfParseFn = (buf: Buffer) => Promise<PdfParseResult>;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse') as PdfParseFn;

// ── 结构化解析结果 ──────────────────────────────────────────────────

export interface StructuredParseResult {
  /** 完整 Markdown 文本 (含表格/标题/列表格式) */
  markdown: string;
  /** 纯文本 (兼容旧管道) */
  plainText: string;
  /** 提取的表格列表 (HTML 格式) */
  tables: Array<{ html: string; page: number; caption: string }>;
  /** 提取的图片数量 */
  imageCount: number;
  /** 使用的解析器 */
  parserUsed: string;
  /** 页数 */
  pageCount: number;
}

@Injectable()
export class DocumentParserService {
  private readonly logger = new Logger(DocumentParserService.name);

  constructor(private readonly mineruBridge: MineruBridgeService) {}

  // ── 新接口: 结构化解析 ────────────────────────────────────────────

  /**
   * 结构化文档解析 — 优先使用 MinerU 2.5
   *
   * 返回丰富的结构化结果 (Markdown + 表格 + 图片信息)，
   * 比纯文本提取保留更多文档结构，让 GPT-4o 生成更精准的课程内容。
   */
  async extractStructured(buffer: Buffer, mimetype: string, originalname: string): Promise<StructuredParseResult> {
    // 尝试 MinerU
    if (this.mineruBridge.isEnabled()) {
      const mineruResult = await this.mineruBridge.parseDocument(buffer, originalname, mimetype);
      if (mineruResult) {
        this.logger.log(`MinerU 解析成功: ${mineruResult.parser_used}, ${mineruResult.markdown.length} chars`);
        return {
          markdown: mineruResult.markdown,
          plainText: mineruResult.plain_text,
          tables: mineruResult.tables,
          imageCount: mineruResult.images.length,
          parserUsed: mineruResult.parser_used,
          pageCount: mineruResult.page_count,
        };
      }
      this.logger.warn('MinerU 不可用，降级到传统解析器');
    }

    // Fallback: 传统解析
    const text = await this.extractTextLegacy(buffer, mimetype, originalname);
    return {
      markdown: text,
      plainText: text,
      tables: [],
      imageCount: 0,
      parserUsed: 'legacy',
      pageCount: 0,
    };
  }

  // ── 兼容接口: 纯文本提取 ──────────────────────────────────────────

  /**
   * 提取文档纯文本 — 保持向后兼容
   *
   * 优先走 MinerU (返回 plain_text 字段), 否则 fallback 到 pdf-parse/mammoth。
   */
  async extractText(buffer: Buffer, mimetype: string, originalname: string): Promise<string> {
    // 尝试 MinerU
    if (this.mineruBridge.isEnabled()) {
      const mineruResult = await this.mineruBridge.parseDocument(buffer, originalname, mimetype);
      if (mineruResult) {
        this.logger.log(`MinerU 解析成功 (plain_text): ${mineruResult.parser_used}`);
        // 返回 Markdown 而非纯文本: GPT-4o 对结构化 Markdown 的理解效果更好,
        // 表格/标题/列表格式有助于生成更精准的课程关卡。
        return mineruResult.markdown || mineruResult.plain_text;
      }
    }

    // Fallback
    return this.extractTextLegacy(buffer, mimetype, originalname);
  }

  // ── 传统解析 (Fallback) ───────────────────────────────────────────

  /**
   * 传统解析器 — pdf-parse / mammoth / 纯文本
   * 当 MinerU 不可用时使用。
   */
  private async extractTextLegacy(buffer: Buffer, mimetype: string, originalname: string): Promise<string> {
    const ext = originalname.split('.').pop()?.toLowerCase() ?? '';

    if (mimetype === 'application/pdf' || ext === 'pdf') {
      return this.extractPdf(buffer);
    }

    if (
      mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      ext === 'docx'
    ) {
      return this.extractDocx(buffer);
    }

    if (mimetype === 'text/plain' || ext === 'txt' || ext === 'md') {
      return buffer.toString('utf-8');
    }

    // MinerU 支持 PPT，但 fallback 不支持
    if (ext === 'pptx' || ext === 'ppt') {
      throw new BadRequestException(
        'PPT 文件需要 MinerU 解析引擎支持。请确保 AI Engine 服务已启动，' +
        '或将文件转换为 PDF 后重试。',
      );
    }

    throw new BadRequestException(`不支持的文件类型：${mimetype || ext}，请上传 PDF / DOCX / PPTX / TXT`);
  }

  // ── PDF (Legacy) ──────────────────────────────────────────────────

  private async extractPdf(buffer: Buffer): Promise<string> {
    try {
      const data = await pdfParse(buffer);
      return data.text.trim();
    } catch (err) {
      throw new BadRequestException(`PDF 解析失败：${(err as Error).message}`);
    }
  }

  // ── DOCX (Legacy) ─────────────────────────────────────────────────

  private async extractDocx(buffer: Buffer): Promise<string> {
    try {
      const result = await mammoth.extractRawText({ buffer });
      return result.value.trim();
    } catch (err) {
      throw new BadRequestException(`DOCX 解析失败：${(err as Error).message}`);
    }
  }

  // ── 文本分块 ──────────────────────────────────────────────────────

  /**
   * 将长文本切分为适合发送给 GPT 的片段（≤ maxChars，按段落边界切割）
   */
  splitIntoChunks(text: string, maxChars = 8000): string[] {
    const paragraphs = text.split(/\n{2,}/);
    const chunks: string[] = [];
    let current = '';

    for (const para of paragraphs) {
      if (current.length + para.length + 2 > maxChars) {
        if (current.trim()) chunks.push(current.trim());
        current = para;
      } else {
        current = current ? `${current}\n\n${para}` : para;
      }
    }
    if (current.trim()) chunks.push(current.trim());
    return chunks.filter((c) => c.length > 50);
  }
}

