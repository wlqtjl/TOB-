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

from typing import Literal

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


async def generate_level_from_material(
    content: str,
    vendor: str,
    difficulty: Literal["beginner", "intermediate", "advanced"],
) -> dict:
    """
    从培训材料生成一个关卡的题目

    Phase 2 实现: 接入 OpenAI GPT-4o API
    """
    # Phase 2 将实现:
    # response = await openai.chat.completions.create(
    #     model="gpt-4o",
    #     messages=[
    #         {"role": "system", "content": SYSTEM_PROMPT},
    #         {"role": "user", "content": f"""
    #         厂商: {vendor}
    #         难度: {difficulty}
    #         培训材料: {content[:3000]}
    #
    #         请生成:
    #         1. 3道单选题（含4个选项，1个正确答案，答案解析）
    #         2. 1道排序题（5个步骤需要排序）
    #         3. 1道连线题（4对知识点匹配）
    #
    #         JSON schema: {LEVEL_SCHEMA}
    #         """}
    #     ],
    #     response_format={"type": "json_object"}
    # )
    return {"status": "placeholder", "vendor": vendor, "difficulty": difficulty}
