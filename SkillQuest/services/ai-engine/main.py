"""
SkillQuest AI Engine — FastAPI 入口

提供文档解析 REST API，由 NestJS 主服务通过 HTTP 调用。
支持 MinerU 2.5 高精度解析 + 多格式 fallback。

端点:
- GET  /health          — 健康检查 + 能力报告
- POST /parse           — 解析文档 (PDF/DOCX/PPTX/TXT)
- POST /extract/topology — 从拓扑图提取网络结构 (GPT-4o Vision)
"""

from __future__ import annotations

import logging
import dataclasses
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from parsers import parse_document, is_mineru_available, ParseResult
from config import MAX_FILE_SIZE, HOST, PORT

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
    description="MinerU 2.5 文档解析 + LLM 题目生成 + GPT-4o Vision 拓扑图识别",
    version="0.2.0",
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
    return result


# ── 启动入口 ──────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=HOST, port=PORT, reload=False, log_level="info")

