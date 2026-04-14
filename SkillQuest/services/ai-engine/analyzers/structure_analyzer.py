"""
文档结构分析器 — MinerU Markdown 解析 → 游戏关卡线索

核心思路:
  MinerU 2.5 生成的 Markdown 保留了文档的语义结构:
    - 标题层级 (# ## ###) → 课程章节 + 前置依赖 DAG
    - 有序列表 (1. 2. 3.) → ORDERING 关卡（步骤排序题）
    - 表格 (| col | col |) → MATCHING 关卡（连线配对题）
    - 代码块 (```bash) → TERMINAL 关卡（命令填空题）
    - 图片引用 (![]) → 候选拓扑图 → TOPOLOGY 关卡

这些信息以 DocumentInsights 结构返回，供:
  1. /analyze 端点快速预览（无需全量 AI 生成）
  2. GPT-4o 提示词增强（引导生成正确题型）
  3. DirectLevelFactory 直接生成关卡（零 GPT-4o 成本）
"""

from __future__ import annotations

import re
import logging
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)

# ── 数据模型 ──────────────────────────────────────────────────────────


@dataclass
class HeadingNode:
    """Markdown 标题节点，用于构建课程 DAG"""
    level: int      # 1=H1, 2=H2, 3=H3
    text: str
    index: int      # 在文档中的顺序（从 0 开始）
    children: list[HeadingNode] = field(default_factory=list)


@dataclass
class CodeBlock:
    """提取的代码块"""
    language: str    # bash, shell, python, cli, vrp, etc.
    code: str
    context: str     # 代码块前的段落（用作场景描述）
    is_cli: bool     # 是否是命令行 (shell/bash/vrp/cli)


@dataclass
class TableData:
    """提取的表格"""
    headers: list[str]
    rows: list[list[str]]
    caption: str     # 表格前的段落（用作题目说明）
    is_comparison: bool   # 是否是对比表（2列，适合 MATCHING）


@dataclass
class OrderedList:
    """提取的有序列表"""
    items: list[str]
    context: str     # 列表前的段落（用作场景描述）
    is_procedure: bool   # 是否是操作步骤（适合 ORDERING）


@dataclass
class ImageReference:
    """Markdown 中的图片引用（MinerU 生成的本地图片路径）"""
    alt_text: str
    path: str        # 可能是本地路径或 URL
    context: str     # 图片前的段落


@dataclass
class DocumentInsights:
    """
    文档结构化洞察 — MinerU Markdown 分析结果

    包含从文档结构中自动提取的课程设计线索。
    """
    # 标题层级 (平铺列表，按顺序排列)
    headings: list[HeadingNode] = field(default_factory=list)

    # 代码块列表 (按在文档中的顺序)
    code_blocks: list[CodeBlock] = field(default_factory=list)

    # CLI 代码块 (is_cli=True 的子集，适合生成 TERMINAL 关卡)
    cli_blocks: list[CodeBlock] = field(default_factory=list)

    # 表格列表
    tables: list[TableData] = field(default_factory=list)

    # 对比表 (适合生成 MATCHING 关卡)
    comparison_tables: list[TableData] = field(default_factory=list)

    # 有序列表
    ordered_lists: list[OrderedList] = field(default_factory=list)

    # 步骤类有序列表 (适合生成 ORDERING 关卡)
    procedure_lists: list[OrderedList] = field(default_factory=list)

    # 图片引用 (候选拓扑图)
    images: list[ImageReference] = field(default_factory=list)

    # 统计摘要
    word_count: int = 0
    section_count: int = 0

    # GPT-4o 提示词增强文本 (直接嵌入到 AI 生成请求中)
    gpt_hints: str = ""

    # 建议的关卡类型分布
    suggested_level_types: dict[str, int] = field(default_factory=dict)


# ── 主分析入口 ────────────────────────────────────────────────────────


