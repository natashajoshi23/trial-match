"""
Integration tests for Layer 7: FastAPI API

Uses FastAPI's TestClient with dependency_overrides to inject mock services
for every external dependency (no network, no embeddings, no ChromaDB).

All services are fully mocked:
  - TrialFetcher.fetch() → hardcoded RawTrial list
  - EmbeddingService.embed() → fixed-dimension zero vector
  - TrialVectorStore.upsert_trials() / query() → controlled SemanticResult list
  - EligibilityCriteriaParser.parse() → minimal ParsedEligibility
  - TrialScorer.score() → controlled MatchExplanation
  - MatchExplainer.explain() → controlled ExplainedMatch
  - GeoService.patient_coordinates() → fixed (lat, lon)

Coverage:
  - GET /api/health → 200 {"status": "ok"}
  - POST /api/match → 200, ranked ExplainedMatch list
  - Results sorted by final_score descending
  - top_k limits response length
  - max_distance_miles filters distant results
  - Hard-excluded trial has final_score == 0.0
  - No trials fetched → empty matches list, no error
  - clinicaltrials.gov failure → 503
  - Request validation: top_k bounds, max_distance_miles >= 0
"""

pytest = __import__("pytest")
fastapi_mod = pytest.importorskip("fastapi", reason="fastapi not installed")

from unittest.mock import AsyncMock, MagicMock

from fastapi.testclient import TestClient

from backend.api.main import app
from backend.api.dependencies import (
    get_fetcher, get_embed_svc, get_vector_store,
    get_parser, get_scorer, get_explainer, get_geo,
)
from backend.embeddings.patient_profile import PatientProfile
from backend.embeddings.vector_store import SemanticResult
from backend.explainability.models import ExplainedMatch
from backend.ingestion.models import RawTrial, TrialLocation
from backend.parser.models import ParsedEligibility, AgeConstraint
from backend.scorer.models import MatchExplanation, ConstraintResult


# ---------------------------------------------------------------------------
# Fixtures & helpers
# ---------------------------------------------------------------------------

def _make_trial(nct_id: str, title: str = "Test Trial") -> RawTrial:
    return RawTrial(
        nct_id=nct_id,
        brief_title=title,
        brief_summary="A test trial.",
        eligibility_criteria="Inclusion Criteria:\n* Age >= 18",
        sex="ALL",
        minimum_age="18 Years",
        maximum_age="70 Years",
        conditions=["Breast Cancer"],
        phases=["PHASE2"],
        overall_status="RECRUITING",
        locations=[
            TrialLocation(facility="Test Hospital", city="New York", state="NY",
                          country="United States", lat=40.7128, lon=-74.0060)
        ],
    )


def _make_match_explanation(nct_id: str, final_score: float = 0.80) -> MatchExplanation:
    return MatchExplanation(
        nct_id=nct_id,
        final_score=final_score,
        semantic_score=0.85,
        eligibility_score=1.0,
        geo_score=1.0,
        hard_excluded=(final_score == 0.0),
        distance_miles=5.0,
        passed=[ConstraintResult(name="age", status="pass",
                                 reason="Patient age 45 is within range 18–70")],
        failed=[] if final_score > 0 else [
            ConstraintResult(name="age", status="fail",
                             reason="Patient age 75 exceeds maximum 60")
        ],
        uncertain=[],
    )


def _make_explained(nct_id: str, score: float = 0.80) -> ExplainedMatch:
    return ExplainedMatch(
        nct_id=nct_id,
        brief_title="Test Trial",
        final_score=score,
        headline="Strong match: 80% overall compatibility.",
        summary="A Phase 2 trial at Test Hospital.",
        why_eligible=["Patient age 45 is within range 18–70"],
        why_uncertain=[],
        why_excluded=[] if score > 0 else ["Patient age 75 exceeds maximum 60"],
        score_breakdown={"semantic": 0.85, "eligibility": 1.0, "geo": 1.0, "final": score},
        distance_miles=5.0,
        hard_excluded=(score == 0.0),
    )


def _make_semantic_result(nct_id: str, score: float = 0.85) -> SemanticResult:
    return SemanticResult(nct_id=nct_id, semantic_score=score, metadata={})


_PATIENT_PAYLOAD = {
    "patient": {
        "age": 45,
        "sex": "female",
        "condition": "HER2-positive breast cancer",
        "zip_code": "10001",
        "ecog_status": 1,
        "biomarkers": ["HER2+"],
        "current_medications": [],
        "prior_treatments": [],
        "comorbidities": [],
    }
}


