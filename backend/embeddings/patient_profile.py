"""
PatientProfile schema and text-preparation utilities for embedding.

Two functions serve as the bridge between structured data and the vector store:
  - profile_to_narrative()  → converts a PatientProfile to an embeddable paragraph
  - trial_to_embed_text()   → converts a RawTrial to an embeddable document

Both use narrative/paragraph format rather than raw field concatenation because
sentence-level embedding models (OpenAI text-embedding-3-small and all-MiniLM)
encode semantic meaning from sentence context, not from keyword proximity.
"""

from typing import Literal, Optional
from pydantic import BaseModel, Field

from backend.ingestion.models import RawTrial


# ---------------------------------------------------------------------------
# Patient profile schema
# ---------------------------------------------------------------------------

class PatientProfile(BaseModel):
    age: int
    sex: Literal["male", "female", "other"]
    condition: str                              # e.g. "HER2-positive breast cancer"
    zip_code: str
    ecog_status: Optional[int] = None          # 0–4; None means unknown
    biomarkers: list[str] = Field(default_factory=list)          # e.g. ["HER2+", "ER-"]
    current_medications: list[str] = Field(default_factory=list)
    prior_treatments: list[str] = Field(default_factory=list)
    comorbidities: list[str] = Field(default_factory=list)
    additional_notes: Optional[str] = None


# ---------------------------------------------------------------------------
# Text preparation
# ---------------------------------------------------------------------------

def profile_to_narrative(profile: PatientProfile) -> str:
    """
    Convert a PatientProfile to a dense natural-language paragraph for embedding.

    Narrative format outperforms raw field concatenation because embedding models
    encode sentence-level context. A string like "Patient is a 45-year-old female
    with HER2-positive breast cancer, currently on trastuzumab" activates the
    model's semantic understanding of those relationships; "age:45 sex:female
    condition:breast cancer" does not.

    Missing fields are omitted (not filled with "unknown") so absent data doesn't
    pollute the embedding with irrelevant tokens.
    """
    parts: list[str] = [
        f"Patient is a {profile.age}-year-old {profile.sex} with {profile.condition}."
    ]
    if profile.ecog_status is not None:
        parts.append(f"ECOG performance status: {profile.ecog_status}.")
    if profile.biomarkers:
        parts.append(f"Biomarkers: {', '.join(profile.biomarkers)}.")
    if profile.current_medications:
        parts.append(f"Currently taking: {', '.join(profile.current_medications)}.")
    if profile.prior_treatments:
        parts.append(
            f"Prior treatments include: {', '.join(profile.prior_treatments)}."
        )
    if profile.comorbidities:
        parts.append(f"Comorbidities: {', '.join(profile.comorbidities)}.")
    if profile.additional_notes:
        parts.append(profile.additional_notes.strip())
    return " ".join(parts)


def trial_to_embed_text(trial: RawTrial) -> str:
    """
    Convert a RawTrial to the text we embed and store in ChromaDB.

    Concatenates: title + brief summary + eligibility criteria (truncated).
    The 2000-character cap on eligibility text prevents very long criteria from
    overwhelming the title+summary signal — and keeps us under the 8191-token
    limit for text-embedding-3-small.
    """
    parts: list[str] = [trial.brief_title]
    if trial.brief_summary:
        parts.append(trial.brief_summary[:1200])
    if trial.eligibility_criteria:
        parts.append(trial.eligibility_criteria[:2000])
    return "\n\n".join(parts)
