"""
文档分片器 — 将 MinerU 输出的 Markdown 切分为可嵌入的语义片段

策略:
  1. 按一级/二级标题 (# / ##) 分割为章节
  2. 每个章节内按段落 (双换行) 进一步切分
  3. 合并短段落直到达到 target_tokens (512)
  4. 相邻片段有 overlap_tokens (64) 重叠以保持上下文
  5. 保留章节标题作为元数据
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field


@dataclass
class DocumentChunk:
    """一个文档片段"""
    content: str
    chapter_title: str = ""
    index: int = 0
    metadata: dict = field(default_factory=dict)

    @property
    def char_count(self) -> int:
        return len(self.content)

    @property
    def estimated_tokens(self) -> int:
        """粗略估算 token 数 (中文约 1.5 字/token, 英文约 4 字符/token)"""
        cn_chars = len(re.findall(r'[\u4e00-\u9fff]', self.content))
        en_chars = len(self.content) - cn_chars
        return int(cn_chars / 1.5 + en_chars / 4)


# ── 标题正则 ──────────────────────────────────────────────────────────

_HEADING_RE = re.compile(r'^(#{1,3})\s+(.+)$', re.MULTILINE)

_TECH_SPEC_RE = re.compile(
    r'(?:>\s*\d+|<\s*\d+|≥|≤|延迟|阈值|带宽|IOPS|吞吐|ms|GB|TB|MHz|Gbps)'
)


def _split_by_headings(markdown: str) -> list[tuple[str, str]]:
    """按标题分割 Markdown, 返回 [(chapter_title, content), ...]"""
    sections: list[tuple[str, str]] = []
    matches = list(_HEADING_RE.finditer(markdown))

    if not matches:
        return [("", markdown)]

    # 标题之前的内容
    if matches[0].start() > 0:
        preamble = markdown[:matches[0].start()].strip()
        if preamble:
            sections.append(("", preamble))

    for i, match in enumerate(matches):
        title = match.group(2).strip()
        start = match.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(markdown)
        body = markdown[start:end].strip()
        if body:
            sections.append((title, body))

    return sections


def _split_paragraphs(text: str) -> list[str]:
    """按双换行分割段落，过滤空段"""
    paras = re.split(r'\n{2,}', text)
    return [p.strip() for p in paras if p.strip() and len(p.strip()) > 20]


def _merge_short_paragraphs(
    paragraphs: list[str],
    target_chars: int = 1500,
    overlap_chars: int = 200,
) -> list[str]:
    """
    合并短段落为接近 target_chars 的长片段
    相邻片段有 overlap_chars 重叠
    """
    if not paragraphs:
        return []

    chunks: list[str] = []
    current: list[str] = []
    current_len = 0

    for para in paragraphs:
        if current_len + len(para) > target_chars and current:
            chunks.append('\n\n'.join(current))
            # 保留最后一段作为 overlap
            if overlap_chars > 0 and current:
                last = current[-1]
                if len(last) <= overlap_chars:
                    current = [last]
                    current_len = len(last)
                else:
                    current = [last[-overlap_chars:]]
                    current_len = overlap_chars
            else:
                current = []
                current_len = 0

        current.append(para)
        current_len += len(para)

    if current:
        chunks.append('\n\n'.join(current))

    return chunks


def chunk_markdown(
    markdown: str,
    target_chars: int = 1500,
    overlap_chars: int = 200,
    min_chunk_chars: int = 50,
) -> list[DocumentChunk]:
    """
    将 Markdown 文档切分为语义连贯的片段

    Args:
        markdown: 完整 Markdown 文本
        target_chars: 目标片段字符数 (~512 tokens)
        overlap_chars: 相邻片段重叠字符数 (~64 tokens)
        min_chunk_chars: 最小片段字符数 (过滤噪声)

    Returns:
        DocumentChunk 列表
    """
    if not markdown or not markdown.strip():
        return []

    sections = _split_by_headings(markdown)
    all_chunks: list[DocumentChunk] = []
    idx = 0

    for chapter_title, body in sections:
        paragraphs = _split_paragraphs(body)
        if not paragraphs:
            # 整个章节作为一个 chunk
            if len(body) >= min_chunk_chars:
                all_chunks.append(DocumentChunk(
                    content=body,
                    chapter_title=chapter_title,
                    index=idx,
                    metadata={"has_code": '```' in body, "has_table": '|' in body},
                ))
                idx += 1
            continue

        merged = _merge_short_paragraphs(paragraphs, target_chars, overlap_chars)

        for text in merged:
            if len(text) < min_chunk_chars:
                continue

            has_code = '```' in text
            has_table = '|' in text and text.count('|') >= 4
            has_tech_spec = bool(_TECH_SPEC_RE.search(text))

            all_chunks.append(DocumentChunk(
                content=text,
                chapter_title=chapter_title,
                index=idx,
                metadata={
                    "has_code": has_code,
                    "has_table": has_table,
                    "has_tech_spec": has_tech_spec,
                },
            ))
            idx += 1

    return all_chunks
