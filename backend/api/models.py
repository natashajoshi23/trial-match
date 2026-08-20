from typing import Optional
from pydantic import BaseModel, Field

from backend.embeddings.patient_profile import PatientProfile
from backend.explainability.models import ExplainedMatch


class MatchRequest(BaseModel):
    patient: PatientProfile
    top_k: int = Field(default=10, ge=1, le=50, description="Maximum results to return")
    max_distance_miles: Optional[float] = Field(
        default=None, ge=0,
        description="Filter out sites farther than this distance. None = no filter."
    )


class TrialMatchResult(ExplainedMatch):
    """ExplainedMatch enriched with trial-level metadata for the frontend."""
    overall_status: Optional[str] = None
    phases: list[str] = Field(default_factory=list)
    conditions: list[str] = Field(default_factory=list)
    locations_count: int = 0
    countries_at_sites: list[str] = Field(default_factory=list)
    minimum_age: Optional[str] = None
    maximum_age: Optional[str] = None
    start_date: Optional[str] = None
    primary_completion_date: Optional[str] = None


class MatchResponse(BaseModel):
    matches: list[TrialMatchResult]
    total_trials_fetched: int
    total_trials_scored: int
    patient_lat: Optional[float]
    patient_lon: Optional[float]


# ---------------------------------------------------------------------------
# Researcher / find-sites models
# ---------------------------------------------------------------------------

class ResearcherSearchRequest(BaseModel):
    conditions: list[str] = Field(default_factory=list)  # one or more conditions to search
    zip_code: str = ""
    country: str = "United States"
    phases: list[str] = Field(default_factory=list)         # empty = all phases
    sponsor_types: list[str] = Field(default_factory=list)  # empty = all sponsor types
    study_types: list[str] = Field(default_factory=list)    # empty = all study types
    intervention_types: list[str] = Field(default_factory=list)  # empty = all intervention types
    healthy_volunteers_only: bool = False
    top_k: int = Field(default=10, ge=1, le=50)
    max_distance_miles: Optional[float] = None


class SiteContactResult(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None


class TrialSiteResult(BaseModel):
    nct_id: str
    brief_title: str
    overall_status: Optional[str] = None
    phases: list[str] = Field(default_factory=list)
    conditions: list[str] = Field(default_factory=list)
    brief_summary: Optional[str] = None
    start_date: Optional[str] = None
    primary_completion_date: Optional[str] = None
    healthy_volunteers: Optional[bool] = None
    minimum_age: Optional[str] = None
    maximum_age: Optional[str] = None
    nearest_facility: Optional[str] = None
    nearest_city: Optional[str] = None
    nearest_state: Optional[str] = None
    nearest_country: Optional[str] = None
    nearest_distance_miles: Optional[float] = None
    nearest_lat: Optional[float] = None
    nearest_lon: Optional[float] = None
    site_contacts: list[SiteContactResult] = Field(default_factory=list)
    overall_contacts: list[SiteContactResult] = Field(default_factory=list)
    investigators: list[SiteContactResult] = Field(default_factory=list)
    total_sites: int = 0
    countries_at_sites: list[str] = Field(default_factory=list)
    sponsor_type: Optional[str] = None
    study_type: Optional[str] = None
    intervention_types: list[str] = Field(default_factory=list)


class ResearcherSearchResponse(BaseModel):
    results: list[TrialSiteResult]
    total_fetched: int
    patient_lat: Optional[float] = None
    patient_lon: Optional[float] = None
    geo_warning: Optional[str] = None
