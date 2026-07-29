"""
Unit tests for Layer 3: EmbeddingService, TrialVectorStore, PatientProfile.

No live API calls. Tests use:
  - MockEmbeddingService: returns deterministic fixed-size vectors
  - chromadb.EphemeralClient(): in-memory ChromaDB (no disk I/O)
  - Hardcoded RawTrial fixtures (same shape as real API data)
"""

import json
import math
import pytest
import chromadb

from backend.embeddings.patient_profile import (
    PatientProfile,
    profile_to_narrative,
    trial_to_embed_text,
)
from backend.embeddings.vector_store import TrialVectorStore, SemanticResult
from backend.ingestion.models import RawTrial, TrialLocation

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

DIM = 8  # small dimension for test embeddings


class MockEmbeddingService:
    """
    Returns deterministic unit vectors so cosine similarity is predictable.

    Each instance gets a UUID-based model_name so TrialVectorStore creates
    a unique ChromaDB collection per test. This prevents state leakage caused
    by EphemeralClient sharing a global in-memory store within the process.
    """

    embedding_dim = DIM
    using_local = True

    def __init__(self):
        import uuid
        self.model_name = f"mock_{uuid.uuid4().hex[:8]}"

    async def embed(self, text: str) -> list[float]:
        results = await self.embed_batch([text])
        return results[0]

    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        results = []
        for i, _ in enumerate(texts):
            vec = [0.0] * DIM
            vec[i % DIM] = 1.0   # one-hot so vectors are orthogonal and predictable
            results.append(vec)
        return results


def make_trial(nct_id: str, title: str = "Test Trial") -> RawTrial:
    return RawTrial(
        nct_id=nct_id,
        brief_title=title,
        official_title=f"Official: {title}",
        brief_summary="A test trial for breast cancer patients.",
        eligibility_criteria=(
            "Inclusion Criteria:\n* Age >= 18 years\n* HER2-positive\n\n"
            "Exclusion Criteria:\n* Prior chemotherapy"
        ),
        sex="ALL",
        minimum_age="18 Years",
        maximum_age="70 Years",
        conditions=["Breast Cancer"],
        phases=["PHASE2"],
        overall_status="RECRUITING",
        locations=[
            TrialLocation(
                facility="Test Hospital",
                city="New York",
                state="New York",
                zip="10001",
                country="United States",
                lat=40.7128,
                lon=-74.0060,
            )
        ],
        start_date="2024-01-01",
    )


PROFILE_FULL = PatientProfile(
    age=45,
    sex="female",
    condition="HER2-positive breast cancer",
    zip_code="10001",
    ecog_status=1,
    biomarkers=["HER2+", "ER-"],
    current_medications=["trastuzumab"],
    prior_treatments=["surgery"],
    comorbidities=["hypertension"],
    additional_notes="Enrolled in a healthy lifestyle program.",
)

PROFILE_MINIMAL = PatientProfile(
    age=60,
    sex="male",
    condition="type 2 diabetes",
    zip_code="94102",
)


# ---------------------------------------------------------------------------
# 1. PatientProfile → narrative
# ---------------------------------------------------------------------------

def test_narrative_contains_age_sex_condition():
    text = profile_to_narrative(PROFILE_FULL)
    assert "45-year-old female" in text
    assert "HER2-positive breast cancer" in text


def test_narrative_includes_ecog():
    text = profile_to_narrative(PROFILE_FULL)
    assert "ECOG performance status: 1" in text


def test_narrative_includes_biomarkers():
    text = profile_to_narrative(PROFILE_FULL)
    assert "HER2+" in text
    assert "ER-" in text


def test_narrative_includes_medications():
    text = profile_to_narrative(PROFILE_FULL)
    assert "trastuzumab" in text


def test_narrative_includes_prior_treatments():
    text = profile_to_narrative(PROFILE_FULL)
    assert "surgery" in text