def analyze_markdown_structure(markdown: str) -> DocumentInsights:
    """
    分析 MinerU 生成的 Markdown，提取课程设计线索。

    Args:
        markdown: MinerU 2.5 输出的 Markdown 文本

    Returns:
        DocumentInsights: 结构化洞察
    """
    insights = DocumentInsights()

    if not markdown.strip():
        return insights

    lines = markdown.split("\n")
    insights.word_count = len(markdown.split())

    # 按顺序提取各类结构元素
    _extract_headings(lines, insights)
    _extract_code_blocks(lines, insights)
    _extract_tables(lines, insights)
    _extract_ordered_lists(lines, insights)
    _extract_images(lines, insights)

    # 计算统计和建议
    _compute_suggestions(insights)
    _build_gpt_hints(insights)

    logger.info(
        f"文档结构分析: headings={len(insights.headings)}, "
        f"cli_blocks={len(insights.cli_blocks)}, "
        f"comparison_tables={len(insights.comparison_tables)}, "
        f"procedure_lists={len(insights.procedure_lists)}, "
        f"images={len(insights.images)}"
    )

    return insights


# ── 标题提取 ──────────────────────────────────────────────────────────

def _extract_headings(lines: list[str], insights: DocumentInsights) -> None:
    """提取 Markdown 标题，构建层级结构"""
    heading_pattern = re.compile(r'^(#{1,3})\s+(.+)$')
    headings: list[HeadingNode] = []
    idx = 0

    for line in lines:
        m = heading_pattern.match(line.strip())
        if m:
            level = len(m.group(1))
            text = m.group(2).strip()
            headings.append(HeadingNode(level=level, text=text, index=idx))
            idx += 1

    insights.headings = headings
    insights.section_count = len([h for h in headings if h.level == 1])


# ── 代码块提取 ────────────────────────────────────────────────────────

# 命令行语言标识符
_CLI_LANGS = frozenset({
    "bash", "sh", "shell", "zsh", "cmd", "powershell", "ps1",
    "cli", "vrp", "huawei", "cisco", "juniper", "terminal",
    "console", "text",  # sometimes used for CLI output
})


def _extract_code_blocks(lines: list[str], insights: DocumentInsights) -> None:
    """提取 Markdown 代码块"""
    code_blocks: list[CodeBlock] = []
    i = 0
    recent_paragraph = ""

    while i < len(lines):
        line = lines[i]

        # 跟踪最近的段落（用作 context）
        stripped = line.strip()
        if stripped and not stripped.startswith("#") and not stripped.startswith("|") and not stripped.startswith("```"):
            if len(stripped) > 20:
                recent_paragraph = stripped

        # 代码块开始
        if stripped.startswith("```"):
            lang = stripped[3:].strip().lower()
            code_lines: list[str] = []
            i += 1

            # 读取代码块内容
            while i < len(lines) and not lines[i].strip().startswith("```"):
                code_lines.append(lines[i])
                i += 1

            code = "\n".join(code_lines).strip()
            if code:
                is_cli = lang in _CLI_LANGS or _looks_like_cli(code)
                cb = CodeBlock(
                    language=lang or "text",
                    code=code,
                    context=recent_paragraph,
                    is_cli=is_cli,
                )
                code_blocks.append(cb)

        i += 1

    insights.code_blocks = code_blocks
    insights.cli_blocks = [cb for cb in code_blocks if cb.is_cli and _count_commands(cb.code) >= 2]


def _looks_like_cli(code: str) -> bool:
    """启发式判断代码块是否是命令行"""
    cli_patterns = [
        r"^\s*\$\s+\S",                # $ command
        r"^\s*>\s+\S",                 # > command (Windows)
        r"^\s*#\s+\S",                 # # root command
        r"<[A-Z][A-Za-z0-9-]+>",      # <RouterName> prompt (Huawei VRP)
        r"\[.*\]\s*\$",               # [user@host]$
        r"(?:display|interface|ip route|vlan|system-view|commit)",  # Huawei
        r"(?:show |configure terminal|interface |ip address )",     # Cisco
        r"(?:sudo |apt |yum |systemctl |docker |kubectl )",         # Linux
    ]
    for pattern in cli_patterns:
        if re.search(pattern, code, re.MULTILINE | re.IGNORECASE):
            return True
    return False


def _count_commands(code: str) -> int:
    """粗略统计命令数量（非空行数）"""
    return sum(1 for line in code.split("\n") if line.strip() and not line.strip().startswith("#"))


# ── 表格提取 ──────────────────────────────────────────────────────────

