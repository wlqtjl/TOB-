"""
拓扑图提取器 — GPT-4o Vision

从PPT/图片中识别网络拓扑, 输出结构化的节点+边数据
用于自动生成「拓扑连线题」(对标 Data Center packet-balls)
"""


async def extract_topology_from_image(image_bytes: bytes) -> dict:
    """
    GPT-4o Vision 分析拓扑图截图

    Phase 2 实现:
    response = await openai.chat.completions.create(
        model="gpt-4o",
        messages=[{
            "role": "user",
            "content": [
                {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{b64}"}},
                {"type": "text", "text": '''
                分析这张网络拓扑图，返回JSON：
                {
                  "nodes": [{"id":"R1","type":"router","label":"AR1"},…],
                  "edges": [{"from":"PC1","to":"SW1","vlan":10},…],
                  "key_concept": "VLAN间路由",
                  "quiz_task": "连线使PC1能访问Server"
                }
                '''}
            ]
        }]
    )
    """
    return {"status": "placeholder", "message": "Phase 2: GPT-4o Vision topology extraction"}