def test_narrative_includes_comorbidities():
    text = profile_to_narrative(PROFILE_FULL)
    assert "hypertension" in text


def test_narrative_includes_additional_notes():
    text = profile_to_narrative(PROFILE_FULL)
    assert "healthy lifestyle program" in text


def test_narrative_minimal_profile_no_optional_fields():
    """Missing optional fields must not produce 'None' or empty list artifacts."""
    text = profile_to_narrative(PROFILE_MINIMAL)
    assert "None" not in text
    assert "[]" not in text
    assert "60-year-old male" in text
    assert "type 2 diabetes" in text


def test_narrative_is_a_string():
    assert isinstance(profile_to_narrative(PROFILE_FULL), str)


# ---------------------------------------------------------------------------
# 2. RawTrial → embed text
# ---------------------------------------------------------------------------

def test_trial_text_contains_title():
    trial = make_trial("NCT00000001", "Breast Cancer Phase 2 Trial")
    text = trial_to_embed_text(trial)
    assert "Breast Cancer Phase 2 Trial" in text


def test_trial_text_contains_summary():
    trial = make_trial("NCT00000001")
    text = trial_to_embed_text(trial)
    assert "breast cancer" in text.lower()


def test_trial_text_contains_eligibility():
    trial = make_trial("NCT00000001")
    text = trial_to_embed_text(trial)
    assert "Inclusion Criteria" in text


def test_trial_text_no_crash_on_missing_fields():
    trial = RawTrial(nct_id="NCT00000002", brief_title="Sparse Trial")
    text = trial_to_embed_text(trial)
    assert "Sparse Trial" in text


# ---------------------------------------------------------------------------
# 3. TrialVectorStore — upsert and query
# ---------------------------------------------------------------------------

def make_store(mock_svc=None):
    """Returns a TrialVectorStore backed by an in-memory ChromaDB client."""
    svc = mock_svc or MockEmbeddingService()
    client = chromadb.EphemeralClient()
    return TrialVectorStore(
        persist_dir="/tmp/test_chroma",  # unused with EphemeralClient
        embedding_service=svc,
        _chroma_client=client,
    )


@pytest.mark.asyncio
async def test_upsert_returns_embedded_count():
    store = make_store()
    trials = [make_trial(f"NCT{i:08d}") for i in range(3)]
    result = await store.upsert_trials(trials)
    assert result["embedded"] == 3
    assert result["skipped"] == 0


@pytest.mark.asyncio
async def test_trial_count_after_upsert():
    store = make_store()
    trials = [make_trial(f"NCT{i:08d}") for i in range(5)]
    await store.upsert_trials(trials)
    assert store.trial_count == 5


@pytest.mark.asyncio
async def test_upsert_skips_existing_trials():
    """Second upsert of the same trials must not re-embed them."""
    store = make_store()
    trials = [make_trial(f"NCT{i:08d}") for i in range(3)]
    await store.upsert_trials(trials)
    result = await store.upsert_trials(trials)  # same trials again
    assert result["embedded"] == 0
    assert result["skipped"] == 3
    assert store.trial_count == 3  # no duplicates in collection


@pytest.mark.asyncio
async def test_upsert_only_embeds_new_trials():
    """Partially overlapping batch: only the new IDs get embedded."""
    store = make_store()
    await store.upsert_trials([make_trial("NCT00000001"), make_trial("NCT00000002")])
    result = await store.upsert_trials([
        make_trial("NCT00000002"),  # already exists
        make_trial("NCT00000003"),  # new
    ])
    assert result["embedded"] == 1
    assert result["skipped"] == 1


@pytest.mark.asyncio
async def test_upsert_empty_list_returns_zeros():
    store = make_store()
    result = await store.upsert_trials([])
    assert result == {"embedded": 0, "skipped": 0}


