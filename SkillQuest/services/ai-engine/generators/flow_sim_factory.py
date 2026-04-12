"""
FLOW_SIM 关卡工厂 — 从技术文档文本中提取数据流向关卡

两种工作模式:
  1. keyword_extract(text)   — 基于关键词/正则，零依赖，适合生产环境
     提取 "A 向 B 发送 X"、"A → B"、"A calls B" 等模式
     → 生成 FlowSimLevel JSON (mode=observe)

  2. spacy_extract(text)     — 集成 spaCy en_core_web_sm/zh_core_web_sm
     使用 NLP 命名实体识别 + 动词-主谓-宾分析，精度更高
     需要 pip install spacy + 下载模型

工厂函数 text_to_flow_sim() 自动选择可用模式:
  - 若 spaCy 已安装 → spacy_extract
  - 否则 → keyword_extract
"""

from __future__ import annotations

import re
import logging
from dataclasses import dataclass, field
from typing import Any

logger = logging.getLogger(__name__)

# ── 数据结构 ──────────────────────────────────────────────────────────


@dataclass
class ExtractedEdge:
    """从文本中提取的 A → B 关系"""
    src: str
    dst: str
    label: str      # 动作/消息描述
    is_return: bool = False  # 是否是返回/响应方向


@dataclass
class ExtractionResult:
    components: list[str]            # 系统组件名称列表 (去重)
    edges: list[ExtractedEdge]       # 方向性关系列表
    notes: list[str]                 # 原理注解 (句子级)


# ── 关键词规则库 ──────────────────────────────────────────────────────

# 常见系统组件 keywords (匹配时不区分大小写)
_COMPONENT_PATTERNS = [
    r'\bClient\b', r'\b客户端\b',
    r'\bAccess\b',
    r'\bMeta(?:data)?\b', r'\b元数据\b',
    r'\bChunk\b',
    r'\bNameNode\b', r'\bDataNode\b',
    r'\bLeader\b', r'\bFollower\b', r'\bCandidate\b',
    r'\bOSD\b', r'\bMonitor\b',
    r'\bRouter\b', r'\bSwitch\b',
    r'\bProxy\b', r'\bGateway\b', r'\b网关\b',
    r'\bController\b', r'\b控制器\b',
    r'\bNode-?\d+\b', r'\b节点\d*\b',
    r'\bPrimary\b', r'\bReplica\b', r'\b主节点\b', r'\b副本\b',
]

# 动作关键词 → 触发边提取 (正则: src 动词 dst)
_ACTION_ZH_PATTERNS = [
    # "A 向 B 发送 X" (whitespace optional in Chinese prose)
    re.compile(r'([^\s，。、；\u3000]+)\s*向\s*([^\s，。、；\u3000]+)\s*(?:发送|请求|转发|写入|推送|同步)\s*(.{0,60}?)(?=[，。\n]|$)'),
    # "A 接收来自 B 的 X"
    re.compile(r'([^\s，。、；\u3000]+)\s*接收\s*来自\s*([^\s，。、；\u3000]+)\s*的\s*(.{0,40}?)(?=[，。\n]|$)'),
    # "A → B: X" or "A -> B"
    re.compile(r'([A-Za-z0-9_\u4e00-\u9fff]+)\s*(?:→|->|-->)\s*([A-Za-z0-9_\u4e00-\u9fff]+)(?:\s*[:：]\s*(.{0,60}))?'),
]

_ACTION_EN_PATTERNS = [
    # "A sends X to B" / "A requests B"
    re.compile(r'\b([A-Z][A-Za-z0-9_]+)\s+(?:sends?|requests?|forwards?|writes?|pushes?|syncs?)\s+(.{0,40}?)\s+to\s+([A-Z][A-Za-z0-9_]+)', re.I),
    # "A receives X from B"
    re.compile(r'\b([A-Z][A-Za-z0-9_]+)\s+receives?\s+(.{0,40}?)\s+from\s+([A-Z][A-Za-z0-9_]+)', re.I),
    # "A → B: label" or "A -> B"
    re.compile(r'\b([A-Z][A-Za-z0-9_]+)\s*(?:→|->|-->)\s*([A-Z][A-Za-z0-9_]+)(?:\s*:\s*(.{0,60}))?', re.I),
    # "A calls B" / "A contacts B"
    re.compile(r'\b([A-Z][A-Za-z0-9_]+)\s+(?:calls?|contacts?|notifies?)\s+([A-Z][A-Za-z0-9_]+)', re.I),
]

