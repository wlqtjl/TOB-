"""
测试 — 文档结构分析器 (structure_analyzer.py)

覆盖:
  - 标题提取
  - 代码块提取 + CLI 识别
  - 表格提取 + 对比表检测
  - 有序列表提取 + 步骤检测
  - 图片提取
  - GPT-4o 提示词增强生成
  - DirectLevelFactory 三种关卡生成
"""

import sys
import os

# 让 pytest 能找到 analyzers 和 generators 包
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from analyzers.structure_analyzer import (
    analyze_markdown_structure,
    CodeBlock,
    TableData,
    OrderedList,
)
from generators.direct_level_factory import (
    code_block_to_terminal_level,
    table_to_matching_level,
    ordered_list_to_ordering_level,
    generate_direct_levels,
)


# ── Fixtures ──────────────────────────────────────────────────────────

SAMPLE_MARKDOWN = """
# VLAN 配置指南

本指南介绍如何在华为交换机上配置 VLAN 和 Trunk 端口。

## 基础概念

| 术语 | 说明 |
|------|------|
| VLAN | 虚拟局域网，逻辑隔离广播域 |
| Trunk | 允许多个 VLAN 通过的链路 |
| Access | 只允许一个 VLAN 通过的链路 |
| Tagged | 带 802.1Q 标签的帧 |

## 配置步骤

按照以下步骤配置 VLAN10：

1. 进入系统视图
2. 创建 VLAN10
3. 进入端口配置
4. 设置端口类型为 Access
5. 将端口加入 VLAN10

## 命令示例

```bash
<Huawei> system-view
[Huawei] vlan 10
[Huawei-vlan10] quit
[Huawei] interface GigabitEthernet0/0/1
[Huawei-GigabitEthernet0/0/1] port link-type access
[Huawei-GigabitEthernet0/0/1] port default vlan 10
```

## 拓扑图

![网络拓扑](images/topology_vlan.png)

以上是 VLAN 配置的完整拓扑图。
"""


# ── 标题提取测试 ──────────────────────────────────────────────────────

class TestHeadingExtraction:
    def test_extracts_h1_headings(self):
        insights = analyze_markdown_structure(SAMPLE_MARKDOWN)
        h1_headings = [h for h in insights.headings if h.level == 1]
        assert len(h1_headings) == 1
        assert h1_headings[0].text == "VLAN 配置指南"

    def test_extracts_h2_headings(self):
        insights = analyze_markdown_structure(SAMPLE_MARKDOWN)
        h2_headings = [h for h in insights.headings if h.level == 2]
        assert len(h2_headings) == 4  # 基础概念, 配置步骤, 命令示例, 拓扑图

    def test_section_count(self):
        insights = analyze_markdown_structure(SAMPLE_MARKDOWN)
        assert insights.section_count == 1  # 1 H1

    def test_word_count_positive(self):
        insights = analyze_markdown_structure(SAMPLE_MARKDOWN)
        assert insights.word_count > 20


# ── 代码块测试 ────────────────────────────────────────────────────────

class TestCodeBlockExtraction:
    def test_extracts_code_block(self):
        insights = analyze_markdown_structure(SAMPLE_MARKDOWN)
        assert len(insights.code_blocks) >= 1

    def test_identifies_cli_block(self):
        insights = analyze_markdown_structure(SAMPLE_MARKDOWN)
        # bash 块包含 <Huawei> prompt，应被识别为 CLI
        assert len(insights.cli_blocks) >= 1

    def test_cli_block_has_vrp_prompt(self):
        insights = analyze_markdown_structure(SAMPLE_MARKDOWN)
        if insights.cli_blocks:
            code = insights.cli_blocks[0].code
            assert "Huawei" in code or "system-view" in code

    def test_non_cli_python_not_detected(self):
        md = """
```python
x = 1 + 2
print(x)
```
"""
        insights = analyze_markdown_structure(md)
        # Python 代码不应被识别为 CLI
        assert len(insights.cli_blocks) == 0

    def test_bash_with_dollar_detected(self):
        md = """
```bash
$ sudo apt-get update
$ sudo apt-get install nginx
$ systemctl start nginx
```
"""
        insights = analyze_markdown_structure(md)
        assert len(insights.cli_blocks) >= 1


