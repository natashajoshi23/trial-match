from typing import Optional
from pydantic import BaseModel, Field


class TrialLocation(BaseModel):
    facility: Optional[str] = None
    status: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip: Optional[str] = None
    country: Optional[str] = None
    # The clinicaltrials.gov v2 API returns pre-geocoded lat/lon via geoPoint.
    # This means we skip Nominatim calls for most sites.
    lat: Optional[float] = None
    lon: Optional[float] = None


class RawTrial(BaseModel):
    nct_id: str
    brief_title: str
    official_title: Optional[str] = None
    brief_summary: Optional[str] = None
    # Raw free-text blob containing both inclusion and exclusion criteria.
    # The parser (Layer 2) splits and structures this.
    eligibility_criteria: Optional[str] = None
    sex: Optional[str] = None           # "ALL" | "MALE" | "FEMALE"
    minimum_age: Optional[str] = None   # e.g. "18 Years" — parse in scorer
    maximum_age: Optional[str] = None   # e.g. "65 Years"
    healthy_volunteers: Optional[bool] = None
    conditions: list[str] = Field(default_factory=list)
    phases: list[str] = Field(default_factory=list)
    overall_status: Optional[str] = None
    locations: list[TrialLocation] = Field(default_factory=list)
    start_date: Optional[str] = None
