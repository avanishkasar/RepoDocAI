from pydantic import BaseModel
from typing import List, Optional, Dict
from enum import Enum


class RepoRequest(BaseModel):
    repo_url: str
    branch: str = "main"
    include_private: bool = False
    github_token: Optional[str] = None


class FileInfo(BaseModel):
    path: str
    language: str
    size: int
    lines: int


class DependencyInfo(BaseModel):
    name: str
    version: Optional[str] = None
    type: str  # "runtime", "dev", "peer"


class FrameworkInfo(BaseModel):
    name: str
    category: str  # "frontend", "backend", "database", "testing", "devops", "ml", "ai"
    confidence: float


class RepoAnalysis(BaseModel):
    repo_name: str
    description: Optional[str] = None
    languages: Dict[str, int]  # language -> line count
    frameworks: List[FrameworkInfo]
    dependencies: List[DependencyInfo]
    file_tree: Dict  # nested dict representing file tree
    file_count: int
    total_lines: int
    key_files: Dict[str, str]  # file path -> content (truncated)
    entry_points: List[str]
    has_tests: bool
    has_ci: bool
    has_docker: bool
    license: Optional[str] = None


class DocSection(BaseModel):
    title: str
    content: str
    order: int


class DiagramData(BaseModel):
    title: str
    mermaid_code: str
    description: str


class HealthCheckDetail(BaseModel):
    check: str
    passed: bool
    message: str
    weight: int


class CodeHealthScore(BaseModel):
    score: int
    grade: str
    max_score: int
    details: List[HealthCheckDetail]
    summary: str


class VulnerabilityFinding(BaseModel):
    package: str
    installed_version: Optional[str] = None
    fix_version: str
    severity: str
    description: str


class VulnerabilityScan(BaseModel):
    total_dependencies: int
    scanned: int
    vulnerabilities_found: int
    risk_level: str
    severity_breakdown: Dict[str, int]
    findings: List[VulnerabilityFinding]


class BadgeInfo(BaseModel):
    label: str
    message: str
    color: str
    markdown: str


class ComplexityMetrics(BaseModel):
    total_files: int
    total_lines: int
    avg_lines_per_file: float
    language_distribution: List[Dict]
    top_modules: List[str]
    framework_categories: Dict[str, List[str]]
    dependency_stats: Dict[str, int]
    codebase_size: str


class NapkinVisual(BaseModel):
    title: str
    description: str
    category: str           # architecture, flow, tech_stack, security, etc.
    format: str = "svg"     # svg or png
    content_data: str       # raw SVG string or base64-encoded PNG
    visual_id: Optional[str] = None
    style: Optional[str] = None


class GeneratedDocs(BaseModel):
    repo_name: str
    overview: str
    sections: List[DocSection]
    diagrams: List[DiagramData]
    tech_stack: str
    setup_guide: str
    api_docs: Optional[str] = None
    # ── New crazy features ──
    health_score: Optional[CodeHealthScore] = None
    vulnerability_scan: Optional[VulnerabilityScan] = None
    badges: Optional[List[BadgeInfo]] = None
    complexity_metrics: Optional[ComplexityMetrics] = None
    contributing_md: Optional[str] = None
    ai_code_review: Optional[str] = None
    # ── Napkin AI visuals ──
    napkin_visuals: Optional[List[NapkinVisual]] = None


class GenerationStatus(str, Enum):
    PENDING = "pending"
    CLONING = "cloning"
    ANALYZING = "analyzing"
    GENERATING = "generating"
    COMPLETE = "complete"
    ERROR = "error"


class GenerationProgress(BaseModel):
    status: GenerationStatus
    progress: int  # 0-100
    message: str
    result: Optional[GeneratedDocs] = None