# ── 表格测试 ──────────────────────────────────────────────────────────

class TestTableExtraction:
    def test_extracts_table(self):
        insights = analyze_markdown_structure(SAMPLE_MARKDOWN)
        assert len(insights.tables) >= 1

    def test_identifies_comparison_table(self):
        insights = analyze_markdown_structure(SAMPLE_MARKDOWN)
        # 2列表格，4行，左列较短 → 应被识别为对比表
        assert len(insights.comparison_tables) >= 1

    def test_table_headers_extracted(self):
        insights = analyze_markdown_structure(SAMPLE_MARKDOWN)
        if insights.tables:
            assert "术语" in insights.tables[0].headers
            assert "说明" in insights.tables[0].headers

    def test_table_rows_extracted(self):
        insights = analyze_markdown_structure(SAMPLE_MARKDOWN)
        if insights.tables:
            assert len(insights.tables[0].rows) >= 3

    def test_non_comparison_table_not_matched(self):
        md = """
| A | B | C |
|---|---|---|
| 1 | 2 | 3 |
| 4 | 5 | 6 |
"""
        insights = analyze_markdown_structure(md)
        # 3列表格不是对比表
        assert len(insights.comparison_tables) == 0


# ── 有序列表测试 ──────────────────────────────────────────────────────

class TestOrderedListExtraction:
    def test_extracts_ordered_list(self):
        insights = analyze_markdown_structure(SAMPLE_MARKDOWN)
        assert len(insights.ordered_lists) >= 1

    def test_identifies_procedure_list(self):
        insights = analyze_markdown_structure(SAMPLE_MARKDOWN)
        # 步骤列表（5个，含"配置"关键词）应被识别为 procedure
        assert len(insights.procedure_lists) >= 1

    def test_list_items_count(self):
        insights = analyze_markdown_structure(SAMPLE_MARKDOWN)
        if insights.ordered_lists:
            assert len(insights.ordered_lists[0].items) >= 3

    def test_short_list_not_procedure(self):
        md = "1. 第一步\n2. 第二步\n3. 第三步"
        insights = analyze_markdown_structure(md)
        # 3个步骤 < 最小4个，不应进入 procedure_lists
        assert len(insights.procedure_lists) == 0


# ── 图片提取测试 ──────────────────────────────────────────────────────

class TestImageExtraction:
    def test_extracts_image(self):
        insights = analyze_markdown_structure(SAMPLE_MARKDOWN)
        assert len(insights.images) >= 1

    def test_image_path(self):
        insights = analyze_markdown_structure(SAMPLE_MARKDOWN)
        if insights.images:
            assert "topology_vlan.png" in insights.images[0].path

    def test_image_alt_text(self):
        insights = analyze_markdown_structure(SAMPLE_MARKDOWN)
        if insights.images:
            assert "网络拓扑" in insights.images[0].alt_text


# ── 建议关卡类型测试 ──────────────────────────────────────────────────

