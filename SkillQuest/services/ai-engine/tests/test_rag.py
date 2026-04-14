"""
RAG Pipeline Tests — chunker + retriever + BM25 fallback

Tests the full document → chunk → embed (mock) → retrieve pipeline,
including BM25 text retrieval as fallback when embedding is unavailable.
"""

import math
import pytest
import sys
import os

# Add parent to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from rag.chunker import chunk_markdown, DocumentChunk, _split_by_headings, _split_paragraphs, _merge_short_paragraphs
from rag.retriever import cosine_similarity, retrieve_relevant_chunks, RetrievalResult
from rag.bm25 import tokenize, build_bm25_index, bm25_score, bm25_retrieve, BM25Index


# ─── Chunker Tests ─────────────────────────────────────────────────


class TestSplitByHeadings:
    def test_single_heading(self):
        md = "# Chapter 1\nSome content here."
        sections = _split_by_headings(md)
        assert len(sections) >= 1
        assert sections[0][0] == "Chapter 1"

    def test_multiple_headings(self):
        md = "# Chapter 1\nContent 1\n\n## Section 1.1\nContent 1.1\n\n# Chapter 2\nContent 2"
        sections = _split_by_headings(md)
        assert len(sections) == 3
        assert sections[0][0] == "Chapter 1"
        assert sections[1][0] == "Section 1.1"
        assert sections[2][0] == "Chapter 2"

    def test_no_headings(self):
        md = "Just plain text without any headings."
        sections = _split_by_headings(md)
        assert len(sections) == 1
        assert sections[0][0] == ""

    def test_preamble_before_heading(self):
        md = "Preamble text here.\n\n# Chapter 1\nContent"
        sections = _split_by_headings(md)
        assert len(sections) >= 2
        assert sections[0][0] == ""  # preamble has no title


class TestSplitParagraphs:
    def test_basic_split(self):
        text = "Paragraph one with enough content.\n\nParagraph two with more content here."
        paras = _split_paragraphs(text)
        assert len(paras) == 2

    def test_filters_short_paragraphs(self):
        text = "Ok.\n\nThis is a much longer paragraph with enough content."
        paras = _split_paragraphs(text)
        assert len(paras) == 1  # "Ok." is too short (< 20 chars)

    def test_empty_input(self):
        assert _split_paragraphs("") == []
        assert _split_paragraphs("   ") == []


class TestMergeShortParagraphs:
    def test_merge_short_paras(self):
        paras = ["A" * 100, "B" * 100, "C" * 100]
        merged = _merge_short_paragraphs(paras, target_chars=250)
        # First two should merge (200 < 250), third may start new
        assert len(merged) >= 1

    def test_overlap(self):
        paras = ["First paragraph with content." * 20, "Second paragraph with content." * 20]
        merged = _merge_short_paragraphs(paras, target_chars=200, overlap_chars=50)
        assert len(merged) >= 2

    def test_empty_input(self):
        assert _merge_short_paragraphs([]) == []


