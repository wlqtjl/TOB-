"""
语义检索器 — 基于余弦相似度的 top-K 检索

支持两种模式:
  1. 内存检索: 直接在 Python 进程中计算 (开发/小规模)
  2. pgvector 检索: 通过 SQL 查询 PostgreSQL (生产)

本模块实现模式 1, 模式 2 由 NestJS API 层通过 Prisma raw SQL 实现。
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Optional

from .chunker import DocumentChunk


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
) -> list[RetrievalResult]:
    """
    从已索引的文档片段中检索最相关的 top-K

    Args:
        query_embedding: 查询文本的 embedding
        chunks: 文档片段列表
        chunk_embeddings: 对应的 embedding 列表
        top_k: 返回前 K 个结果
        min_score: 最低相似度阈值
        chapter_weight: 如果指定, 匹配该章节标题的 chunk 得分 ×1.3 加权

    Returns:
        按相关度降序排列的 RetrievalResult 列表
    """
    if not chunks or not chunk_embeddings or not query_embedding:
        return []

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
