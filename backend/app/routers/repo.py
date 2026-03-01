import uuid
from fastapi import APIRouter, HTTPException, BackgroundTasks

from ..models.schemas import (
    RepoRequest,
    GenerationProgress,
    GenerationStatus,
    GeneratedDocs,
)
from ..services.github_service import GitHubService
from ..services.code_analyzer import CodeAnalyzer
from ..services.llm_service import LLMService
from ..services.doc_generator import DocGenerator

router = APIRouter(prefix="/api", tags=["documentation"])

# ── Shared service singletons ────────────────────
github_service = GitHubService()
code_analyzer = CodeAnalyzer()
llm_service = LLMService()
doc_generator = DocGenerator(llm_service)

# In-memory task store  (swap for Redis in production)
_tasks: dict = {}


# ── Endpoints ────────────────────────────────────

@router.post("/generate")
async def start_generation(request: RepoRequest, bg: BackgroundTasks):
    """Kick off documentation generation for a GitHub repository."""
    task_id = str(uuid.uuid4())
    _tasks[task_id] = GenerationProgress(
        status=GenerationStatus.PENDING, progress=0, message="Queued…"
    )
    bg.add_task(_generate, task_id, request)
    return {"task_id": task_id, "status": "started"}


@router.get("/status/{task_id}")
async def get_status(task_id: str):
    """Poll progress of a running generation task."""
    if task_id not in _tasks:
        raise HTTPException(404, "Task not found")
    return _tasks[task_id]


@router.get("/result/{task_id}")
async def get_result(task_id: str):
    """Fetch the full generated docs + markdown once complete."""
    data_key = f"{task_id}_data"
    if data_key in _tasks:
        return {"status": "complete", "result": _tasks[data_key]}
    if task_id in _tasks:
        t = _tasks[task_id]
        if t.status == GenerationStatus.COMPLETE and t.result:
            return {"status": "complete", "result": t.result.model_dump()}
        return {"status": t.status.value, "message": t.message}
    raise HTTPException(404, "Result not found")


@router.get("/health")
async def health():
    llm_health = await llm_service.check_health()
    return {"status": "healthy", "llm": llm_health, "version": "1.0.0"}


@router.get("/metrics")
async def metrics():
    return {
        "llm_metrics": llm_service.get_performance_metrics(),
        "amd_gpu": {
            "enabled": True,
            "provider": "ROCm + Ollama",
            "description": "AMD GPU acceleration via ROCm for local LLM inference",
        },
    }


# ── Background worker ───────────────────────────

async def _generate(task_id: str, req: RepoRequest):
    try:
        # Clone
        _tasks[task_id] = GenerationProgress(
            status=GenerationStatus.CLONING, progress=10, message="Cloning repository…"
        )
        local_path = github_service.clone_repo(req.repo_url, req.branch, req.github_token)

        # Analyse
        _tasks[task_id] = GenerationProgress(
            status=GenerationStatus.ANALYZING, progress=30, message="Analyzing codebase…"
        )
        analysis = code_analyzer.analyze(local_path)

        # Generate docs + advanced
        _tasks[task_id] = GenerationProgress(
            status=GenerationStatus.GENERATING, progress=50, message="Generating docs with AI…"
        )
        docs = await doc_generator.generate(analysis)

        _tasks[task_id] = GenerationProgress(
            status=GenerationStatus.GENERATING, progress=85,
            message="Generating Napkin AI visuals & running security scan…"
        )

        markdown = doc_generator.generate_markdown(docs)

        docs_dict = docs.model_dump()
        docs_dict["full_markdown"] = markdown
        docs_dict["performance_metrics"] = llm_service.get_performance_metrics()

        _tasks[task_id] = GenerationProgress(
            status=GenerationStatus.COMPLETE,
            progress=100,
            message="Documentation generated successfully!",
            result=docs,
        )
        _tasks[f"{task_id}_data"] = docs_dict

        github_service.cleanup(local_path)

    except Exception as exc:
        _tasks[task_id] = GenerationProgress(
            status=GenerationStatus.ERROR, progress=0, message=f"Error: {exc}"
        )
