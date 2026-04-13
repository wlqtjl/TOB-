"""
Tests for FLOW_SIM generators — mermaid_to_flow_sim, flow_sim_factory, otlp_trace_replay

Coverage:
  - Mermaid sequenceDiagram → FlowSimLevel JSON
  - Text keyword extraction → FlowSimLevel JSON
  - OTLP Trace JSON → FlowSimLevel JSON
  - Edge cases: empty input, unknown nodes, error spans
"""

import pytest

# ── Mermaid → FLOW_SIM ────────────────────────────────────────────────

from generators.mermaid_to_flow_sim import parse_mermaid_sequence, mermaid_to_flow_sim

SIMPLE_MERMAID = """
sequenceDiagram
  participant Client as 客户端
  participant Access as Access网关
  participant Meta as Meta元数据服务
  participant Chunk as Chunk存储节点

  Client->>Access: Write(block_id=42, data=4KB)
  Access->>Meta: GetLease(block_id=42)
  Meta-->>Access: Lease(chunk_ids=[Chunk])
  Access->>Chunk: Write(data=4KB)
  Chunk-->>Access: WriteOK
  Access-->>Client: WriteACK
"""

MERMAID_WITH_ALT = """
sequenceDiagram
  participant A as Access
  participant M as Meta
  participant C1 as Chunk1
  participant C2 as Chunk2

  A->>M: GetLease(block)
  M-->>A: Lease([C1, C2])
  alt 写入Primary节点
    A->>C1: Write(data)
  else 备用Replica
    A->>C2: Write(data)
  end
"""


class TestParseMermaidSequence:
    def test_parses_participants(self):
        seq = parse_mermaid_sequence(SIMPLE_MERMAID)
        assert len(seq.participants) == 4
        labels = [p.label for p in seq.participants]
        assert '客户端' in labels
        assert 'Access网关' in labels

    def test_parses_solid_arrows(self):
        seq = parse_mermaid_sequence(SIMPLE_MERMAID)
        solid_msgs = [m for m in seq.messages if not m.is_return]
        assert len(solid_msgs) >= 3

    def test_parses_dotted_arrows_as_return(self):
        seq = parse_mermaid_sequence(SIMPLE_MERMAID)
        return_msgs = [m for m in seq.messages if m.is_return]
        assert len(return_msgs) >= 2  # Lease + WriteOK + WriteACK

    def test_parses_alt_block_as_decision(self):
        seq = parse_mermaid_sequence(MERMAID_WITH_ALT)
        assert len(seq.decisions) >= 1
        assert '写入Primary节点' in seq.decisions[0].condition

    def test_auto_creates_missing_participant(self):
        # Participant used in message but not declared
        minimal = "sequenceDiagram\n  A->>B: Hello"
        seq = parse_mermaid_sequence(minimal)
        aliases = {p.alias for p in seq.participants}
        assert 'A' in aliases
        assert 'B' in aliases

    def test_empty_mermaid(self):
        seq = parse_mermaid_sequence("")
        assert seq.participants == []
        assert seq.messages == []