class TestChunkMarkdown:
    def test_basic_chunking(self):
        md = """# 分布式存储架构

ZBS (Zettabyte File System) 采用三副本策略。IO 延迟阈值设置为 50ms。
当延迟超过 50ms 时触发告警。IOPS 目标为 100K。

数据重平衡通过后台任务实现，默认带宽限制为 200MB/s。

## 元数据管理

Meta 服务使用 Raft 共识协议。Leader 选举超时为 10s。
日志复制延迟 < 5ms。三个 Meta 节点组成 Raft 组。

## 数据恢复

当节点离线时间超过 30 分钟，自动触发数据重建。
重建速度受限于网络带宽和 IO 优先级配置。"""

        chunks = chunk_markdown(md, target_chars=300, overlap_chars=50)
        assert len(chunks) >= 2

        # Check chapter titles are preserved
        chapter_titles = [c.chapter_title for c in chunks]
        assert any("分布式存储架构" in t for t in chapter_titles)

    def test_tech_spec_detection(self):
        md = """# 性能指标

IO 延迟阈值: > 50ms 触发告警。
IOPS 目标: ≥ 100K。
带宽: 200 Gbps。"""

        chunks = chunk_markdown(md, target_chars=500)
        assert len(chunks) >= 1
        assert chunks[0].metadata.get("has_tech_spec") is True

    def test_code_detection(self):
        md = """# 终端操作

```bash
smtxctl cluster status
smtxctl node list
```"""

        chunks = chunk_markdown(md, target_chars=500)
        assert len(chunks) >= 1
        assert chunks[0].metadata.get("has_code") is True

    def test_empty_input(self):
        assert chunk_markdown("") == []
        assert chunk_markdown("   ") == []
        assert chunk_markdown(None) == []  # type: ignore

    def test_min_chunk_chars(self):
        md = "# Title\nToo short."
        chunks = chunk_markdown(md, min_chunk_chars=100)
        assert len(chunks) == 0

    def test_estimated_tokens(self):
        chunk = DocumentChunk(content="这是一个中文测试句子" * 10, chapter_title="测试")
        assert chunk.estimated_tokens > 0
        assert chunk.char_count == len(chunk.content)


# ─── Retriever Tests ──────────────────────────────────────────────


class TestCosineSimilarity:
    def test_identical_vectors(self):
        v = [1.0, 2.0, 3.0]
        assert abs(cosine_similarity(v, v) - 1.0) < 1e-6

    def test_orthogonal_vectors(self):
        a = [1.0, 0.0, 0.0]
        b = [0.0, 1.0, 0.0]
        assert abs(cosine_similarity(a, b)) < 1e-6

    def test_opposite_vectors(self):
        a = [1.0, 0.0]
        b = [-1.0, 0.0]
        assert abs(cosine_similarity(a, b) - (-1.0)) < 1e-6

    def test_empty_vectors(self):
        assert cosine_similarity([], []) == 0.0
        assert cosine_similarity([1.0], []) == 0.0

    def test_zero_vector(self):
        assert cosine_similarity([0.0, 0.0], [1.0, 1.0]) == 0.0

    def test_different_lengths(self):
        assert cosine_similarity([1.0, 2.0], [1.0]) == 0.0


