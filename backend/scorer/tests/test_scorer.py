"""
Unit tests for Layer 4: TrialScorer

Coverage:
  - Hard exclusion logic: age, sex, ECOG, biomarker conflict, medication exclusion
  - Score weighting (0.40/0.40/0.20)
  - Geographic distance thresholds (25 / 100 mile bands)
  - Missing / uncertain patient fields
  - MatchExplanation structure (passed / failed / uncertain lists)
  - Haversine distance sanity checks

No network calls, no disk I/O, no embedding API.
"""

import pytest

from backend.scorer.trial_scorer import TrialScorer, _haversine_miles
from backend.scorer.models import MatchExplanation
from backend.embeddings.patient_profile import PatientProfile
from backend.parser.models import ParsedEligibility, AgeConstraint, LabValue
from backend.ingestion.models import RawTrial, TrialLocation


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

scorer = TrialScorer()


def make_patient(**kwargs) -> PatientProfile:
    defaults = {
        "age": 45,
        "sex": "female",
        "condition": "HER2-positive breast cancer",
        "zip_code": "10001",
        "ecog_status": 1,
        "biomarkers": ["HER2+", "ER-"],
        "current_medications": [],
        "prior_treatments": [],
        "comorbidities": [],
    }
    defaults.update(kwargs)
    return PatientProfile(**defaults)


def make_eligibility(**kwargs) -> ParsedEligibility:
    defaults: dict = {
        "age": AgeConstraint(min_age=18, max_age=70),
        "sex": "all",
        "required_biomarkers": [],
        "ecog_max": None,
        "medication_exclusions": [],
        "exclusion_flags": [],
    }
    defaults.update(kwargs)
    return ParsedEligibility(**defaults)


def make_trial(nct_id: str = "NCT00000001", locations: list[TrialLocation] = None) -> RawTrial:
    if locations is None:
        locations = [TrialLocation(facility="NYU Langone", city="New York", state="NY",
                                   lat=40.7128, lon=-74.0060, country="United States")]
    return RawTrial(
        nct_id=nct_id,
        brief_title="Phase 2 HER2+ Breast Cancer Study",
        brief_summary="A study for HER2-positive breast cancer.",
        eligibility_criteria="Inclusion Criteria:\n* Age 18-70\n* HER2+\n\nExclusion Criteria:\n* Prior chemo",
        sex="ALL",
        minimum_age="18 Years",
        maximum_age="70 Years",
        conditions=["Breast Cancer"],
        phases=["PHASE2"],
        overall_status="RECRUITING",
        locations=locations,
    )


def score(patient=None, eligibility=None, trial=None,
          semantic=0.8, lat=None, lon=None) -> MatchExplanation:
    return scorer.score(
        patient=patient or make_patient(),
        parsed_eligibility=eligibility or make_eligibility(),
        trial=trial or make_trial(),
        semantic_score=semantic,
        patient_lat=lat,
        patient_lon=lon,
    )


# ---------------------------------------------------------------------------
# 1. Age — hard exclusion
# ---------------------------------------------------------------------------

def test_age_below_minimum_triggers_hard_exclusion():
    elig = make_eligibility(age=AgeConstraint(min_age=18, max_age=70))
    result = score(patient=make_patient(age=16), eligibility=elig, semantic=1.0)
    assert result.hard_excluded is True
    assert result.final_score == 0.0


def test_age_above_maximum_triggers_hard_exclusion():
    elig = make_eligibility(age=AgeConstraint(min_age=18, max_age=60))
    result = score(patient=make_patient(age=65), eligibility=elig, semantic=1.0)
    assert result.hard_excluded is True
    assert result.final_score == 0.0
    assert any("exceeds" in r.reason for r in result.failed)


def test_age_at_minimum_boundary_passes():
    elig = make_eligibility(age=AgeConstraint(min_age=18, max_age=70))
    result = score(patient=make_patient(age=18), eligibility=elig)
    assert any(r.name == "age" and r.status == "pass" for r in result.passed)
    assert result.hard_excluded is False