# ACK/Response keywords
_ACK_KEYWORDS = {'ack', 'acks', 'acknowledge', 'response', 'reply', 'return', 'ok',
                 '确认', '响应', '回复', '返回'}


def _is_ack(label: str) -> bool:
    lower = label.lower()
    return any(k in lower for k in _ACK_KEYWORDS)


def keyword_extract(text: str) -> ExtractionResult:
    """
    基于关键词正则从文本中提取系统组件和数据流边。
    零外部依赖，适用于任何 Python 环境。
    """
    edges: list[ExtractedEdge] = []
    components_set: set[str] = set()
    notes: list[str] = []

    # Extract component names
    for pat in _COMPONENT_PATTERNS:
        for m in re.finditer(pat, text, re.IGNORECASE):
            name = m.group(0).strip()
            if len(name) > 1:
                components_set.add(name)

    # Extract edges from Chinese patterns
    for pattern in _ACTION_ZH_PATTERNS:
        for m in pattern.finditer(text):
            groups = m.groups()
            if len(groups) == 3:
                src, dst, label = groups
            elif len(groups) == 2:
                src, dst = groups
                label = ''
            else:
                continue
            src, dst, label = (src or '').strip(), (dst or '').strip(), (label or '').strip()
            if src and dst and src != dst:
                edges.append(ExtractedEdge(src=src, dst=dst, label=label or f'{src}→{dst}',
                                           is_return=_is_ack(label)))
                components_set.update([src, dst])

    # Extract edges from English patterns
    for pattern in _ACTION_EN_PATTERNS:
        for m in pattern.finditer(text):
            groups = m.groups()
            if len(groups) == 3:
                # "sends X to B" → src=g1, label=g2, dst=g3
                # "receives X from B" → src=g1 (receiver), label=g2, dst=g3 (sender)
                g1, label, g3 = (groups[0] or ''), (groups[1] or ''), (groups[2] or '')
                src, dst = g1.strip(), g3.strip()
            elif len(groups) == 2:
                src, dst, label = groups[0].strip(), groups[1].strip(), ''
            else:
                continue
            if src and dst and src != dst:
                edges.append(ExtractedEdge(src=src, dst=dst, label=(label or f'{src}→{dst}').strip(),
                                           is_return=_is_ack(label)))
                components_set.update([src, dst])

    # Extract sentence-level notes (sentences mentioning 2+ components)
    sentences = re.split(r'[。\.\n!？?]', text)
    comp_lower = {c.lower() for c in components_set}
    for sent in sentences:
        sent = sent.strip()
        if len(sent) < 10:
            continue
        mentions = sum(1 for c in comp_lower if c in sent.lower())
        if mentions >= 2:
            notes.append(sent[:120])  # Truncate long sentences

    # Deduplicate edges by (src, dst, label)
    seen: set[tuple[str, str]] = set()
    unique_edges: list[ExtractedEdge] = []
    for e in edges:
        key = (e.src.lower(), e.dst.lower())
        if key not in seen:
            seen.add(key)
            unique_edges.append(e)

    # Ordered components: preserve encounter order
    ordered = list(dict.fromkeys(
        c for e in unique_edges for c in [e.src, e.dst]
    ))
    # Add any remaining from components_set
    for c in components_set:
        if c not in ordered:
            ordered.append(c)

    return ExtractionResult(
        components=ordered,
        edges=unique_edges,
        notes=notes[:8],  # max 8 annotations
    )


