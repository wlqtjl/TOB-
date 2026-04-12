"""
Mermaid 序列图 → FLOW_SIM 关卡 JSON 转换器

使用场景:
  1. GPT-4o 输出 Mermaid 格式 → 本模块转为 FLOW_SIM 关卡 (精确、无噪声)
  2. 用户手工编写 Mermaid 描述系统流程 → 直接生成可玩关卡

支持的 Mermaid 语法 (sequenceDiagram):
  participant A as 标签
  A->>B: 消息
  A-->>B: 虚线消息 (ACK/Response)
  Note over A: 注解
  Note over A,B: 跨节点注解
  loop 循环: ... end
  alt/opt/else 块 (解析为 decision 点)
"""

from __future__ import annotations

import re
import logging
from dataclasses import dataclass, field
from typing import Any

logger = logging.getLogger(__name__)

# ── 解析数据结构 ──────────────────────────────────────────────────────


@dataclass
class MermaidParticipant:
    alias: str       # 代码中使用的简名 (e.g. "A")
    label: str       # as 后面的显示名 (e.g. "Access节点")


@dataclass
class MermaidMessage:
    from_alias: str
    to_alias: str
    text: str
    is_return: bool  # --> 虚线 = ACK/Response


@dataclass
class MermaidNote:
    text: str
    participants: list[str]  # 涉及的 alias


@dataclass
class MermaidDecision:
    """alt/opt 块中的选项"""
    condition: str
    messages: list[MermaidMessage]


@dataclass
class ParsedSequence:
    participants: list[MermaidParticipant] = field(default_factory=list)
    messages: list[MermaidMessage] = field(default_factory=list)
    notes: list[MermaidNote] = field(default_factory=list)
    decisions: list[MermaidDecision] = field(default_factory=list)


# ── 解析器 ────────────────────────────────────────────────────────────

# Regex patterns
# Length bounds prevent polynomial-time ReDoS on crafted inputs:
#   - \w+ is already safe (bounded by word chars)
#   - (.{0,300}) limits unbounded .+ in the message label capture group
#   - [^:\n]+ for Note participants avoids [\w,\s]+ overlap with the ':' delimiter
_RE_PARTICIPANT = re.compile(r'^\s*participant\s+(\w+)(?:\s+as\s+(.{0,200}))?$', re.IGNORECASE)
_RE_ACTOR      = re.compile(r'^\s*actor\s+(\w+)(?:\s+as\s+(.{0,200}))?$', re.IGNORECASE)
_RE_MSG_SOLID  = re.compile(r'^\s*(\w+)\s*->>\s*(\w+)\s*:\s*(.{0,300})$')
_RE_MSG_DOTTED = re.compile(r'^\s*(\w+)\s*-->>\s*(\w+)\s*:\s*(.{0,300})$')
_RE_NOTE_OVER  = re.compile(r'^\s*[Nn]ote\s+over\s+([^:\n]{1,200}):\s*(.{0,300})$')
_RE_ALT        = re.compile(r'^\s*alt\s+(.{1,300})$', re.IGNORECASE)
_RE_OPT        = re.compile(r'^\s*opt\s+(.{1,300})$', re.IGNORECASE)
_RE_ELSE       = re.compile(r'^\s*else\s*(.{0,300})$', re.IGNORECASE)
_RE_END        = re.compile(r'^\s*end\s*$', re.IGNORECASE)
_RE_LOOP       = re.compile(r'^\s*loop\s+(.{1,300})$', re.IGNORECASE)


