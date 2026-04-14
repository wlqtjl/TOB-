"""
OpenTelemetry OTLP Trace → FLOW_SIM 关卡 JSON 转换器 (Phase 3)

将真实分布式系统的 OpenTelemetry Trace 回放为 SkillQuest 游戏关卡:
  - 每个 Span → 一个 FlowSimStep (粒子沿服务边流动)
  - Span 的 serviceName → FlowSimNode
  - Span 的 kind (CLIENT/SERVER) → 消息方向
  - Span 的 status.code = ERROR → 可选故障注入 FlowSimFault
  - Trace 的开始时间作为基准，delayMs 按相对时间计算

支持两种输入格式:
  1. OTLP JSON (从 Jaeger/Tempo/Zipkin 导出的标准格式)
  2. 简化的 Trace dict (内部测试用)

playbackSpeed 由调用方指定 (0.1~10), 默认 1.0。

输出的 FLOW_SIM 关卡包含:
  - mode = 'observe' (完整回放) 或 'route' (玩家参与关键决策)
  - sourceTraceId 字段标注来源 Trace
"""

from __future__ import annotations

import logging
import re
from typing import Any

logger = logging.getLogger(__name__)

# ── OTLP span kind constants ──────────────────────────────────────────

_KIND_INTERNAL  = 'SPAN_KIND_INTERNAL'
_KIND_SERVER    = 'SPAN_KIND_SERVER'
_KIND_CLIENT    = 'SPAN_KIND_CLIENT'
_KIND_PRODUCER  = 'SPAN_KIND_PRODUCER'
_KIND_CONSUMER  = 'SPAN_KIND_CONSUMER'

# ── Role / color heuristics (same as flow_sim_factory) ───────────────

_ROLE_KEYWORDS: list[tuple[list[str], str]] = [
    (['client', 'user', 'frontend', 'app', 'initiator', '客户端'], 'client'),
    (['access', 'gateway', 'proxy', 'ingress', 'lb', '网关'], 'gateway'),
    (['meta', 'metadata', 'namenode', 'master', 'controller', '元数据'], 'control'),
    (['chunk', 'datanode', 'osd', 'storage', 'data', '存储', 'primary', 'replica'], 'data'),
    (['raft', 'leader', 'follower', 'paxos', 'consensus', '共识', '投票'], 'consensus'),
]

_ROLE_ICONS = {
    'client': '💻', 'gateway': '🔀', 'control': '🗃️',
    'data': '💾', 'consensus': '⚖️', 'external': '🌐',
}

_SPAN_COLOR_BY_KIND = {
    _KIND_CLIENT:   '#60a5fa',
    _KIND_SERVER:   '#34d399',
    _KIND_PRODUCER: '#fbbf24',
    _KIND_CONSUMER: '#a78bfa',
    _KIND_INTERNAL: '#94a3b8',
}


def _infer_role(name: str) -> str:
    lower = name.lower()
    for keywords, role in _ROLE_KEYWORDS:
        if any(k in lower for k in keywords):
            return role
    return 'external'


def _to_node_id(service_name: str) -> str:
    safe = re.sub(r'[^a-zA-Z0-9\u4e00-\u9fff]+', '-', service_name.strip())
    safe = re.sub(r'-+', '-', safe).strip('-').lower()
    return safe or 'svc'


# ── OTLP JSON parsing ─────────────────────────────────────────────────


