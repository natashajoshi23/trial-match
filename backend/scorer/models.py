from typing import Literal, Optional
from pydantic import BaseModel


class ConstraintResult(BaseModel):
    """Result of evaluating one eligibility constraint against the patient profile."""
    name: str
    status: Literal["pass", "fail", "uncertain"]
    reason: str


class MatchExplanation(BaseModel):
    """
    Full scoring breakdown for a (patient, trial) pair.

    The three sub-scores feed into:
      final_score = 0.40 * semantic + 0.40 * eligibility + 0.20 * geo
    Hard exclusions (age/sex mismatch, biomarker conflict, ECOG exceeded) force
    final_score to 0.0 regardless of semantic or geo scores.
    """
    nct_id: str
    final_score: float          # 0.0–1.0
    semantic_score: float       # 0.0–1.0  (from embedding cosine similarity)
    eligibility_score: float    # 0.0–1.0  (from rule-based constraint check)
    geo_score: float            # 0.0–1.0  (from distance to nearest site)
    hard_excluded: bool         # True when final_score was forced to 0.0

    distance_miles: Optional[float]   # distance to nearest trial site; None if unknown

    passed: list[ConstraintResult]
    failed: list[ConstraintResult]
    uncertain: list[ConstraintResult]
