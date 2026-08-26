"""
Modal deployment for the Clinical Trial Matcher.

Runs the FastAPI backend (which also serves the built React frontend) as a
serverless ASGI web endpoint on Modal. Scales to zero when idle, so it stays
within Modal's free monthly credits.

Deploy:
    modal deploy modal_app.py

Local test (ephemeral URL, live-reloads on code changes):
    modal serve modal_app.py

The frontend must be built first (frontend/dist), which the repo already has:
    cd frontend && npx vite build
"""

import modal

# ---------------------------------------------------------------------------
# Container image — mirrors backend/Dockerfile, plus the built frontend.
# ---------------------------------------------------------------------------
image = (
    modal.Image.debian_slim(python_version="3.12")
    # System libs: libgomp1 for sentence-transformers, build tools for native wheels
    .apt_install("build-essential", "libgomp1")
    # Cache ML model downloads at a fixed path baked into the image so the
    # prewarmed model is reused at runtime instead of re-downloaded.
    .env(
        {
            "HF_HOME": "/models",
            "SENTENCE_TRANSFORMERS_HOME": "/models",
            # App runtime config
            "STATIC_DIR": "/app/static",
            "CHROMA_DIR": "/tmp/chroma",     # ephemeral per container; rebuilt on cold start
            "CACHE_DIR": "/tmp/cache",
            "PYTHONPATH": "/app",            # so `import backend.api.main` resolves
        }
    )
    .pip_install_from_requirements("requirements-prod.txt")
    # spaCy model used by EligibilityCriteriaParser
    .run_commands("python -m spacy download en_core_web_sm")
    # Pre-warm sentence-transformers so the first request is fast
    .run_commands(
        "python -c \"from sentence_transformers import SentenceTransformer; "
        "SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')\""
    )
    # Application code + built frontend (mounted at runtime)
    .add_local_dir("backend", "/app/backend")
    .add_local_dir("frontend/dist", "/app/static")
    .add_local_file("pyproject.toml", "/app/pyproject.toml")
)

app = modal.App("trial-match", image=image)


# ---------------------------------------------------------------------------
# Web endpoint — serves both /api/* and the static frontend at one origin.
# ---------------------------------------------------------------------------
@app.function(
    memory=2048,          # headroom for torch + sentence-transformers + spaCy
    timeout=300,          # allow long clinicaltrials.gov fetch + scoring
    scaledown_window=300, # keep a warm container ~5 min after the last request
    # To use OpenAI embeddings instead of the local model, create a Modal secret
    # named "openai" (key OPENAI_API_KEY) and uncomment the next line:
    # secrets=[modal.Secret.from_name("openai")],
)
@modal.concurrent(max_inputs=20)   # one container serves multiple requests
@modal.asgi_app()
def web():
    from backend.api.main import app as fastapi_app
    return fastapi_app
