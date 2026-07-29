"""
Layer 5: MatchExplainer

Converts a MatchExplanation (Layer 4 scorer output) into human-readable text
that the frontend can display directly.

Two modes:
  explain()           — synchronous, template-based, no API key needed
  explain_with_llm()  — async, generates an additional GPT prose narrative;
                        falls back gracefully to template on error or missing key

Template approach was chosen over pure LLM for the primary path because:
  - Deterministic: same input always produces the same output (testable)
  - Zero latency: no API round-trip for the core explanation
  - Graceful degradation: works in environments without an OpenAI key

The LLM narrative is additive — it supplements the structured bullets rather
than replacing them, so the UI always has structured data to render.
"""

import os
from typing import Optional

try:
    from openai import AsyncOpenAI
except ImportError:
    AsyncOpenAI = None  # type: ignore[assignment,misc]

from .models import ExplainedMatch
from backend.scorer.models import MatchExplanation
from backend.ingestion.models import RawTrial
from backend.embeddings.patient_profile import PatientProfile

_LLM_MODEL = "gpt-4o-mini"
_LLM_MAX_TOKENS = 150

_LLM_SYSTEM = (
    "You are a clinical trial matching assistant helping patients and clinicians "
    "understand trial compatibility. Write clear, empathetic explanations. "
    "Be specific — cite actual patient criteria and trial requirements. "
    "Use plain language; avoid jargon. 2–3 sentences maximum."
)

# Score tier labels
_TIERS = [
    (0.80, "Strong match"),
    (0.60, "Potential match"),
    (0.40, "Weak match"),
    (0.00, "Poor match"),
]


class MatchExplainer:
    """
    Generates natural-language explanations for trial-patient match results.

    Usage:
        explainer = MatchExplainer()
        explained = explainer.explain(match, trial, patient)

        # With GPT narrative:
        explained = await explainer.explain_with_llm(match, trial, patient, api_key="sk-...")
    """

    # ------------------------------------------------------------------
    # Public interface
    # ------------------------------------------------------------------

    def explain(
        self,
        match: MatchExplanation,
        trial: RawTrial,
        patient: PatientProfile,
    ) -> ExplainedMatch:
        """Synchronous, template-based explanation. No API calls."""
        return ExplainedMatch(
            nct_id=match.nct_id,
            brief_title=trial.brief_title,
            final_score=match.final_score,
            headline=self._headline(match),
            summary=self._summary(match, trial, patient),
            why_eligible=self._why_eligible(match),
            why_uncertain=self._why_uncertain(match),
            why_excluded=self._why_excluded(match),
            score_breakdown={
                "semantic": match.semantic_score,
                "eligibility": match.eligibility_score,
                "geo": match.geo_score,
                "final": match.final_score,
            },
            distance_miles=match.distance_miles,
            hard_excluded=match.hard_excluded,
            llm_narrative=None,
        )

    async def explain_with_llm(
        self,
        match: MatchExplanation,
        trial: RawTrial,
        patient: PatientProfile,
        openai_api_key: Optional[str] = None,
    ) -> ExplainedMatch:
        """
        Template explanation augmented with a GPT-generated prose narrative.

        Falls back to template-only if:
          - No API key is available
          - OpenAI raises any error
        The structured fields (why_eligible, why_uncertain, why_excluded) are
        always populated from the template — llm_narrative is additive.
        """
        base = self.explain(match, trial, patient)
        api_key = openai_api_key or os.getenv("OPENAI_API_KEY")
        if not api_key:
            return base

        try:
            narrative = await self._call_llm(match, trial, patient, api_key)
            return base.model_copy(update={"llm_narrative": narrative})
        except Exception:
            return base

    # ------------------------------------------------------------------
    # Template building blocks
    # ------------------------------------------------------------------

    @staticmethod
    def _headline(match: MatchExplanation) -> str:
        if match.hard_excluded:
            first_fail = match.failed[0].reason if match.failed else "eligibility criteria not met"
            return f"Not eligible: {first_fail}"
        for threshold, label in _TIERS:
            if match.final_score >= threshold:
                return f"{label}: {_score_pct(match.final_score)} overall compatibility."
        return "Poor match."

    @staticmethod
    def _summary(
        match: MatchExplanation, trial: RawTrial, patient: PatientProfile
    ) -> str:
        parts: list[str] = []

        # Trial description
        phase_str = _format_phases(trial.phases)
        conditions_str = ", ".join(trial.conditions[:2]) or "this condition"
        parts.append(f"This {phase_str}trial is studying {conditions_str}.")

        # Site context
        recruiting_sites = [
            loc for loc in trial.locations
            if loc.country == "United States" or not loc.country
        ]
        if recruiting_sites:
            site = recruiting_sites[0]
            location_parts = [p for p in [site.city, site.state] if p]
            location_str = ", ".join(location_parts)
            site_count = len(trial.locations)
            if site_count == 1:
                parts.append(f"It is enrolling at {site.facility or 'one site'}"
                              + (f" in {location_str}." if location_str else "."))
            else:
                parts.append(f"It is enrolling at {site_count} sites"
                              + (f", including {location_str}." if location_str else "."))
        elif trial.locations:
            parts.append(f"It has {len(trial.locations)} recruiting site(s).")

        # Distance context
        if match.distance_miles is not None:
            if match.distance_miles < 1:
                parts.append("A trial site is at the patient's location.")
            else:
                parts.append(f"The nearest site is {match.distance_miles:.0f} mile(s) away.")
        elif match.geo_score == 0.5:
            parts.append("Site distance could not be determined.")

        return " ".join(parts)

    @staticmethod
    def _why_eligible(match: MatchExplanation) -> list[str]:
        bullets: list[str] = [c.reason for c in match.passed]
        # Add semantic relevance if notable
        if not match.hard_excluded and match.semantic_score >= 0.70:
            bullets.append(
                f"Trial content is semantically relevant to the patient's condition "
                f"({_score_pct(match.semantic_score)} similarity)."
            )
        # Add geo context if nearby
        if not match.hard_excluded and match.geo_score == 1.0 and match.distance_miles is not None:
            bullets.append(
                f"Nearest site is {match.distance_miles:.0f} mile(s) away — within easy reach."
            )
        return bullets

    @staticmethod
    def _why_uncertain(match: MatchExplanation) -> list[str]:
        seen: set[str] = set()
        bullets: list[str] = []
        for c in match.uncertain:
            if c.reason not in seen:
                seen.add(c.reason)
                bullets.append(c.reason)
        return bullets

    @staticmethod
    def _why_excluded(match: MatchExplanation) -> list[str]:
        return [c.reason for c in match.failed]

    # ------------------------------------------------------------------
    # LLM narrative generation
    # ------------------------------------------------------------------

    @staticmethod
    async def _call_llm(
        match: MatchExplanation,
        trial: RawTrial,
        patient: PatientProfile,
        api_key: str,
    ) -> str:
        if AsyncOpenAI is None:
            raise RuntimeError("openai package is not installed")
        client = AsyncOpenAI(api_key=api_key)
        prompt = _build_llm_prompt(match, trial, patient)

        response = await client.chat.completions.create(
            model=_LLM_MODEL,
            messages=[
                {"role": "system", "content": _LLM_SYSTEM},
                {"role": "user", "content": prompt},
            ],
            max_tokens=_LLM_MAX_TOKENS,
            temperature=0.3,
        )
        return response.choices[0].message.content.strip()