class TestMermaidToFlowSim:
    def test_produces_valid_flow_sim_level(self):
        level = mermaid_to_flow_sim(SIMPLE_MERMAID, level_id='test-1', level_id_ref='l1')
        assert level['type'] == 'flow_sim'
        assert level['id'] == 'test-1'
        assert len(level['nodes']) >= 4
        assert len(level['steps']) >= 4

    def test_node_roles_inferred(self):
        level = mermaid_to_flow_sim(SIMPLE_MERMAID)
        roles = {n['id']: n['role'] for n in level['nodes']}
        # 'Client' alias → role 'client'
        assert roles.get('Client') == 'client'

    def test_steps_have_required_fields(self):
        level = mermaid_to_flow_sim(SIMPLE_MERMAID)
        for step in level['steps']:
            assert 'id' in step
            assert 'from' in step
            assert 'to' in step
            assert 'data' in step
            assert 'delayMs' in step
            assert 'color' in step

    def test_ack_steps_have_different_color(self):
        level = mermaid_to_flow_sim(SIMPLE_MERMAID)
        # Return messages should use ACK color (#34d399)
        colors = {s['id']: s['color'] for s in level['steps']}
        # At least one step should be ACK color
        assert '#34d399' in colors.values()

    def test_playback_speed_clamped(self):
        level = mermaid_to_flow_sim(SIMPLE_MERMAID, playback_speed=100)
        assert level['playbackSpeed'] <= 10.0

        level2 = mermaid_to_flow_sim(SIMPLE_MERMAID, playback_speed=0.0001)
        assert level2['playbackSpeed'] >= 0.1

    def test_mermaid_source_stored(self):
        level = mermaid_to_flow_sim(SIMPLE_MERMAID)
        assert 'mermaidSource' in level
        assert 'sequenceDiagram' in level['mermaidSource'] or 'participant' in level['mermaidSource']

    def test_returns_empty_on_no_participants(self):
        level = mermaid_to_flow_sim("")
        assert level == {}

    def test_alt_block_creates_decision(self):
        level = mermaid_to_flow_sim(MERMAID_WITH_ALT)
        assert len(level['decisions']) >= 1
        d = level['decisions'][0]
        assert 'question' in d
        assert len(d['options']) >= 1

    def test_custom_task_preserved(self):
        level = mermaid_to_flow_sim(SIMPLE_MERMAID, task='自定义任务')
        assert level['task'] == '自定义任务'

    def test_auto_task_generated_when_empty(self):
        level = mermaid_to_flow_sim(SIMPLE_MERMAID, task='')
        assert level['task']  # non-empty


# ── Text keyword extraction → FLOW_SIM ───────────────────────────────

from generators.flow_sim_factory import keyword_extract, text_to_flow_sim

ZBS_TEXT = """
ZBS 写入流程:
  客户端通过 iSCSI 协议向 Access 节点发送写请求 Write(block_id, data)。
  Access 向 Meta 元数据服务发送 GetLease 请求，获取写入目标 Chunk 节点列表。
  Meta 向 Access 返回 Lease(chunk_ids) 响应，包含三个副本节点的 ID。
  Access 将数据写入 Primary Chunk 节点。
  Primary → Replica1: Sync(data)
  Primary → Replica2: Sync(data)
  Replica1 和 Replica2 确认写入后，Primary 向 Access 发送 WriteOK。
  Access 向客户端返回写入成功 ACK。
"""

RAFT_TEXT = """
Raft 领导选举流程:
  Candidate → Follower: RequestVote RPC
  Follower → Candidate: VoteGranted
  当获得多数票后, Candidate 向所有节点发送 AppendEntries 心跳确认领导权。
  Leader → Follower: AppendEntries (heartbeat)
  Follower → Leader: AppendEntriesACK
"""


class TestKeywordExtract:
    def test_extracts_components_from_arrow_pattern(self):
        result = keyword_extract("Primary → Replica1: Sync(data)\nPrimary → Replica2: Sync(data)")
        assert len(result.components) >= 2

    def test_extracts_components_from_chinese_pattern(self):
        result = keyword_extract("客户端向Access节点发送写请求")
        component_names = ' '.join(result.components).lower()
        # At least one component should be extracted
        assert len(result.components) >= 1

    def test_notes_contain_multi_component_sentences(self):
        result = keyword_extract(ZBS_TEXT)
        assert len(result.notes) >= 1

    def test_no_duplicate_edges(self):
        result = keyword_extract(ZBS_TEXT)
        edge_keys = [(e.src.lower(), e.dst.lower()) for e in result.edges]
        assert len(edge_keys) == len(set(edge_keys))