def build_client(
    trials=None,
    semantic_results=None,
    explained_map=None,
    geo_coords=(40.7128, -74.0060),
    fetcher_error=False,
):
    """Build a TestClient with all services mocked."""
    if trials is None:
        trials = [_make_trial("NCT00000001")]
    if semantic_results is None:
        semantic_results = [_make_semantic_result("NCT00000001")]
    if explained_map is None:
        explained_map = {"NCT00000001": _make_explained("NCT00000001")}

    mock_fetcher = MagicMock()
    if fetcher_error:
        mock_fetcher.fetch = AsyncMock(side_effect=RuntimeError("API down"))
    else:
        mock_fetcher.fetch = AsyncMock(return_value=trials)

    mock_embed = MagicMock()
    mock_embed.embed = AsyncMock(return_value=[0.0] * 8)
    mock_embed.model_name = "mock"
    mock_embed.embedding_dim = 8

    mock_store = MagicMock()
    mock_store.upsert_trials = AsyncMock(return_value={"embedded": len(trials), "skipped": 0})
    mock_store.query = MagicMock(return_value=semantic_results)

    mock_parser = MagicMock()
    mock_parser.parse = MagicMock(return_value=ParsedEligibility(
        age=AgeConstraint(min_age=18, max_age=70),
        sex="all",
    ))

    mock_scorer = MagicMock()
    def _score(patient, parsed_eligibility, trial, semantic_score, **kw):
        return _make_match_explanation(trial.nct_id)
    mock_scorer.score = MagicMock(side_effect=_score)

    mock_explainer = MagicMock()
    def _explain(match, trial, patient):
        return explained_map.get(match.nct_id, _make_explained(match.nct_id))
    mock_explainer.explain = MagicMock(side_effect=_explain)

    mock_geo = MagicMock()
    mock_geo.patient_coordinates = AsyncMock(return_value=geo_coords)

    overrides = {
        get_fetcher: lambda: mock_fetcher,
        get_embed_svc: lambda: mock_embed,
        get_vector_store: lambda: mock_store,
        get_parser: lambda: mock_parser,
        get_scorer: lambda: mock_scorer,
        get_explainer: lambda: mock_explainer,
        get_geo: lambda: mock_geo,
    }
    app.dependency_overrides = overrides
    return TestClient(app)


# ---------------------------------------------------------------------------
# 1. Health endpoint
# ---------------------------------------------------------------------------

def test_health_returns_200():
    app.dependency_overrides = {}
    client = TestClient(app)
    resp = client.get("/api/health")
    assert resp.status_code == 200


def test_health_body():
    app.dependency_overrides = {}
    client = TestClient(app)
    resp = client.get("/api/health")
    assert resp.json() == {"status": "ok"}


# ---------------------------------------------------------------------------
# 2. POST /api/match — happy path
# ---------------------------------------------------------------------------

def test_match_returns_200():
    client = build_client()
    resp = client.post("/api/match", json=_PATIENT_PAYLOAD)
    assert resp.status_code == 200


def test_match_response_has_matches_key():
    client = build_client()
    data = client.post("/api/match", json=_PATIENT_PAYLOAD).json()
    assert "matches" in data


def test_match_response_has_stats():
    client = build_client()
    data = client.post("/api/match", json=_PATIENT_PAYLOAD).json()
    assert "total_trials_fetched" in data
    assert "total_trials_scored" in data


def test_match_response_includes_patient_coordinates():
    client = build_client(geo_coords=(40.7128, -74.0060))
    data = client.post("/api/match", json=_PATIENT_PAYLOAD).json()
    assert data["patient_lat"] == pytest.approx(40.7128)
    assert data["patient_lon"] == pytest.approx(-74.0060)


def test_match_returns_explained_fields():
    client = build_client()
    data = client.post("/api/match", json=_PATIENT_PAYLOAD).json()
    match = data["matches"][0]
    for field in ("nct_id", "brief_title", "final_score", "headline",
                  "summary", "why_eligible", "why_uncertain", "why_excluded",
                  "score_breakdown", "hard_excluded"):
        assert field in match, f"Missing field: {field}"


def test_match_returns_trial_metadata_fields():
    client = build_client()
    data = client.post("/api/match", json=_PATIENT_PAYLOAD).json()
    match = data["matches"][0]
    assert "overall_status" in match
    assert "phases" in match
    assert "conditions" in match
    assert "locations_count" in match


def test_match_total_trials_fetched():
    trials = [_make_trial(f"NCT{i:08d}") for i in range(5)]
    semantic = [_make_semantic_result(t.nct_id) for t in trials]
    explained = {t.nct_id: _make_explained(t.nct_id) for t in trials}
    client = build_client(trials=trials, semantic_results=semantic, explained_map=explained)
    data = client.post("/api/match", json=_PATIENT_PAYLOAD).json()
    assert data["total_trials_fetched"] == 5


# ---------------------------------------------------------------------------
# 3. Sorting
# ---------------------------------------------------------------------------

def test_matches_sorted_by_score_descending():
    trials = [_make_trial("NCT00000001"), _make_trial("NCT00000002")]
    semantic = [
        _make_semantic_result("NCT00000001", score=0.90),
        _make_semantic_result("NCT00000002", score=0.60),
    ]
    explained = {
        "NCT00000001": _make_explained("NCT00000001", score=0.82),
        "NCT00000002": _make_explained("NCT00000002", score=0.55),
    }
    client = build_client(trials=trials, semantic_results=semantic, explained_map=explained)
    data = client.post("/api/match", json=_PATIENT_PAYLOAD).json()
    scores = [m["final_score"] for m in data["matches"]]
    assert scores == sorted(scores, reverse=True)