# ------------------------------------------------------------------
# Helper functions
# ------------------------------------------------------------------

def _score_pct(score: float) -> str:
    return f"{score:.0%}"


def _format_phases(phases: list[str]) -> str:
    if not phases:
        return ""
    readable = {
        "PHASE1": "Phase 1",
        "PHASE2": "Phase 2",
        "PHASE3": "Phase 3",
        "PHASE4": "Phase 4",
        "PHASE1_PHASE2": "Phase 1/2",
        "PHASE2_PHASE3": "Phase 2/3",
        "EARLY_PHASE1": "early Phase 1",
    }
    labels = [readable.get(p, p) for p in phases]
    return f"{'/'.join(labels)} "


def _build_llm_prompt(
    match: MatchExplanation,
    trial: RawTrial,
    patient: PatientProfile,
) -> str:
    lines = [
        f"Trial: {trial.brief_title}",
        f"Patient: {patient.age}-year-old {patient.sex} with {patient.condition}",
        f"Overall match score: {_score_pct(match.final_score)}",
    ]

    if match.hard_excluded:
        reasons = "; ".join(c.reason for c in match.failed)
        lines.append(f"DISQUALIFIED — reason(s): {reasons}")
    else:
        if match.passed:
            confirmed = "; ".join(c.reason for c in match.passed[:4])
            lines.append(f"Confirmed eligible criteria: {confirmed}")
        if match.uncertain:
            unverified = "; ".join(c.reason for c in match.uncertain[:3])
            lines.append(f"Unverified criteria: {unverified}")
        if match.distance_miles is not None:
            lines.append(f"Distance to nearest site: {match.distance_miles:.0f} miles")

    lines.append("\nWrite a 2–3 sentence explanation of this match for the patient.")
    return "\n".join(lines)