class TestTextToFlowSim:
    def test_produces_flow_sim_from_zbs_text(self):
        level = text_to_flow_sim(ZBS_TEXT, level_id='zbs-1', level_id_ref='l1')
        assert level  # non-empty
        assert level['type'] == 'flow_sim'
        assert len(level['nodes']) >= 1
        assert len(level['steps']) >= 1

    def test_produces_flow_sim_from_raft_text(self):
        level = text_to_flow_sim(RAFT_TEXT, level_id='raft-1')
        assert level
        assert level['type'] == 'flow_sim'

    def test_all_step_nodes_exist_in_nodes(self):
        level = text_to_flow_sim(ZBS_TEXT)
        if not level:
            pytest.skip('No steps extracted from text')
        node_ids = {n['id'] for n in level['nodes']}
        for step in level['steps']:
            assert step['from'] in node_ids, f"Step 'from' node {step['from']} not in nodes"
            assert step['to'] in node_ids, f"Step 'to' node {step['to']} not in nodes"

    def test_playback_speed_options_present(self):
        level = text_to_flow_sim(ZBS_TEXT)
        if not level:
            pytest.skip('No content extracted')
        assert 'playbackSpeedOptions' in level
        assert 0.1 in level['playbackSpeedOptions']
        assert 10 in level['playbackSpeedOptions']

    def test_returns_empty_on_blank_text(self):
        level = text_to_flow_sim("   ")
        assert level == {}

    def test_custom_mode_preserved(self):
        level = text_to_flow_sim(ZBS_TEXT, mode='failover')
        if not level:
            pytest.skip('No content extracted')
        assert level['mode'] == 'failover'

    def test_playback_speed_clamped(self):
        level = text_to_flow_sim(ZBS_TEXT, playback_speed=999)
        if not level:
            pytest.skip('No content extracted')
        assert level['playbackSpeed'] <= 10.0


# ── OTLP Trace → FLOW_SIM ─────────────────────────────────────────────

from generators.otlp_trace_replay import otlp_trace_to_flow_sim, _extract_spans_from_otlp

SAMPLE_OTLP = {
    "resourceSpans": [
        {
            "resource": {
                "attributes": [
                    {"key": "service.name", "value": {"stringValue": "access-gateway"}}
                ]
            },
            "scopeSpans": [
                {
                    "spans": [
                        {
                            "traceId": "abcdef1234567890abcdef1234567890",
                            "spanId": "span001",
                            "parentSpanId": "",
                            "name": "iSCSI.Write",
                            "kind": "SPAN_KIND_SERVER",
                            "startTimeUnixNano": "1700000000000000000",
                            "endTimeUnixNano":   "1700000000100000000",
                            "status": {"code": "STATUS_CODE_OK"},
                            "attributes": []
                        }
                    ]
                }
            ]
        },
        {
            "resource": {
                "attributes": [
                    {"key": "service.name", "value": {"stringValue": "meta-service"}}
                ]
            },
            "scopeSpans": [
                {
                    "spans": [
                        {
                            "traceId": "abcdef1234567890abcdef1234567890",
                            "spanId": "span002",
                            "parentSpanId": "span001",
                            "name": "Meta.GetLease",
                            "kind": "SPAN_KIND_CLIENT",
                            "startTimeUnixNano": "1700000000010000000",
                            "endTimeUnixNano":   "1700000000050000000",
                            "status": {"code": "STATUS_CODE_OK"},
                            "attributes": []
                        }
                    ]
                }
            ]
        },
        {
            "resource": {
                "attributes": [
                    {"key": "service.name", "value": {"stringValue": "chunk-node"}}
                ]
            },
            "scopeSpans": [
                {
                    "spans": [
                        {
                            "traceId": "abcdef1234567890abcdef1234567890",
                            "spanId": "span003",
                            "parentSpanId": "span001",
                            "name": "Chunk.Write",
                            "kind": "SPAN_KIND_CLIENT",
                            "startTimeUnixNano": "1700000000060000000",
                            "endTimeUnixNano":   "1700000000090000000",
                            "status": {"code": "STATUS_CODE_OK"},
                            "attributes": []
                        }
                    ]
                }
            ]
        }
    ]
}

OTLP_WITH_ERROR = {
    "resourceSpans": [
        {
            "resource": {
                "attributes": [{"key": "service.name", "value": {"stringValue": "frontend"}}]
            },
            "scopeSpans": [
                {
                    "spans": [
                        {
                            "traceId": "err001",
                            "spanId": "sA",
                            "parentSpanId": "",
                            "name": "HTTP.GET /api/data",
                            "kind": "SPAN_KIND_SERVER",
                            "startTimeUnixNano": "1700000000000000000",
                            "endTimeUnixNano":   "1700000000100000000",
                            "status": {"code": "STATUS_CODE_OK"},
                            "attributes": []
                        }
                    ]
                }
            ]
        },
        {
            "resource": {
                "attributes": [{"key": "service.name", "value": {"stringValue": "backend"}}]
            },
            "scopeSpans": [
                {
                    "spans": [
                        {
                            "traceId": "err001",
                            "spanId": "sB",
                            "parentSpanId": "sA",
                            "name": "DB.Query",
                            "kind": "SPAN_KIND_CLIENT",
                            "startTimeUnixNano": "1700000000020000000",
                            "endTimeUnixNano":   "1700000000090000000",
                            "status": {"code": "STATUS_CODE_ERROR"},
                            "attributes": []
                        }
                    ]
                }
            ]
        }
    ]
}