def test_hard_excluded_trial_has_zero_score():
    trials = [_make_trial("NCT00000001")]
    semantic = [_make_semantic_result("NCT00000001")]
    explained = {"NCT00000001": _make_explained("NCT00000001", score=0.0)}
    client = build_client(trials=trials, semantic_results=semantic, explained_map=explained)
    data = client.post("/api/match", json=_PATIENT_PAYLOAD).json()
    excluded = [m for m in data["matches"] if m["hard_excluded"]]
    for m in excluded:
        assert m["final_score"] == 0.0


# ---------------------------------------------------------------------------
# 4. top_k parameter
# ---------------------------------------------------------------------------

def test_top_k_limits_results():
    trials = [_make_trial(f"NCT{i:08d}") for i in range(10)]
    semantic = [_make_semantic_result(t.nct_id) for t in trials]
    explained = {t.nct_id: _make_explained(t.nct_id) for t in trials}
    client = build_client(trials=trials, semantic_results=semantic, explained_map=explained)
    payload = {**_PATIENT_PAYLOAD, "top_k": 3}
    data = client.post("/api/match", json=payload).json()
    assert len(data["matches"]) <= 3


def test_top_k_default_is_10():
    trials = [_make_trial(f"NCT{i:08d}") for i in range(15)]
    semantic = [_make_semantic_result(t.nct_id) for t in trials]
    explained = {t.nct_id: _make_explained(t.nct_id) for t in trials}
    client = build_client(trials=trials, semantic_results=semantic, explained_map=explained)
    data = client.post("/api/match", json=_PATIENT_PAYLOAD).json()
    assert len(data["matches"]) <= 10


def test_top_k_above_50_rejected():
    client = build_client()
    payload = {**_PATIENT_PAYLOAD, "top_k": 51}
    resp = client.post("/api/match", json=payload)
    assert resp.status_code == 422


def test_top_k_zero_rejected():
    client = build_client()
    payload = {**_PATIENT_PAYLOAD, "top_k": 0}
    resp = client.post("/api/match", json=payload)
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# 5. Distance filter
# ---------------------------------------------------------------------------

def test_max_distance_filter_excludes_far_matches():
    trials = [_make_trial("NCT00000001"), _make_trial("NCT00000002")]
    semantic = [_make_semantic_result("NCT00000001"), _make_semantic_result("NCT00000002")]
    close = _make_explained("NCT00000001", score=0.80)
    close_d = close.model_copy(update={"distance_miles": 10.0})
    far = _make_explained("NCT00000002", score=0.75)
    far_d = far.model_copy(update={"distance_miles": 200.0})
    explained = {"NCT00000001": close_d, "NCT00000002": far_d}
    client = build_client(trials=trials, semantic_results=semantic, explained_map=explained)
    payload = {**_PATIENT_PAYLOAD, "max_distance_miles": 50.0}
    data = client.post("/api/match", json=payload).json()
    for m in data["matches"]:
        if m["distance_miles"] is not None:
            assert m["distance_miles"] <= 50.0


def test_max_distance_filter_keeps_unknown_distance():
    """Trials with distance_miles=None (no site coords) must not be filtered out."""
    trials = [_make_trial("NCT00000001")]
    semantic = [_make_semantic_result("NCT00000001")]
    no_dist = _make_explained("NCT00000001", score=0.80)
    no_dist = no_dist.model_copy(update={"distance_miles": None})
    explained = {"NCT00000001": no_dist}
    client = build_client(trials=trials, semantic_results=semantic, explained_map=explained)
    payload = {**_PATIENT_PAYLOAD, "max_distance_miles": 25.0}
    data = client.post("/api/match", json=payload).json()
    assert len(data["matches"]) == 1   # not filtered


def test_negative_max_distance_rejected():
    client = build_client()
    payload = {**_PATIENT_PAYLOAD, "max_distance_miles": -1}
    resp = client.post("/api/match", json=payload)
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# 6. Edge cases
# ---------------------------------------------------------------------------

def test_no_trials_found_returns_empty_matches():
    client = build_client(trials=[], semantic_results=[])
    data = client.post("/api/match", json=_PATIENT_PAYLOAD).json()
    assert data["matches"] == []
    assert data["total_trials_fetched"] == 0


def test_clinicaltrials_failure_returns_503():
    client = build_client(fetcher_error=True)
    resp = client.post("/api/match", json=_PATIENT_PAYLOAD)
    assert resp.status_code == 503


def test_geo_failure_returns_none_coordinates():
    client = build_client(geo_coords=(None, None))
    data = client.post("/api/match", json=_PATIENT_PAYLOAD).json()
    assert data["patient_lat"] is None
    assert data["patient_lon"] is None


def test_missing_required_field_rejected():
    """Submitting a patient without the required 'age' field → 422."""
    bad_payload = {"patient": {"sex": "female", "condition": "cancer", "zip_code": "10001"}}
    client = build_client()
    resp = client.post("/api/match", json=bad_payload)
    assert resp.status_code == 422
