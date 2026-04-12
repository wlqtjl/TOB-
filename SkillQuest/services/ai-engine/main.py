"""
SkillQuest AI Engine — FastAPI 入口

提供文档解析 REST API，由 NestJS 主服务通过 HTTP 调用。
支持 MinerU 2.5 高精度解析 + 多格式 fallback。

端点:
- GET  /health                — 健康检查 + 能力报告
- POST /parse                 — 解析文档 (PDF/DOCX/PPTX/TXT)
- POST /analyze               — 文档智能预览 (快速结构分析，无需全量解析)
- POST /analyze/images        — 批量 GPT-4o Vision 拓扑图识别
- POST /extract/topology      — 单张拓扑图提取 (GPT-4o Vision)
"""

from __future__ import annotations

import dataclasses
import logging
from contextlib import asynccontextmanager
from typing import Any, AsyncGenerator

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from analyzers import analyze_markdown_structure, DocumentInsights
from config import HOST, MAX_FILE_SIZE, PORT
from parsers import ParseResult, is_mineru_available, parse_document

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("ai-engine")

# ── 响应模型 ──────────────────────────────────────────────────────────


class HealthResponse(BaseModel):
    status: str
    service: str
    mineru_available: bool
    supported_formats: list[str]


class ParseResponse(BaseModel):
    markdown: str
    plain_text: str
    images: list[dict]
    tables: list[dict]
    page_count: int
    parser_used: str
    metadata: dict


class AnalyzeResponse(BaseModel):
    """文档智能预览响应"""
    word_count: int
    section_count: int
    heading_count: int
    cli_block_count: int
    comparison_table_count: int
    procedure_list_count: int
    image_count: int
    suggested_level_types: dict[str, int]
    gpt_hints: str
    headings: list[dict[str, Any]]


# ── App Lifecycle ─────────────────────────────────────────────────────


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """启动时预检 MinerU 可用性"""
    available = is_mineru_available()
    logger.info(f"AI Engine 启动 — MinerU: {'✅ 可用' if available else '⚠️ 不可用 (使用 fallback)'}")
    yield
    logger.info("AI Engine 关闭")


app = FastAPI(
    title="SkillQuest AI Engine",
    description="MinerU 2.5 文档解析 + 结构分析 + GPT-4o Vision 拓扑图识别 + 关卡直接生成",
    version="0.3.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── 健康检查 ──────────────────────────────────────────────────────────


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    """健康检查 + 能力报告"""
    return HealthResponse(
        status="ok",
        service="skillquest-ai-engine",
        mineru_available=is_mineru_available(),
        supported_formats=["pdf", "docx", "pptx", "txt", "md"],
    )


# ── 文档解析 ──────────────────────────────────────────────────────────


@app.post("/parse", response_model=ParseResponse)
async def parse(
    file: UploadFile = File(..., description="文档文件 (PDF/DOCX/PPTX/TXT)"),
    filename_override: str = Form(default="", description="覆盖文件名 (可选)"),
) -> ParseResponse:
    """
    解析文档 — 核心端点

    上传文档文件，返回结构化的解析结果:
    - markdown: 完整的 Markdown 文本 (含表格、标题、列表)
    - plain_text: 纯文本 (兼容旧管道)
    - images: 提取的图片列表
    - tables: 提取的表格列表 (HTML 格式)
    - parser_used: 使用的解析器 (mineru / pymupdf / docx / pptx)
    """
    if file.size and file.size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"文件过大: {file.size} 字节，限制 {MAX_FILE_SIZE} 字节",
        )

    filename = filename_override or file.filename or "unknown"
    content_type = file.content_type or ""

    try:
        file_bytes = await file.read()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"读取文件失败: {e}") from e

    if not file_bytes:
        raise HTTPException(status_code=400, detail="文件内容为空")

    logger.info(f"解析文档: {filename} ({content_type}, {len(file_bytes)} bytes)")

    try:
        result: ParseResult = await parse_document(
            file_bytes=file_bytes,
            filename=filename,
            mimetype=content_type,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e)) from e

    logger.info(
        f"解析完成: parser={result.parser_used}, "
        f"markdown={len(result.markdown)} chars, "
        f"images={len(result.images)}, tables={len(result.tables)}"
    )

    return ParseResponse(
        markdown=result.markdown,
        plain_text=result.plain_text,
        images=[dataclasses.asdict(img) for img in result.images],
        tables=[dataclasses.asdict(tbl) for tbl in result.tables],
        page_count=result.page_count,
        parser_used=result.parser_used,
        metadata=result.metadata,
    )