def test_age_at_maximum_boundary_passes():
    elig = make_eligibility(age=AgeConstraint(min_age=18, max_age=70))
    result = score(patient=make_patient(age=70), eligibility=elig)
    assert any(r.name == "age" and r.status == "pass" for r in result.passed)
    assert result.hard_excluded is False


def test_no_age_constraint_returns_uncertain():
    elig = make_eligibility(age=AgeConstraint())
    result = score(eligibility=elig)
    assert any(r.name == "age" and r.status == "uncertain" for r in result.uncertain)
    assert result.hard_excluded is False


def test_only_min_age_specified_passes():
    elig = make_eligibility(age=AgeConstraint(min_age=18))
    result = score(patient=make_patient(age=50), eligibility=elig)
    assert any(r.name == "age" and r.status == "pass" for r in result.passed)


def test_only_min_age_specified_fails():
    elig = make_eligibility(age=AgeConstraint(min_age=18))
    result = score(patient=make_patient(age=16), eligibility=elig)
    assert result.hard_excluded is True


# ---------------------------------------------------------------------------
# 2. Sex — hard exclusion
# ---------------------------------------------------------------------------

def test_sex_mismatch_triggers_hard_exclusion():
    elig = make_eligibility(sex="male")
    result = score(patient=make_patient(sex="female"), eligibility=elig, semantic=1.0)
    assert result.hard_excluded is True
    assert result.final_score == 0.0


def test_sex_match_passes():
    elig = make_eligibility(sex="female")
    result = score(patient=make_patient(sex="female"), eligibility=elig)
    assert any(r.name == "sex" and r.status == "pass" for r in result.passed)
    assert result.hard_excluded is False


def test_trial_all_sex_always_passes():
    for sex in ("male", "female", "other"):
        elig = make_eligibility(sex="all")
        result = score(patient=make_patient(sex=sex), eligibility=elig)
        assert any(r.name == "sex" and r.status == "pass" for r in result.passed)


def test_sex_other_with_restricted_trial_is_uncertain():
    elig = make_eligibility(sex="female")
    result = score(patient=make_patient(sex="other"), eligibility=elig)
    assert any(r.name == "sex" and r.status == "uncertain" for r in result.uncertain)
    assert result.hard_excluded is False


def test_no_sex_specified_in_eligibility_is_pass():
    """None sex in parsed eligibility means no restriction → pass."""
    elig = make_eligibility(sex=None)
    result = score(patient=make_patient(sex="male"), eligibility=elig)
    assert any(r.name == "sex" and r.status == "pass" for r in result.passed)


# ---------------------------------------------------------------------------
# 3. ECOG — hard exclusion
# ---------------------------------------------------------------------------

def test_ecog_exceeded_triggers_hard_exclusion():
    elig = make_eligibility(ecog_max=1)
    result = score(patient=make_patient(ecog_status=3), eligibility=elig, semantic=1.0)
    assert result.hard_excluded is True
    assert result.final_score == 0.0


def test_ecog_at_limit_passes():
    elig = make_eligibility(ecog_max=2)
    result = score(patient=make_patient(ecog_status=2), eligibility=elig)
    assert any(r.name == "ecog" and r.status == "pass" for r in result.passed)


def test_ecog_below_limit_passes():
    elig = make_eligibility(ecog_max=2)
    result = score(patient=make_patient(ecog_status=0), eligibility=elig)
    assert any(r.name == "ecog" and r.status == "pass" for r in result.passed)
    assert result.hard_excluded is False


def test_ecog_not_specified_in_trial_is_uncertain():
    elig = make_eligibility(ecog_max=None)
    result = score(patient=make_patient(ecog_status=2), eligibility=elig)
    assert any(r.name == "ecog" and r.status == "uncertain" for r in result.uncertain)


def test_patient_ecog_not_provided_is_uncertain():
    elig = make_eligibility(ecog_max=1)
    result = score(patient=make_patient(ecog_status=None), eligibility=elig)
    assert any(r.name == "ecog" and r.status == "uncertain" for r in result.uncertain)
    assert result.hard_excluded is False


