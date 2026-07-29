"""
Layer 4: TrialScorer

Combines three sub-scores into a single match score for a (patient, trial) pair:

  final_score = 0.40 * semantic_score
              + 0.40 * eligibility_score
              + 0.20 * geo_score

Hard exclusions force final_score to 0.0 regardless of other components.
A hard exclusion is triggered when:
  - Patient age is outside the trial's min/max age range
  - Patient sex does not match the trial's sex restriction
  - Patient ECOG status exceeds the trial's stated maximum (when both are known)
  - Patient biomarkers explicitly conflict with a required biomarker
    (e.g., patient has HER2–, trial requires HER2+)
  - Patient's current or prior medications match a trial exclusion criterion

Missing patient fields (e.g., biomarker not reported, ECOG not provided)
are treated as UNCERTAIN — they do not trigger exclusion. This is intentional:
the scorer must not penalize patients for incomplete profiles.
"""

import math
from typing import Optional

from .models import ConstraintResult, MatchExplanation
from backend.embeddings.patient_profile import PatientProfile
from backend.parser.models import ParsedEligibility, AgeConstraint
from backend.ingestion.models import RawTrial

# --- Score weights (must sum to 1.0) ---
_W_SEMANTIC = 0.40
_W_ELIGIBILITY = 0.40
_W_GEO = 0.20

# --- Geographic thresholds (miles) ---
_GEO_NEAR_MILES = 25.0
_GEO_MID_MILES = 100.0
_GEO_SCORE_NEAR = 1.0
_GEO_SCORE_MID = 0.5
_GEO_SCORE_FAR = 0.1
_GEO_SCORE_UNKNOWN = 0.5   # neutral when patient or site coordinates unavailable

# --- Soft mismatch deduction per violation ---
_SOFT_DEDUCTION = 0.15

# --- Biomarker opposites for conflict detection ---
_BIOMARKER_OPPOSITES: dict[str, str] = {
    "her2+": "her2-",
    "her2-": "her2+",
    "er+": "er-",
    "er-": "er+",
    "pr+": "pr-",
    "pr-": "pr+",
}

# Maximum number of raw exclusion flags surfaced as uncertain constraints
_MAX_EXCLUSION_FLAGS = 5