# ── 文档智能预览 ──────────────────────────────────────────────────────


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze(
    file: UploadFile = File(..., description="文档文件 (PDF/DOCX/PPTX/TXT)"),
    filename_override: str = Form(default="", description="覆盖文件名 (可选)"),
) -> AnalyzeResponse:
    """
    文档智能预览 — 快速结构分析

    解析文档后立即进行结构分析，返回:
    - 标题层级 / 章节数
    - CLI 代码块数量 → TERMINAL 关卡候选
    - 对比表格数量   → MATCHING 关卡候选
    - 步骤列表数量   → ORDERING 关卡候选
    - 图片数量       → TOPOLOGY 关卡候选
    - 建议关卡类型分布
    - GPT-4o 提示词增强文本

    比 /parse 快，适合在正式生成前给用户展示文档分析预览。
    """
    if file.size and file.size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"文件过大: {file.size} 字节，限制 {MAX_FILE_SIZE} 字节",
        )

    filename = filename_override or file.filename or "unknown"
    content_type = file.content_type or ""

    try:
        file_bytes = await file.read()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"读取文件失败: {e}") from e

    if not file_bytes:
        raise HTTPException(status_code=400, detail="文件内容为空")

    logger.info(f"分析文档结构: {filename} ({len(file_bytes)} bytes)")

    try:
        result: ParseResult = await parse_document(
            file_bytes=file_bytes,
            filename=filename,
            mimetype=content_type,
        )
    except (ValueError, RuntimeError) as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    # 对 Markdown 进行结构分析
    insights: DocumentInsights = analyze_markdown_structure(result.markdown)

    logger.info(
        f"文档分析完成: cli={len(insights.cli_blocks)}, "
        f"tables={len(insights.comparison_tables)}, "
        f"procedures={len(insights.procedure_lists)}, "
        f"images={len(insights.images)}"
    )

    return AnalyzeResponse(
        word_count=insights.word_count,
        section_count=insights.section_count,
        heading_count=len(insights.headings),
        cli_block_count=len(insights.cli_blocks),
        comparison_table_count=len(insights.comparison_tables),
        procedure_list_count=len(insights.procedure_lists),
        image_count=len(insights.images),
        suggested_level_types=insights.suggested_level_types,
        gpt_hints=insights.gpt_hints,
        headings=[
            {"level": h.level, "text": h.text, "index": h.index}
            for h in insights.headings[:20]
        ],
    )


# ── 批量图片拓扑识别 ──────────────────────────────────────────────────


@app.post("/analyze/images")
async def analyze_images(
    files: list[UploadFile] = File(..., description="图片文件列表 (PNG/JPG，最多10张)"),
) -> dict:
    """
    批量 GPT-4o Vision 拓扑图识别

    接收多张图片，逐一调用 GPT-4o Vision 判断是否为网络拓扑图。
    识别为拓扑图的，返回完整的 TopologyQuizLevel 数据。

    返回格式:
    {
      "results": [
        {
          "filename": "diagram.png",
          "is_topology": true,
          "confidence": 0.95,
          "nodes": [...],
          "edges": [...],
          "correctConnections": [...],
          "task": "...",
          ...
        },
        ...
      ],
      "topology_count": 2,
      "total_processed": 5
    }
    """
    from generators.topology_extractor import extract_topology_from_image

    if len(files) > 10:
        raise HTTPException(status_code=400, detail="最多支持同时分析 10 张图片")

    results = []
    topology_count = 0

    for upload in files:
        fname = upload.filename or "unknown"
        try:
            img_bytes = await upload.read()
            if not img_bytes:
                results.append({"filename": fname, "is_topology": False, "error": "空文件"})
                continue

            result = await extract_topology_from_image(img_bytes)
            result["filename"] = fname

            if result.get("is_topology"):
                topology_count += 1

            results.append(result)
            logger.info(f"图片分析: {fname} → is_topology={result.get('is_topology')}")

        except Exception as e:
            logger.error(f"图片分析失败 ({fname}): {e}")
            results.append({"filename": fname, "is_topology": False, "error": "图片处理失败，请检查格式是否正确"})

    return {
        "results": results,
        "topology_count": topology_count,
        "total_processed": len(results),
    }


# ── 拓扑图提取 (GPT-4o Vision) ───────────────────────────────────────


@app.post("/extract/topology")
async def extract_topology(
    file: UploadFile = File(..., description="拓扑图图片 (PNG/JPG)"),
) -> dict:
    """GPT-4o Vision: 从拓扑图截图提取网络结构"""
    from generators.topology_extractor import extract_topology_from_image

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="文件内容为空")

    result = await extract_topology_from_image(file_bytes)
    # Return only known safe fields (strip internal error details)
    if not result.get("is_topology") and result.get("error"):
        result = {"is_topology": False, "confidence": result.get("confidence", 0.0), "description": "拓扑识别失败，请检查图片格式"}
    return result


# ── 启动入口 ──────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=HOST, port=PORT, reload=False, log_level="info")