def parse_mermaid_sequence(mermaid_text: str) -> ParsedSequence:
    """
    解析 Mermaid sequenceDiagram 文本 → ParsedSequence

    忽略 sequenceDiagram 声明行, 解析 participant/actor/消息/Note/alt/opt。
    输入限制: 最多 50KB, 每行最多 1000 字符 (防止 ReDoS)。
    """
    result = ParsedSequence()
    alias_to_label: dict[str, str] = {}

    # Input length guard — prevents ReDoS on adversarially crafted input
    MAX_TOTAL_CHARS = 50_000
    MAX_LINE_CHARS = 1_000
    text_safe = mermaid_text[:MAX_TOTAL_CHARS]
    lines = [ln[:MAX_LINE_CHARS] for ln in text_safe.splitlines()]

    # Track alt/opt decision blocks
    in_decision: MermaidDecision | None = None

    for raw_line in lines:
        line = raw_line.strip()
        if not line or line.startswith('%%') or line.lower().startswith('sequencediagram'):
            continue

        # participant / actor
        m = _RE_PARTICIPANT.match(line) or _RE_ACTOR.match(line)
        if m:
            alias = m.group(1)
            label = (m.group(2) or alias).strip()
            alias_to_label[alias] = label
            result.participants.append(MermaidParticipant(alias=alias, label=label))
            continue

        # solid arrow  A->>B: msg
        m = _RE_MSG_SOLID.match(line)
        if m:
            msg = MermaidMessage(
                from_alias=m.group(1), to_alias=m.group(2),
                text=m.group(3).strip(), is_return=False,
            )
            if in_decision:
                in_decision.messages.append(msg)
            else:
                result.messages.append(msg)
            continue

        # dotted arrow  A-->>B: msg  (ACK / response)
        m = _RE_MSG_DOTTED.match(line)
        if m:
            msg = MermaidMessage(
                from_alias=m.group(1), to_alias=m.group(2),
                text=m.group(3).strip(), is_return=True,
            )
            if in_decision:
                in_decision.messages.append(msg)
            else:
                result.messages.append(msg)
            continue

        # Note over
        m = _RE_NOTE_OVER.match(line)
        if m:
            participants = [p.strip() for p in m.group(1).split(',')]
            result.notes.append(MermaidNote(text=m.group(2).strip(), participants=participants))
            continue

        # alt/opt → decision block
        m = _RE_ALT.match(line) or _RE_OPT.match(line)
        if m:
            in_decision = MermaidDecision(condition=m.group(1).strip(), messages=[])
            continue

        # else — treat as end of previous alt branch, start new
        m = _RE_ELSE.match(line)
        if m and in_decision:
            result.decisions.append(in_decision)
            cond = m.group(1).strip() or 'else'
            in_decision = MermaidDecision(condition=cond, messages=[])
            continue

        # end — close decision block
        if _RE_END.match(line):
            if in_decision:
                result.decisions.append(in_decision)
                in_decision = None
            continue

        # loop — treat as annotation, skip internals
        m = _RE_LOOP.match(line)
        if m:
            logger.debug('Mermaid loop block detected: %s (treated as annotation)', m.group(1))
            continue

    # Auto-create participants for any alias used in messages but not declared
    declared = {p.alias for p in result.participants}
    for msg in result.messages:
        for alias in [msg.from_alias, msg.to_alias]:
            if alias not in declared:
                result.participants.append(MermaidParticipant(alias=alias, label=alias))
                alias_to_label[alias] = alias
                declared.add(alias)

    return result


# ── FLOW_SIM JSON 生成器 ───────────────────────────────────────────────

# Role heuristics: if label contains these keywords → assign role
_ROLE_KEYWORDS: list[tuple[list[str], str]] = [
    (['client', 'user', '客户端', 'initiator', 'app'], 'client'),
    (['access', 'gateway', 'proxy', 'iscsi', 'nvme', '网关', '接入'], 'gateway'),
    (['meta', 'metadata', 'namenode', 'master', 'controller', '元数据'], 'control'),
    (['chunk', 'datanode', 'osd', 'storage', 'data', '存储', '数据'], 'data'),
    (['raft', 'leader', 'follower', 'paxos', 'consensus', '共识', '投票'], 'consensus'),
]

# Step colors by direction: return messages (ACK) use lighter color
_STEP_COLOR_DEFAULT = '#60a5fa'
_STEP_COLOR_ACK     = '#34d399'
_STEP_COLOR_CONTROL = '#fbbf24'

# Keywords that suggest "control plane" messages
_CONTROL_KEYWORDS = ['lease', 'grant', 'elect', 'vote', '租约', '选举', '投票', 'meta', '元数据']


def _infer_role(label: str) -> str:
    lower = label.lower()
    for keywords, role in _ROLE_KEYWORDS:
        if any(k in lower for k in keywords):
            return role
    return 'external'


def _infer_step_color(msg: MermaidMessage) -> str:
    if msg.is_return:
        return _STEP_COLOR_ACK
    text_lower = msg.text.lower()
    if any(k in text_lower for k in _CONTROL_KEYWORDS):
        return _STEP_COLOR_CONTROL
    return _STEP_COLOR_DEFAULT


def _layout_participants(participants: list[MermaidParticipant]) -> dict[str, dict[str, float]]:
    """Auto-layout nodes in a left-to-right lane at y=280, spacing=160px."""
    positions: dict[str, dict[str, float]] = {}
    x = 80.0
    y = 280.0
    for p in participants:
        positions[p.alias] = {'x': x, 'y': y}
        x += 160.0
    return positions


