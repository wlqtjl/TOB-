"""
SkillQuest AI Engine — FastAPI 入口

提供:
- POST /parse/pdf     — 解析PDF培训材料
- POST /parse/ppt     — 解析PPT培训材料
- POST /generate/level — AI生成关卡题目
- POST /extract/topology — 从拓扑图提取网络结构
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="SkillQuest AI Engine",
    description="PDF/PPT解析 + LLM题目生成 + GPT-4o Vision 拓扑图识别",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "skillquest-ai-engine"}


@app.post("/parse/pdf")
async def parse_pdf():
    """解析PDF培训材料，抽取知识点"""
    return {"message": "PDF parsing — Phase 2 实现"}


@app.post("/parse/ppt")
async def parse_ppt():
    """解析PPT培训材料，抽取知识点和拓扑图"""
    return {"message": "PPT parsing — Phase 2 实现"}


@app.post("/generate/level")
async def generate_level():
    """AI生成关卡题目 (含单选/排序/连线/拓扑/终端/情景)"""
    return {"message": "Level generation — Phase 2 实现"}


@app.post("/extract/topology")
async def extract_topology():
    """GPT-4o Vision: 从拓扑图截图提取网络结构"""
    return {"message": "Topology extraction — Phase 2 实现"}
