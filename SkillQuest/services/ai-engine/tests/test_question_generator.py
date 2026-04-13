"""
Tests for question_generator.py — Phase 2 Implementation

Covers:
- Fallback generation (no API key)
- Prompt building
- Result validation
"""

import os
from unittest.mock import patch

import pytest

from generators.question_generator import (
    generate_level_from_material,
    _generate_fallback_questions,
    _build_user_prompt,
    DIFFICULTY_CONFIG,
)


# ─── Fallback Generator Tests ────────────────────────────────────────


class TestFallbackGenerator:
    """Test rule-based fallback when OpenAI is unavailable."""

    def test_fallback_returns_questions(self):
        content = "SmartX SMTX OS is a hyperconverged operating system.\nZBS provides distributed block storage."
        result = _generate_fallback_questions(content, "SmartX", "beginner")

        assert result["status"] == "fallback"
        assert result["vendor"] == "SmartX"
        assert result["difficulty"] == "beginner"
        assert isinstance(result["questions"], list)
        assert len(result["questions"]) > 0

    def test_fallback_question_structure(self):
        content = "ZBS is the distributed storage engine.\nELF provides KVM-based virtualization.\nCloudTower manages multiple clusters."
        result = _generate_fallback_questions(content, "SmartX", "intermediate")

        for q in result["questions"]:
            assert "type" in q
            assert "content" in q
            assert "options" in q
            assert "correctOptionIds" in q
            assert "explanation" in q
            assert "knowledgePointTags" in q
            assert q["type"] == "single_choice"
            assert len(q["options"]) == 4

    def test_fallback_with_empty_content(self):
        result = _generate_fallback_questions("", "TestVendor", "beginner")
        assert result["status"] == "fallback"
        assert len(result["questions"]) >= 1

    def test_fallback_with_short_paragraphs(self):
        content = "Short.\nAlso short.\nStill short."
        result = _generate_fallback_questions(content, "Vendor", "advanced")
        assert result["status"] == "fallback"
        assert len(result["questions"]) >= 1

    def test_fallback_generates_unique_tags(self):
        content = "First paragraph about storage technology and distribution.\nSecond paragraph about network configuration.\nThird paragraph about security policies."
        result = _generate_fallback_questions(content, "TestCo", "beginner")

        tags = [q["knowledgePointTags"][0] for q in result["questions"]]
        assert len(tags) == len(set(tags)), "Tags should be unique per question"


# ─── Prompt Building Tests ────────────────────────────────────────────


class TestPromptBuilding:
    """Test GPT-4o prompt construction."""

    def test_beginner_prompt(self):
        prompt = _build_user_prompt("Sample content", "SmartX", "beginner")
        assert "SmartX" in prompt
        assert "beginner" in prompt
        assert "识记" in prompt
        assert "3道单选题" in prompt

    def test_intermediate_prompt(self):
        prompt = _build_user_prompt("Sample content", "锐捷", "intermediate")
        assert "锐捷" in prompt
        assert "应用" in prompt

    def test_advanced_prompt(self):
        prompt = _build_user_prompt("Sample content", "Sangfor", "advanced")
        assert "advanced" in prompt
        assert "4道单选题" in prompt
        assert "创造" in prompt

    def test_content_truncation(self):
        long_content = "x" * 10000
        prompt = _build_user_prompt(long_content, "V", "beginner")
        # Content should be truncated to 4000 chars
        assert len(prompt) < 10000

    def test_prompt_includes_schema(self):
        prompt = _build_user_prompt("content", "V", "beginner")
        assert "single_choice" in prompt
        assert "ordering" in prompt
        assert "matching" in prompt


# ─── Difficulty Config Tests ──────────────────────────────────────────


class TestDifficultyConfig:
    """Test difficulty level configuration."""

    def test_all_difficulties_defined(self):
        assert "beginner" in DIFFICULTY_CONFIG
        assert "intermediate" in DIFFICULTY_CONFIG
        assert "advanced" in DIFFICULTY_CONFIG

    def test_advanced_has_more_questions(self):
        assert DIFFICULTY_CONFIG["advanced"]["single_choice_count"] >= DIFFICULTY_CONFIG["beginner"]["single_choice_count"]

    def test_bloom_levels_progressive(self):
        assert "识记" in DIFFICULTY_CONFIG["beginner"]["bloom_level"]
        assert "应用" in DIFFICULTY_CONFIG["intermediate"]["bloom_level"]
        assert "创造" in DIFFICULTY_CONFIG["advanced"]["bloom_level"]


# ─── Async Generator Tests ───────────────────────────────────────────


class TestAsyncGenerator:
    """Test the main generate_level_from_material function."""

    @pytest.fixture(autouse=True)
    def _clear_api_key(self):
        """Ensure OPENAI_API_KEY is unset for fallback testing."""
        with patch.dict(os.environ, {"OPENAI_API_KEY": ""}):
            import generators.question_generator as qg
            original = qg.OPENAI_API_KEY
            qg.OPENAI_API_KEY = ""
            yield
            qg.OPENAI_API_KEY = original

    @pytest.mark.asyncio
    async def test_generates_fallback_without_api_key(self):
        """Without OPENAI_API_KEY, should use fallback generator."""
        result = await generate_level_from_material(
            content="SmartX SMTX OS integrates compute, storage, and networking.",
            vendor="SmartX",
            difficulty="beginner",
        )
        assert result["status"] == "fallback"
        assert "questions" in result
        assert len(result["questions"]) > 0

    @pytest.mark.asyncio
    async def test_generates_with_different_difficulties(self):
        for diff in ("beginner", "intermediate", "advanced"):
            result = await generate_level_from_material(
                content="Test content for generation.",
                vendor="TestVendor",
                difficulty=diff,
            )
            assert result["difficulty"] == diff
            assert "questions" in result