class TestExtractSpansFromOtlp:
    def test_extracts_spans_with_service_name(self):
        spans = _extract_spans_from_otlp(SAMPLE_OTLP)
        assert len(spans) == 3
        service_names = {s['serviceName'] for s in spans}
        assert 'access-gateway' in service_names
        assert 'meta-service' in service_names

    def test_extracts_span_kind(self):
        spans = _extract_spans_from_otlp(SAMPLE_OTLP)
        kinds = {s['kind'] for s in spans}
        assert 'SPAN_KIND_SERVER' in kinds
        assert 'SPAN_KIND_CLIENT' in kinds

    def test_extracts_parent_span_id(self):
        spans = _extract_spans_from_otlp(SAMPLE_OTLP)
        by_id = {s['spanId']: s for s in spans}
        assert by_id['span002']['parentSpanId'] == 'span001'

    def test_empty_otlp(self):
        spans = _extract_spans_from_otlp({})
        assert spans == []


class TestOtlpTraceToFlowSim:
    def test_produces_flow_sim_from_sample_trace(self):
        level = otlp_trace_to_flow_sim(SAMPLE_OTLP, level_id='trace-1', level_id_ref='l1')
        assert level
        assert level['type'] == 'flow_sim'
        assert level['id'] == 'trace-1'

    def test_nodes_represent_services(self):
        level = otlp_trace_to_flow_sim(SAMPLE_OTLP)
        node_labels = {n['label'] for n in level['nodes']}
        assert 'access-gateway' in node_labels
        assert 'meta-service' in node_labels
        assert 'chunk-node' in node_labels

    def test_cross_service_steps_extracted(self):
        level = otlp_trace_to_flow_sim(SAMPLE_OTLP)
        assert len(level['steps']) >= 1

    def test_step_delay_is_relative_to_trace_start(self):
        level = otlp_trace_to_flow_sim(SAMPLE_OTLP)
        # First step should have delay_ms close to 0
        if level['steps']:
            assert level['steps'][0]['delayMs'] >= 0

    def test_source_trace_id_recorded(self):
        level = otlp_trace_to_flow_sim(SAMPLE_OTLP)
        assert 'sourceTraceId' in level
        assert level['sourceTraceId'] == 'abcdef1234567890abcdef1234567890'

    def test_error_span_creates_fault_when_enabled(self):
        level = otlp_trace_to_flow_sim(OTLP_WITH_ERROR, error_as_fault=True)
        assert len(level['faults']) >= 1
        # Fault should reference the error node
        fault_nodes = {f['affectedNodeId'] for f in level['faults']}
        assert 'backend' in fault_nodes

    def test_error_span_no_fault_when_disabled(self):
        level = otlp_trace_to_flow_sim(OTLP_WITH_ERROR, error_as_fault=False)
        assert len(level['faults']) == 0

    def test_max_steps_respected(self):
        level = otlp_trace_to_flow_sim(SAMPLE_OTLP, max_steps=1)
        assert len(level['steps']) <= 1

    def test_playback_speed_options_present(self):
        level = otlp_trace_to_flow_sim(SAMPLE_OTLP)
        assert 'playbackSpeedOptions' in level
        assert 0.1 in level['playbackSpeedOptions']
        assert 10 in level['playbackSpeedOptions']

    def test_returns_empty_on_empty_trace(self):
        level = otlp_trace_to_flow_sim({})
        assert level == {}

    def test_auto_generates_task_from_service_names(self):
        level = otlp_trace_to_flow_sim(SAMPLE_OTLP, task='')
        assert level['task']  # non-empty

    def test_playback_speed_clamped(self):
        level = otlp_trace_to_flow_sim(SAMPLE_OTLP, playback_speed=999)
        assert level['playbackSpeed'] <= 10.0