def _extract_tables(lines: list[str], insights: DocumentInsights) -> None:
    """提取 Markdown 表格"""
    tables: list[TableData] = []
    i = 0
    recent_paragraph = ""

    while i < len(lines):
        line = lines[i].strip()

        # 非空非表格行作为 context
        if line and not line.startswith("|") and not line.startswith("#"):
            if len(line) > 10:
                recent_paragraph = line

        # 检测表格开始
        if line.startswith("|") and i + 1 < len(lines):
            next_line = lines[i + 1].strip()
            if re.match(r'^\|[\s\-|:]+\|$', next_line):
                # 解析表头
                headers = _parse_table_row(line)
                i += 2  # 跳过分隔行

                # 解析数据行
                rows: list[list[str]] = []
                while i < len(lines) and lines[i].strip().startswith("|"):
                    row = _parse_table_row(lines[i])
                    if row:
                        rows.append(row)
                    i += 1

                if headers and rows:
                    is_comparison = _is_comparison_table(headers, rows)
                    tables.append(TableData(
                        headers=headers,
                        rows=rows,
                        caption=recent_paragraph,
                        is_comparison=is_comparison,
                    ))
                continue

        i += 1

    insights.tables = tables
    insights.comparison_tables = [t for t in tables if t.is_comparison]


def _parse_table_row(line: str) -> list[str]:
    """解析 Markdown 表格行"""
    line = line.strip()
    if line.startswith("|"):
        line = line[1:]
    if line.endswith("|"):
        line = line[:-1]
    cells = [c.strip() for c in line.split("|")]
    return [c for c in cells if c]


def _is_comparison_table(headers: list[str], rows: list[list[str]]) -> bool:
    """
    判断是否是适合生成 MATCHING 关卡的对比表。

    条件:
    - 2列 (左列=概念/名称, 右列=描述/值)
    - 行数在 3-10 之间（适合 MATCHING）
    """
    if len(headers) == 2 and 3 <= len(rows) <= 10:
        left_avg_len = sum(len(r[0]) for r in rows if r) / len(rows) if rows else 0
        if left_avg_len < 40:
            return True
    return False


# ── 有序列表提取 ──────────────────────────────────────────────────────

def _extract_ordered_lists(lines: list[str], insights: DocumentInsights) -> None:
    """提取 Markdown 有序列表"""
    ordered_lists: list[OrderedList] = []
    ordered_pattern = re.compile(r'^\s*(\d+)[.)]\s+(.+)$')
    i = 0
    recent_paragraph = ""

    while i < len(lines):
        line = lines[i]
        stripped = line.strip()

        # 非空非列表行作为 context
        if stripped and not ordered_pattern.match(stripped) and not stripped.startswith("|") and not stripped.startswith("#"):
            if len(stripped) > 15:
                recent_paragraph = stripped

        m = ordered_pattern.match(stripped)
        if m:
            items: list[str] = [m.group(2).strip()]
            expected = int(m.group(1)) + 1
            i += 1

            # 读取连续的有序列表项
            while i < len(lines):
                next_stripped = lines[i].strip()
                nm = ordered_pattern.match(next_stripped)
                if nm and int(nm.group(1)) == expected:
                    items.append(nm.group(2).strip())
                    expected += 1
                    i += 1
                elif next_stripped == "":
                    i += 1
                    if i < len(lines):
                        nm2 = ordered_pattern.match(lines[i].strip())
                        if nm2 and int(nm2.group(1)) == expected:
                            continue
                    break
                else:
                    break

            if len(items) >= 3:
                is_procedure = _looks_like_procedure(items, recent_paragraph)
                ordered_lists.append(OrderedList(
                    items=items,
                    context=recent_paragraph,
                    is_procedure=is_procedure,
                ))
            continue

        i += 1

    insights.ordered_lists = ordered_lists
    insights.procedure_lists = [
        ol for ol in ordered_lists if ol.is_procedure and 4 <= len(ol.items) <= 10
    ]


def _looks_like_procedure(items: list[str], context: str) -> bool:
    """判断有序列表是否是操作步骤"""
    procedure_keywords = {
        "步骤", "操作", "配置", "安装", "部署", "创建", "设置", "启动",
        "执行", "运行", "step", "configure", "install", "setup", "create",
        "click", "select", "enter", "open", "close", "start", "stop",
    }
    text = " ".join(items[:3]).lower() + " " + context.lower()
    return any(kw in text for kw in procedure_keywords)