# ---------------------------------------------------------------------------
# 4. Biomarkers — hard exclusion on conflict, uncertain on missing
# ---------------------------------------------------------------------------

def test_required_biomarker_confirmed_is_pass():
    elig = make_eligibility(required_biomarkers=["HER2+"])
    result = score(patient=make_patient(biomarkers=["HER2+", "ER-"]), eligibility=elig)
    assert any("HER2+" in r.name and r.status == "pass" for r in result.passed)


def test_required_biomarker_missing_is_uncertain():
    """Patient didn't report HER2 status → uncertain, not excluded."""
    elig = make_eligibility(required_biomarkers=["HER2+"])
    result = score(patient=make_patient(biomarkers=[]), eligibility=elig)
    assert any("HER2+" in r.name and r.status == "uncertain" for r in result.uncertain)
    assert result.hard_excluded is False


def test_opposite_biomarker_triggers_hard_exclusion():
    """Patient has HER2–, trial requires HER2+ → explicit conflict."""
    elig = make_eligibility(required_biomarkers=["HER2+"])
    result = score(patient=make_patient(biomarkers=["HER2-"]), eligibility=elig, semantic=1.0)
    assert result.hard_excluded is True
    assert result.final_score == 0.0


def test_er_positive_conflict():
    elig = make_eligibility(required_biomarkers=["ER+"])
    result = score(patient=make_patient(biomarkers=["ER-"]), eligibility=elig)
    assert result.hard_excluded is True


def test_no_required_biomarkers_no_biomarker_constraint():
    elig = make_eligibility(required_biomarkers=[])
    result = score(eligibility=elig)
    assert not any(r.name.startswith("biomarker") for r in result.failed)


# ---------------------------------------------------------------------------
# 5. Medication exclusions — hard exclusion
# ---------------------------------------------------------------------------

def test_current_medication_matches_exclusion_triggers_hard_exclusion():
    elig = make_eligibility(medication_exclusions=["trastuzumab"])
    patient = make_patient(current_medications=["trastuzumab"])
    result = score(patient=patient, eligibility=elig, semantic=1.0)
    assert result.hard_excluded is True
    assert result.final_score == 0.0


def test_prior_treatment_matches_exclusion_triggers_hard_exclusion():
    elig = make_eligibility(medication_exclusions=["prior chemotherapy"])
    patient = make_patient(prior_treatments=["prior chemotherapy"])
    result = score(patient=patient, eligibility=elig)
    assert result.hard_excluded is True


def test_medication_not_in_patient_history_is_no_result():
    elig = make_eligibility(medication_exclusions=["cyclophosphamide"])
    patient = make_patient(current_medications=["trastuzumab"])
    result = score(patient=patient, eligibility=elig)
    assert not any(r.name == "medication_exclusion" for r in result.failed)
    assert result.hard_excluded is False


def test_empty_medication_exclusions_no_constraint():
    elig = make_eligibility(medication_exclusions=[])
    result = score(eligibility=elig)
    assert not any(r.name == "medication_exclusion" for r in result.failed)


# ---------------------------------------------------------------------------
# 6. Score weighting
# ---------------------------------------------------------------------------

def test_final_score_formula_all_max():
    """semantic=1.0, eligibility=1.0, geo=1.0 → final=1.0"""
    elig = make_eligibility()
    trial = make_trial(locations=[TrialLocation(lat=40.7128, lon=-74.0060)])
    result = scorer.score(
        patient=make_patient(),
        parsed_eligibility=elig,
        trial=trial,
        semantic_score=1.0,
        patient_lat=40.7128,  # same point → 0 miles → geo_score=1.0
        patient_lon=-74.0060,
    )
    assert result.final_score == pytest.approx(1.0, abs=1e-4)
    assert result.eligibility_score == 1.0
    assert result.geo_score == 1.0


