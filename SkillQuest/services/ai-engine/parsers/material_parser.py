"""
培训材料解析器

支持: PDF, PPT, DOCX
抽取: 纯文本 + 图片(拓扑图) + 表格
"""


async def parse_pdf(file_bytes: bytes) -> dict:
    """解析PDF培训材料 — Phase 2 实现 (PyMuPDF / pdfplumber)"""
    return {"status": "placeholder", "message": "Phase 2: PDF parsing"}


async def parse_ppt(file_bytes: bytes) -> dict:
    """解析PPT培训材料 — Phase 2 实现 (python-pptx)"""
    return {"status": "placeholder", "message": "Phase 2: PPT parsing"}