def _try_spacy_extract(text: str) -> ExtractionResult | None:
    """
    尝试使用 spaCy 进行 NLP 实体/关系提取。
    若 spaCy 未安装或模型不存在, 返回 None。
    """
    try:
        import spacy  # type: ignore[import-untyped]
    except ImportError:
        logger.debug('spaCy not available, falling back to keyword extraction')
        return None

    # Try Chinese model first, then English
    nlp = None
    for model in ('zh_core_web_sm', 'en_core_web_sm'):
        try:
            nlp = spacy.load(model)
            break
        except OSError:
            continue

    if nlp is None:
        logger.debug('No spaCy model found, falling back to keyword extraction')
        return None

    doc = nlp(text[:8000])  # Limit to 8K chars for performance

    # Collect NER entities as components (ORG, PRODUCT, WORK_OF_ART, GPE)
    components_set: set[str] = set()
    for ent in doc.ents:
        if ent.label_ in ('ORG', 'PRODUCT', 'WORK_OF_ART', 'PERSON', 'GPE'):
            components_set.add(ent.text.strip())

    # Also extract nouns > 2 chars as potential component names (zh/en)
    for chunk in doc.noun_chunks:
        token = chunk.root.text.strip()
        if 2 < len(token) < 20 and token[0].isupper():
            components_set.add(token)

    # Extract verb-object-prepositional relations for edges
    edges: list[ExtractedEdge] = []
    notes: list[str] = []

    for sent in doc.sents:
        sent_text = sent.text.strip()
        if len(sent_text) < 5:
            continue

        # Find verbs with subjects and objects in the sentence
        for token in sent:
            if token.pos_ not in ('VERB', 'AUX'):
                continue
            subj_tokens = [c for c in token.children if c.dep_ in ('nsubj', 'nsubjpass')]
            obj_tokens = [c for c in token.children if c.dep_ in ('dobj', 'pobj', 'nmod')]
            to_tokens = [c for c in token.children if c.dep_ in ('prep', 'mark') and c.text.lower() in ('to', 'toward', '向', '给', '到')]

            for subj in subj_tokens:
                for obj in obj_tokens:
                    label = token.text + ' ' + obj.text
                    src = subj.text.strip()
                    dst = obj.text.strip()
                    if src and dst and src != dst and len(src) > 1 and len(dst) > 1:
                        edges.append(ExtractedEdge(src=src, dst=dst, label=label,
                                                   is_return=_is_ack(label)))
                        components_set.update([src, dst])

        # Sentences with multiple component mentions → notes
        mentions = sum(1 for c in components_set if c.lower() in sent_text.lower())
        if mentions >= 2:
            notes.append(sent_text[:120])

    return ExtractionResult(
        components=list(components_set),
        edges=edges,
        notes=notes[:8],
    )


# ── Role and layout helpers ───────────────────────────────────────────

_ROLE_KEYWORDS: list[tuple[list[str], str]] = [
    (['client', 'user', '客户端', 'initiator', 'app', 'host'], 'client'),
    (['access', 'gateway', 'proxy', 'iscsi', 'nvme', '网关', '接入', 'lb'], 'gateway'),
    (['meta', 'metadata', 'namenode', 'master', 'controller', '元数据'], 'control'),
    (['chunk', 'datanode', 'osd', 'storage', 'data', '存储', '数据', 'primary', 'replica'], 'data'),
    (['raft', 'leader', 'follower', 'paxos', 'consensus', '共识', '投票', 'candidate'], 'consensus'),
]

_ROLE_ICONS = {
    'client': '💻', 'gateway': '🔀', 'control': '🗃️',
    'data': '💾', 'consensus': '⚖️', 'external': '🌐',
}

_STEP_COLORS = {
    False: '#60a5fa',  # forward message
    True:  '#34d399',  # ACK/return
}


def _infer_role(name: str) -> str:
    lower = name.lower()
    for keywords, role in _ROLE_KEYWORDS:
        if any(k in lower for k in keywords):
            return role
    return 'external'


def _layout_components(components: list[str]) -> dict[str, dict[str, float]]:
    """Auto-layout: distribute nodes horizontally, group by role."""
    by_role: dict[str, list[str]] = {}
    for comp in components:
        role = _infer_role(comp)
        by_role.setdefault(role, []).append(comp)

    # Assign lanes by role priority
    role_order = ['client', 'gateway', 'control', 'data', 'consensus', 'external']
    positions: dict[str, dict[str, float]] = {}
    x = 80.0
    for role in role_order:
        for comp in by_role.get(role, []):
            positions[comp] = {'x': x, 'y': 280.0}
            x += 160.0
    # Remaining
    for comp in components:
        if comp not in positions:
            positions[comp] = {'x': x, 'y': 280.0}
            x += 160.0

    return positions


# ── Public API ────────────────────────────────────────────────────────


