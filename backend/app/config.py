import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # App
    APP_NAME: str = "RepoDocAI"
    DEBUG: bool = True

    # LLM Configuration
    LLM_PROVIDER: str = "ollama"  # "ollama" | "openai" | "gemini"
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "aseio8886/aseio-deepseek-coder6.7b"
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4"
    GEMINI_API_KEY: str = ""  # Set via env var or .env file
    GEMINI_MODEL: str = "gemini-2.0-flash"

    # GitHub
    GITHUB_TOKEN: str = ""  # Optional — for private repos
    CLONE_DIR: str = os.path.join(os.environ.get("TEMP", os.path.join(os.path.dirname(__file__), "..", "..")), "repodocai_repos")

    # Napkin AI (visual generation)
    NAPKIN_API_KEY: str = ""  # Set via env var or .env file

    # AMD GPU
    AMD_GPU_ENABLED: bool = True
    ROCM_PATH: str = "/opt/rocm"

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
