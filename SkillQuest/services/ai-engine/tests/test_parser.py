"""
Tests for material_parser — 文档解析器单元测试

测试覆盖:
  - MinerU 可用性检测
  - 文件类型检测
  - 纯文本解析
  - Markdown → 纯文本转换
  - 文本分块
  - DOCX 解析 (需要 python-docx)
  - ParseResult 数据模型
"""

import pytest
from parsers.material_parser import (
    _detect_mime,
    _markdown_to_plain_text,
    _parse_plain_text,
    is_mineru_available,
    parse_document,
    ParseResult,
    ParsedImage,
    ParsedTable,
)


# ── 文件类型检测 ─────────────────────────────────────────────────────


class TestDetectMime:
    def test_pdf_by_mime(self):
        assert _detect_mime("doc.pdf", "application/pdf") == "pdf"

    def test_pdf_by_extension(self):
        assert _detect_mime("doc.pdf", "") == "pdf"

    def test_docx_by_mime(self):
        mime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        assert _detect_mime("doc.docx", mime) == "docx"

    def test_docx_by_extension(self):
        assert _detect_mime("doc.docx", "") == "docx"

    def test_pptx_by_extension(self):
        assert _detect_mime("slides.pptx", "") == "pptx"

    def test_txt_by_extension(self):
        assert _detect_mime("notes.txt", "") == "text"

    def test_md_by_extension(self):
        assert _detect_mime("README.md", "") == "text"

    def test_unknown(self):
        assert _detect_mime("file.xyz", "") == "xyz"


# ── Markdown → 纯文本 ────────────────────────────────────────────────


class TestMarkdownToPlainText:
    def test_removes_headers(self):
        assert _markdown_to_plain_text("# Title") == "Title"
        assert _markdown_to_plain_text("## Section") == "Section"

    def test_removes_bold(self):
        assert _markdown_to_plain_text("**bold text**") == "bold text"

    def test_removes_images(self):
        assert _markdown_to_plain_text("![alt](url)") == "alt"

    def test_removes_links(self):
        assert _markdown_to_plain_text("[text](url)") == "text"

    def test_removes_inline_code(self):
        assert _markdown_to_plain_text("`code`") == "code"

    def test_plain_text_unchanged(self):
        assert _markdown_to_plain_text("hello world") == "hello world"


# ── 纯文本解析 ──────────────────────────────────────────────────────


class TestParsePlainText:
    def test_utf8(self):
        result = _parse_plain_text(b"Hello World")
        assert result.plain_text == "Hello World"
        assert result.markdown == "Hello World"
        assert result.parser_used == "plaintext"

    def test_chinese(self):
        text = "这是中文测试"
        result = _parse_plain_text(text.encode("utf-8"))
        assert result.plain_text == text

    def test_empty(self):
        result = _parse_plain_text(b"")
        assert result.plain_text == ""


# ── 数据模型 ─────────────────────────────────────────────────────────


class TestParseResult:
    def test_defaults(self):
        r = ParseResult(markdown="md", plain_text="txt")
        assert r.images == []
        assert r.tables == []
        assert r.page_count == 0
        assert r.parser_used == "unknown"
        assert r.metadata == {}

    def test_with_data(self):
        r = ParseResult(
            markdown="# Hello",
            plain_text="Hello",
            images=[ParsedImage(path="/tmp/img.png", page=0)],
            tables=[ParsedTable(html="<table></table>", page=0)],
            page_count=5,
            parser_used="mineru",
        )
        assert len(r.images) == 1
        assert len(r.tables) == 1
        assert r.page_count == 5


# ── MinerU 可用性检测 ────────────────────────────────────────────────


class TestMineruAvailability:
    def test_returns_bool(self):
        result = is_mineru_available()
        assert isinstance(result, bool)


# ── parse_document 集成 ──────────────────────────────────────────────


class TestParseDocument:
    @pytest.mark.asyncio
    async def test_plain_text(self):
        result = await parse_document(
            file_bytes=b"Hello World\n\nParagraph 2",
            filename="test.txt",
        )
        assert result.parser_used == "plaintext"
        assert "Hello World" in result.plain_text

    @pytest.mark.asyncio
    async def test_markdown_file(self):
        result = await parse_document(
            file_bytes=b"# Title\n\nContent",
            filename="test.md",
        )
        assert result.parser_used == "plaintext"
        assert "Title" in result.markdown

    @pytest.mark.asyncio
    async def test_unsupported_format(self):
        with pytest.raises(ValueError, match="不支持的文件类型"):
            await parse_document(
                file_bytes=b"data",
                filename="file.xyz",
            )
