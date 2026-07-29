# Build context must be the project root (trial-match/) so that the
# `backend` package is importable as `from backend.xxx import ...`
# In docker-compose: build: { context: .., dockerfile: backend/Dockerfile }

FROM python:3.12-slim

WORKDIR /app

# System libraries required by sentence-transformers (libgomp) and
# chromadb's native SQLite bindings (libsqlite3-dev)
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies first (better layer caching)
COPY requirements-prod.txt .
RUN pip install --no-cache-dir -r requirements-prod.txt

# Download spaCy model used by EligibilityCriteriaParser
RUN python -m spacy download en_core_web_sm

# Pre-warm sentence-transformers model so the first request is fast
# (OpenAI embedding path is still preferred when OPENAI_API_KEY is set)
RUN python -c "\
from sentence_transformers import SentenceTransformer; \
SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')"

# Copy source (placed last to avoid invalidating pip cache layer on code changes)
COPY backend/ backend/
COPY pyproject.toml .

EXPOSE 8000

# CHROMA_DIR and CACHE_DIR can be overridden via environment / docker-compose
ENV CHROMA_DIR=/app/data/chroma \
    CACHE_DIR=/app/data/cache

CMD ["uvicorn", "backend.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