def _extract_spans_from_otlp(otlp_json: dict) -> list[dict]:
    """
    从 OTLP ExportTraceServiceRequest JSON 中提取扁平化 span 列表。

    期望格式:
    {
      "resourceSpans": [
        {
          "resource": { "attributes": [ {"key":"service.name","value":{"stringValue":"access"}} ] },
          "scopeSpans": [
            {
              "spans": [
                {
                  "traceId": "...",
                  "spanId": "...",
                  "parentSpanId": "...",
                  "name": "...",
                  "kind": "SPAN_KIND_SERVER",
                  "startTimeUnixNano": "1700000000000000000",
                  "endTimeUnixNano":   "1700000000100000000",
                  "status": {"code": "STATUS_CODE_OK"},
                  "attributes": [...]
                }
              ]
            }
          ]
        }
      ]
    }
    """
    flat_spans: list[dict] = []

    for resource_span in otlp_json.get('resourceSpans', []):
        # Extract service name from resource attributes
        service_name = 'unknown'
        for attr in resource_span.get('resource', {}).get('attributes', []):
            if attr.get('key') == 'service.name':
                service_name = (
                    attr.get('value', {}).get('stringValue', '')
                    or str(attr.get('value', {}).get('intValue', service_name))
                )
                break

        for scope_span in resource_span.get('scopeSpans', []):
            for span in scope_span.get('spans', []):
                flat_spans.append({
                    'serviceName': service_name,
                    'traceId': span.get('traceId', ''),
                    'spanId': span.get('spanId', ''),
                    'parentSpanId': span.get('parentSpanId', ''),
                    'name': span.get('name', ''),
                    'kind': span.get('kind', _KIND_INTERNAL),
                    'startTimeUnixNano': int(span.get('startTimeUnixNano', 0)),
                    'endTimeUnixNano':   int(span.get('endTimeUnixNano', 0)),
                    'statusCode': span.get('status', {}).get('code', 'STATUS_CODE_OK'),
                    'attributes': span.get('attributes', []),
                })

    return flat_spans


def _build_span_tree(spans: list[dict]) -> dict[str, list[dict]]:
    """Build parent_id → [child_spans] tree."""
    tree: dict[str, list[dict]] = {}
    for span in spans:
        parent = span.get('parentSpanId', '') or 'root'
        tree.setdefault(parent, []).append(span)
    return tree


def _get_attr_value(attrs: list[dict], key: str) -> str:
    """Extract string value from OTLP attribute list."""
    for attr in attrs:
        if attr.get('key') == key:
            val = attr.get('value', {})
            return (val.get('stringValue')
                    or str(val.get('intValue', ''))
                    or str(val.get('boolValue', '')))
    return ''


# ── Main conversion function ──────────────────────────────────────────


