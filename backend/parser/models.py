from typing import Optional
from pydantic import BaseModel, Field


class AgeConstraint(BaseModel):
    min_age: Optional[int] = None   # years, inclusive
    max_age: Optional[int] = None   # years, inclusive


class LabValue(BaseModel):
    marker: str             # e.g. "eGFR", "HbA1c", "creatinine"
    operator: str           # "<" | ">" | "<=" | ">="
    value: float
    unit: Optional[str] = None  # e.g. "mL/min", "%"


class ParsedEligibility(BaseModel):
    # Raw bullet text — preserved for display and debugging
    inclusion_bullets: list[str] = Field(default_factory=list)
    exclusion_bullets: list[str] = Field(default_factory=list)

    # --- Structured constraints ---
    age: AgeConstraint = Field(default_factory=AgeConstraint)
    sex: Optional[str] = None   # "all" | "male" | "female"

    # What the patient must have (inclusion side)
    required_diagnoses: list[str] = Field(default_factory=list)
    required_biomarkers: list[str] = Field(default_factory=list)  # e.g. ["HER2+", "TNBC"]

    # Performance status upper bound (patient must be AT OR BELOW this)
    ecog_max: Optional[int] = None
    karnofsky_min: Optional[int] = None  # patient must be AT OR ABOVE this

    # Numeric lab requirements from inclusion criteria
    lab_values: list[LabValue] = Field(default_factory=list)

    # What would disqualify the patient
    exclusion_flags: list[str] = Field(default_factory=list)        # e.g. ["prior chemotherapy"]
    medication_exclusions: list[str] = Field(default_factory=list)  # drug-specific prohibitions
    medication_requirements: list[str] = Field(default_factory=list)

    # Bullets the parser could not structure → fed to the embedding scorer
    raw_unstructured: list[str] = Field(default_factory=list)
