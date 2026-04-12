"""
向量嵌入器 — 调用 OpenAI text-embedding-3-small 生成 1536 维向量

设计要点:
  - 批量调用 (最多 2048 条/批)
  - 错误重试 (3 次)
  - 支持降级 (无 API key 时返回零向量, 可用于本地开发)
"""

from __future__ import annotations

import logging
import os
from typing import Optional

logger = logging.getLogger("ai-engine.rag.embedder")

EMBEDDING_MODEL = "text-embedding-3-small"
EMBEDDING_DIMENSIONS = 1536
MAX_BATCH_SIZE = 2048
MAX_RETRIES = 3


def _get_openai_client() -> Optional[object]:
    """延迟加载 OpenAI 客户端"""
    api_key = os.environ.get("OPENAI_API_KEY", "")
    if not api_key:
        logger.warning("OPENAI_API_KEY 未设置, embedding 将返回零向量 (仅限开发环境)")
        return None
    try:
        from openai import OpenAI
        return OpenAI(api_key=api_key)
    except ImportError:
        logger.warning("openai 库未安装, embedding 将返回零向量")
        return None


def _zero_vector() -> list[float]:
    """返回零向量 (降级模式)"""
    return [0.0] * EMBEDDING_DIMENSIONS


async def embed_texts(texts: list[str]) -> list[list[float]]:
    """
    批量生成文本 embedding

    Args:
        texts: 文本列表

    Returns:
        对应的 embedding 向量列表 (1536 维)
    """
    if not texts:
        return []

    client = _get_openai_client()
    if client is None:
        return [_zero_vector() for _ in texts]

    all_embeddings: list[list[float]] = []

    for batch_start in range(0, len(texts), MAX_BATCH_SIZE):
        batch = texts[batch_start:batch_start + MAX_BATCH_SIZE]
        # 截断过长文本 (embedding 模型最大 8191 tokens)
        batch = [t[:30000] if len(t) > 30000 else t for t in batch]

        for attempt in range(MAX_RETRIES):
            try:
                response = client.embeddings.create(  # type: ignore[union-attr]
                    model=EMBEDDING_MODEL,
                    input=batch,
                )
                batch_embeddings = [item.embedding for item in response.data]
                all_embeddings.extend(batch_embeddings)
                break
            except Exception as e:
                if attempt < MAX_RETRIES - 1:
                    logger.warning(f"Embedding 调用失败 (重试 {attempt + 1}/{MAX_RETRIES}): {e}")
                else:
                    logger.error(f"Embedding 调用最终失败: {e}")
                    all_embeddings.extend([_zero_vector() for _ in batch])

    return all_embeddings


async def embed_query(query: str) -> list[float]:
    """
    生成查询文本的 embedding (单条)

    Args:
        query: 查询文本

    Returns:
        1536 维 embedding 向量
    """
    results = await embed_texts([query])
    return results[0] if results else _zero_vector()