def otlp_trace_to_flow_sim(
    otlp_json: dict,
    level_id: str = 'trace-replay-1',
    level_id_ref: str = 'level-1',
    mode: str = 'observe',
    task: str = '',
    explanation: str = '',
    playback_speed: float = 1.0,
    max_steps: int = 20,
    error_as_fault: bool = True,
) -> dict[str, Any]:
    """
    将 OTLP Trace JSON 转换为 FLOW_SIM 关卡。

    Args:
        otlp_json:      OTLP ExportTraceServiceRequest JSON dict
        level_id:       生成的关卡 ID
        level_id_ref:   关联的 LevelNode ID
        mode:           'observe' | 'route' | 'failover'
        task:           关卡任务描述 (空则自动生成)
        explanation:    关卡解析 (空则自动生成)
        playback_speed: 播放速度 (0.1-10)
        max_steps:      最大步骤数限制 (避免 Trace 过长导致关卡失控)
        error_as_fault: 将 ERROR span 转换为 FlowSimFault (failover 模式)

    Returns:
        FLOW_SIM 关卡 dict，若 Trace 为空则返回 {}
    """
    spans = _extract_spans_from_otlp(otlp_json)
    if not spans:
        logger.warning('otlp_trace_to_flow_sim: no spans in OTLP JSON')
        return {}

    # Sort spans by start time
    spans.sort(key=lambda s: s['startTimeUnixNano'])

    # Get trace metadata
    trace_id = spans[0].get('traceId', '') if spans else ''
    t0 = spans[0]['startTimeUnixNano'] if spans else 0

    # Build parent → children tree
    tree = _build_span_tree(spans)

    # ── Collect unique services as nodes ──────────────────────────
    services: dict[str, dict] = {}  # node_id → node dict
    for span in spans:
        svc = span['serviceName']
        nid = _to_node_id(svc)
        if nid not in services:
            role = _infer_role(svc)
            services[nid] = {
                'id': nid,
                'label': svc,
                'icon': _ROLE_ICONS.get(role, '📦'),
                'role': role,
                'x': 0.0,  # positioned below
                'y': 280.0,
                'faultable': role in ('control', 'data', 'consensus'),
                'annotations': [],
            }

    # Layout: evenly spaced
    node_list = list(services.values())
    for i, node in enumerate(node_list):
        node['x'] = 80.0 + i * 160.0

    # ── Convert parent→child span edges to steps ──────────────────
    span_by_id: dict[str, dict] = {s['spanId']: s for s in spans}
    steps: list[dict[str, Any]] = []
    faults: list[dict[str, Any]] = []
    step_counter = 0

    # BFS from root spans to maintain causal order
    queue: list[tuple[dict, str | None]] = []
    root_spans = tree.get('root', []) + tree.get('', [])
    for rs in root_spans:
        queue.append((rs, None))

    visited: set[str] = set()
    while queue and step_counter < max_steps:
        span, parent_id = queue.pop(0)
        sid = span['spanId']
        if sid in visited:
            continue
        visited.add(sid)

        svc_id = _to_node_id(span['serviceName'])

        # Determine source node: parent span's service
        if parent_id and parent_id in span_by_id:
            parent_svc_id = _to_node_id(span_by_id[parent_id]['serviceName'])
        else:
            parent_svc_id = svc_id  # self-call for root spans (skip)

        # Relative delay in ms
        delay_ms = int((span['startTimeUnixNano'] - t0) / 1_000_000)

        kind = span.get('kind', _KIND_INTERNAL)
        color = _SPAN_COLOR_BY_KIND.get(kind, '#94a3b8')
        step_id = f's{step_counter + 1}'

        # Only emit cross-service edges; skip internal spans if src==dst
        if parent_svc_id != svc_id:
            # Build data label from span name + key attributes
            peer_svc = _get_attr_value(span.get('attributes', []), 'peer.service') or ''
            http_method = _get_attr_value(span.get('attributes', []), 'http.method')
            http_url = _get_attr_value(span.get('attributes', []), 'http.url') or span['name']
            if http_method:
                data_label = f'{http_method} {http_url}'
            else:
                data_label = span['name']

            annotation = (
                f"[{kind.replace('SPAN_KIND_', '')}] {span['name']}"
                + (f' → {peer_svc}' if peer_svc else '')
            )

            step: dict[str, Any] = {
                'id': step_id,
                'from': parent_svc_id,
                'to': svc_id,
                'data': data_label,
                'annotation': annotation,
                'delayMs': delay_ms,
                'color': color,
            }
            steps.append(step)

            # Error span → fault
            if error_as_fault and span.get('statusCode', '') not in ('STATUS_CODE_OK', 'STATUS_CODE_UNSET', ''):
                faults.append({
                    'id': f'fault-{step_id}',
                    'beforeStepId': step_id,
                    'affectedNodeId': svc_id,
                    'description': f'{svc_id} 报错: {span["name"]} (status={span.get("statusCode","?")})',
                    'expectedRecoveryStepIds': [],
                })

            step_counter += 1

        # Enqueue children in start-time order
        children = sorted(tree.get(sid, []), key=lambda s: s['startTimeUnixNano'])
        for child in children:
            queue.append((child, sid))

    if not steps:
        logger.warning('otlp_trace_to_flow_sim: no cross-service steps extracted from trace')
        return {}

    # ── Auto task / explanation ────────────────────────────────────
    svc_names = [n['label'] for n in node_list[:4]]
    if not task:
        task = f'Trace 回放: {" → ".join(svc_names)}' + (' 数据流向仿真' if len(svc_names) > 1 else '')
    if not explanation:
        explanation = (
            f'本关卡由 OpenTelemetry Trace (id={trace_id[:16]}...) 自动生成。'
            f'共 {len(steps)} 个跨服务调用步骤，覆盖 {len(node_list)} 个服务节点。'
        )

    return {
        'id': level_id,
        'levelId': level_id_ref,
        'type': 'flow_sim',
        'mode': mode,
        'task': task,
        'nodes': node_list,
        'steps': steps,
        'decisions': [],
        'faults': faults,
        'playbackSpeed': max(0.1, min(10.0, playback_speed)),
        'playbackSpeedOptions': [0.1, 0.5, 1, 2, 5, 10],
        'sourceTraceId': trace_id,
        'explanation': explanation,
    }