@pytest.mark.asyncio
async def test_query_returns_semantic_results():
    store = make_store()
    trials = [make_trial(f"NCT{i:08d}") for i in range(4)]
    await store.upsert_trials(trials)
    patient_vec = [1.0] + [0.0] * (DIM - 1)
    results = store.query(patient_vec, top_k=2)
    assert len(results) == 2
    assert all(isinstance(r, SemanticResult) for r in results)


@pytest.mark.asyncio
async def test_query_score_is_in_0_1_range():
    store = make_store()
    trials = [make_trial(f"NCT{i:08d}") for i in range(3)]
    await store.upsert_trials(trials)
    patient_vec = [1.0] + [0.0] * (DIM - 1)
    results = store.query(patient_vec, top_k=3)
    for r in results:
        assert 0.0 <= r.semantic_score <= 1.0


@pytest.mark.asyncio
async def test_query_results_sorted_descending():
    store = make_store()
    trials = [make_trial(f"NCT{i:08d}") for i in range(4)]
    await store.upsert_trials(trials)
    patient_vec = [1.0] + [0.0] * (DIM - 1)
    results = store.query(patient_vec, top_k=4)
    scores = [r.semantic_score for r in results]
    assert scores == sorted(scores, reverse=True)


@pytest.mark.asyncio
async def test_query_top_k_limits_results():
    store = make_store()
    trials = [make_trial(f"NCT{i:08d}") for i in range(10)]
    await store.upsert_trials(trials)
    patient_vec = [1.0] + [0.0] * (DIM - 1)
    results = store.query(patient_vec, top_k=3)
    assert len(results) <= 3


@pytest.mark.asyncio
async def test_query_empty_store_returns_empty():
    store = make_store()
    patient_vec = [1.0] + [0.0] * (DIM - 1)
    results = store.query(patient_vec, top_k=5)
    assert results == []


# ---------------------------------------------------------------------------
# 4. Metadata serialization
# ---------------------------------------------------------------------------

def test_metadata_has_all_required_keys():
    trial = make_trial("NCT00000001")
    meta = TrialVectorStore._trial_metadata(trial)
    for key in ("nct_id", "brief_title", "overall_status", "phases",
                "conditions", "minimum_age", "maximum_age", "sex",
                "locations_count", "has_geo", "start_date"):
        assert key in meta, f"Missing metadata key: {key}"


def test_metadata_phases_is_json_string():
    trial = make_trial("NCT00000001")
    meta = TrialVectorStore._trial_metadata(trial)
    phases = json.loads(meta["phases"])
    assert isinstance(phases, list)
    assert "PHASE2" in phases


def test_metadata_has_geo_true_when_location_has_latlon():
    trial = make_trial("NCT00000001")
    meta = TrialVectorStore._trial_metadata(trial)
    assert meta["has_geo"] is True


def test_metadata_has_geo_false_when_no_location_data():
    trial = RawTrial(nct_id="NCT00000002", brief_title="No Locations")
    meta = TrialVectorStore._trial_metadata(trial)
    assert meta["has_geo"] is False


def test_metadata_locations_count():
    trial = make_trial("NCT00000001")
    meta = TrialVectorStore._trial_metadata(trial)
    assert meta["locations_count"] == 1


# ---------------------------------------------------------------------------
# 5. EmbeddingService — unit tests without API calls
# ---------------------------------------------------------------------------

def test_embedding_service_defaults_to_local_without_key():
    from backend.embeddings.embedding_service import EmbeddingService
    svc = EmbeddingService(openai_api_key=None, force_local=True)
    assert svc.using_local
    assert svc.model_name == "all-MiniLM-L6-v2"


def test_embedding_service_openai_backend_when_key_set():
    from backend.embeddings.embedding_service import EmbeddingService
    svc = EmbeddingService(openai_api_key="sk-fake-key-for-test")
    assert not svc.using_local
    assert "text-embedding" in svc.model_name


def test_embedding_service_force_local_overrides_key():
    from backend.embeddings.embedding_service import EmbeddingService
    svc = EmbeddingService(openai_api_key="sk-fake-key", force_local=True)
    assert svc.using_local