def test_final_score_weighted_combination():
    """0.40*0.8 + 0.40*1.0 + 0.20*0.5 = 0.32 + 0.40 + 0.10 = 0.82"""
    elig = make_eligibility()
    # geo score = 0.5 (no location coords)
    result = score(eligibility=elig, semantic=0.8)
    expected = 0.40 * 0.8 + 0.40 * 1.0 + 0.20 * 0.5
    assert result.final_score == pytest.approx(expected, abs=1e-4)


def test_hard_exclusion_zeroes_final_score_regardless_of_semantic():
    """Even with perfect semantic similarity, a hard exclusion → 0.0."""
    elig = make_eligibility(age=AgeConstraint(min_age=18, max_age=40))
    result = score(patient=make_patient(age=75), eligibility=elig, semantic=1.0)
    assert result.final_score == 0.0
    assert result.hard_excluded is True


def test_multiple_hard_exclusions_still_zero():
    """Multiple hard exclusions — score stays 0.0, not compounded."""
    elig = make_eligibility(
        age=AgeConstraint(min_age=18, max_age=40),
        sex="male",
        ecog_max=1,
    )
    patient = make_patient(age=75, sex="female", ecog_status=3)
    result = score(patient=patient, eligibility=elig, semantic=1.0)
    assert result.final_score == 0.0
    assert len(result.failed) >= 2   # at least age + sex


def test_final_score_clamped_at_1():
    """Arithmetic can't produce a score above 1.0."""
    elig = make_eligibility()
    result = score(semantic=2.0, eligibility=elig)  # bogus input
    assert result.final_score <= 1.0


def test_final_score_clamped_at_0():
    result = score(semantic=-1.0)
    assert result.final_score >= 0.0


# ---------------------------------------------------------------------------
# 7. Geographic scoring
# ---------------------------------------------------------------------------

def test_geo_within_25_miles_score_1():
    # New York City to nearby NJ: ~5 miles
    trial = make_trial(locations=[TrialLocation(lat=40.7282, lon=-74.0776)])
    result = scorer.score(
        patient=make_patient(),
        parsed_eligibility=make_eligibility(),
        trial=trial,
        semantic_score=0.0,
        patient_lat=40.7128,
        patient_lon=-74.0060,
    )
    assert result.geo_score == 1.0
    assert result.distance_miles is not None
    assert result.distance_miles < 25.0


def test_geo_between_25_and_100_miles_score_0_5():
    # NYC (40.71, -74.01) to Philadelphia (~95 miles)
    trial = make_trial(locations=[TrialLocation(lat=39.9526, lon=-75.1652)])
    result = scorer.score(
        patient=make_patient(),
        parsed_eligibility=make_eligibility(),
        trial=trial,
        semantic_score=0.0,
        patient_lat=40.7128,
        patient_lon=-74.0060,
    )
    assert result.geo_score == 0.5
    assert 25.0 < result.distance_miles <= 100.0


def test_geo_beyond_100_miles_score_0_1():
    # NYC to Boston (~215 miles)
    trial = make_trial(locations=[TrialLocation(lat=42.3601, lon=-71.0589)])
    result = scorer.score(
        patient=make_patient(),
        parsed_eligibility=make_eligibility(),
        trial=trial,
        semantic_score=0.0,
        patient_lat=40.7128,
        patient_lon=-74.0060,
    )
    assert result.geo_score == 0.1
    assert result.distance_miles > 100.0


def test_geo_no_patient_coords_returns_neutral():
    result = score(lat=None, lon=None)
    assert result.geo_score == 0.5
    assert result.distance_miles is None


def test_geo_trial_has_no_geocoded_sites_returns_neutral():
    trial = make_trial(locations=[TrialLocation(facility="Unknown Site")])
    result = scorer.score(
        patient=make_patient(),
        parsed_eligibility=make_eligibility(),
        trial=trial,
        semantic_score=0.0,
        patient_lat=40.7128,
        patient_lon=-74.0060,
    )
    assert result.geo_score == 0.5
    assert result.distance_miles is None


