"""
关卡直接生成工厂 — 从文档结构零成本生成 SkillQuest 关卡

核心价值:
  MinerU 提取的结构化内容可以直接映射到 SkillQuest 的游戏关卡，
  无需调用 GPT-4o，实现零 AI 成本的内容生成。

映射规则:
  CLI 代码块 → TERMINAL 关卡 (命令填空题)
  对比表格   → MATCHING 关卡 (连线配对题)
  步骤列表   → ORDERING 关卡 (步骤排序题)
  拓扑图像   → TOPOLOGY 关卡 (GPT-4o Vision 后续处理)

生成的关卡内容完全符合 SkillQuest 的 content schema，
可直接存入数据库并被游戏引擎渲染。
"""

from __future__ import annotations

import random
import re
import logging
from typing import Any

from analyzers.structure_analyzer import CodeBlock, TableData, OrderedList

logger = logging.getLogger(__name__)

# ── CLI 代码块 → TERMINAL 关卡 ────────────────────────────────────────


def code_block_to_terminal_level(
    cb: CodeBlock,
    sort_order: int,
    level_id_prefix: str = "direct",
) -> dict[str, Any]:
    """
    将 CLI 代码块转换为 TERMINAL 关卡。

    策略:
      1. 将代码分为"上文命令"和"需要填空的命令"
      2. 取最后 1-2 条命令作为填空目标（前面的作为上下文）
      3. 对每个填空命令生成 hints（按空格分词）

    Args:
        cb: CLI 代码块数据
        sort_order: 关卡排序号
        level_id_prefix: 关卡 ID 前缀

    Returns:
        符合 TERMINAL content schema 的关卡 dict
    """
    commands = _parse_cli_commands(cb.code)
    if len(commands) < 2:
        return {}

    # 前 N-1 条作为上文，最后 1-2 条作为填空
    n_blanks = min(2, max(1, len(commands) // 3))
    context_cmds = commands[:-n_blanks]
    blank_cmds = commands[-n_blanks:]

    # 构建 terminalLines
    terminal_lines = []
    for cmd in context_cmds:
        terminal_lines.append({
            "prompt": cmd["prompt"],
            "command": cmd["command"],
            "output": cmd.get("output", ""),
        })

    # 构建 blankCommands
    blank_commands = []
    for cmd in blank_cmds:
        hints = _generate_hints(cmd["command"])
        blank_commands.append({
            "prompt": cmd["prompt"],
            "answer": cmd["command"],
            "hints": hints,
            "fuzzyMatch": True,
        })

    level_id = f"{level_id_prefix}-terminal-{sort_order}"
    scenario = cb.context or f"配置命令行场景（关卡 {sort_order}）"

    return {
        "id": level_id,
        "sortOrder": sort_order,
        "title": f"命令行操作: {_summarize_commands(commands[:2])}",
        "type": "TERMINAL",
        "description": f"根据场景描述，填写缺失的命令行指令",
        "timeLimitSec": 180,
        "positionX": 0,
        "positionY": 0,
        "content": {
            "id": level_id,
            "levelId": level_id,
            "type": "terminal",
            "scenario": scenario,
            "terminalLines": terminal_lines,
            "blankCommands": blank_commands,
            "successOutput": "✅ 命令执行成功！配置已生效。",
            "explanation": f"这是从培训材料中自动提取的 CLI 命令序列。场景: {scenario}",
        },
    }


def _parse_cli_commands(code: str) -> list[dict[str, str]]:
    """解析 CLI 代码块为命令列表"""
    commands: list[dict[str, str]] = []
    lines = [line for line in code.split("\n") if line.strip()]

    prompt_pattern = re.compile(r'^([<\[]\S+[>\]])\s*(.*)$')
    shell_pattern = re.compile(r'^(\$|#|>)\s+(.+)$')

    for line in lines:
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue

        # Huawei VRP: <R1> system-view 或 [R1-GigabitEthernet0/0/1] ip address ...
        m = prompt_pattern.match(stripped)
        if m:
            commands.append({"prompt": m.group(1), "command": m.group(2).strip()})
            continue

        # Shell: $ command 或 # command
        m = shell_pattern.match(stripped)
        if m:
            commands.append({"prompt": m.group(1), "command": m.group(2).strip()})
            continue

        # 纯命令行（无 prompt）
        if len(stripped) > 3 and not stripped.startswith("//"):
            commands.append({"prompt": "$", "command": stripped})

    return [cmd for cmd in commands if cmd.get("command")]


def _generate_hints(command: str) -> list[str]:
    """为命令生成 hints（取前几个词作为提示）"""
    words = command.split()
    if len(words) <= 2:
        return words[:1]
    # 取前 50% 的词作为 hints
    n = max(1, len(words) // 2)
    return words[:n]


def _summarize_commands(commands: list[dict]) -> str:
    """生成关卡标题摘要"""
    if not commands:
        return "CLI 操作"
    cmd = commands[0].get("command", "")
    return cmd[:30] + ("…" if len(cmd) > 30 else "")


# ── 对比表 → MATCHING 关卡 ────────────────────────────────────────────


def table_to_matching_level(
    table: TableData,
    sort_order: int,
    level_id_prefix: str = "direct",
) -> dict[str, Any]:
    """
    将对比表格转换为 MATCHING 关卡。

    策略:
      - 左列 → leftItems (概念/名称)
      - 右列 → rightItems (描述/值)
      - 打乱右列顺序，生成配对题

    Args:
        table: 对比表数据（必须是 2 列）
        sort_order: 关卡排序号
        level_id_prefix: 关卡 ID 前缀

    Returns:
        符合 MATCHING content schema 的关卡 dict
    """
    if len(table.headers) < 2 or len(table.rows) < 3:
        return {}

    level_id = f"{level_id_prefix}-matching-{sort_order}"
    left_header = table.headers[0]
    right_header = table.headers[1] if len(table.headers) > 1 else "描述"

    # 构建左右列表项
    left_items = []
    right_items = []
    correct_pairs: list[list[str]] = []

    for i, row in enumerate(table.rows[:8]):  # 最多8对
        if len(row) < 2:
            continue
        left_id = f"l{i}"
        right_id = f"r{i}"
        left_items.append({"id": left_id, "text": row[0][:80]})
        right_items.append({"id": right_id, "text": row[1][:120]})
        correct_pairs.append([left_id, right_id])

    if len(left_items) < 3:
        return {}

    # 打乱右列顺序（增加游戏难度）
    shuffled_rights = right_items.copy()
    random.shuffle(shuffled_rights)

    return {
        "id": level_id,
        "sortOrder": sort_order,
        "title": f"知识配对: {left_header} ↔ {right_header}",
        "type": "MATCHING",
        "description": f"将左侧的 {left_header} 与右侧的 {right_header} 正确连线",
        "timeLimitSec": 240,
        "positionX": 0,
        "positionY": 0,
        "content": {
            "id": level_id,
            "levelId": level_id,
            "type": "matching",
            "content": table.caption or f"请将 {left_header} 与对应的 {right_header} 连线",
            "leftItems": left_items,
            "rightItems": shuffled_rights,
            "correctPairs": correct_pairs,
            "explanation": (
                f"本题基于文档中的对比表格自动生成。\n"
                f"表头: {' | '.join(table.headers[:2])}\n"
                f"共 {len(table.rows)} 行数据，{len(left_items)} 对配对。"
            ),
        },
    }


# ── 步骤列表 → ORDERING 关卡 ──────────────────────────────────────────


def ordered_list_to_ordering_level(
    ol: OrderedList,
    sort_order: int,
    level_id_prefix: str = "direct",
) -> dict[str, Any]:
    """
    将有序步骤列表转换为 ORDERING 关卡。

    策略:
      - 提取步骤 → 正确顺序
      - 打乱步骤顺序 → 让玩家重新排列
      - 步骤 ID 保持正确顺序编号（s1, s2, s3...）

    Args:
        ol: 有序列表数据
        sort_order: 关卡排序号
        level_id_prefix: 关卡 ID 前缀

    Returns:
        符合 ORDERING content schema 的关卡 dict
    """
    if len(ol.items) < 4:
        return {}

    level_id = f"{level_id_prefix}-ordering-{sort_order}"

    # 构建步骤（正确顺序）
    steps = [
        {"id": f"s{i + 1}", "text": item[:120]}
        for i, item in enumerate(ol.items[:8])
    ]
    correct_order = [s["id"] for s in steps]

    # 打乱步骤顺序
    shuffled_steps = steps.copy()
    random.shuffle(shuffled_steps)

    context = ol.context or f"操作步骤排序（关卡 {sort_order}）"

    return {
        "id": level_id,
        "sortOrder": sort_order,
        "title": f"步骤排序: {context[:30]}",
        "type": "ORDERING",
        "description": "将以下操作步骤拖拽到正确顺序",
        "timeLimitSec": 300,
        "positionX": 0,
        "positionY": 0,
        "content": {
            "id": level_id,
            "levelId": level_id,
            "type": "ordering",
            "content": f"请将以下步骤排列成正确的操作顺序: {context}",
            "steps": shuffled_steps,
            "correctOrder": correct_order,
            "explanation": (
                f"正确的操作步骤顺序为:\n"
                + "\n".join(f"{i + 1}. {s['text']}" for i, s in enumerate(steps))
            ),
        },
    }


# ── 批量生成入口 ──────────────────────────────────────────────────────


def generate_direct_levels(
    cli_blocks: list[CodeBlock],
    comparison_tables: list[TableData],
    procedure_lists: list[OrderedList],
    start_sort_order: int = 1,
    max_terminal: int = 2,
    max_matching: int = 2,
    max_ordering: int = 1,
    level_id_prefix: str = "direct",
) -> list[dict[str, Any]]:
    """
    从文档结构批量生成关卡（零 GPT-4o 成本）。

    Args:
        cli_blocks: CLI 代码块列表
        comparison_tables: 对比表格列表
        procedure_lists: 步骤列表列表
        start_sort_order: 起始排序号
        max_terminal: 最多生成 TERMINAL 关卡数
        max_matching: 最多生成 MATCHING 关卡数
        max_ordering: 最多生成 ORDERING 关卡数
        level_id_prefix: 关卡 ID 前缀

    Returns:
        关卡 dict 列表（可直接存入数据库）
    """
    levels: list[dict[str, Any]] = []
    sort_order = start_sort_order

    # TERMINAL 关卡
    for cb in cli_blocks[:max_terminal]:
        level = code_block_to_terminal_level(cb, sort_order, level_id_prefix)
        if level:
            levels.append(level)
            sort_order += 1
            logger.info(f"直接生成 TERMINAL 关卡 #{sort_order - 1}: {level.get('title', '')}")

    # MATCHING 关卡
    for table in comparison_tables[:max_matching]:
        level = table_to_matching_level(table, sort_order, level_id_prefix)
        if level:
            levels.append(level)
            sort_order += 1
            logger.info(f"直接生成 MATCHING 关卡 #{sort_order - 1}: {level.get('title', '')}")

    # ORDERING 关卡
    for ol in procedure_lists[:max_ordering]:
        level = ordered_list_to_ordering_level(ol, sort_order, level_id_prefix)
        if level:
            levels.append(level)
            sort_order += 1
            logger.info(f"直接生成 ORDERING 关卡 #{sort_order - 1}: {level.get('title', '')}")

    logger.info(f"直接生成关卡总计: {len(levels)} 个 (TERMINAL+MATCHING+ORDERING)")
    return levels
