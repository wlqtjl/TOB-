"""
题目生成器 — 核心AI能力

对标 Data Center 的固定内容,
SkillQuest 的差异化在于: AI从培训材料自动生成多种题型

支持生成:
- 单选/多选/判断 (基础)
- 排序题 (操作步骤)
- 连线题 (知识关联)
- 拓扑连线题 (网络类, 对标Data Center packet-balls)
- VRP终端填空 (命令行类)
- 故障排查情景 (叙事类)
"""

from __future__ import annotations

import json
import logging
import os
import uuid
from typing import Any, Literal

logger = logging.getLogger(__name__)

OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4o")
OPENAI_TIMEOUT_SECONDS: float = float(os.getenv("OPENAI_TIMEOUT_SECONDS", "60"))

SYSTEM_PROMPT = """你是专业的企业培训课程设计专家。
根据提供的培训材料，生成符合布鲁姆教育目标分类的题目。
输出严格的JSON格式，不包含任何其他文字。"""

LEVEL_SCHEMA = {
    "questions": [
        {
            "type": "single_choice | multi_choice | true_false | ordering | matching",
            "content": "题干文字",
            "options": [{"id": "a", "text": "选项文字"}],
            "correctOptionIds": ["a"],
            "explanation": "答案解析",
            "knowledgePointTags": ["知识点标签"],
        }
    ],
}

DIFFICULTY_CONFIG: dict[str, dict[str, Any]] = {
    "beginner": {
        "single_choice_count": 3,
        "ordering_count": 1,
        "matching_count": 1,
        "option_count": 4,
        "ordering_steps": 4,
        "matching_pairs": 4,
        "bloom_level": "识记、理解",
    },
    "intermediate": {
        "single_choice_count": 3,
        "ordering_count": 1,
        "matching_count": 1,
        "option_count": 4,
        "ordering_steps": 5,
        "matching_pairs": 5,
        "bloom_level": "应用、分析",
    },
    "advanced": {
        "single_choice_count": 4,
        "ordering_count": 1,
        "matching_count": 1,
        "option_count": 5,
        "ordering_steps": 6,
        "matching_pairs": 5,
        "bloom_level": "分析、评价、创造",
    },
}


def _build_user_prompt(
    content: str,
    vendor: str,
    difficulty: Literal["beginner", "intermediate", "advanced"],
) -> str:
    """Build the user prompt for GPT-4o based on difficulty configuration."""
    cfg = DIFFICULTY_CONFIG[difficulty]
    return f"""厂商: {vendor}
难度: {difficulty}
布鲁姆层级: {cfg["bloom_level"]}
培训材料:
{content[:4000]}

请严格按照以下JSON schema生成题目:

{{
  "questions": [
    // {cfg["single_choice_count"]}道单选题，每道含{cfg["option_count"]}个选项(id用a/b/c/d...)，1个正确答案
    {{
      "type": "single_choice",
      "content": "题干",
      "options": [{{"id": "a", "text": "选项文字"}}, ...],
      "correctOptionIds": ["a"],
      "explanation": "答案解析，引用培训材料原文",
      "knowledgePointTags": ["知识点标签"]
    }},
    // {cfg["ordering_count"]}道排序题，含{cfg["ordering_steps"]}个步骤需要正确排序
    {{
      "type": "ordering",
      "content": "请将以下步骤按正确顺序排列",
      "options": [{{"id": "1", "text": "步骤文字"}}, ...],
      "correctOptionIds": ["2", "1", "3", ...],
      "explanation": "正确顺序及原因",
      "knowledgePointTags": ["知识点标签"]
    }},
    // {cfg["matching_count"]}道连线题，含{cfg["matching_pairs"]}对知识点匹配
    {{
      "type": "matching",
      "content": "请将左侧概念与右侧描述正确配对",
      "options": [{{"id": "a", "text": "概念A → 描述A"}}, ...],
      "correctOptionIds": ["a", "b", "c", "d"],
      "explanation": "配对解析",
      "knowledgePointTags": ["知识点标签"]
    }}
  ]
}}

要求:
1. 题目内容必须完全来自提供的培训材料
2. 答案解析需引用材料原文
3. 知识点标签简洁准确
4. 不要添加schema之外的字段"""