def text_to_flow_sim(
    text: str,
    level_id: str = 'flow-sim-1',
    level_id_ref: str = 'level-1',
    mode: str = 'observe',
    task: str = '',
    explanation: str = '',
    playback_speed: float = 1.0,
    prefer_spacy: bool = True,
) -> dict[str, Any]:
    """
    从技术文档文本生成 FLOW_SIM 关卡 JSON。

    优先尝试 spaCy NLP 提取 (精度更高),
    若 spaCy 不可用则回退到关键词正则提取。

    Args:
        text:            技术文档文本 (MinerU 输出的 Markdown 或纯文本)
        level_id:        关卡 ID
        level_id_ref:    关联的 LevelNode ID
        mode:            'observe' | 'route' | 'failover'
        task:            关卡任务描述
        explanation:     关卡解析
        playback_speed:  初始播放速度
        prefer_spacy:    是否优先使用 spaCy (默认 True)

    Returns:
        FLOW_SIM 关卡 dict，若提取失败返回 {}
    """
    result: ExtractionResult | None = None
    if prefer_spacy:
        result = _try_spacy_extract(text)
    if result is None:
        result = keyword_extract(text)

    if not result.components and not result.edges:
        logger.warning('text_to_flow_sim: no components or edges extracted')
        return {}

    positions = _layout_components(result.components)

    # Build nodes
    nodes: list[dict[str, Any]] = []
    seen_names: set[str] = set()
    for comp in result.components:
        if comp in seen_names:
            continue
        seen_names.add(comp)
        role = _infer_role(comp)
        pos = positions.get(comp, {'x': 80.0, 'y': 280.0})
        nodes.append({
            'id': _to_id(comp),
            'label': comp,
            'icon': _ROLE_ICONS.get(role, '📦'),
            'role': role,
            'x': pos['x'],
            'y': pos['y'],
            'faultable': role in ('control', 'data', 'consensus'),
            'annotations': [],
        })

    # Build id map
    id_map = {comp: _to_id(comp) for comp in result.components}

    # Build steps from edges
    steps: list[dict[str, Any]] = []
    delay = 0
    for i, edge in enumerate(result.edges):
        src_id = id_map.get(edge.src, _to_id(edge.src))
        dst_id = id_map.get(edge.dst, _to_id(edge.dst))
        # Ensure both nodes exist
        for nid, nname in [(src_id, edge.src), (dst_id, edge.dst)]:
            if not any(n['id'] == nid for n in nodes):
                role = _infer_role(nname)
                nodes.append({
                    'id': nid, 'label': nname,
                    'icon': _ROLE_ICONS.get(role, '📦'),
                    'role': role,
                    'x': 80.0 + len(nodes) * 160.0, 'y': 280.0,
                    'faultable': role in ('control', 'data', 'consensus'),
                    'annotations': [],
                })

        annotation = result.notes[i] if i < len(result.notes) else edge.label
        steps.append({
            'id': f's{i + 1}',
            'from': src_id,
            'to': dst_id,
            'data': edge.label,
            'annotation': annotation,
            'delayMs': delay,
            'color': _STEP_COLORS[edge.is_return],
        })
        delay += 300

    if not steps:
        logger.warning('text_to_flow_sim: no steps extracted, returning empty')
        return {}

    # Auto-generate task and explanation if not provided
    if not task:
        if result.components:
            task = f'观察 {" → ".join(result.components[:4])} 之间的数据流向'
        else:
            task = '系统数据流向仿真'

    if not explanation:
        explanation = ' | '.join(result.notes[:3]) or task

    return {
        'id': level_id,
        'levelId': level_id_ref,
        'type': 'flow_sim',
        'mode': mode,
        'task': task,
        'nodes': nodes,
        'steps': steps,
        'decisions': [],  # route decisions added by GPT-4o post-processing
        'faults': [],

        'playbackSpeed': max(0.1, min(10.0, playback_speed)),
        'playbackSpeedOptions': [0.1, 0.5, 1, 2, 5, 10],
        'explanation': explanation,
    }


def _to_id(name: str) -> str:
    """Convert a display name to a safe node ID."""
    # Keep alphanumeric and dash, collapse runs of dashes
    safe = re.sub(r'[^a-zA-Z0-9\u4e00-\u9fff]+', '-', name.strip())
    safe = re.sub(r'-+', '-', safe).strip('-').lower()
    return safe or 'node'
