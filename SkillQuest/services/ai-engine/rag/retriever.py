"""
语义检索器 — 基于余弦相似度的 top-K 检索, 支持 BM25 降级

支持两种模式:
  1. 内存检索: 直接在 Python 进程中计算 (开发/小规模)
  2. pgvector 检索: 通过 SQL 查询 PostgreSQL (生产)
  3. BM25 降级: 当 embedding 不可用时, 使用 BM25 文本检索

本模块实现模式 1 和 3, 模式 2 由 NestJS API 层通过 Prisma raw SQL 实现。
"""

from __future__ import annotations

import logging
import math
from dataclasses import dataclass
from typing import Optional

from .chunker import DocumentChunk
from .bm25 import build_bm25_index, bm25_retrieve

logger = logging.getLogger("ai-engine.rag.retriever")


@dataclass
class RetrievalResult:
    """检索结果"""
    chunk: DocumentChunk
    score: float
    embedding: list[float]


def cosine_similarity(a: list[float], b: list[float]) -> float:
    """计算两个向量的余弦相似度"""
    if not a or not b or len(a) != len(b):
        return 0.0

    dot_product = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(x * x for x in b))

    if norm_a == 0 or norm_b == 0:
        return 0.0

    return dot_product / (norm_a * norm_b)


def retrieve_relevant_chunks(
    query_embedding: list[float],
    chunks: list[DocumentChunk],
    chunk_embeddings: list[list[float]],
    top_k: int = 5,
    min_score: float = 0.3,
    chapter_weight: Optional[str] = None,
    query_text: Optional[str] = None,
) -> list[RetrievalResult]:
    """
    从已索引的文档片段中检索最相关的 top-K

    当 embedding 不可用时 (query_embedding 为空), 自动降级到 BM25。

    Args:
        query_embedding: 查询文本的 embedding (为空时降级到 BM25)
        chunks: 文档片段列表
        chunk_embeddings: 对应的 embedding 列表
        top_k: 返回前 K 个结果
        min_score: 最低相似度阈值
        chapter_weight: 如果指定, 匹配该章节标题的 chunk 得分 ×1.3 加权
        query_text: 原始查询文本 (BM25 降级时必需)

    Returns:
        按相关度降序排列的 RetrievalResult 列表
    """
    if not chunks:
        return []

    # ── BM25 降级: 当 embedding 不可用时 ──
    if not query_embedding or not chunk_embeddings:
        if not query_text:
            logger.warning("BM25 降级模式需要 query_text 参数")
            return []

        logger.info(f"使用 BM25 降级检索 (共 {len(chunks)} 片段)")
        texts = [c.content for c in chunks]
        index = build_bm25_index(texts)
        bm25_results = bm25_retrieve(
            index, chunks, query_text,
            top_k=top_k,
            min_score=min_score,
            chapter_weight=chapter_weight,
        )
        return [
            RetrievalResult(chunk=chunk, score=score, embedding=[])
            for chunk, score in bm25_results
        ]

    # ── 正常模式: 余弦相似度检索 ──
    results: list[RetrievalResult] = []

    for chunk, embedding in zip(chunks, chunk_embeddings):
        score = cosine_similarity(query_embedding, embedding)

        # 章节权重加成
        if chapter_weight and chunk.chapter_title:
            if chapter_weight.lower() in chunk.chapter_title.lower():
                score *= 1.3

        # 技术指标加权 (含阈值/参数的片段更有出题价值)
        if chunk.metadata.get("has_tech_spec"):
            score *= 1.15

        if score >= min_score:
            results.append(RetrievalResult(
                chunk=chunk,
                score=score,
                embedding=embedding,
            ))

    results.sort(key=lambda r: r.score, reverse=True)
    return results[:top_k]
