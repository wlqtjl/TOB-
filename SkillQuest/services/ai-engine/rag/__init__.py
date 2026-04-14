"""
RAG (Retrieval-Augmented Generation) 模块

提供文档向量化、语义检索能力，用于精准出题。
组件:
  - chunker: Markdown 文档分片 (按章节/段落, 512 tokens, 64 overlap)
  - embedder: OpenAI text-embedding-3-small 向量化
  - retriever: 余弦相似度 top-K 检索
"""

from .chunker import chunk_markdown
from .embedder import embed_texts, embed_query
from .retriever import retrieve_relevant_chunks

__all__ = [
    "chunk_markdown",
    "embed_texts",
    "embed_query",
    "retrieve_relevant_chunks",
]