def mermaid_to_flow_sim(
    mermaid_text: str,
    level_id: str = 'flow-sim-1',
    level_id_ref: str = 'level-1',
    mode: str = 'observe',
    task: str = '',
    explanation: str = '',
    playback_speed: float = 1.0,
) -> dict[str, Any]:
    """
    将 Mermaid 序列图转换为 FLOW_SIM 关卡 JSON。

    Args:
        mermaid_text:   Mermaid sequenceDiagram 文本
        level_id:       生成的关卡 ID
        level_id_ref:   关联的 LevelNode ID
        mode:           'observe' | 'route' | 'failover'
        task:           关卡任务描述 (空则从第一条 Note 或自动生成)
        explanation:    关卡解析 (空则从 Notes 汇总)
        playback_speed: 初始播放速度 (0.1-10)

    Returns:
        FLOW_SIM 关卡 dict (可直接存入数据库)
    """
    seq = parse_mermaid_sequence(mermaid_text)

    if not seq.participants:
        logger.warning('No participants found in Mermaid text — returning empty level')
        return {}

    positions = _layout_participants(seq.participants)

    # ── Nodes ─────────────────────────────────────────────────────
    nodes: list[dict[str, Any]] = []
    for p in seq.participants:
        pos = positions[p.alias]
        role = _infer_role(p.label)
        icon = _role_icon(role)
        nodes.append({
            'id': p.alias,
            'label': p.label,
            'icon': icon,
            'role': role,
            'x': pos['x'],
            'y': pos['y'],
            'faultable': role in ('control', 'data', 'consensus'),
            'annotations': [],
        })

    # ── Steps ─────────────────────────────────────────────────────
    steps: list[dict[str, Any]] = []
    delay_cursor = 0
    delay_increment = 300  # ms per step

    # Note text → match to nearest step for annotation
    note_texts = [n.text for n in seq.notes]
    note_idx = 0

    for i, msg in enumerate(seq.messages):
        annotation = note_texts[note_idx] if note_idx < len(note_texts) else msg.text
        note_idx += 1

        step: dict[str, Any] = {
            'id': f's{i + 1}',
            'from': msg.from_alias,
            'to': msg.to_alias,
            'data': msg.text,
            'annotation': annotation,
            'delayMs': delay_cursor,
            'color': _infer_step_color(msg),
        }
        steps.append(step)
        delay_cursor += delay_increment

    # ── Decisions from alt/opt blocks ─────────────────────────────
    decisions: list[dict[str, Any]] = []
    for di, dec in enumerate(seq.decisions):
        if not dec.messages:
            continue
        # Find the step that precedes this decision block
        # Heuristic: use the last step before the decision's first message
        after_step_id = steps[-1]['id'] if steps else 's1'
        # Collect the unique "to" nodes as options
        option_ids = list({m.to_alias for m in dec.messages})
        # Correct option: first message's target
        correct = [dec.messages[0].to_alias] if dec.messages else option_ids[:1]

        decisions.append({
            'id': f'd{di + 1}',
            'afterStepId': after_step_id,
            'question': dec.condition,
            'options': option_ids,
            'correctOptions': correct,
            'wrongFeedback': f'错误! 正确路径是 {dec.condition}',
            'correctFeedback': f'正确! {dec.condition}',
        })

    # ── Task and explanation ───────────────────────────────────────
    if not task:
        # Use first Note or build from participants
        if seq.notes:
            task = seq.notes[0].text
        else:
            names = ', '.join(p.label for p in seq.participants[:3])
            task = f'观察 {names} 之间的数据流向'

    if not explanation:
        explanation = ' | '.join(n.text for n in seq.notes) or task

    return {
        'id': level_id,
        'levelId': level_id_ref,
        'type': 'flow_sim',
        'mode': mode,
        'task': task,
        'nodes': nodes,
        'steps': steps,
        'decisions': decisions,
        'faults': [],
        'playbackSpeed': max(0.1, min(10.0, playback_speed)),
        'playbackSpeedOptions': [0.1, 0.5, 1, 2, 5, 10],
        'mermaidSource': mermaid_text.strip(),
        'explanation': explanation,
    }


def _role_icon(role: str) -> str:
    icons = {
        'client': '💻',
        'gateway': '🔀',
        'control': '🗃️',
        'data': '💾',
        'consensus': '⚖️',
        'external': '🌐',
    }
    return icons.get(role, '📦')
