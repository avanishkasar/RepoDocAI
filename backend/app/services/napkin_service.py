"""
Napkin AI Visual Generation Service
Converts documentation text into professional diagrams and visuals
using the Napkin AI API (https://api.napkin.ai).
"""

import asyncio
import base64
import logging
from typing import Optional

import httpx

from ..config import settings

logger = logging.getLogger(__name__)

# ── Styles optimised for documentation visuals ──────────
NAPKIN_STYLES = {
    "architecture": "CDQPRVVJCSTPRBBCD5Q6AWR",       # Vibrant Strokes — great for arch diagrams
    "flow":         "CDQPRVVJCSTPRBB6DHGQ8",          # Bold Canvas — process / data flows
    "tech_stack":   "CSQQ4VB1DGPPRTB7D1T0",           # Subtle Accent — formal tech lists
    "overview":     "CDQPRVVJCSTPRBB6D5P6RSB4",       # Radiant Blocks — overview visuals
    "security":     "CSQQ4VB1DGPP4V31CDNJTVKFBXK6JV3C",# Elegant Outline — security diagrams
    "complexity":   "CDQPRVVJCSTPRBB7E9GP8TB5DST0",   # Pragmatic Shades — metrics dashboards
    "default":      "CDQPRVVJCSTPRBBKDXK78",          # Glowful Breeze — general-purpose
}

# Which Napkin visual query types to pair with each doc section
VISUAL_QUERIES = {
    "architecture": "architecture diagram",
    "flow":         "flowchart",
    "tech_stack":   "technology stack",
    "overview":     "summary infographic",
    "security":     "security overview",
    "complexity":   "dashboard metrics",
}

BASE_URL = "https://api.napkin.ai"
POLL_INTERVAL = 2        # seconds
MAX_POLL_ATTEMPTS = 30   # 60 s total


