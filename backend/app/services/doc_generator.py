import logging
from typing import List, Optional
from ..models.schemas import RepoAnalysis, GeneratedDocs, DocSection, DiagramData, NapkinVisual
from .llm_service import LLMService
from .diagram_generator import DiagramGenerator
from .napkin_service import NapkinService
from .advanced_features import (
    CodeHealthScorer,
    VulnerabilityScanner,
    BadgeGenerator,
    ComplexityAnalyzer,
    ContributingGenerator,
    CodeReviewPromptBuilder,
)

logger = logging.getLogger(__name__)


class DocGenerator:
    """Orchestrate full documentation generation: diagrams + LLM content + advanced features."""

    def __init__(self, llm_service: LLMService):
        self.llm = llm_service
        self.diagram_gen = DiagramGenerator()
        # ── Advanced feature engines ──
        self.health_scorer = CodeHealthScorer()
        self.vuln_scanner = VulnerabilityScanner()
        self.badge_gen = BadgeGenerator()
        self.complexity_analyzer = ComplexityAnalyzer()
        self.contributing_gen = ContributingGenerator()
        self.review_builder = CodeReviewPromptBuilder()
        self.napkin = NapkinService()

    async def generate(self, analysis: RepoAnalysis) -> GeneratedDocs:
        # 1. Generate diagrams (no LLM needed)
        diagrams = self.diagram_gen.generate_all(analysis)

        # 2-5. Try LLM docs — gracefully degrade if offline
        overview = tech_stack = setup_guide = ""
        api_docs = None
        sections: list = []
        remaining: List[DocSection] = []

        try:
            system_prompt, user_prompt = self.llm.build_analysis_prompt(analysis)
            raw = await self.llm.generate(user_prompt, system_prompt)
            sections = self._parse_sections(raw)

            for sec in sections:
                t = sec.title.lower()
                if "overview" in t or "description" in t:
                    overview = sec.content
                elif "technology" in t or "tech stack" in t:
                    tech_stack = sec.content
                elif "setup" in t or "getting started" in t or "installation" in t:
                    setup_guide = sec.content
                elif "api" in t:
                    api_docs = sec.content
                    remaining.append(sec)
                else:
                    remaining.append(sec)

            if not overview and sections:
                overview = sections[0].content
        except Exception as e:
            # LLM offline — generate fallback docs from analysis data
            overview = self._fallback_overview(analysis)
            tech_stack = self._fallback_tech_stack(analysis)
            setup_guide = "Setup guide requires LLM — run locally with Ollama for full docs."
            remaining = [DocSection(title="Note", content="LLM was unavailable. Non-AI features (health score, vulnerability scan, complexity metrics, badges, contributing guide) are fully generated below.", order=0)]

        # ── 6. Advanced features (NO LLM needed) ──
        health_data = self.health_scorer.score(analysis)
        vuln_data = self.vuln_scanner.scan(analysis)
        badge_data = self.badge_gen.generate(analysis, health_data)
        complexity_data = self.complexity_analyzer.analyze(analysis)
        contributing = self.contributing_gen.generate(analysis)

        # 7. AI Code Review (separate LLM call)
        ai_review = None
        try:
            review_sys, review_user = self.review_builder.build_review_prompt(analysis)
            ai_review = await self.llm.generate(review_user, review_sys)
        except Exception:
            ai_review = "Code review generation failed — LLM may be unavailable."

        # 8. Napkin AI Visuals
        napkin_visuals = await self._generate_napkin_visuals(analysis)

        return GeneratedDocs(
            repo_name=analysis.repo_name,
            overview=overview,
            sections=remaining or sections,
            diagrams=diagrams,
            tech_stack=tech_stack,
            setup_guide=setup_guide,
            api_docs=api_docs,
            health_score=health_data,
            vulnerability_scan=vuln_data,
            badges=badge_data,
            complexity_metrics=complexity_data,
            contributing_md=contributing,
            ai_code_review=ai_review,
            napkin_visuals=napkin_visuals,
        )

    # ── Parsing ──────────────────────────────────

    async def _generate_napkin_visuals(self, analysis: RepoAnalysis) -> Optional[list]:
        """Generate Napkin AI visuals from analysis data."""
        if not self.napkin.available:
            logger.info("Napkin AI not configured — skipping visual generation")
            return None

        try:
            summary = {
                "repo_name": analysis.repo_name,
                "languages": analysis.languages,
                "frameworks": [f.name for f in analysis.frameworks],
                "file_count": analysis.file_count,
                "total_lines": analysis.total_lines,
                "has_tests": analysis.has_tests,
                "has_docker": analysis.has_docker,
                "has_ci": analysis.has_ci,
                "dependencies_count": len(analysis.dependencies),
            }
            raw_visuals = await self.napkin.generate_doc_visuals(summary)
            return [
                NapkinVisual(
                    title=v["title"],
                    description=v["description"],
                    category=v["category"],
                    format=v.get("format", "svg"),
                    content_data=v["content_data"],
                    visual_id=v.get("visual_id"),
                    style=v.get("style"),
                )
                for v in raw_visuals
            ] or None
        except Exception as e:
            logger.error(f"Napkin visual generation failed: {e}")
            return None

    @staticmethod
    def _parse_sections(raw: str) -> List[DocSection]:
        if "---SECTION_BREAK---" in raw:
            parts = raw.split("---SECTION_BREAK---")
        else:
            parts, buf = [], ""
            for line in raw.split("\n"):
                if line.startswith("## ") and buf:
                    parts.append(buf)
                    buf = line + "\n"
                else:
                    buf += line + "\n"
            if buf:
                parts.append(buf)

        sections: List[DocSection] = []
        for i, part in enumerate(parts):
            part = part.strip()
            if not part:
                continue
            title = f"Section {i + 1}"
            for line in part.split("\n"):
                if line.startswith("#"):
                    title = line.lstrip("#").strip()
                    break
            sections.append(DocSection(title=title, content=part, order=i))
        return sections

    # ── Export helpers ────────────────────────────

    def generate_markdown(self, docs: GeneratedDocs) -> str:
        md = f"# {docs.repo_name}\n\n"

        if docs.overview:
            md += f"## Overview\n\n{docs.overview}\n\n"
        if docs.tech_stack:
            md += f"## Technology Stack\n\n{docs.tech_stack}\n\n"

        for d in docs.diagrams:
            md += f"## {d.title}\n\n{d.description}\n\n```mermaid\n{d.mermaid_code}\n```\n\n"

        if docs.setup_guide:
            md += f"## Getting Started\n\n{docs.setup_guide}\n\n"
        if docs.api_docs:
            md += f"## API Documentation\n\n{docs.api_docs}\n\n"

        for sec in docs.sections:
            md += f"{sec.content}\n\n"

        md += "---\n\n*Generated by [RepoDocAI](https://github.com/repodocai) — AI-powered documentation with AMD GPU acceleration*\n"
        return md

    # ── Fallback generators (when LLM is offline) ──

    @staticmethod
    def _fallback_overview(analysis: RepoAnalysis) -> str:
        langs = ", ".join(analysis.languages.keys())
        fws = ", ".join(f.name for f in analysis.frameworks) or "none detected"
        return (
            f"## {analysis.repo_name}\n\n"
            f"A software project with **{analysis.file_count} files** "
            f"and **{analysis.total_lines:,} lines** of code.\n\n"
            f"**Languages**: {langs}\n\n"
            f"**Frameworks**: {fws}\n\n"
            f"**Has Tests**: {'Yes' if analysis.has_tests else 'No'} | "
            f"**CI/CD**: {'Yes' if analysis.has_ci else 'No'} | "
            f"**Docker**: {'Yes' if analysis.has_docker else 'No'}\n\n"
            f"*Full AI-generated overview requires Ollama to be running.*"
        )

    @staticmethod
    def _fallback_tech_stack(analysis: RepoAnalysis) -> str:
        lines = ["## Technology Stack\n"]
        if analysis.languages:
            lines.append("### Languages")
            for lang, count in analysis.languages.items():
                lines.append(f"- **{lang}**: {count:,} lines")
        if analysis.frameworks:
            lines.append("\n### Frameworks & Libraries")
            for fw in analysis.frameworks:
                lines.append(f"- **{fw.name}** ({fw.category}) — {fw.confidence:.0%} confidence")
        if analysis.dependencies:
            lines.append(f"\n### Dependencies ({len(analysis.dependencies)} total)")
            for dep in analysis.dependencies[:15]:
                ver = f" v{dep.version}" if dep.version else ""
                lines.append(f"- {dep.name}{ver} ({dep.type})")
        return "\n".join(lines)
