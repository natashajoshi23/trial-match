"""
Layer 1: Data Ingestion — TrialFetcher

Fetches recruiting clinical trials from the clinicaltrials.gov v2 API
and caches results to disk keyed by (condition, date) so we don't hammer
the API during development.

API docs: https://clinicaltrials.gov/data-api/api
"""

import json
from datetime import date
from pathlib import Path
from typing import Optional

import httpx

from .models import RawTrial, SiteContact, TrialLocation

CTGOV_BASE_URL = "https://clinicaltrials.gov/api/v2/studies"

# Only these statuses are useful for matching — closed trials waste embeddings.
RECRUITING_STATUSES = "RECRUITING,NOT_YET_RECRUITING"

DEFAULT_CACHE_DIR = Path(__file__).parent.parent / "data" / "cache"


class TrialFetcher:
    """
    Fetches and caches clinical trial data from clinicaltrials.gov v2.

    Usage:
        fetcher = TrialFetcher()
        trials = await fetcher.fetch("breast cancer")
    """

    def __init__(
        self,
        cache_dir: Path = DEFAULT_CACHE_DIR,
        page_size: int = 100,
        max_pages: int = 5,
    ):
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        # page_size * max_pages = max trials fetched per condition (500 default)
        self.page_size = page_size
        self.max_pages = max_pages

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def fetch(self, condition: str) -> list[RawTrial]:
        """
        Return recruiting trials for the given condition.
        Reads from disk cache if a cache file for today's date exists,
        otherwise calls the API and writes the cache.
        """
        cache_path = self._cache_path(condition)
        if cache_path.exists():
            return self._load_cache(cache_path)

        trials = await self._fetch_from_api(condition)
        self._write_cache(cache_path, trials)
        return trials

    def clear_cache(self, condition: str) -> None:
        """Delete the cached file for a condition (forces a fresh API fetch)."""
        path = self._cache_path(condition)
        if path.exists():
            path.unlink()

    # ------------------------------------------------------------------
    # Cache helpers
    # ------------------------------------------------------------------

    def _cache_path(self, condition: str) -> Path:
        # Key by condition slug + today's date so data refreshes daily.
        slug = condition.lower().replace(" ", "_")[:50]
        return self.cache_dir / f"{slug}_{date.today().isoformat()}.json"

    def _load_cache(self, path: Path) -> list[RawTrial]:
        raw = json.loads(path.read_text(encoding="utf-8"))
        return [RawTrial(**t) for t in raw]

    def _write_cache(self, path: Path, trials: list[RawTrial]) -> None:
        serialized = [t.model_dump() for t in trials]
        path.write_text(json.dumps(serialized, indent=2), encoding="utf-8")

    # ------------------------------------------------------------------
    # API fetching
    # ------------------------------------------------------------------

    async def _fetch_from_api(self, condition: str) -> list[RawTrial]:
        results: list[RawTrial] = []
        next_page_token: Optional[str] = None

        async with httpx.AsyncClient(timeout=30) as client:
            for _ in range(self.max_pages):
                params: dict = {
                    "query.cond": condition,
                    "filter.overallStatus": RECRUITING_STATUSES,
                    "pageSize": self.page_size,
                    "format": "json",
                }
                if next_page_token:
                    params["pageToken"] = next_page_token

                response = await client.get(CTGOV_BASE_URL, params=params)
                response.raise_for_status()
                data = response.json()

                for study in data.get("studies", []):
                    trial = self._parse_study(study)
                    if trial is not None:
                        results.append(trial)

                next_page_token = data.get("nextPageToken")
                if not next_page_token:
                    break

        return results

    def _parse_study(self, study: dict) -> Optional[RawTrial]:
        """
        Extract the fields we care about from one raw API study object.
        Returns None if the study is missing an NCT ID (malformed entry).
        """
        ps = study.get("protocolSection", {})

        id_mod = ps.get("identificationModule", {})
        nct_id = id_mod.get("nctId")
        if not nct_id:
            return None

        status_mod = ps.get("statusModule", {})
        start_date_struct = status_mod.get("startDateStruct") or {}
        completion_date_struct = status_mod.get("primaryCompletionDateStruct") or {}

        desc_mod = ps.get("descriptionModule", {})
        elig_mod = ps.get("eligibilityModule", {})
        cond_mod = ps.get("conditionsModule", {})
        design_mod = ps.get("designModule", {})
        sponsor_mod = ps.get("sponsorCollaboratorsModule", {})
        arms_mod = ps.get("armsInterventionsModule", {})

        contacts_mod = ps.get("contactsLocationsModule", {})
        locations_raw = contacts_mod.get("locations", [])
        central_contacts_raw = contacts_mod.get("centralContacts", [])
        officials_raw = contacts_mod.get("overallOfficials", [])

        lead_sponsor = sponsor_mod.get("leadSponsor", {})
        intervention_types = list({
            iv.get("type") for iv in arms_mod.get("interventions", []) if iv.get("type")
        })

        return RawTrial(
            nct_id=nct_id,
            brief_title=id_mod.get("briefTitle", ""),
            official_title=id_mod.get("officialTitle"),
            brief_summary=desc_mod.get("briefSummary"),
            eligibility_criteria=elig_mod.get("eligibilityCriteria"),
            sex=elig_mod.get("sex"),
            minimum_age=elig_mod.get("minimumAge"),
            maximum_age=elig_mod.get("maximumAge"),
            healthy_volunteers=elig_mod.get("healthyVolunteers"),
            conditions=cond_mod.get("conditions", []),
            phases=design_mod.get("phases", []),
            overall_status=status_mod.get("overallStatus"),
            locations=self._parse_locations(locations_raw),
            start_date=start_date_struct.get("date"),
            primary_completion_date=completion_date_struct.get("date"),
            overall_contacts=self._parse_central_contacts(central_contacts_raw),
            investigators=self._parse_officials(officials_raw),
            sponsor_type=lead_sponsor.get("class"),
            study_type=design_mod.get("studyType"),
            intervention_types=intervention_types,
        )

    @staticmethod
    def _parse_contact(c: dict) -> SiteContact:
        return SiteContact(
            name=c.get("name"),
            role=c.get("role"),
            phone=c.get("phone") or c.get("phoneExt"),
            email=c.get("email"),
        )

    @classmethod
    def _parse_central_contacts(cls, raw: list[dict]) -> list[SiteContact]:
        return [cls._parse_contact(c) for c in raw if c.get("name") or c.get("email")]

    @classmethod
    def _parse_officials(cls, raw: list[dict]) -> list[SiteContact]:
        return [cls._parse_contact(c) for c in raw if c.get("name")]

    @classmethod
    def _parse_locations(cls, locations_raw: list[dict]) -> list[TrialLocation]:
        result = []
        for loc in locations_raw:
            geo = loc.get("geoPoint") or {}
            site_contacts = [
                cls._parse_contact(c)
                for c in loc.get("contacts", [])
                if c.get("name") or c.get("email")
            ]
            result.append(
                TrialLocation(
                    facility=loc.get("facility"),
                    status=loc.get("status"),
                    city=loc.get("city"),
                    state=loc.get("state"),
                    zip=loc.get("zip"),
                    country=loc.get("country"),
                    lat=geo.get("lat"),
                    lon=geo.get("lon"),
                    contacts=site_contacts,
                )
            )
        return result
