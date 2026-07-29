"""
Layer 7: FastAPI Application

Ties together all layers (ingestion → parser → embeddings → scorer →
explainability → geo) into two HTTP endpoints:

  GET  /api/health  — liveness probe
  POST /api/match   — full trial-matching pipeline

Service singletons are initialized once during the lifespan startup event
and stored in app.state so they are shared across requests without
re-initializing heavy models (sentence-transformers, ChromaDB) on each call.

Environment variables (can also be set in .env):
  OPENAI_API_KEY    — uses OpenAI embeddings if set; falls back to local model
  CHROMA_DIR        — ChromaDB persistence directory (default: backend/data/chroma)
  CACHE_DIR         — trial JSON cache directory  (default: backend/data/cache)
"""

import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from backend.ingestion.trial_fetcher import TrialFetcher
from backend.embeddings.embedding_service import EmbeddingService
from backend.embeddings.vector_store import TrialVectorStore
from backend.embeddings.patient_profile import profile_to_narrative
from backend.parser.eligibility_parser import EligibilityCriteriaParser
from backend.scorer.trial_scorer import TrialScorer
from backend.explainability.explainer import MatchExplainer
from backend.geo.geo_service import GeoService
from backend.embeddings.vector_store import SemanticResult

from .models import MatchRequest, MatchResponse, TrialMatchResult
from .dependencies import (
    get_fetcher, get_embed_svc, get_vector_store,
    get_parser, get_scorer, get_explainer, get_geo,
)

_CHROMA_DIR = Path(os.getenv("CHROMA_DIR", "backend/data/chroma"))
_CACHE_DIR = Path(os.getenv("CACHE_DIR", "backend/data/cache"))

# Over-fetch from the vector store before scoring, to allow re-ranking
_CANDIDATE_MULTIPLIER = 3
_MAX_CANDIDATES = 60


# ---------------------------------------------------------------------------
# Lifespan — service initialization
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    api_key = os.getenv("OPENAI_API_KEY")
    embed_svc = EmbeddingService(openai_api_key=api_key)

    app.state.fetcher = TrialFetcher(cache_dir=_CACHE_DIR)
    app.state.embed_svc = embed_svc
    app.state.vector_store = TrialVectorStore(
        persist_dir=_CHROMA_DIR,
        embedding_service=embed_svc,
    )
    app.state.parser = EligibilityCriteriaParser()
    app.state.scorer = TrialScorer()
    app.state.explainer = MatchExplainer()
    app.state.geo = GeoService()
    yield
    # No explicit cleanup needed; ChromaDB flushes on process exit.


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Clinical Trial Matcher",
    description="Match patients to relevant clinical trials using semantic search and structured eligibility scoring.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",   # Vite dev server
        "http://localhost:3000",   # CRA / alternative
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/api/health", tags=["meta"])
async def health():
    """Liveness probe for Docker / load-balancer health checks."""
    return {"status": "ok"}


@app.post("/api/match", response_model=MatchResponse, tags=["matching"])
async def match_trials(
    body: MatchRequest,
    fetcher: TrialFetcher = Depends(get_fetcher),
    embed_svc: EmbeddingService = Depends(get_embed_svc),
    vector_store: TrialVectorStore = Depends(get_vector_store),
    parser: EligibilityCriteriaParser = Depends(get_parser),
    scorer: TrialScorer = Depends(get_scorer),
    explainer: MatchExplainer = Depends(get_explainer),
    geo: GeoService = Depends(get_geo),
) -> MatchResponse:
    """
    Full trial-matching pipeline for a patient profile.

    Pipeline:
      1. Geocode patient zip code → lat/lon
      2. Fetch recruiting trials from clinicaltrials.gov for patient's condition
      3. Upsert trials to ChromaDB (skip already-embedded ones)
      4. Embed patient narrative → semantic vector
      5. Query ChromaDB for top candidates by cosine similarity
      6. For each candidate: parse eligibility, score (semantic + eligibility + geo), explain
      7. Sort by final_score descending; apply distance filter if requested
      8. Return top_k results
    """
    patient = body.patient

    # Step 1: Geocode
    patient_lat, patient_lon = await geo.patient_coordinates(patient.zip_code)

    # Step 2: Fetch
    try:
        trials = await fetcher.fetch(patient.condition)
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Could not reach clinicaltrials.gov: {exc}",
        )

    if not trials:
        return MatchResponse(
            matches=[],
            total_trials_fetched=0,
            total_trials_scored=0,
            patient_lat=patient_lat,
            patient_lon=patient_lon,
        )

    # Step 3: Upsert (only new trials get embedded)
    await vector_store.upsert_trials(trials)

    # Step 4: Embed patient profile
    patient_text = profile_to_narrative(patient)
    patient_embedding = await embed_svc.embed(patient_text)

    # Step 5: Semantic search — over-fetch to allow post-scoring re-ranking
    n_candidates = min(body.top_k * _CANDIDATE_MULTIPLIER, _MAX_CANDIDATES)
    candidates: list[SemanticResult] = vector_store.query(
        patient_embedding, top_k=n_candidates
    )

    # Build lookup map so we can correlate semantic results back to full trials
    trial_map = {t.nct_id: t for t in trials}

    # Step 6: Parse → Score → Explain each candidate
    results: list[TrialMatchResult] = []
    for candidate in candidates:
        trial = trial_map.get(candidate.nct_id)
        if trial is None:
            continue   # stale ChromaDB entry from a previous session

        parsed = parser.parse(
            trial.eligibility_criteria or "",
            sex_from_api=trial.sex,
            min_age_from_api=trial.minimum_age,
            max_age_from_api=trial.maximum_age,
        )

        match = scorer.score(
            patient=patient,
            parsed_eligibility=parsed,
            trial=trial,
            semantic_score=candidate.semantic_score,
            patient_lat=patient_lat,
            patient_lon=patient_lon,
        )

        explained = explainer.explain(match, trial, patient)

        results.append(TrialMatchResult(
            **explained.model_dump(),
            overall_status=trial.overall_status,
            phases=trial.phases,
            conditions=trial.conditions,
            locations_count=len(trial.locations),
        ))

    # Step 7: Sort by final_score descending
    results.sort(key=lambda r: r.final_score, reverse=True)

    # Step 8: Distance filter
    if body.max_distance_miles is not None:
        results = [
            r for r in results
            if r.distance_miles is None or r.distance_miles <= body.max_distance_miles
        ]

    return MatchResponse(
        matches=results[: body.top_k],
        total_trials_fetched=len(trials),
        total_trials_scored=len(results),
        patient_lat=patient_lat,
        patient_lon=patient_lon,
    )