class TestSuggestedLevels:
    def test_suggests_quiz(self):
        insights = analyze_markdown_structure(SAMPLE_MARKDOWN)
        assert "QUIZ" in insights.suggested_level_types

    def test_suggests_terminal_for_cli(self):
        insights = analyze_markdown_structure(SAMPLE_MARKDOWN)
        assert "TERMINAL" in insights.suggested_level_types

    def test_suggests_matching_for_table(self):
        insights = analyze_markdown_structure(SAMPLE_MARKDOWN)
        assert "MATCHING" in insights.suggested_level_types

    def test_suggests_ordering_for_steps(self):
        insights = analyze_markdown_structure(SAMPLE_MARKDOWN)
        assert "ORDERING" in insights.suggested_level_types

    def test_gpt_hints_not_empty(self):
        insights = analyze_markdown_structure(SAMPLE_MARKDOWN)
        assert len(insights.gpt_hints) > 0

    def test_gpt_hints_mentions_terminal(self):
        insights = analyze_markdown_structure(SAMPLE_MARKDOWN)
        assert "TERMINAL" in insights.gpt_hints

    def test_empty_markdown_returns_defaults(self):
        insights = analyze_markdown_structure("")
        assert insights.word_count == 0
        assert len(insights.headings) == 0


# ── DirectLevelFactory 测试 ───────────────────────────────────────────

class TestDirectLevelFactory:
    def test_cli_block_to_terminal(self):
        cb = CodeBlock(
            language="bash",
            code="<Huawei> system-view\n[Huawei] vlan 10\n[Huawei-vlan10] quit\n[Huawei] interface GigabitEthernet0/0/1\n[Huawei-GigabitEthernet0/0/1] port link-type access",
            context="配置VLAN场景",
            is_cli=True,
        )
        level = code_block_to_terminal_level(cb, sort_order=1)
        assert level["type"] == "TERMINAL"
        content = level["content"]
        assert len(content["terminalLines"]) >= 1
        assert len(content["blankCommands"]) >= 1
        assert content["blankCommands"][0]["fuzzyMatch"] is True

    def test_table_to_matching(self):
        table = TableData(
            headers=["协议", "功能"],
            rows=[
                ["OSPF", "链路状态路由协议"],
                ["BGP", "边界网关协议"],
                ["VLAN", "虚拟局域网隔离"],
                ["STP", "生成树协议防环"],
            ],
            caption="网络协议说明",
            is_comparison=True,
        )
        level = table_to_matching_level(table, sort_order=2)
        assert level["type"] == "MATCHING"
        content = level["content"]
        assert len(content["leftItems"]) == 4
        assert len(content["rightItems"]) == 4
        assert len(content["correctPairs"]) == 4

    def test_ordered_list_to_ordering(self):
        ol = OrderedList(
            items=[
                "进入系统视图",
                "创建VLAN10",
                "进入端口视图",
                "设置端口类型为Access",
                "将端口加入VLAN10",
            ],
            context="配置步骤",
            is_procedure=True,
        )
        level = ordered_list_to_ordering_level(ol, sort_order=3)
        assert level["type"] == "ORDERING"
        content = level["content"]
        assert len(content["steps"]) == 5
        assert len(content["correctOrder"]) == 5
        # 步骤应被打乱（不一定完全不同，但 correctOrder 应保持原顺序）
        assert content["correctOrder"] == ["s1", "s2", "s3", "s4", "s5"]

    def test_table_too_short_returns_empty(self):
        table = TableData(
            headers=["A", "B"],
            rows=[["x", "y"], ["p", "q"]],
            caption="",
            is_comparison=True,
        )
        level = table_to_matching_level(table, sort_order=1)
        assert level == {}

    def test_ordered_list_too_short_returns_empty(self):
        ol = OrderedList(items=["a", "b", "c"], context="", is_procedure=True)
        level = ordered_list_to_ordering_level(ol, sort_order=1)
        assert level == {}

    def test_generate_direct_levels_batch(self):
        insights = analyze_markdown_structure(SAMPLE_MARKDOWN)
        levels = generate_direct_levels(
            cli_blocks=insights.cli_blocks,
            comparison_tables=insights.comparison_tables,
            procedure_lists=insights.procedure_lists,
            start_sort_order=5,
        )
        # 应生成至少1个关卡
        assert len(levels) >= 1
        # 所有关卡排序号 >= 5
        for lv in levels:
            assert lv["sortOrder"] >= 5