class TrialScorer:
    """
    Scores a (patient, trial) pair and returns a MatchExplanation.

    Parameters accepted by score():
      patient           — structured patient profile
      parsed_eligibility — structured eligibility parsed from the trial text
      trial             — raw trial record (used for locations)
      semantic_score    — cosine similarity from Layer 3 (0.0–1.0)
      patient_lat/lon   — pre-geocoded patient coordinates; Layer 6 supplies these.
                          When omitted, geo score defaults to 0.5 (neutral).
    """

    def score(
        self,
        patient: PatientProfile,
        parsed_eligibility: ParsedEligibility,
        trial: RawTrial,
        semantic_score: float,
        patient_lat: Optional[float] = None,
        patient_lon: Optional[float] = None,
    ) -> MatchExplanation:
        elig_score, passed, failed, uncertain = self._score_eligibility(
            patient, parsed_eligibility
        )
        hard_excluded = bool(failed)

        geo_score, distance_miles = self._score_geo(patient_lat, patient_lon, trial)

        if hard_excluded:
            final_score = 0.0
        else:
            raw = (
                _W_SEMANTIC * semantic_score
                + _W_ELIGIBILITY * elig_score
                + _W_GEO * geo_score
            )
            final_score = max(0.0, min(1.0, raw))

        return MatchExplanation(
            nct_id=trial.nct_id,
            final_score=round(final_score, 4),
            semantic_score=round(float(semantic_score), 4),
            eligibility_score=round(elig_score, 4),
            geo_score=round(geo_score, 4),
            hard_excluded=hard_excluded,
            distance_miles=round(distance_miles, 2) if distance_miles is not None else None,
            passed=passed,
            failed=failed,
            uncertain=uncertain,
        )

    # ------------------------------------------------------------------
    # Eligibility scoring
    # ------------------------------------------------------------------

    def _score_eligibility(
        self,
        patient: PatientProfile,
        parsed: ParsedEligibility,
    ) -> tuple[float, list[ConstraintResult], list[ConstraintResult], list[ConstraintResult]]:
        passed: list[ConstraintResult] = []
        failed: list[ConstraintResult] = []    # hard exclusions
        uncertain: list[ConstraintResult] = []
        soft_fails: int = 0

        def _route(result: ConstraintResult, *, hard: bool = True) -> None:
            nonlocal soft_fails
            if result.status == "pass":
                passed.append(result)
            elif result.status == "fail":
                if hard:
                    failed.append(result)
                else:
                    # Soft mismatch: flag as uncertain with a deduction marker
                    uncertain.append(ConstraintResult(
                        name=result.name,
                        status="uncertain",
                        reason=f"[soft mismatch] {result.reason}",
                    ))
                    soft_fails += 1
            else:
                uncertain.append(result)

        # Age — hard constraint
        _route(self._check_age(patient.age, parsed.age), hard=True)

        # Sex — hard constraint
        _route(self._check_sex(patient.sex, parsed.sex), hard=True)

        # ECOG — hard when both values are known, uncertain otherwise
        _route(self._check_ecog(patient.ecog_status, parsed.ecog_max), hard=True)

        # Required biomarkers — hard when explicitly conflicting, uncertain when missing
        for result in self._check_biomarkers(patient.biomarkers, parsed.required_biomarkers):
            _route(result, hard=True)

        # Medication exclusions — hard constraint
        for result in self._check_medication_exclusions(patient, parsed):
            _route(result, hard=True)

        # Raw exclusion flags — always uncertain; we cannot verify them structurally
        for flag in parsed.exclusion_flags[:_MAX_EXCLUSION_FLAGS]:
            uncertain.append(ConstraintResult(
                name="exclusion_flag",
                status="uncertain",
                reason=f"Cannot verify: '{flag[:80]}'",
            ))

        if failed:
            return 0.0, passed, failed, uncertain

        eligibility_score = max(0.0, 1.0 - soft_fails * _SOFT_DEDUCTION)
        return eligibility_score, passed, failed, uncertain

    # ------------------------------------------------------------------
    # Individual constraint checks
    # ------------------------------------------------------------------

    @staticmethod
    def _check_age(patient_age: int, age: AgeConstraint) -> ConstraintResult:
        min_a, max_a = age.min_age, age.max_age
        if min_a is None and max_a is None:
            return ConstraintResult(
                name="age",
                status="uncertain",
                reason="Trial does not specify an age range",
            )
        if min_a is not None and patient_age < min_a:
            return ConstraintResult(
                name="age",
                status="fail",
                reason=f"Patient age {patient_age} is below trial minimum {min_a}",
            )
        if max_a is not None and patient_age > max_a:
            return ConstraintResult(
                name="age",
                status="fail",
                reason=f"Patient age {patient_age} exceeds trial maximum {max_a}",
            )
        if min_a and max_a:
            age_range = f"{min_a}–{max_a}"
        elif min_a:
            age_range = f">= {min_a}"
        else:
            age_range = f"<= {max_a}"
        return ConstraintResult(
            name="age",
            status="pass",
            reason=f"Patient age {patient_age} is within trial range ({age_range})",
        )

    @staticmethod
    def _check_sex(patient_sex: str, trial_sex: Optional[str]) -> ConstraintResult:
        if not trial_sex or trial_sex.lower() == "all":
            return ConstraintResult(
                name="sex",
                status="pass",
                reason="Trial accepts all sexes",
            )
        if patient_sex.lower() == "other":
            return ConstraintResult(
                name="sex",
                status="uncertain",
                reason=f"Trial restricts to {trial_sex}; patient sex is 'other'",
            )
        if patient_sex.lower() == trial_sex.lower():
            return ConstraintResult(
                name="sex",
                status="pass",
                reason=f"Patient sex ({patient_sex}) matches trial requirement",
            )
        return ConstraintResult(
            name="sex",
            status="fail",
            reason=f"Patient is {patient_sex}, but trial requires {trial_sex}",
        )

    @staticmethod
    def _check_ecog(patient_ecog: Optional[int], ecog_max: Optional[int]) -> ConstraintResult:
        if ecog_max is None:
            return ConstraintResult(
                name="ecog",
                status="uncertain",
                reason="Trial does not specify an ECOG limit",
            )
        if patient_ecog is None:
            return ConstraintResult(
                name="ecog",
                status="uncertain",
                reason=f"Patient ECOG not reported; trial requires ECOG ≤ {ecog_max}",
            )
        if patient_ecog <= ecog_max:
            return ConstraintResult(
                name="ecog",
                status="pass",
                reason=f"Patient ECOG {patient_ecog} meets limit (≤ {ecog_max})",
            )
        return ConstraintResult(
            name="ecog",
            status="fail",
            reason=f"Patient ECOG {patient_ecog} exceeds trial maximum {ecog_max}",
        )

    @staticmethod
    def _check_biomarkers(
        patient_biomarkers: list[str],
        required_biomarkers: list[str],
    ) -> list[ConstraintResult]:
        patient_lower = {m.lower() for m in patient_biomarkers}
        results: list[ConstraintResult] = []
        for required in required_biomarkers:
            req_lower = required.lower()
            opposite = _BIOMARKER_OPPOSITES.get(req_lower)
            if opposite and opposite in patient_lower:
                results.append(ConstraintResult(
                    name=f"biomarker_{required}",
                    status="fail",
                    reason=f"Patient has {opposite.upper()}, conflicting with required {required}",
                ))
            elif req_lower in patient_lower:
                results.append(ConstraintResult(
                    name=f"biomarker_{required}",
                    status="pass",
                    reason=f"Patient biomarker {required} confirmed",
                ))
            else:
                results.append(ConstraintResult(
                    name=f"biomarker_{required}",
                    status="uncertain",
                    reason=f"Patient has not reported {required} status",
                ))
        return results

    @staticmethod
    def _check_medication_exclusions(
        patient: PatientProfile,
        parsed: ParsedEligibility,
    ) -> list[ConstraintResult]:
        patient_meds = {
            m.lower()
            for m in patient.current_medications + patient.prior_treatments
        }
        results: list[ConstraintResult] = []
        for exclusion in parsed.medication_exclusions:
            excl_lower = exclusion.lower()
            match = any(excl_lower in med or med in excl_lower for med in patient_meds)
            if match:
                results.append(ConstraintResult(
                    name="medication_exclusion",
                    status="fail",
                    reason=f"Patient history includes '{exclusion}', an exclusion criterion",
                ))
        return results

    # ------------------------------------------------------------------
    # Geographic scoring
    # ------------------------------------------------------------------

    def _score_geo(
        self,
        patient_lat: Optional[float],
        patient_lon: Optional[float],
        trial: RawTrial,
    ) -> tuple[float, Optional[float]]:
        if patient_lat is None or patient_lon is None:
            return _GEO_SCORE_UNKNOWN, None

        min_dist: Optional[float] = None
        for loc in trial.locations:
            if loc.lat is not None and loc.lon is not None:
                d = _haversine_miles(patient_lat, patient_lon, loc.lat, loc.lon)
                if min_dist is None or d < min_dist:
                    min_dist = d

        if min_dist is None:
            return _GEO_SCORE_UNKNOWN, None

        if min_dist <= _GEO_NEAR_MILES:
            return _GEO_SCORE_NEAR, min_dist
        elif min_dist <= _GEO_MID_MILES:
            return _GEO_SCORE_MID, min_dist
        return _GEO_SCORE_FAR, min_dist


def _haversine_miles(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance between two (lat, lon) points, in miles."""
    R = 3958.8
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = (
        math.sin(dphi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    )
    return 2 * R * math.asin(math.sqrt(a))
