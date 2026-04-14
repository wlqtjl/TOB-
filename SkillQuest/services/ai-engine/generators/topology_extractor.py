"""
拓扑图提取器 — GPT-4o Vision

从 PDF/PPT 中提取的图片识别网络拓扑，输出结构化的节点+边数据，
直接生成 SkillQuest TopologyQuizLevel 格式的关卡内容。

流程:
  1. 接收图片字节
  2. base64 编码后调用 GPT-4o Vision
  3. 结构化输出 → 补充端口信息 → TopologyQuizLevel JSON
"""

from __future__ import annotations

import base64
import json
import os
import logging

logger = logging.getLogger(__name__)

# ── GPT-4o Vision 提示词 ─────────────────────────────────────────────

_TOPOLOGY_VISION_PROMPT = """分析这张图片，判断是否是网络拓扑图或架构图。

如果是网络拓扑/架构图，返回以下JSON（严格格式）：
{
  "is_topology": true,
  "confidence": 0.95,
  "key_concept": "图中的核心网络概念，如'VLAN间路由'、'三层交换'等",
  "nodes": [
    {
      "id": "n1",
      "type": "pc|router|switch|server|firewall|vm|storage",
      "label": "设备名称或IP，如'PC1'或'AR1'",
      "x": 150,
      "y": 200
    }
  ],
  "edges": [
    {
      "id": "e1",
      "from": "n1",
      "to": "n2",
      "label": "连接描述，如'GE0/0/1'或'VLAN10'",
      "bandwidth": "1Gbps",
      "vlan": 10
    }
  ],
  "task": "关卡任务描述，如'完成正确连线，使PC1能访问Server'",
  "explanation": "该拓扑的技术说明"
}

坐标系说明：图片左上角为(0,0)，估算每个设备的大概位置，范围约为(0-800, 0-600)。

设备类型映射：
- PC/电脑/工作站 → "pc"
- 路由器/Router → "router"
- 交换机/Switch → "switch"
- 服务器/Server → "server"
- 防火墙/Firewall → "firewall"
- 虚拟机/VM → "vm"
- 存储/NAS/SAN → "storage"

如果不是网络拓扑图（如流程图、表格截图、文字图等），返回：
{
  "is_topology": false,
  "confidence": 0.90,
  "description": "图片内容简述（10字以内）"
}

严格只返回JSON，不要包含任何其他文字或解释。"""


# ── 主函数 ────────────────────────────────────────────────────────────


async def extract_topology_from_image(image_bytes: bytes) -> dict:
    """
    GPT-4o Vision 分析图片，提取网络拓扑结构。

    Args:
        image_bytes: 图片二进制数据 (PNG/JPG/WEBP)

    Returns:
        dict:
          - is_topology=True 时: 含 nodes/edges/task 的拓扑数据
            + SkillQuest 格式的 nodes(含ports)/edges/correctConnections
          - is_topology=False 时: {is_topology: false, description: ...}
          - 失败时: {is_topology: false, error: "..."}
    """
    api_key = os.getenv("OPENAI_API_KEY", "")
    if not api_key:
        logger.warning("OPENAI_API_KEY 未配置，跳过拓扑图识别")
        return {
            "is_topology": False,
            "confidence": 0.0,
            "error": "OPENAI_API_KEY not configured",
        }

    import openai

    client = openai.AsyncOpenAI(api_key=api_key)

    # 检测 MIME 类型
    mime = _detect_image_mime(image_bytes)

    # base64 编码
    b64 = base64.b64encode(image_bytes).decode("utf-8")

    try:
        response = await client.chat.completions.create(
            model="gpt-4o",
            temperature=0.1,
            response_format={"type": "json_object"},
            max_tokens=2_000,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{mime};base64,{b64}",
                                "detail": "high",
                            },
                        },
                        {"type": "text", "text": _TOPOLOGY_VISION_PROMPT},
                    ],
                }
            ],
        )

        raw = response.choices[0].message.content or "{}"
        result = json.loads(raw)

        if result.get("is_topology"):
            # 补充 SkillQuest TopologyQuizLevel 所需的端口信息
            result = _enrich_for_skillquest(result)
            logger.info(
                f"拓扑识别成功: {len(result.get('nodes', []))} 节点, "
                f"{len(result.get('edges', []))} 边, "
                f"confidence={result.get('confidence', 0):.2f}"
            )
        else:
            logger.info(f"图片不是拓扑图: {result.get('description', '')}")

        return result

    except json.JSONDecodeError as e:
        logger.error(f"GPT-4o 返回非 JSON: {e}")
        return {"is_topology": False, "confidence": 0.0}
    except Exception as e:
        logger.error(f"GPT-4o Vision 调用失败: {e}")
        return {"is_topology": False, "confidence": 0.0}


