# syntax=docker/dockerfile:1
#
# Single-container build for Google Cloud Run.
#
# Stage 1 builds the React/Vite frontend. Stage 2 runs the FastAPI backend,
# which also serves the built frontend so the SPA's relative /api/* calls hit
# the same origin — no nginx / reverse proxy needed.
#
# Cloud Run injects the port to listen on via $PORT (default 8080); the CMD
# below honors it.

# ---- Stage 1: build frontend ----------------------------------------------
FROM node:20-alpine AS frontend
WORKDIR /fe

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
RUN npx vite build          # outputs to /fe/dist

# ---- Stage 2: backend + static frontend -----------------------------------
FROM python:3.12-slim
WORKDIR /app

# System libraries required by sentence-transformers (libgomp) and
# chromadb's native SQLite bindings.
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Cache ML model downloads at a known, writable path baked into the image so
# the prewarmed model is reused at runtime instead of re-downloaded.
ENV HF_HOME=/app/.cache/huggingface \
    SENTENCE_TRANSFORMERS_HOME=/app/.cache/huggingface

# Install Python dependencies first (better layer caching)
COPY requirements-prod.txt .
RUN pip install --no-cache-dir -r requirements-prod.txt

# Download spaCy model used by EligibilityCriteriaParser
RUN python -m spacy download en_core_web_sm

# Pre-warm sentence-transformers model so the first request is fast
# (OpenAI embedding path is still preferred when OPENAI_API_KEY is set)
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')"

# Copy source (placed last to avoid invalidating pip cache on code changes)
COPY backend/ backend/
COPY pyproject.toml .
COPY --from=frontend /fe/dist ./static

# Writable data dirs for Chroma + trial cache. On the HF free tier these are
# ephemeral (rebuilt on restart); chmod 777 so the app can write regardless of
# the UID the platform runs the container as.
ENV CHROMA_DIR=/app/data/chroma \
    CACHE_DIR=/app/data/cache \
    STATIC_DIR=/app/static
RUN mkdir -p /app/data/chroma /app/data/cache /app/.cache \
    && chmod -R 777 /app/data /app/.cache

EXPOSE 8080

# Shell form so ${PORT} (set by Cloud Run, default 8080) is expanded at runtime.
CMD ["sh", "-c", "uvicorn backend.api.main:app --host 0.0.0.0 --port ${PORT:-8080}"]
