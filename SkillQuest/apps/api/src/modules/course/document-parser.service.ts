/**
 * DocumentParserService — PDF / DOCX 文本提取
 *
 * 从上传的二进制 Buffer 中提取纯文本，供 AiGeneratorService 使用。
 * 支持 PDF (.pdf)  和 Word (.docx) 格式。
 */

import { Injectable, BadRequestException } from '@nestjs/common';
import * as pdfParse from 'pdf-parse';
import * as mammoth from 'mammoth';

@Injectable()
export class DocumentParserService {
  /**
   * 根据 MIME 类型或扩展名提取文档纯文本
   */
  async extractText(buffer: Buffer, mimetype: string, originalname: string): Promise<string> {
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

    throw new BadRequestException(`不支持的文件类型：${mimetype || ext}，请上传 PDF / DOCX / TXT`);
  }

  // ── PDF ──────────────────────────────────────────────────────────

  private async extractPdf(buffer: Buffer): Promise<string> {
    try {
      const data = await (pdfParse as unknown as (buf: Buffer) => Promise<{ text: string }>)(buffer);
      return data.text.trim();
    } catch (err) {
      throw new BadRequestException(`PDF 解析失败：${(err as Error).message}`);
    }
  }

  // ── DOCX ─────────────────────────────────────────────────────────

  private async extractDocx(buffer: Buffer): Promise<string> {
    try {
      const result = await mammoth.extractRawText({ buffer });
      return result.value.trim();
    } catch (err) {
      throw new BadRequestException(`DOCX 解析失败：${(err as Error).message}`);
    }
  }

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