class NapkinService:
    """Generate visuals from text using the Napkin AI API."""

    def __init__(self):
        self.api_key: str = getattr(settings, "NAPKIN_API_KEY", "")
        self._headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Authorization": f"Bearer {self.api_key}",
        }

    @property
    def available(self) -> bool:
        return bool(self.api_key)

    # ── Public API ──────────────────────────────────

    async def generate_visual(
        self,
        content: str,
        *,
        category: str = "default",
        context: Optional[str] = None,
        fmt: str = "svg",
        dark_mode: bool = True,
    ) -> Optional[dict]:
        """
        Generate a single Napkin visual. Returns dict with keys:
        {svg_content, png_url, visual_id, style, category}
        or None on failure.
        """
        if not self.available:
            logger.warning("Napkin API key not configured — skipping visual generation")
            return None

        style_id = NAPKIN_STYLES.get(category, NAPKIN_STYLES["default"])
        visual_query = VISUAL_QUERIES.get(category)

        payload: dict = {
            "format": fmt,
            "content": content[:3000],   # Napkin has content limits
            "style_id": style_id,
            "language": "en-US",
            "color_mode": "dark" if dark_mode else "light",
            "number_of_visuals": 1,
            "text_extraction_mode": "auto",
            "sort_strategy": "relevance",
        }
        if context:
            payload["context"] = context[:500]
        if visual_query:
            payload["visual_query"] = visual_query

        try:
            request_id = await self._create_visual(payload)
            if not request_id:
                return None

            result = await self._poll_until_done(request_id)
            if not result:
                return None

            # Download the generated file and encode inline
            file_data = await self._download_file(result)
            if not file_data:
                return None

            return {
                "category": category,
                "style": style_id,
                "format": fmt,
                "visual_id": result.get("visual_id"),
                "content_data": file_data,  # base64 string or raw SVG
            }

        except Exception as e:
            logger.error(f"Napkin visual generation failed ({category}): {e}")
            return None

    async def generate_doc_visuals(self, analysis_summary: dict) -> list:
        """
        Generate multiple visuals for different documentation sections.
        Returns a list of visual results.
        """
        if not self.available:
            return []

        visual_configs = self._build_visual_configs(analysis_summary)
        results = []

        for cfg in visual_configs:
            visual = await self.generate_visual(
                content=cfg["content"],
                category=cfg["category"],
                context=cfg.get("context"),
                dark_mode=True,
            )
            if visual:
                visual["title"] = cfg["title"]
                visual["description"] = cfg["description"]
                results.append(visual)

            # Small delay to avoid rate limits
            await asyncio.sleep(0.5)

        return results

    # ── Internal helpers ────────────────────────────

    async def _create_visual(self, payload: dict) -> Optional[str]:
        """POST /v1/visual → returns request ID."""
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{BASE_URL}/v1/visual",
                json=payload,
                headers=self._headers,
            )
            if resp.status_code == 201:
                data = resp.json()
                req_id = data.get("id")
                logger.info(f"Napkin request created: {req_id}")
                return req_id
            else:
                logger.error(f"Napkin create failed ({resp.status_code}): {resp.text[:300]}")
                return None

    async def _poll_until_done(self, request_id: str) -> Optional[dict]:
        """Poll GET /v1/visual/{id}/status until completed."""
        async with httpx.AsyncClient(timeout=30) as client:
            for attempt in range(MAX_POLL_ATTEMPTS):
                resp = await client.get(
                    f"{BASE_URL}/v1/visual/{request_id}/status",
                    headers=self._headers,
                )
                if resp.status_code != 200:
                    logger.warning(f"Napkin poll error ({resp.status_code})")
                    await asyncio.sleep(POLL_INTERVAL)
                    continue

                data = resp.json()
                status = data.get("status")

                if status == "completed":
                    files = data.get("generated_files", [])
                    if files:
                        first = files[0]
                        return {
                            "url": first.get("url"),
                            "visual_id": first.get("visual_id", ""),
                            "format": first.get("format", "svg"),
                        }
                    return None
                elif status == "failed":
                    error = data.get("error", {})
                    logger.error(f"Napkin visual failed: {error}")
                    return None

                # Still pending — wait and retry
                await asyncio.sleep(POLL_INTERVAL)

        logger.warning(f"Napkin poll timed out for {request_id}")
        return None

    async def _download_file(self, result: dict) -> Optional[str]:
        """Download the generated visual file and return as base64 or raw SVG."""
        url = result.get("url")
        if not url:
            return None

        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(url, headers=self._headers)
            if resp.status_code != 200:
                logger.error(f"Napkin file download failed ({resp.status_code})")
                return None

            fmt = result.get("format", "svg")
            if fmt == "svg":
                return resp.text  # raw SVG XML
            else:
                # PNG → base64 encode for inline embedding
                return base64.b64encode(resp.content).decode("utf-8")

    def _build_visual_configs(self, summary: dict) -> list:
        """Build a set of visual generation configs from analysis summary."""
        configs = []
        repo_name = summary.get("repo_name", "Repository")
        languages = summary.get("languages", {})
        frameworks = summary.get("frameworks", [])
        file_count = summary.get("file_count", 0)
        total_lines = summary.get("total_lines", 0)
        has_tests = summary.get("has_tests", False)
        has_docker = summary.get("has_docker", False)
        has_ci = summary.get("has_ci", False)

        # 1. Architecture Overview
        lang_str = ", ".join(f"{k}: {v} lines" for k, v in list(languages.items())[:6])
        fw_str = ", ".join(frameworks[:8]) if frameworks else "No frameworks detected"
        configs.append({
            "title": "Architecture Overview",
            "category": "architecture",
            "description": f"High-level architecture diagram for {repo_name}",
            "content": (
                f"Project: {repo_name}\n"
                f"Languages: {lang_str}\n"
                f"Frameworks: {fw_str}\n"
                f"Files: {file_count}, Lines: {total_lines:,}\n"
                f"Has Tests: {has_tests}, Docker: {has_docker}, CI/CD: {has_ci}"
            ),
            "context": f"Software architecture overview for the {repo_name} repository",
        })

        # 2. Tech Stack Visual
        if languages or frameworks:
            stack_parts = []
            if languages:
                stack_parts.append("Languages: " + ", ".join(languages.keys()))
            if frameworks:
                stack_parts.append("Frameworks & Tools: " + ", ".join(frameworks[:10]))
            configs.append({
                "title": "Technology Stack",
                "category": "tech_stack",
                "description": "Visual breakdown of technologies used",
                "content": "\n".join(stack_parts),
                "context": f"Technology stack visualization for {repo_name}",
            })

        # 3. Project Flow
        flow_parts = [
            f"Repository: {repo_name}",
            f"Step 1: Clone ({file_count} files)",
            "Step 2: Analyze codebase structure",
            "Step 3: Detect frameworks and dependencies",
            "Step 4: Generate documentation with AI",
            "Step 5: Create diagrams and visuals",
            "Step 6: Run code health & security scan",
        ]
        configs.append({
            "title": "Documentation Flow",
            "category": "flow",
            "description": "How RepoDocAI processes this repository",
            "content": "\n".join(flow_parts),
            "context": "AI documentation generation workflow",
        })

        # 4. Security / Health overview (if there are enough deps)
        deps_count = summary.get("dependencies_count", 0)
        if deps_count > 0:
            configs.append({
                "title": "Security & Health Overview",
                "category": "security",
                "description": "Dependency security and code health snapshot",
                "content": (
                    f"Project: {repo_name}\n"
                    f"Total Dependencies: {deps_count}\n"
                    f"Has Tests: {has_tests}\n"
                    f"Has CI/CD: {has_ci}\n"
                    f"Has Docker: {has_docker}\n"
                    f"Code Files: {file_count}\n"
                    f"Total Lines: {total_lines:,}"
                ),
                "context": "Security scan and code health metrics overview",
            })

        return configs
