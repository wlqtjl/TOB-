"""
BM25 文本检索 — 当向量 embedding 不可用时的降级方案

BM25 (Best Match 25) 基于词频和逆文档频率进行文本相似度评分,
不依赖外部 API, 可作为 RAG 的纯本地检索回退。

设计要点:
  - 中英文混合分词 (基于空格 + CJK 字符拆分)
  - 标准 BM25 参数: k1=1.5, b=0.75
  - 与 retriever.py 的 RetrievalResult 兼容
"""

from __future__ import annotations

import math
import re
from collections import Counter
from dataclasses import dataclass
from typing import Optional

from .chunker import DocumentChunk


# ─── BM25 参数 ──────────────────────────────────────────────────────

DEFAULT_K1 = 1.5
DEFAULT_B = 0.75


# ─── 分词 ───────────────────────────────────────────────────────────

_CJK_RANGES = (
    r'\u4e00-\u9fff'   # CJK Unified Ideographs
    r'\u3400-\u4dbf'   # CJK Unified Ideographs Extension A
    r'\uf900-\ufaff'   # CJK Compatibility Ideographs
)
_CJK_PATTERN = re.compile(f'([{_CJK_RANGES}])')
_WORD_PATTERN = re.compile(r'[a-zA-Z0-9_]+')


def tokenize(text: str) -> list[str]:
    """
    简单分词: 英文按空格/标点分割, 中文按单字拆分

    适用于技术文档中中英文混合场景。
    """
    if not text:
        return []

    text_lower = text.lower()
    tokens: list[str] = []

    # 提取英文/数字词
    for match in _WORD_PATTERN.finditer(text_lower):
        token = match.group()
        if len(token) >= 2:  # 保留长度≥2的英文/数字词, 过滤单字符
            tokens.append(token)

    # 提取中文单字
    for match in _CJK_PATTERN.finditer(text_lower):
        tokens.append(match.group())

    return tokens


# ─── BM25 索引 ──────────────────────────────────────────────────────

@dataclass
class BM25Index:
    """BM25 倒排索引"""
    doc_freqs: dict[str, int]       # 每个词出现在多少文档中
    doc_term_freqs: list[Counter]   # 每个文档的词频
    doc_lengths: list[int]          # 每个文档的词数
    avg_doc_length: float           # 平均文档长度
    n_docs: int                     # 文档总数
    k1: float = DEFAULT_K1
    b: float = DEFAULT_B


def build_bm25_index(
    texts: list[str],
    k1: float = DEFAULT_K1,
    b: float = DEFAULT_B,
) -> BM25Index:
    """
    从文本列表构建 BM25 索引

    Args:
        texts: 文档文本列表
        k1: 词频饱和参数 (默认 1.5)
        b: 文档长度归一化参数 (默认 0.75)

    Returns:
        BM25Index 实例
    """
    n_docs = len(texts)
    doc_freqs: dict[str, int] = {}
    doc_term_freqs: list[Counter] = []
    doc_lengths: list[int] = []

    for text in texts:
        tokens = tokenize(text)
        doc_lengths.append(len(tokens))
        tf = Counter(tokens)
        doc_term_freqs.append(tf)

        for term in set(tokens):
            doc_freqs[term] = doc_freqs.get(term, 0) + 1

    avg_doc_length = sum(doc_lengths) / max(n_docs, 1)

    return BM25Index(
        doc_freqs=doc_freqs,
        doc_term_freqs=doc_term_freqs,
        doc_lengths=doc_lengths,
        avg_doc_length=avg_doc_length,
        n_docs=n_docs,
        k1=k1,
        b=b,
    )


def bm25_score(index: BM25Index, query: str, doc_idx: int) -> float:
    """
    计算单个文档的 BM25 得分

    Args:
        index: BM25 索引
        query: 查询文本
        doc_idx: 文档索引

    Returns:
        BM25 得分 (≥ 0)
    """
    query_tokens = tokenize(query)
    if not query_tokens or doc_idx >= index.n_docs:
        return 0.0

    score = 0.0
    doc_tf = index.doc_term_freqs[doc_idx]
    doc_len = index.doc_lengths[doc_idx]

    for term in query_tokens:
        if term not in index.doc_freqs:
            continue

        df = index.doc_freqs[term]
        tf = doc_tf.get(term, 0)

        # IDF (使用 Robertson-Spärck Jones 公式的变体, 确保非负)
        idf = math.log((index.n_docs - df + 0.5) / (df + 0.5) + 1.0)

        # TF 归一化
        tf_norm = (tf * (index.k1 + 1)) / (
            tf + index.k1 * (1 - index.b + index.b * doc_len / max(index.avg_doc_length, 1e-10))
        )

        score += idf * tf_norm

    return score


def bm25_retrieve(
    index: BM25Index,
    chunks: list[DocumentChunk],
    query: str,
    top_k: int = 5,
    min_score: float = 0.0,
    chapter_weight: Optional[str] = None,
) -> list[tuple[DocumentChunk, float]]:
    """
    使用 BM25 检索最相关的文档片段

    Args:
        index: BM25 索引
        chunks: 文档片段列表 (与索引一一对应)
        query: 查询文本
        top_k: 返回前 K 个结果
        min_score: 最低得分阈值
        chapter_weight: 章节权重加成

    Returns:
        (chunk, score) 元组列表, 按得分降序
    """
    if not chunks or not query:
        return []

    results: list[tuple[DocumentChunk, float]] = []

    for i, chunk in enumerate(chunks):
        if i >= index.n_docs:
            break

        score = bm25_score(index, query, i)

        # 章节权重加成
        if chapter_weight and chunk.chapter_title:
            if chapter_weight.lower() in chunk.chapter_title.lower():
                score *= 1.3

        # 技术指标加权
        if chunk.metadata.get("has_tech_spec"):
            score *= 1.15

        if score >= min_score:
            results.append((chunk, score))

    results.sort(key=lambda r: r[1], reverse=True)
    return results[:top_k]
