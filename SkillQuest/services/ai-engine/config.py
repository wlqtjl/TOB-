"""
SkillQuest AI Engine — 配置管理

所有配置通过环境变量注入，适配 Docker / K8s / 裸机部署。
"""

import os
from pathlib import Path


# ── MinerU 模型配置 ─────────────────────────────────────────────────

# MinerU 模型目录 (首次运行时自动下载到此目录)
MINERU_MODEL_DIR: str = os.getenv("MINERU_MODEL_DIR", str(Path.home() / ".mineru" / "models"))

# 推理设备: cpu / cuda / mps (Apple Silicon)
MINERU_DEVICE: str = os.getenv("MINERU_DEVICE", "cpu")

# 是否启用 OCR (对扫描件/图片 PDF 必须开启)
MINERU_ENABLE_OCR: bool = os.getenv("MINERU_ENABLE_OCR", "true").lower() in ("true", "1", "yes")

# ── 服务配置 ─────────────────────────────────────────────────────────

# FastAPI 监听地址
HOST: str = os.getenv("AI_ENGINE_HOST", "127.0.0.1")
PORT: int = int(os.getenv("AI_ENGINE_PORT", "8000"))

# 临时文件目录 (解析产物缓存)
TEMP_DIR: str = os.getenv("MINERU_TEMP_DIR", "/tmp/mineru-workdir")

# 上传文件大小限制 (字节)
MAX_FILE_SIZE: int = int(os.getenv("MAX_FILE_SIZE", str(50 * 1024 * 1024)))  # 50 MB

# ── OpenAI 配置 (拓扑图识别用) ──────────────────────────────────────

OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
