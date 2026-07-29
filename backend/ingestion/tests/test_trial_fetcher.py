"""
Unit tests for TrialFetcher._parse_study().

All tests use hardcoded study dicts that mirror the real clinicaltrials.gov
v2 JSON shape — no network calls, no mocking needed.
"""

import json
import pytest
from pathlib import Path
from unittest.mock import AsyncMock, patch

from backend.ingestion.trial_fetcher import TrialFetcher
from backend.ingestion.models import RawTrial

fetcher = TrialFetcher()

# ---------------------------------------------------------------------------
# Fixture: a minimal valid study dict (mirrors real ctgov v2 shape)
# ---------------------------------------------------------------------------

MINIMAL_STUDY = {
    "protocolSection": {
        "identificationModule": {
            "nctId": "NCT99999999",
            "briefTitle": "Test Trial",
        },
        "statusModule": {
            "overallStatus": "RECRUITING",
            "startDateStruct": {"date": "2024-01-01", "type": "ACTUAL"},
        },
        "descriptionModule": {
            "briefSummary": "A test trial summary.",
        },
        "eligibilityModule": {
            "eligibilityCriteria": "Inclusion Criteria:\n* Age >= 18\n\nExclusion Criteria:\n* Prior chemotherapy",
            "sex": "ALL",
            "minimumAge": "18 Years",
            "maximumAge": "65 Years",
            "healthyVolunteers": False,
        },
        "conditionsModule": {
            "conditions": ["Breast Cancer"],
        },
        "designModule": {
            "phases": ["PHASE2"],
        },
        "contactsLocationsModule": {
            "locations": [
                {
                    "facility": "Test Hospital",
                    "status": "RECRUITING",
                    "city": "New York",
                    "state": "New York",
                    "zip": "10001",
                    "country": "United States",
                    "geoPoint": {"lat": 40.7128, "lon": -74.0060},
                }
            ]
        },
    }
}


def test_parse_minimal_study_returns_raw_trial():
    trial = fetcher._parse_study(MINIMAL_STUDY)
    assert isinstance(trial, RawTrial)
    assert trial.nct_id == "NCT99999999"


def test_parse_brief_title():
    trial = fetcher._parse_study(MINIMAL_STUDY)
    assert trial.brief_title == "Test Trial"


def test_parse_overall_status():
    trial = fetcher._parse_study(MINIMAL_STUDY)
    assert trial.overall_status == "RECRUITING"


def test_parse_eligibility_criteria_text():
    trial = fetcher._parse_study(MINIMAL_STUDY)
    assert "Inclusion Criteria" in trial.eligibility_criteria
    assert "Exclusion Criteria" in trial.eligibility_criteria


def test_parse_sex_field():
    trial = fetcher._parse_study(MINIMAL_STUDY)
    assert trial.sex == "ALL"


def test_parse_age_fields():
    trial = fetcher._parse_study(MINIMAL_STUDY)
    assert trial.minimum_age == "18 Years"
    assert trial.maximum_age == "65 Years"


def test_parse_conditions():
    trial = fetcher._parse_study(MINIMAL_STUDY)
    assert "Breast Cancer" in trial.conditions


def test_parse_phases():
    trial = fetcher._parse_study(MINIMAL_STUDY)
    assert "PHASE2" in trial.phases


def test_parse_location_lat_lon():
    trial = fetcher._parse_study(MINIMAL_STUDY)
    assert len(trial.locations) == 1
    loc = trial.locations[0]
    assert loc.lat == pytest.approx(40.7128)
    assert loc.lon == pytest.approx(-74.0060)


def test_parse_location_fields():
    trial = fetcher._parse_study(MINIMAL_STUDY)
    loc = trial.locations[0]
    assert loc.facility == "Test Hospital"
    assert loc.city == "New York"
    assert loc.zip == "10001"


def test_parse_study_missing_nct_id_returns_none():
    study = {"protocolSection": {"identificationModule": {}}}
    assert fetcher._parse_study(study) is None


def test_parse_empty_locations():
    study = {**MINIMAL_STUDY}
    study["protocolSection"] = {
        **MINIMAL_STUDY["protocolSection"],
        "contactsLocationsModule": {},
    }
    trial = fetcher._parse_study(study)
    assert trial.locations == []


def test_parse_missing_optional_fields():
    study = {
        "protocolSection": {
            "identificationModule": {"nctId": "NCT12345678", "briefTitle": "Sparse"},
            "statusModule": {"overallStatus": "RECRUITING"},
        }
    }
    trial = fetcher._parse_study(study)
    assert trial.nct_id == "NCT12345678"
    assert trial.brief_summary is None
    assert trial.eligibility_criteria is None
    assert trial.conditions == []
    assert trial.phases == []
    assert trial.locations == []


def test_parse_location_without_geopoint():
    study = {**MINIMAL_STUDY}
    study["protocolSection"] = {
        **MINIMAL_STUDY["protocolSection"],
        "contactsLocationsModule": {
            "locations": [{"facility": "Remote Site", "city": "Boston"}]
        },
    }
    trial = fetcher._parse_study(study)
    loc = trial.locations[0]
    assert loc.lat is None
    assert loc.lon is None
    assert loc.city == "Boston"


def test_parse_multiple_locations():
    study = {**MINIMAL_STUDY}
    study["protocolSection"] = {
        **MINIMAL_STUDY["protocolSection"],
        "contactsLocationsModule": {
            "locations": [
                {"facility": "Site A", "city": "NYC", "geoPoint": {"lat": 40.7, "lon": -74.0}},
                {"facility": "Site B", "city": "LA", "geoPoint": {"lat": 34.0, "lon": -118.2}},
            ]
        },
    }
    trial = fetcher._parse_study(study)
    assert len(trial.locations) == 2
    assert trial.locations[1].city == "LA"


def test_cache_roundtrip(tmp_path):
    """Cached data survives a serialize/deserialize roundtrip."""
    fetcher_tmp = TrialFetcher(cache_dir=tmp_path)
    trial = fetcher._parse_study(MINIMAL_STUDY)
    cache_path = fetcher_tmp._cache_path("test condition")
    fetcher_tmp._write_cache(cache_path, [trial])
    loaded = fetcher_tmp._load_cache(cache_path)
    assert loaded[0].nct_id == trial.nct_id
    assert loaded[0].locations[0].lat == trial.locations[0].lat


@pytest.mark.asyncio
async def test_fetch_uses_cache_on_second_call(tmp_path):
    """Second fetch() call reads from disk, not the API."""
    fetcher_tmp = TrialFetcher(cache_dir=tmp_path)
    trial = fetcher._parse_study(MINIMAL_STUDY)
    cache_path = fetcher_tmp._cache_path("breast cancer")
    fetcher_tmp._write_cache(cache_path, [trial])

    # Should read from cache without hitting the network
    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        results = await fetcher_tmp.fetch("breast cancer")
        mock_get.assert_not_called()

    assert len(results) == 1
    assert results[0].nct_id == "NCT99999999"