def test_geo_nearest_of_multiple_sites_used():
    """Scorer picks the closest site, not just the first."""
    trial = make_trial(locations=[
        TrialLocation(lat=42.3601, lon=-71.0589),   # Boston ~215 mi
        TrialLocation(lat=40.7282, lon=-74.0776),   # NJ ~5 mi
    ])
    result = scorer.score(
        patient=make_patient(),
        parsed_eligibility=make_eligibility(),
        trial=trial,
        semantic_score=0.0,
        patient_lat=40.7128,
        patient_lon=-74.0060,
    )
    assert result.geo_score == 1.0  # closest site is <25 mi


def test_geo_empty_locations_list_returns_neutral():
    trial = make_trial(locations=[])
    result = scorer.score(
        patient=make_patient(),
        parsed_eligibility=make_eligibility(),
        trial=trial,
        semantic_score=0.0,
        patient_lat=40.7128,
        patient_lon=-74.0060,
    )
    assert result.geo_score == 0.5


# ---------------------------------------------------------------------------
# 8. MatchExplanation structure
# ---------------------------------------------------------------------------

def test_match_explanation_has_nct_id():
    result = score()
    assert result.nct_id == "NCT00000001"


def test_all_scores_in_0_1_range():
    result = score(semantic=0.7)
    for s in (result.final_score, result.semantic_score, result.eligibility_score, result.geo_score):
        assert 0.0 <= s <= 1.0


def test_hard_excluded_false_on_clean_match():
    result = score()
    assert result.hard_excluded is False


def test_passed_list_populated_on_clean_match():
    elig = make_eligibility(
        age=AgeConstraint(min_age=18, max_age=70),
        sex="all",
        ecog_max=2,
    )
    result = score(eligibility=elig)
    names = {r.name for r in result.passed}
    assert "age" in names
    assert "sex" in names
    assert "ecog" in names


def test_failed_list_populated_on_hard_exclusion():
    elig = make_eligibility(age=AgeConstraint(min_age=18, max_age=40))
    result = score(patient=make_patient(age=80), eligibility=elig)
    assert len(result.failed) >= 1
    assert all(r.status == "fail" for r in result.failed)


def test_uncertain_list_has_status_uncertain():
    elig = make_eligibility(required_biomarkers=["BRCA1"])
    result = score(patient=make_patient(biomarkers=[]), eligibility=elig)
    assert all(r.status == "uncertain" for r in result.uncertain)


def test_exclusion_flags_surfaced_as_uncertain():
    elig = make_eligibility(exclusion_flags=["prior cranial radiation", "active CNS metastases"])
    result = score(eligibility=elig)
    uncertain_names = [r.name for r in result.uncertain]
    assert uncertain_names.count("exclusion_flag") == 2
    assert result.hard_excluded is False


def test_exclusion_flags_capped_at_five():
    elig = make_eligibility(exclusion_flags=[f"flag_{i}" for i in range(10)])
    result = score(eligibility=elig)
    flag_items = [r for r in result.uncertain if r.name == "exclusion_flag"]
    assert len(flag_items) == 5


# ---------------------------------------------------------------------------
# 9. Haversine sanity checks
# ---------------------------------------------------------------------------

def test_haversine_same_point_is_zero():
    assert _haversine_miles(40.7128, -74.0060, 40.7128, -74.0060) == pytest.approx(0.0, abs=1e-6)


def test_haversine_nyc_to_la_approx():
    # NYC to LA ≈ 2,450 miles
    d = _haversine_miles(40.7128, -74.0060, 34.0522, -118.2437)
    assert 2400 < d < 2500


def test_haversine_nyc_to_boston_approx():
    # NYC to Boston great-circle distance ≈ 190 miles (driving is ~215)
    d = _haversine_miles(40.7128, -74.0060, 42.3601, -71.0589)
    assert 185 < d < 200


def test_haversine_symmetric():
    d1 = _haversine_miles(40.7128, -74.0060, 42.3601, -71.0589)
    d2 = _haversine_miles(42.3601, -71.0589, 40.7128, -74.0060)
    assert d1 == pytest.approx(d2, abs=1e-6)