class TestRetrieveRelevantChunks:
    def setup_method(self):
        self.chunks = [
            DocumentChunk(content="ZBS使用三副本策略", chapter_title="存储", index=0,
                          metadata={"has_tech_spec": True}),
            DocumentChunk(content="网络配置VLAN设置", chapter_title="网络", index=1,
                          metadata={"has_tech_spec": False}),
            DocumentChunk(content="集群扩容步骤说明", chapter_title="运维", index=2,
                          metadata={"has_tech_spec": False}),
        ]
        # Simulated embeddings (3D for simplicity)
        self.embeddings = [
            [1.0, 0.5, 0.1],  # storage
            [0.1, 1.0, 0.2],  # network
            [0.3, 0.3, 1.0],  # ops
        ]

    def test_basic_retrieval(self):
        query_emb = [0.9, 0.4, 0.1]  # similar to storage chunk
        results = retrieve_relevant_chunks(
            query_emb, self.chunks, self.embeddings, top_k=2, min_score=0.0,
        )
        assert len(results) <= 2
        assert results[0].chunk.chapter_title == "存储"

    def test_top_k_limit(self):
        query_emb = [0.5, 0.5, 0.5]  # similar to all
        results = retrieve_relevant_chunks(
            query_emb, self.chunks, self.embeddings, top_k=1, min_score=0.0,
        )
        assert len(results) == 1

    def test_min_score_filter(self):
        query_emb = [0.0, 0.0, 0.1]  # barely similar
        results = retrieve_relevant_chunks(
            query_emb, self.chunks, self.embeddings, top_k=5, min_score=0.99,
        )
        assert len(results) == 0

    def test_chapter_weight_boost(self):
        query_emb = [0.5, 0.5, 0.5]  # equal similarity to all
        results_no_weight = retrieve_relevant_chunks(
            query_emb, self.chunks, self.embeddings, top_k=3, min_score=0.0,
        )
        results_with_weight = retrieve_relevant_chunks(
            query_emb, self.chunks, self.embeddings, top_k=3, min_score=0.0,
            chapter_weight="存储",
        )
        # With chapter weight, storage chunk should rank higher or equal
        storage_rank_no_weight = next(
            (i for i, r in enumerate(results_no_weight) if r.chunk.chapter_title == "存储"), -1
        )
        storage_rank_with_weight = next(
            (i for i, r in enumerate(results_with_weight) if r.chunk.chapter_title == "存储"), -1
        )
        assert storage_rank_with_weight <= storage_rank_no_weight

    def test_tech_spec_boost(self):
        query_emb = [0.9, 0.4, 0.1]  # similar to storage
        results = retrieve_relevant_chunks(
            query_emb, self.chunks, self.embeddings, top_k=3, min_score=0.0,
        )
        # Storage chunk has has_tech_spec=True, should get boosted
        assert results[0].chunk.metadata.get("has_tech_spec") is True

    def test_empty_inputs(self):
        assert retrieve_relevant_chunks([], self.chunks, self.embeddings) == []
        assert retrieve_relevant_chunks([1.0], [], []) == []
        # Empty chunk_embeddings with query_text -> BM25 fallback
        results = retrieve_relevant_chunks(
            [1.0], self.chunks, [], query_text="ZBS副本", min_score=0.0,
        )
        assert len(results) >= 1  # BM25 should return results

    def test_results_sorted_by_score(self):
        query_emb = [0.5, 0.5, 0.5]
        results = retrieve_relevant_chunks(
            query_emb, self.chunks, self.embeddings, top_k=3, min_score=0.0,
        )
        scores = [r.score for r in results]
        assert scores == sorted(scores, reverse=True)


# ─── BM25 Tests ───────────────────────────────────────────────────


class TestTokenize:
    def test_english_words(self):
        tokens = tokenize("Hello World Python")
        assert "hello" in tokens
        assert "world" in tokens
        assert "python" in tokens

    def test_chinese_chars(self):
        tokens = tokenize("三副本策略")
        assert "三" in tokens
        assert "副" in tokens
        assert "本" in tokens

    def test_mixed_content(self):
        tokens = tokenize("ZBS 三副本 storage")
        assert "zbs" in tokens
        assert "storage" in tokens
        assert "三" in tokens

    def test_empty_input(self):
        assert tokenize("") == []
        assert tokenize("   ") == []

    def test_filters_single_chars(self):
        tokens = tokenize("a b c hello")
        assert "hello" in tokens
        # Single English chars should be filtered
        assert "a" not in tokens


class TestBM25Index:
    def setup_method(self):
        self.texts = [
            "ZBS使用三副本策略保证数据可靠性",
            "网络配置VLAN和交换机设置",
            "集群扩容步骤与运维指南",
        ]
        self.index = build_bm25_index(self.texts)

    def test_index_creation(self):
        assert self.index.n_docs == 3
        assert self.index.avg_doc_length > 0
        assert len(self.index.doc_term_freqs) == 3
        assert len(self.index.doc_lengths) == 3

    def test_doc_freqs(self):
        # "zbs" only appears in doc 0
        assert self.index.doc_freqs.get("zbs", 0) == 1

    def test_score_relevant_higher(self):
        s0 = bm25_score(self.index, "ZBS副本", 0)
        s1 = bm25_score(self.index, "ZBS副本", 1)
        assert s0 > s1

    def test_score_empty_query(self):
        assert bm25_score(self.index, "", 0) == 0.0

    def test_score_out_of_range(self):
        assert bm25_score(self.index, "test", 99) == 0.0

    def test_score_non_negative(self):
        for i in range(3):
            score = bm25_score(self.index, "ZBS网络集群", i)
            assert score >= 0.0