# ── SkillQuest 格式转换 ───────────────────────────────────────────────


def _enrich_for_skillquest(result: dict) -> dict:
    """
    将 GPT-4o 识别的拓扑数据转换为 SkillQuest TopologyQuizLevel 格式。

    补充:
      - 每个节点的 ports 列表
      - Cable edges 格式 (fromPortId/toPortId)
      - correctConnections 列表
      - packetPath (简化版: 经过所有节点的路径)
    """
    nodes: list[dict] = result.get("nodes", [])
    edges: list[dict] = result.get("edges", [])

    # 为每个节点生成端口（每条连线占一个端口）
    # port_usage[node_id] = 已分配端口数
    port_usage: dict[str, int] = {n["id"]: 0 for n in nodes}

    # 构建端口分配映射: edge_idx → {from_port_id, to_port_id}
    edge_port_map: dict[int, dict[str, str]] = {}
    for i, edge in enumerate(edges):
        from_id = edge.get("from", "")
        to_id = edge.get("to", "")
        from_port_num = port_usage.get(from_id, 0) + 1
        to_port_num = port_usage.get(to_id, 0) + 1
        port_usage[from_id] = from_port_num
        port_usage[to_id] = to_port_num
        edge_port_map[i] = {
            "from_port_id": f"{from_id}-ge{from_port_num}",
            "to_port_id": f"{to_id}-ge{to_port_num}",
        }

    # 更新节点，添加 ports 字段
    for node in nodes:
        n_id = node["id"]
        port_count = port_usage.get(n_id, 0)
        node["ports"] = [
            {"id": f"{n_id}-ge{p}", "label": f"GE0/0/{p - 1}"}
            for p in range(1, port_count + 1)
        ]

    # 构建 SkillQuest Cable 格式的 edges
    skillquest_edges = []
    correct_connections = []
    for i, edge in enumerate(edges):
        ports = edge_port_map.get(i, {})
        from_port_id = ports.get("from_port_id", f"{edge.get('from')}-ge1")
        to_port_id = ports.get("to_port_id", f"{edge.get('to')}-ge1")

        skillquest_edges.append({
            "id": edge.get("id", f"e{i}"),
            "fromPortId": from_port_id,
            "toPortId": to_port_id,
            "visible": True,  # 初始全部可见
            "bandwidth": edge.get("bandwidth", ""),
            "vlan": edge.get("vlan"),
            "label": edge.get("label", ""),
        })
        correct_connections.append({
            "fromPortId": from_port_id,
            "toPortId": to_port_id,
        })

    # Hide edges to increase challenge — shuffle indices first to avoid
    # always hiding the same (potentially critical) edges, while keeping
    # at least 2 visible edges to give players enough connectivity context.
    if len(skillquest_edges) >= 3:
        hide_count = max(1, len(skillquest_edges) // 3)
        # Work on a shuffled index list so hidden edges are random, not always the last ones
        import random as _random
        candidate_indices = list(range(1, len(skillquest_edges)))  # never hide edge 0 (entry point)
        _random.shuffle(candidate_indices)
        hidden_indices = set(candidate_indices[:hide_count])
        for idx, edge in enumerate(skillquest_edges):
            if idx in hidden_indices:
                edge["visible"] = False

    # 简化的 packetPath（经过所有节点的第一个端口）
    packet_path: list[str] = []
    for node in nodes:
        ports = node.get("ports", [])
        if ports:
            packet_path.append(ports[0]["id"])

    result["nodes"] = nodes
    result["edges"] = skillquest_edges
    result["correctConnections"] = correct_connections
    result["packetPath"] = packet_path

    return result


def _detect_image_mime(image_bytes: bytes) -> str:
    """从文件头字节检测图片 MIME 类型"""
    if image_bytes[:8] == b"\x89PNG\r\n\x1a\n":
        return "image/png"
    if image_bytes[:3] == b"\xff\xd8\xff":
        return "image/jpeg"
    if image_bytes[:4] == b"RIFF" and image_bytes[8:12] == b"WEBP":
        return "image/webp"
    if image_bytes[:4] in (b"GIF8", b"GIF9"):
        return "image/gif"
    return "image/png"  # 默认
