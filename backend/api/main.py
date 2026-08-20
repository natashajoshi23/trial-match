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

from .models import (
    MatchRequest, MatchResponse, TrialMatchResult,
    ResearcherSearchRequest, ResearcherSearchResponse, TrialSiteResult, SiteContactResult,
)
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
    patient_lat, patient_lon = await geo.patient_coordinates(patient.zip_code, patient.country) if patient.zip_code.strip() else (None, None)

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

    # Step 5: Semantic search — always fetch the full candidate pool so that
    # changing top_k doesn't change which trials enter the scoring pipeline.
    n_candidates = _MAX_CANDIDATES
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

        site_countries = sorted({
            loc.country for loc in trial.locations if loc.country
        })
        results.append(TrialMatchResult(
            **explained.model_dump(),
            overall_status=trial.overall_status,
            phases=trial.phases,
            conditions=trial.conditions,
            locations_count=len(trial.locations),
            countries_at_sites=site_countries,
            minimum_age=trial.minimum_age,
            maximum_age=trial.maximum_age,
            start_date=trial.start_date,
            primary_completion_date=trial.primary_completion_date,
        ))

    # Step 7: Sort by final_score descending
    results.sort(key=lambda r: r.final_score, reverse=True)

    # Step 8: Distance filter
    if body.max_distance_miles is not None:
        results = [
            r for r in results
            if r.distance_miles is None or r.distance_miles <= body.max_distance_miles
        ]

    # Return top_k eligible + all hard-excluded (shown separately in the UI)
    eligible = [r for r in results if not r.hard_excluded]
    excluded = [r for r in results if r.hard_excluded]
    matches = eligible[: body.top_k] + excluded

    return MatchResponse(
        matches=matches,
        total_trials_fetched=len(trials),
        total_trials_scored=len(results),
        patient_lat=patient_lat,
        patient_lon=patient_lon,
    )