class TestBM25Retrieve:
    def setup_method(self):
        self.chunks = [
            DocumentChunk(content="ZBS使用三副本策略", chapter_title="存储", index=0,
                          metadata={"has_tech_spec": True}),
            DocumentChunk(content="网络配置VLAN设置", chapter_title="网络", index=1),
            DocumentChunk(content="集群扩容步骤说明", chapter_title="运维", index=2),
        ]
        texts = [c.content for c in self.chunks]
        self.index = build_bm25_index(texts)

    def test_basic_retrieval(self):
        results = bm25_retrieve(self.index, self.chunks, "ZBS副本", top_k=2, min_score=0.0)
        assert len(results) >= 1
        assert results[0][0].chapter_title == "存储"

    def test_top_k_limit(self):
        results = bm25_retrieve(self.index, self.chunks, "ZBS网络集群", top_k=1, min_score=0.0)
        assert len(results) <= 1

    def test_chapter_weight(self):
        results_no_weight = bm25_retrieve(
            self.index, self.chunks, "ZBS网络", top_k=3, min_score=0.0,
        )
        results_with_weight = bm25_retrieve(
            self.index, self.chunks, "ZBS网络", top_k=3, min_score=0.0,
            chapter_weight="存储",
        )
        # With chapter weight, storage should rank higher or equal
        if results_no_weight and results_with_weight:
            storage_rank_no = next(
                (i for i, r in enumerate(results_no_weight) if r[0].chapter_title == "存储"), -1
            )
            storage_rank_w = next(
                (i for i, r in enumerate(results_with_weight) if r[0].chapter_title == "存储"), -1
            )
            assert storage_rank_w <= storage_rank_no

    def test_tech_spec_boost(self):
        results = bm25_retrieve(self.index, self.chunks, "ZBS副本", top_k=3, min_score=0.0)
        assert results[0][0].metadata.get("has_tech_spec") is True

    def test_empty_inputs(self):
        assert bm25_retrieve(self.index, [], "query") == []
        assert bm25_retrieve(self.index, self.chunks, "") == []

    def test_results_sorted_by_score(self):
        results = bm25_retrieve(self.index, self.chunks, "ZBS网络集群", top_k=3, min_score=0.0)
        scores = [r[1] for r in results]
        assert scores == sorted(scores, reverse=True)


class TestRetrieverBM25Fallback:
    """Test that retrieve_relevant_chunks falls back to BM25 when embeddings are empty"""

    def setup_method(self):
        self.chunks = [
            DocumentChunk(content="ZBS使用三副本策略", chapter_title="存储", index=0,
                          metadata={"has_tech_spec": True}),
            DocumentChunk(content="网络配置VLAN设置", chapter_title="网络", index=1),
            DocumentChunk(content="集群扩容步骤说明", chapter_title="运维", index=2),
        ]

    def test_fallback_with_empty_embedding(self):
        results = retrieve_relevant_chunks(
            query_embedding=[],
            chunks=self.chunks,
            chunk_embeddings=[],
            top_k=2,
            min_score=0.0,
            query_text="ZBS副本",
        )
        assert len(results) >= 1
        assert results[0].chunk.chapter_title == "存储"
        assert results[0].embedding == []  # BM25 returns empty embedding

    def test_fallback_without_query_text(self):
        results = retrieve_relevant_chunks(
            query_embedding=[],
            chunks=self.chunks,
            chunk_embeddings=[],
            top_k=2,
            min_score=0.0,
        )
        assert results == []  # No query_text, can't do BM25

    def test_fallback_preserves_sort_order(self):
        results = retrieve_relevant_chunks(
            query_embedding=[],
            chunks=self.chunks,
            chunk_embeddings=[],
            top_k=3,
            min_score=0.0,
            query_text="ZBS网络集群",
        )
        scores = [r.score for r in results]
        assert scores == sorted(scores, reverse=True)