# ── 图片提取 ──────────────────────────────────────────────────────────

def _extract_images(lines: list[str], insights: DocumentInsights) -> None:
    """提取 Markdown 图片引用"""
    images: list[ImageReference] = []
    img_pattern = re.compile(r'!\[([^\]]*)\]\(([^)]+)\)')
    recent_paragraph = ""

    for line in lines:
        stripped = line.strip()

        # 非图片行作为 context
        if stripped and not stripped.startswith("!") and not stripped.startswith("|") and not stripped.startswith("#"):
            if len(stripped) > 10:
                recent_paragraph = stripped

        for m in img_pattern.finditer(stripped):
            alt = m.group(1).strip()
            path = m.group(2).strip()
            images.append(ImageReference(
                alt_text=alt,
                path=path,
                context=recent_paragraph,
            ))

    insights.images = images


# ── 统计与建议 ────────────────────────────────────────────────────────

def _compute_suggestions(insights: DocumentInsights) -> None:
    """根据文档结构计算建议的关卡类型分布"""
    suggestions: dict[str, int] = {}

    # CLI 代码块 → TERMINAL 关卡
    terminal_count = min(len(insights.cli_blocks), 3)
    if terminal_count > 0:
        suggestions["TERMINAL"] = terminal_count

    # 对比表 → MATCHING 关卡
    matching_count = min(len(insights.comparison_tables), 3)
    if matching_count > 0:
        suggestions["MATCHING"] = matching_count

    # 步骤列表 → ORDERING 关卡
    ordering_count = min(len(insights.procedure_lists), 2)
    if ordering_count > 0:
        suggestions["ORDERING"] = ordering_count

    # 图片 → 候选 TOPOLOGY 关卡 (需要 Vision 进一步确认)
    if insights.images:
        suggestions["TOPOLOGY"] = min(len(insights.images), 2)

    # 补充 QUIZ (始终存在)
    quiz_count = max(3, 8 - sum(suggestions.values()))
    suggestions["QUIZ"] = quiz_count

    # 如果有足够内容，加 SCENARIO
    if insights.word_count > 2000 and "SCENARIO" not in suggestions:
        suggestions["SCENARIO"] = 1

    insights.suggested_level_types = suggestions


def _build_gpt_hints(insights: DocumentInsights) -> None:
    """构建 GPT-4o 提示词增强文本"""
    parts: list[str] = []

    if insights.suggested_level_types:
        dist = ", ".join(f"{k}×{v}" for k, v in insights.suggested_level_types.items())
        parts.append(f"[文档分析建议的关卡类型分布: {dist}]")

    if insights.cli_blocks:
        sample = insights.cli_blocks[0].code[:300]
        parts.append(
            f"[文档含 {len(insights.cli_blocks)} 个CLI命令块，建议生成 TERMINAL 关卡。"
            f"示例命令:\n```\n{sample}\n```]"
        )

    if insights.comparison_tables:
        t = insights.comparison_tables[0]
        if t.headers and t.rows:
            pairs_preview = "; ".join(
                f"{r[0]} → {r[1]}" for r in t.rows[:3] if len(r) >= 2
            )
            parts.append(
                f"[文档含 {len(insights.comparison_tables)} 个对比表，建议生成 MATCHING 关卡。"
                f"示例配对: {pairs_preview}]"
            )

    if insights.procedure_lists:
        pl = insights.procedure_lists[0]
        steps_preview = " → ".join(pl.items[:4])
        parts.append(
            f"[文档含 {len(insights.procedure_lists)} 个操作步骤序列，建议生成 ORDERING 关卡。"
            f"示例步骤: {steps_preview}]"
        )

    if insights.images:
        parts.append(
            f"[文档含 {len(insights.images)} 张图片，"
            f"可能包含网络拓扑图，建议生成 TOPOLOGY 关卡]"
        )

    if insights.headings:
        top_sections = [h.text for h in insights.headings if h.level == 1][:5]
        if top_sections:
            parts.append(f"[文档主要章节: {' / '.join(top_sections)}]")

    insights.gpt_hints = "\n".join(parts)