@app.post("/api/find-sites", response_model=ResearcherSearchResponse, tags=["researcher"])
async def find_sites(
    body: ResearcherSearchRequest,
    fetcher: TrialFetcher = Depends(get_fetcher),
    geo: GeoService = Depends(get_geo),
) -> ResearcherSearchResponse:
    """
    Find clinical trial sites for researchers / students looking to work in trials.

    Returns trials sorted by proximity to the researcher, with contact information
    (investigators, site contacts, central contacts) for each trial.
    """
    import math

    geo_is_centroid = False
    if body.zip_code.strip():
        patient_lat, patient_lon, geo_is_centroid = await geo.patient_coordinates_ex(body.zip_code, body.country)
    else:
        patient_lat, patient_lon = None, None

    # Fetch for each condition and merge (deduplicate by NCT ID)
    seen_ids: set[str] = set()
    trials = []
    for cond in body.conditions:
        try:
            fetched = await fetcher.fetch(cond)
        except Exception as exc:
            raise HTTPException(status_code=503, detail=f"Could not reach clinicaltrials.gov: {exc}")
        for t in fetched:
            if t.nct_id not in seen_ids:
                seen_ids.add(t.nct_id)
                trials.append(t)

    if not trials:
        return ResearcherSearchResponse(results=[], total_fetched=0,
                                        patient_lat=patient_lat, patient_lon=patient_lon)

    def haversine_miles(lat1, lon1, lat2, lon2):
        R = 3958.8
        phi1, phi2 = math.radians(lat1), math.radians(lat2)
        dphi = math.radians(lat2 - lat1)
        dlambda = math.radians(lon2 - lon1)
        a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
        return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    results: list[TrialSiteResult] = []
    for trial in trials:
        # Phase filter — EARLY_PHASE1 counts as Phase 1; NA excluded when filter is set
        if body.phases:
            trial_phases_set: set[str] = set()
            for p in trial.phases:
                p_norm = p.upper().replace(" ", "").replace("_", "").replace("-", "")
                trial_phases_set.add(p_norm)
                if "EARLYPHASE1" in p_norm or p_norm == "EARLYPHASE":
                    trial_phases_set.add("PHASE1")
            requested = {p.upper().replace(" ", "").replace("_", "").replace("-", "") for p in body.phases}
            if not trial_phases_set & requested:
                continue

        # Sponsor type filter — null sponsor_type excluded when filter is set
        if body.sponsor_types:
            if not trial.sponsor_type or trial.sponsor_type.upper() not in [s.upper() for s in body.sponsor_types]:
                continue

        # Study type filter — null study_type excluded when filter is set
        if body.study_types:
            if not trial.study_type or trial.study_type.upper() not in [s.upper() for s in body.study_types]:
                continue

        # Intervention type filter — empty intervention_types excluded when filter is set
        if body.intervention_types:
            if not trial.intervention_types:
                continue
            trial_iv_types = [t.upper() for t in trial.intervention_types]
            if not any(iv.upper() in trial_iv_types for iv in body.intervention_types):
                continue

        # Healthy volunteers filter
        if body.healthy_volunteers_only and not trial.healthy_volunteers:
            continue

        # Find nearest site (fall back to first site with a facility name if no coords)
        nearest_loc = None
        nearest_dist: Optional[float] = None
        if patient_lat is not None and patient_lon is not None:
            for loc in trial.locations:
                if loc.lat is not None and loc.lon is not None:
                    d = haversine_miles(patient_lat, patient_lon, loc.lat, loc.lon)
                    if nearest_dist is None or d < nearest_dist:
                        nearest_dist = d
                        nearest_loc = loc
        if nearest_loc is None and trial.locations:
            # No distance available — pick the first location with a facility name
            nearest_loc = next((l for l in trial.locations if l.facility), trial.locations[0])

        # Distance filter — skip when geocoding fell back to a country centroid
        # (centroid distances are meaningless and would filter out everything)
        if body.max_distance_miles is not None and not geo_is_centroid:
            if nearest_dist is None or nearest_dist > body.max_distance_miles:
                continue

        site_contacts = [
            SiteContactResult(name=c.name, role=c.role, phone=c.phone, email=c.email)
            for c in (nearest_loc.contacts if nearest_loc else [])
        ]
        overall_contacts = [
            SiteContactResult(name=c.name, role=c.role, phone=c.phone, email=c.email)
            for c in trial.overall_contacts
        ]
        investigators = [
            SiteContactResult(name=c.name, role=c.role, phone=c.phone, email=c.email)
            for c in trial.investigators
        ]

        countries = sorted({loc.country for loc in trial.locations if loc.country})

        results.append(TrialSiteResult(
            nct_id=trial.nct_id,
            brief_title=trial.brief_title,
            overall_status=trial.overall_status,
            phases=trial.phases,
            conditions=trial.conditions,
            brief_summary=trial.brief_summary,
            start_date=trial.start_date,
            primary_completion_date=trial.primary_completion_date,
            healthy_volunteers=trial.healthy_volunteers,
            minimum_age=trial.minimum_age,
            maximum_age=trial.maximum_age,
            nearest_facility=nearest_loc.facility if nearest_loc else None,
            nearest_city=nearest_loc.city if nearest_loc else None,
            nearest_state=nearest_loc.state if nearest_loc else None,
            nearest_country=nearest_loc.country if nearest_loc else None,
            nearest_distance_miles=round(nearest_dist, 1) if nearest_dist is not None else None,
            nearest_lat=nearest_loc.lat if nearest_loc else None,
            nearest_lon=nearest_loc.lon if nearest_loc else None,
            site_contacts=site_contacts,
            overall_contacts=overall_contacts,
            investigators=investigators,
            total_sites=len(trial.locations),
            countries_at_sites=countries,
            sponsor_type=trial.sponsor_type,
            study_type=trial.study_type,
            intervention_types=trial.intervention_types,
        ))

    # Sort by distance (trials with no distance go last)
    results.sort(key=lambda r: r.nearest_distance_miles if r.nearest_distance_miles is not None else float("inf"))

    geo_warning = (
        "Couldn't precisely locate your postal code — showing all results without distance filtering."
        if geo_is_centroid and body.max_distance_miles is not None and body.zip_code.strip()
        else None
    )

    return ResearcherSearchResponse(
        results=results[: body.top_k],
        total_fetched=len(trials),
        patient_lat=patient_lat,
        patient_lon=patient_lon,
        geo_warning=geo_warning,
    )