def _generate_fallback_questions(
    content: str,
    vendor: str,
    difficulty: Literal["beginner", "intermediate", "advanced"],
) -> dict[str, Any]:
    """Generate basic fallback questions when OpenAI API is unavailable."""
    paragraphs = [p.strip() for p in content.split("\n") if len(p.strip()) > 20]
    questions: list[dict[str, Any]] = []

    for i, para in enumerate(paragraphs[:3]):
        qid = str(uuid.uuid4())[:8]
        questions.append({
            "type": "single_choice",
            "content": f"关于以下内容，哪个描述是正确的？\n\n「{para[:150]}」",
            "options": [
                {"id": "a", "text": f"以上描述涉及{vendor}产品的核心功能"},
                {"id": "b", "text": "以上描述与该主题无关"},
                {"id": "c", "text": "以上描述存在明显错误"},
                {"id": "d", "text": "以上描述需要更多上下文才能理解"},
            ],
            "correctOptionIds": ["a"],
            "explanation": f"根据培训材料，此内容描述了{vendor}产品的相关知识点。",
            "knowledgePointTags": [f"{vendor}-基础知识-{i + 1}"],
        })

    if not questions:
        questions.append({
            "type": "single_choice",
            "content": f"以下关于{vendor}产品的描述，哪个是正确的？",
            "options": [
                {"id": "a", "text": f"{vendor}提供企业级IT基础设施解决方案"},
                {"id": "b", "text": f"{vendor}仅提供消费级产品"},
                {"id": "c", "text": f"{vendor}不涉及虚拟化技术"},
                {"id": "d", "text": f"{vendor}产品不支持分布式架构"},
            ],
            "correctOptionIds": ["a"],
            "explanation": f"{vendor}是企业级IT基础设施解决方案提供商。",
            "knowledgePointTags": [f"{vendor}-概述"],
        })

    return {
        "status": "fallback",
        "vendor": vendor,
        "difficulty": difficulty,
        "questions": questions,
    }


async def generate_level_from_material(
    content: str,
    vendor: str,
    difficulty: Literal["beginner", "intermediate", "advanced"],
) -> dict[str, Any]:
    """
    从培训材料生成一个关卡的题目

    Phase 2: 接入 OpenAI GPT-4o API，失败时降级为规则生成
    """
    if not OPENAI_API_KEY:
        logger.warning("OPENAI_API_KEY not set — using fallback question generator")
        return _generate_fallback_questions(content, vendor, difficulty)

    try:
        import httpx

        user_prompt = _build_user_prompt(content, vendor, difficulty)

        async with httpx.AsyncClient(timeout=OPENAI_TIMEOUT_SECONDS) as client:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {OPENAI_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": OPENAI_MODEL,
                    "messages": [
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": user_prompt},
                    ],
                    "response_format": {"type": "json_object"},
                    "temperature": 0.7,
                    "max_tokens": 3000,
                },
            )
            response.raise_for_status()

        data = response.json()
        raw_content = data["choices"][0]["message"]["content"]
        result = json.loads(raw_content)

        # Validate structure
        if "questions" not in result or not isinstance(result["questions"], list):
            logger.error("GPT-4o returned invalid structure — missing 'questions' array")
            return _generate_fallback_questions(content, vendor, difficulty)

        # Enrich metadata
        for q in result["questions"]:
            if "knowledgePointTags" not in q:
                q["knowledgePointTags"] = []

        return {
            "status": "generated",
            "vendor": vendor,
            "difficulty": difficulty,
            "model": OPENAI_MODEL,
            "questions": result["questions"],
        }

    except Exception as exc:
        logger.error("GPT-4o question generation failed: %s — using fallback", exc)
        return _generate_fallback_questions(content, vendor, difficulty)
