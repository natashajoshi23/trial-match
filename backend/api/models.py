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


class MatchResponse(BaseModel):
    matches: list[TrialMatchResult]
    total_trials_fetched: int
    total_trials_scored: int
    patient_lat: Optional[float]
    patient_lon: Optional[float]
