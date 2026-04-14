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
- POST /extract/flow-sim      — 从文档文本/Mermaid 提取 FLOW_SIM 关卡
- POST /replay/trace          — OpenTelemetry Trace → FLOW_SIM 关卡回放
"""

from __future__ import annotations

import dataclasses
import logging
import os
from contextlib import asynccontextmanager
from typing import Any, AsyncGenerator

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from analyzers import analyze_markdown_structure, DocumentInsights
from config import HOST, MAX_FILE_SIZE, PORT
from parsers import ParseResult, is_mineru_available, parse_document
from rag import chunk_markdown, embed_texts, embed_query, retrieve_relevant_chunks

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
    allow_origins=os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:3001").split(","),
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Authorization"],
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

    # Whitelist of safe response keys — never expose internal/exception-derived fields
    _SAFE_KEYS = frozenset({
        "filename", "is_topology", "confidence", "key_concept",
        "nodes", "edges", "correctConnections", "packetPath",
        "task", "explanation", "description",
    })

    safe_results = []
    topology_count = 0

    for upload in files:
        fname = upload.filename or "unknown"
        try:
            img_bytes = await upload.read()
            if not img_bytes:
                safe_results.append({"filename": fname, "is_topology": False})
                continue

            result = await extract_topology_from_image(img_bytes)

            if result.get("is_topology"):
                topology_count += 1

            # Only include known-safe keys in the response
            safe_result = {k: result[k] for k in _SAFE_KEYS if k in result}
            safe_result["filename"] = fname
            safe_results.append(safe_result)
            logger.info(f"图片分析: {fname} → is_topology={result.get('is_topology')}")

        except Exception as e:
            logger.error(f"图片分析失败 ({fname}): {e}")
            safe_results.append({"filename": fname, "is_topology": False})

    return {
        "results": safe_results,
        "topology_count": topology_count,
        "total_processed": len(safe_results),
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
    # Return only the known-safe fields — never expose internal error or exception details
    _SAFE_KEYS = frozenset({
        "is_topology", "confidence", "key_concept", "nodes", "edges",
        "correctConnections", "packetPath", "task", "explanation", "description",
    })
    if not result.get("is_topology"):
        return {"is_topology": False, "confidence": float(result.get("confidence") or 0), "description": "拓扑识别失败，请检查图片格式"}
    return {k: result[k] for k in _SAFE_KEYS if k in result}


# ── FLOW_SIM 关卡提取 ─────────────────────────────────────────────────


class FlowSimTextRequest(BaseModel):
    """从文本/Mermaid 提取 FLOW_SIM 关卡的请求体"""
    text: str
    """技术文档文本或 Mermaid sequenceDiagram 文本"""
    level_id: str = "flow-sim-1"
    level_id_ref: str = "level-1"
    mode: str = "observe"
    """'observe' | 'route' | 'failover'"""
    task: str = ""
    explanation: str = ""
    playback_speed: float = 1.0
    """播放速度倍数 (0.1 ~ 10)"""
    is_mermaid: bool = False
    """True=输入为 Mermaid sequenceDiagram; False=普通文本(自动提取)"""


@app.post("/extract/flow-sim")
async def extract_flow_sim(req: FlowSimTextRequest) -> dict:
    """
    从技术文档文本或 Mermaid 序列图提取 FLOW_SIM 关卡。

    两种工作模式 (由 is_mermaid 参数控制):
      is_mermaid=false (默认): 使用关键词正则 + spaCy (若可用) 从自然语言文本提取组件和数据流边
      is_mermaid=true:         精确解析 Mermaid sequenceDiagram 语法

    请求体 (JSON):
      text:           必填，技术文档文本或 Mermaid 文本
      level_id:       生成的关卡 ID (默认 flow-sim-1)
      level_id_ref:   关联的 LevelNode ID (默认 level-1)
      mode:           'observe' | 'route' | 'failover' (默认 observe)
      task:           关卡任务描述 (空则自动生成)
      explanation:    关卡解析 (空则自动生成)
      playback_speed: 初始播放速度 0.1~10 (默认 1.0)
      is_mermaid:     是否为 Mermaid 格式 (默认 false)

    返回: FLOW_SIM 关卡 JSON (符合 FlowSimLevel schema)
    """
    if not req.text or not req.text.strip():
        raise HTTPException(status_code=400, detail="text 参数不能为空")

    playback_speed = max(0.1, min(10.0, req.playback_speed))

    if req.is_mermaid:
        from generators.mermaid_to_flow_sim import mermaid_to_flow_sim
        level = mermaid_to_flow_sim(
            mermaid_text=req.text,
            level_id=req.level_id,
            level_id_ref=req.level_id_ref,
            mode=req.mode,
            task=req.task,
            explanation=req.explanation,
            playback_speed=playback_speed,
        )
    else:
        from generators.flow_sim_factory import text_to_flow_sim
        level = text_to_flow_sim(
            text=req.text,
            level_id=req.level_id,
            level_id_ref=req.level_id_ref,
            mode=req.mode,
            task=req.task,
            explanation=req.explanation,
            playback_speed=playback_speed,
        )

    if not level:
        raise HTTPException(
            status_code=422,
            detail="无法从提供的文本中提取数据流向信息，请确保文本描述了组件间的消息传递或数据流"
        )
    return level


# ── OpenTelemetry Trace 回放 ──────────────────────────────────────────


class TraceReplayRequest(BaseModel):
    """OTLP Trace → FLOW_SIM 请求体"""
    otlp_json: dict
    """OTLP ExportTraceServiceRequest JSON"""
    level_id: str = "trace-replay-1"
    level_id_ref: str = "level-1"
    mode: str = "observe"
    """'observe' | 'route' | 'failover'"""
    task: str = ""
    explanation: str = ""
    playback_speed: float = 1.0
    """播放速度倍数 (0.1 ~ 10); 支持 0.1x 慢动作 ~ 10x 快进"""
    max_steps: int = 20
    """最大步骤数限制 (防止 Trace 过长)"""
    error_as_fault: bool = True
    """是否将 ERROR span 转为 FlowSimFault 故障事件 (failover 模式)"""


@app.post("/replay/trace")
async def replay_trace(req: TraceReplayRequest) -> dict:
    """
    将 OpenTelemetry OTLP Trace JSON 转换为 FLOW_SIM 关卡。

    这是 Phase 3 的核心功能: 把生产环境的真实 Trace (从 Jaeger/Tempo/Zipkin 导出)
    变成 SkillQuest 可玩关卡:
      - 每个跨服务 Span → 一个粒子动画步骤
      - ERROR Span → FlowSimFault 故障事件 (mode=failover 时激活)
      - playbackSpeed 支持 0.1x 慢放 (看清每一步) ~ 10x 快进 (看全局流向)

    请求体 (JSON):
      otlp_json:      必填, OTLP ExportTraceServiceRequest JSON
      level_id:       关卡 ID (默认 trace-replay-1)
      level_id_ref:   关联的 LevelNode ID (默认 level-1)
      mode:           'observe' | 'route' | 'failover'
      task:           关卡任务描述
      explanation:    关卡解析
      playback_speed: 0.1 ~ 10 (默认 1.0)
      max_steps:      最大步骤数 (默认 20)
      error_as_fault: 是否将 ERROR span 转为故障事件 (默认 true)

    返回: FLOW_SIM 关卡 JSON
    """
    if not req.otlp_json:
        raise HTTPException(status_code=400, detail="otlp_json 不能为空")

    playback_speed = max(0.1, min(10.0, req.playback_speed))
    max_steps = max(1, min(50, req.max_steps))

    from generators.otlp_trace_replay import otlp_trace_to_flow_sim
    level = otlp_trace_to_flow_sim(
        otlp_json=req.otlp_json,
        level_id=req.level_id,
        level_id_ref=req.level_id_ref,
        mode=req.mode,
        task=req.task,
        explanation=req.explanation,
        playback_speed=playback_speed,
        max_steps=max_steps,
        error_as_fault=req.error_as_fault,
    )

    if not level:
        raise HTTPException(
            status_code=422,
            detail="无法从提供的 OTLP Trace 中提取跨服务调用步骤，请检查 Trace 格式是否正确"
        )
    return level


# ── RAG 文档索引与检索 ──────────────────────────────────────────────


class RagIndexRequest(BaseModel):
    """文档 RAG 索引请求"""
    markdown: str
    """Markdown 格式的文档内容"""
    course_id: str = "default"
    """关联课程 ID"""
    target_chars: int = 1500
    """目标片段字符数"""
    overlap_chars: int = 200
    """相邻片段重叠字符数"""


class RagQueryRequest(BaseModel):
    """RAG 语义检索请求"""
    query: str
    """检索查询文本"""
    course_id: str = "default"
    """限定检索的课程 ID"""
    top_k: int = 5
    """返回前 K 个最相关片段"""
    min_score: float = 0.3
    """最低相似度阈值"""
    chapter_hint: str = ""
    """章节加权提示 (匹配的章节得分 ×1.3)"""


# 内存索引存储 (生产环境用 pgvector, 这里做进程内缓存)
_rag_index: dict[str, dict] = {}


@app.post("/rag/index")
async def rag_index(req: RagIndexRequest) -> dict:
    """
    索引文档 — 将 Markdown 切片并生成 embedding

    流程: Markdown → 按章节/段落切片 → OpenAI embedding → 缓存到内存

    生产环境应将 embedding 持久化到 pgvector (由 NestJS API 层负责写入 DocumentChunk 表)。
    本端点用于快速验证和开发阶段。
    """
    if not req.markdown or not req.markdown.strip():
        raise HTTPException(status_code=400, detail="markdown 不能为空")

    chunks = chunk_markdown(
        req.markdown,
        target_chars=req.target_chars,
        overlap_chars=req.overlap_chars,
    )

    if not chunks:
        return {"course_id": req.course_id, "chunk_count": 0, "indexed": False}

    texts = [c.content for c in chunks]
    embeddings = await embed_texts(texts)

    _rag_index[req.course_id] = {
        "chunks": chunks,
        "embeddings": embeddings,
    }

    logger.info(f"RAG 索引完成: course={req.course_id}, chunks={len(chunks)}")

    return {
        "course_id": req.course_id,
        "chunk_count": len(chunks),
        "indexed": True,
        "chunks_preview": [
            {
                "index": c.index,
                "chapter_title": c.chapter_title,
                "char_count": c.char_count,
                "estimated_tokens": c.estimated_tokens,
                "has_tech_spec": c.metadata.get("has_tech_spec", False),
            }
            for c in chunks[:20]
        ],
    }


@app.post("/rag/query")
async def rag_query(req: RagQueryRequest) -> dict:
    """
    语义检索 — 从已索引的文档中检索最相关片段

    用于 AI 出题时精确引用原文参数/阈值/架构逻辑。
    返回的 source_quote 将直接嵌入题目 JSON。
    """
    if not req.query or not req.query.strip():
        raise HTTPException(status_code=400, detail="query 不能为空")

    index_data = _rag_index.get(req.course_id)
    if not index_data:
        return {
            "query": req.query,
            "course_id": req.course_id,
            "results": [],
            "total": 0,
            "message": f"课程 {req.course_id} 尚未索引, 请先调用 /rag/index",
        }

    query_emb = await embed_query(req.query)

    results = retrieve_relevant_chunks(
        query_embedding=query_emb,
        chunks=index_data["chunks"],
        chunk_embeddings=index_data["embeddings"],
        top_k=req.top_k,
        min_score=req.min_score,
        chapter_weight=req.chapter_hint or None,
    )

    logger.info(f"RAG 检索: query='{req.query[:50]}...', results={len(results)}")

    return {
        "query": req.query,
        "course_id": req.course_id,
        "results": [
            {
                "chunk_index": r.chunk.index,
                "chapter_title": r.chunk.chapter_title,
                "content": r.chunk.content,
                "score": round(r.score, 4),
                "metadata": r.chunk.metadata,
            }
            for r in results
        ],
        "total": len(results),
    }


# ── 题目生成 ──────────────────────────────────────────────────────────


class GenerateRequest(BaseModel):
    """题目生成请求"""
    content: str
    """培训材料文本 (Markdown 或纯文本)"""
    vendor: str = "通用"
    """厂商名称"""
    difficulty: str = "beginner"
    """难度: beginner / intermediate / advanced"""


@app.post("/generate")
async def generate_questions(req: GenerateRequest) -> dict:
    """
    从培训材料文本生成关卡题目

    调用 GPT-4o API 生成单选题、排序题、连线题。
    若 OPENAI_API_KEY 未设置或 API 调用失败，自动降级为规则生成。
    """
    from generators.question_generator import generate_level_from_material

    if not req.content.strip():
        raise HTTPException(status_code=400, detail="培训材料内容不能为空")

    difficulty = req.difficulty if req.difficulty in ("beginner", "intermediate", "advanced") else "beginner"

    logger.info(
        f"生成题目: vendor={req.vendor}, difficulty={difficulty}, "
        f"content_len={len(req.content)}"
    )

    result = await generate_level_from_material(
        content=req.content,
        vendor=req.vendor,
        difficulty=difficulty,  # type: ignore[arg-type]
    )

    logger.info(f"题目生成完成: status={result.get('status')}, questions={len(result.get('questions', []))}")
    return result


# ── 启动入口 ──────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=HOST, port=PORT, reload=False, log_level="info")

