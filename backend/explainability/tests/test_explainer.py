"""
Unit tests for Layer 5: MatchExplainer

Coverage:
  - ExplainedMatch structure and field population
  - Headline tiers (strong / potential / weak / poor / not eligible)
  - why_eligible, why_uncertain, why_excluded bullet generation
  - Summary sentence construction (phases, sites, distance)
  - score_breakdown keys and values
  - explain_with_llm() LLM path and graceful fallback
  - Edge cases: no locations, no passed constraints, multiple failures

No network calls. LLM path is tested by injecting a mock OpenAI client.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from backend.explainability.explainer import MatchExplainer, _format_phases, _build_llm_prompt
from backend.explainability.models import ExplainedMatch
from backend.scorer.models import MatchExplanation, ConstraintResult
from backend.embeddings.patient_profile import PatientProfile
from backend.ingestion.models import RawTrial, TrialLocation
from backend.parser.models import AgeConstraint


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

explainer = MatchExplainer()


def make_patient(**kw) -> PatientProfile:
    defaults = {
        "age": 45,
        "sex": "female",
        "condition": "HER2-positive breast cancer",
        "zip_code": "10001",
        "ecog_status": 1,
        "biomarkers": ["HER2+", "ER-"],
    }
    defaults.update(kw)
    return PatientProfile(**defaults)


def make_trial(nct_id="NCT00000001", **kw) -> RawTrial:
    defaults = {
        "brief_title": "Phase 2 HER2+ Breast Cancer Study",
        "brief_summary": "A study for HER2-positive breast cancer.",
        "conditions": ["Breast Cancer"],
        "phases": ["PHASE2"],
        "overall_status": "RECRUITING",
        "sex": "ALL",
        "minimum_age": "18 Years",
        "maximum_age": "70 Years",
        "locations": [
            TrialLocation(
                facility="NYU Langone",
                city="New York",
                state="NY",
                country="United States",
                lat=40.7128,
                lon=-74.0060,
            )
        ],
    }
    defaults.update(kw)
    return RawTrial(nct_id=nct_id, **defaults)


_DEFAULT_PASSED = [
    ConstraintResult(name="age", status="pass", reason="Patient age 45 is within range 18–70"),
    ConstraintResult(name="sex", status="pass", reason="Trial accepts all sexes"),
    ConstraintResult(name="ecog", status="pass", reason="Patient ECOG 1 meets limit (≤ 2)"),
    ConstraintResult(name="biomarker_HER2+", status="pass", reason="Patient biomarker HER2+ confirmed"),
]
_DEFAULT_UNCERTAIN = [
    ConstraintResult(name="exclusion_flag", status="uncertain",
                     reason="Cannot verify: 'prior cranial radiation'"),
]


def make_match(
    nct_id="NCT00000001",
    final_score=0.82,
    semantic_score=0.85,
    eligibility_score=1.0,
    geo_score=1.0,
    hard_excluded=False,
    distance_miles=10.0,
    passed=None,
    failed=None,
    uncertain=None,
) -> MatchExplanation:
    return MatchExplanation(
        nct_id=nct_id,
        final_score=final_score,
        semantic_score=semantic_score,
        eligibility_score=eligibility_score,
        geo_score=geo_score,
        hard_excluded=hard_excluded,
        distance_miles=distance_miles,
        passed=_DEFAULT_PASSED if passed is None else passed,
        failed=[] if failed is None else failed,
        uncertain=_DEFAULT_UNCERTAIN if uncertain is None else uncertain,
    )


def make_hard_excluded_match() -> MatchExplanation:
    return make_match(
        final_score=0.0,
        hard_excluded=True,
        passed=[],
        failed=[
            ConstraintResult(
                name="age",
                status="fail",
                reason="Patient age 75 exceeds trial maximum 60",
            )
        ],
        uncertain=[],
    )


# ---------------------------------------------------------------------------
# 1. ExplainedMatch structure
# ---------------------------------------------------------------------------

def test_explain_returns_explained_match():
    result = explainer.explain(make_match(), make_trial(), make_patient())
    assert isinstance(result, ExplainedMatch)


def test_explained_match_nct_id():
    result = explainer.explain(make_match(nct_id="NCT99999999"), make_trial(nct_id="NCT99999999"), make_patient())
    assert result.nct_id == "NCT99999999"


def test_explained_match_brief_title():
    result = explainer.explain(make_match(), make_trial(), make_patient())
    assert result.brief_title == "Phase 2 HER2+ Breast Cancer Study"


def test_explained_match_final_score():
    result = explainer.explain(make_match(final_score=0.75), make_trial(), make_patient())
    assert result.final_score == 0.75


def test_score_breakdown_has_all_keys():
    result = explainer.explain(make_match(), make_trial(), make_patient())
    assert set(result.score_breakdown.keys()) == {"semantic", "eligibility", "geo", "final"}


def test_score_breakdown_values_match_match_explanation():
    m = make_match(semantic_score=0.85, eligibility_score=1.0, geo_score=0.5, final_score=0.74)
    result = explainer.explain(m, make_trial(), make_patient())
    assert result.score_breakdown["semantic"] == 0.85
    assert result.score_breakdown["eligibility"] == 1.0
    assert result.score_breakdown["geo"] == 0.5
    assert result.score_breakdown["final"] == 0.74


def test_hard_excluded_propagated():
    result = explainer.explain(make_hard_excluded_match(), make_trial(), make_patient())
    assert result.hard_excluded is True


def test_distance_miles_propagated():
    result = explainer.explain(make_match(distance_miles=42.5), make_trial(), make_patient())
    assert result.distance_miles == 42.5


def test_no_llm_narrative_by_default():
    result = explainer.explain(make_match(), make_trial(), make_patient())
    assert result.llm_narrative is None


# ---------------------------------------------------------------------------
# 2. Headline tiers
# ---------------------------------------------------------------------------

def test_headline_strong_match():
    result = explainer.explain(make_match(final_score=0.85), make_trial(), make_patient())
    assert result.headline.startswith("Strong match")


def test_headline_potential_match():
    result = explainer.explain(make_match(final_score=0.65), make_trial(), make_patient())
    assert result.headline.startswith("Potential match")


def test_headline_weak_match():
    result = explainer.explain(make_match(final_score=0.45), make_trial(), make_patient())
    assert result.headline.startswith("Weak match")


def test_headline_poor_match():
    result = explainer.explain(make_match(final_score=0.20), make_trial(), make_patient())
    assert result.headline.startswith("Poor match")


def test_headline_hard_excluded():
    result = explainer.explain(make_hard_excluded_match(), make_trial(), make_patient())
    assert result.headline.startswith("Not eligible")
    assert "75" in result.headline or "age" in result.headline.lower()


def test_headline_at_exactly_0_80_is_strong():
    result = explainer.explain(make_match(final_score=0.80), make_trial(), make_patient())
    assert result.headline.startswith("Strong match")


def test_headline_includes_score_percentage():
    result = explainer.explain(make_match(final_score=0.82), make_trial(), make_patient())
    assert "82%" in result.headline


# ---------------------------------------------------------------------------
# 3. why_eligible bullets
# ---------------------------------------------------------------------------

def test_why_eligible_contains_passed_reasons():
    result = explainer.explain(make_match(), make_trial(), make_patient())
    reasons = result.why_eligible
    assert any("age" in r.lower() for r in reasons)
    assert any("HER2+" in r for r in reasons)


def test_why_eligible_includes_semantic_when_high():
    m = make_match(semantic_score=0.90)
    result = explainer.explain(m, make_trial(), make_patient())
    assert any("similarity" in r.lower() or "semantically" in r.lower() for r in result.why_eligible)


def test_why_eligible_omits_semantic_when_low():
    m = make_match(semantic_score=0.40)
    result = explainer.explain(m, make_trial(), make_patient())
    assert not any("similarity" in r.lower() for r in result.why_eligible)


def test_why_eligible_includes_geo_when_nearby():
    m = make_match(geo_score=1.0, distance_miles=8.0)
    result = explainer.explain(m, make_trial(), make_patient())
    assert any("mile" in r.lower() for r in result.why_eligible)


def test_why_eligible_empty_on_hard_excluded():
    result = explainer.explain(make_hard_excluded_match(), make_trial(), make_patient())
    assert result.why_eligible == []


# ---------------------------------------------------------------------------
# 4. why_uncertain bullets
# ---------------------------------------------------------------------------

def test_why_uncertain_contains_uncertain_reasons():
    result = explainer.explain(make_match(), make_trial(), make_patient())
    assert any("cranial radiation" in r for r in result.why_uncertain)


def test_why_uncertain_deduplicates_identical_reasons():
    m = make_match(uncertain=[
        ConstraintResult(name="ecog", status="uncertain", reason="same reason"),
        ConstraintResult(name="biomarker", status="uncertain", reason="same reason"),
    ])
    result = explainer.explain(m, make_trial(), make_patient())
    assert result.why_uncertain.count("same reason") == 1


def test_why_uncertain_empty_when_no_uncertain():
    m = make_match(uncertain=[])
    result = explainer.explain(m, make_trial(), make_patient())
    assert result.why_uncertain == []


# ---------------------------------------------------------------------------
# 5. why_excluded bullets
# ---------------------------------------------------------------------------

def test_why_excluded_populated_on_hard_exclusion():
    result = explainer.explain(make_hard_excluded_match(), make_trial(), make_patient())
    assert len(result.why_excluded) >= 1
    assert any("age" in r.lower() for r in result.why_excluded)


def test_why_excluded_empty_when_no_hard_exclusion():
    result = explainer.explain(make_match(), make_trial(), make_patient())
    assert result.why_excluded == []


def test_why_excluded_multiple_failures():
    m = make_match(
        hard_excluded=True,
        final_score=0.0,
        failed=[
            ConstraintResult(name="age", status="fail", reason="Age out of range"),
            ConstraintResult(name="sex", status="fail", reason="Sex mismatch"),
        ],
    )
    result = explainer.explain(m, make_trial(), make_patient())
    assert len(result.why_excluded) == 2


# ---------------------------------------------------------------------------
# 6. Summary sentence construction
# ---------------------------------------------------------------------------

def test_summary_mentions_condition():
    result = explainer.explain(make_match(), make_trial(), make_patient())
    assert "Breast Cancer" in result.summary or "breast cancer" in result.summary


def test_summary_mentions_phase():
    result = explainer.explain(make_match(), make_trial(phases=["PHASE2"]), make_patient())
    assert "Phase 2" in result.summary


def test_summary_mentions_site_city():
    result = explainer.explain(make_match(), make_trial(), make_patient())
    assert "New York" in result.summary


def test_summary_mentions_distance_when_known():
    m = make_match(distance_miles=15.0)
    result = explainer.explain(m, make_trial(), make_patient())
    assert "15" in result.summary or "mile" in result.summary.lower()


def test_summary_notes_unknown_distance_when_neutral():
    m = make_match(distance_miles=None, geo_score=0.5)
    result = explainer.explain(m, make_trial(), make_patient())
    assert "distance" in result.summary.lower() or "determined" in result.summary.lower()


def test_summary_site_count_when_multiple():
    trial = make_trial(locations=[
        TrialLocation(facility="Site A", city="New York", state="NY",
                      country="United States", lat=40.7, lon=-74.0),
        TrialLocation(facility="Site B", city="Boston", state="MA",
                      country="United States", lat=42.4, lon=-71.1),
        TrialLocation(facility="Site C", city="Chicago", state="IL",
                      country="United States", lat=41.8, lon=-87.6),
    ])
    result = explainer.explain(make_match(), trial, make_patient())
    assert "3" in result.summary or "three" in result.summary.lower() or "sites" in result.summary.lower()


def test_summary_no_locations_graceful():
    trial = make_trial(locations=[])
    result = explainer.explain(make_match(), trial, make_patient())
    assert isinstance(result.summary, str)
    assert len(result.summary) > 0


def test_summary_is_string():
    result = explainer.explain(make_match(), make_trial(), make_patient())
    assert isinstance(result.summary, str)


# ---------------------------------------------------------------------------
# 7. Phase formatter
# ---------------------------------------------------------------------------

def test_format_phases_single():
    assert "Phase 2 " == _format_phases(["PHASE2"])


def test_format_phases_combined():
    assert "Phase 1/2 " == _format_phases(["PHASE1_PHASE2"])


def test_format_phases_empty():
    assert _format_phases([]) == ""


def test_format_phases_multiple():
    result = _format_phases(["PHASE1", "PHASE2"])
    assert "Phase 1" in result and "Phase 2" in result


# ---------------------------------------------------------------------------
# 8. LLM path — mocked
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_explain_with_llm_returns_explained_match():
    narrative = "This trial is a strong match for the patient."
    with patch("backend.explainability.explainer.AsyncOpenAI") as mock_cls:
        mock_client = AsyncMock()
        mock_cls.return_value = mock_client
        mock_choice = MagicMock()
        mock_choice.message.content = narrative
        mock_client.chat.completions.create = AsyncMock(
            return_value=MagicMock(choices=[mock_choice])
        )
        result = await explainer.explain_with_llm(
            make_match(), make_trial(), make_patient(), openai_api_key="sk-fake"
        )
    assert isinstance(result, ExplainedMatch)
    assert result.llm_narrative == narrative


@pytest.mark.asyncio
async def test_explain_with_llm_narrative_is_trimmed():
    with patch("backend.explainability.explainer.AsyncOpenAI") as mock_cls:
        mock_client = AsyncMock()
        mock_cls.return_value = mock_client
        mock_choice = MagicMock()
        mock_choice.message.content = "  Narrative with whitespace.  "
        mock_client.chat.completions.create = AsyncMock(
            return_value=MagicMock(choices=[mock_choice])
        )
        result = await explainer.explain_with_llm(
            make_match(), make_trial(), make_patient(), openai_api_key="sk-fake"
        )
    assert result.llm_narrative == "Narrative with whitespace."


@pytest.mark.asyncio
async def test_explain_with_llm_falls_back_on_no_key():
    """With no API key, llm_narrative stays None — template result returned."""
    result = await explainer.explain_with_llm(
        make_match(), make_trial(), make_patient(), openai_api_key=None
    )
    assert result.llm_narrative is None
    assert isinstance(result, ExplainedMatch)


@pytest.mark.asyncio
async def test_explain_with_llm_falls_back_on_api_error():
    """On OpenAI error, gracefully return the template explanation."""
    with patch("backend.explainability.explainer.AsyncOpenAI") as mock_cls:
        mock_client = AsyncMock()
        mock_cls.return_value = mock_client
        mock_client.chat.completions.create = AsyncMock(side_effect=RuntimeError("API error"))
        result = await explainer.explain_with_llm(
            make_match(), make_trial(), make_patient(), openai_api_key="sk-fake"
        )
    assert result.llm_narrative is None
    assert isinstance(result, ExplainedMatch)


@pytest.mark.asyncio
async def test_explain_with_llm_preserves_template_fields():
    """LLM path must not overwrite the structured bullets."""
    with patch("backend.explainability.explainer.AsyncOpenAI") as mock_cls:
        mock_client = AsyncMock()
        mock_cls.return_value = mock_client
        mock_choice = MagicMock()
        mock_choice.message.content = "Generated narrative."
        mock_client.chat.completions.create = AsyncMock(
            return_value=MagicMock(choices=[mock_choice])
        )
        result = await explainer.explain_with_llm(
            make_match(), make_trial(), make_patient(), openai_api_key="sk-fake"
        )
    # Template fields still intact
    assert result.why_uncertain != [] or result.why_eligible != []
    assert result.score_breakdown is not None
    assert result.headline != ""


# ---------------------------------------------------------------------------
# 9. LLM prompt builder (unit test)
# ---------------------------------------------------------------------------

def test_llm_prompt_includes_trial_title():
    prompt = _build_llm_prompt(make_match(), make_trial(), make_patient())
    assert "HER2+ Breast Cancer Study" in prompt


def test_llm_prompt_includes_patient_info():
    prompt = _build_llm_prompt(make_match(), make_trial(), make_patient())
    assert "45" in prompt
    assert "female" in prompt
    assert "HER2-positive breast cancer" in prompt


def test_llm_prompt_excluded_notes_disqualification():
    prompt = _build_llm_prompt(make_hard_excluded_match(), make_trial(), make_patient())
    assert "DISQUALIFIED" in prompt


def test_llm_prompt_non_excluded_notes_confirmed_criteria():
    prompt = _build_llm_prompt(make_match(), make_trial(), make_patient())
    assert "Confirmed" in prompt or "confirmed" in prompt
