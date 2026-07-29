from typing import Optional
from pydantic import BaseModel


class ExplainedMatch(BaseModel):
    """
    Human-readable explanation for a single (patient, trial) match result.

    Produced by MatchExplainer from a MatchExplanation (Layer 4) and the raw
    RawTrial. Designed so the React frontend can render it without any further
    processing — the three 'why_*' lists map directly to UI bullet groups.
    """
    nct_id: str
    brief_title: str
    final_score: float          # 0.0–1.0, copied from MatchExplanation

    headline: str               # one-sentence verdict (e.g. "Strong match: ...")
    summary: str                # 2–3 sentence description of the trial + fit

    why_eligible: list[str]     # confirmed reasons the patient may qualify
    why_uncertain: list[str]    # criteria we could not verify from the profile
    why_excluded: list[str]     # hard disqualification reasons; empty if not excluded

    score_breakdown: dict[str, float]  # keys: "semantic", "eligibility", "geo", "final"
    distance_miles: Optional[float]
    hard_excluded: bool

    llm_narrative: Optional[str] = None  # GPT-generated prose, if explain_with_llm() was called
