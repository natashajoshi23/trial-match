"""
Layer 2: Eligibility Parser

Converts the raw free-text eligibilityCriteria blob into a ParsedEligibility object.

Pipeline:
  raw text
    → _split_sections()  →  inclusion_text, exclusion_text
    → _extract_bullets() →  list[str] per section
    → _parse_*()         →  structured fields
    → _is_structured()   →  bullets that matched nothing → raw_unstructured
"""

import re
from typing import Optional

from .models import AgeConstraint, LabValue, ParsedEligibility

# ---------------------------------------------------------------------------
# spaCy — optional; used only for diagnosis entity extraction.
# Falls back to regex-only if the model is not installed.
# ---------------------------------------------------------------------------
try:
    import spacy as _spacy
    _NLP = _spacy.load("en_core_web_sm")
except (ImportError, OSError):
    _NLP = None


# ===========================================================================
# Compiled regex constants — one block so every pattern is easy to audit.
# ===========================================================================

# --- Section headers -------------------------------------------------------
# Simple non-anchored patterns: find the header anywhere in the text and
# slice at its position.
_INCLUSION_HDR = re.compile(
    r"(?:key\s+|main\s+|major\s+)?inclusion\s+criteria?\s*:",
    re.IGNORECASE,
)
_EXCLUSION_HDR = re.compile(
    r"(?:key\s+|main\s+|major\s+)?exclusion\s+criteria?\s*:",
    re.IGNORECASE,
)

# --- Bullet markers --------------------------------------------------------
_BULLET_START = re.compile(
    r"""
    ^[\s]*                               # optional leading whitespace
    (?:
        [*\-•]                           # *, -, •
        | \d{1,2}\s*[.)]\s              # 1. or 1) with space
        | \([a-zA-Z\d]{1,2}\)\s        # (a) or (1)
        | [a-zA-Z]\.\s                  # a.
    )
    """,
    re.VERBOSE | re.MULTILINE,
)

# --- Age -------------------------------------------------------------------

# "≥ 18 years", ">= 18 years", "at least 18 years"
_AGE_MIN = re.compile(
    r"(?:≥|>=|greater\s+than\s+or\s+equal\s+to|at\s+least|no\s+less\s+than)\s*(\d+)\s*years?",
    re.IGNORECASE,
)

# "age ≥ 18" or "age >= 18" without the word "years" (seen in NCT07007169).
# No negative lookahead — when bullets are joined into all_text, a word
# character following the number (e.g. "Age >= 18 Histologically...") would
# incorrectly block the match.
_AGE_GE_BARE = re.compile(
    r"age\s*(?:of\s*)?(?:≥|>=)\s*(\d+)",
    re.IGNORECASE,
)

# "Female, ≥ 50 years of age" — ≥/> followed by number then "years of age"
_AGE_GTE_OF_AGE = re.compile(
    r"(?:≥|>=)\s*(\d+)\s*years?\s+of\s+age",
    re.IGNORECASE,
)

# "≤ 65 years", "<= 65 years", "no more than 65 years", "up to 65"
_AGE_MAX = re.compile(
    r"(?:≤|<=|no\s+more\s+than|up\s+to|not\s+to\s+exceed|not\s+older\s+than)\s*(\d+)\s*years?",
    re.IGNORECASE,
)

# "age ≤ 70" without "years"
_AGE_LE_BARE = re.compile(
    r"age\s*(?:of\s*)?(?:≤|<=)\s*(\d+)",
    re.IGNORECASE,
)

# "18 years or older", "18 years of age or older"
_AGE_OR_OLDER = re.compile(
    r"(\d+)\s*years?\s*(?:of\s+age\s+)?or\s+older",
    re.IGNORECASE,
)

# "between 18 and 65 years", "18 to 65 years", "18-65 years", "18 ~ 70 years",
# "aged from 18 to 70" (no "years" word — NCT04790305 style).
# "years?" is optional because "Aged from 18 to 70." has no "years" at the end.
_AGE_RANGE = re.compile(
    r"(?:aged?\s+)?(?:from\s+)?(\d+)\s*(?:and|–|—|-|to|~)\s*(\d+)(?:\s*years?)?",
    re.IGNORECASE,
)

# "under 18 years", "younger than 18", "below 18"
_AGE_UNDER = re.compile(
    r"(?:under|younger\s+than|below|less\s+than)\s*(\d+)\s*years?",
    re.IGNORECASE,
)

# "adults only" → infer min_age=18
_ADULTS = re.compile(r"\badults?\b(?:\s+only)?\b", re.IGNORECASE)

# Parse the API's "18 Years" string
_API_AGE_STR = re.compile(r"(\d+)\s*years?", re.IGNORECASE)


# --- ECOG / Performance Status ---------------------------------------------
# All four spellings: ECOG, Eastern Cooperative Oncology Group, Zubrod, WHO PS.
# Zubrod and WHO are interchangeable with ECOG in oncology practice.
#
# The prefix must handle the two real-world orderings:
#   "ECOG (PS) performance status"  — parenthetical before "performance status"
#   "Eastern Cooperative Oncology Group (ECOG) performance status"  — same
# Using [^)]{1,20} for parentheticals avoids matching deeply nested parens.
_ECOG_PREFIX = (
    r"(?:ECOG|Eastern\s+Cooperative\s+Oncology\s+Group|Zubrod|WHO)"
    r"(?:\s*\([^)]{1,20}\))?"              # optional parenthetical e.g. "(ECOG)"
    r"(?:\s*(?:performance\s*)?(?:status|score|PS))?"  # optional "performance status"
    r"(?:\s*\([^)]{1,20}\))?"              # second optional parenthetical
    r"\s*"
)

# "ECOG ≤ 2", "ECOG PS ≤ 1"
_ECOG_MAX = re.compile(_ECOG_PREFIX + r"(?:of\s+)?(?:≤|<=)\s*(\d)", re.IGNORECASE)
# "ECOG 0-2", "ECOG 0 or 1", "ECOG 0 to 2"
_ECOG_RANGE = re.compile(_ECOG_PREFIX + r"(?:of\s+)?(\d)\s*(?:-|or|to)\s*(\d)", re.IGNORECASE)
# "ECOG 0, 1" — comma-separated list
_ECOG_COMMA = re.compile(_ECOG_PREFIX + r"(?:of\s+)?(\d)(?:\s*,\s*(\d))+", re.IGNORECASE)
# "ECOG performance status 2" — single bare number
_ECOG_BARE = re.compile(
    _ECOG_PREFIX + r"(?:of\s+)?(\d)(?!\s*(?:or|-|to|,))",
    re.IGNORECASE,
)


# --- Karnofsky -------------------------------------------------------------
_KARNOFSKY = re.compile(
    r"Karnofsky\s*(?:Performance\s*(?:Scale|Score|Status)|KPS|score)?"
    r"\s*(?:≥|>=|of\s+at\s+least)?\s*(\d{2,3})",
    re.IGNORECASE,
)


# --- Biomarkers ------------------------------------------------------------
# (pattern, normalized_label) — checked in order; ALL matching labels are kept
# for a single bullet (unlike ECOG where we stop at first match).
#
# ER+ pattern handles the slash-combined form "Estrogen-Receptor (ER)/Progesterone-
# Receptor (PR) positive" — the optional middle section consumes "/PR..." so that
# "positive" at the end still ties back to the initial ER mention.
#
# HER2- pattern adds "\bHER2?\)\s*negative" to match "(HER2) negative" where the
# full name is spelled out and HER2 appears only as an abbreviation in parens.
_BIOMARKER_PATTERNS: list[tuple[re.Pattern, str]] = [
    (re.compile(r"triple[-\s]?negative\s+breast\s+cancer|TNBC\b", re.I), "TNBC"),
    (re.compile(r"HER2?[-\s]?positive|HER2?\+|HER-2\s*positive|HER2?/neu\s*positive", re.I), "HER2+"),
    # "(HER2) negative" — full name spelled out, abbreviation in parens
    (re.compile(r"HER2?[-\s]?negative|HER-2\s*negative|\bHER2?\)\s*(?:is\s+)?negative", re.I), "HER2-"),
    # ER/PR slash notation: "Estrogen-Receptor (ER)/Progesterone-Receptor (PR) positive"
    (re.compile(
        r"(?:Estrogen[-\s]?Receptor|ER)\s*(?:\([^)]*\))?\s*"
        r"(?:/\s*(?:Progesterone[-\s]?Receptor|PR)\s*(?:\([^)]*\))?\s*)?"
        r"(?:positive|\+)\b",
        re.I,
    ), "ER+"),
    (re.compile(r"(?:Estrogen[-\s]?Receptor|ER)\s*(?:\([^)]*\))?\s*(?:negative|-)\b", re.I), "ER-"),
    (re.compile(r"(?:Progesterone[-\s]?Receptor|PR)\s*(?:\([^)]*\))?\s*(?:positive|\+)\b", re.I), "PR+"),
    (re.compile(r"(?:Progesterone[-\s]?Receptor|PR)\s*(?:\([^)]*\))?\s*(?:negative|-)\b", re.I), "PR-"),
    (re.compile(r"BRCA[12]?\s*(?:mutant|mutation|positive|variant)\b", re.I), "BRCA_mutation"),
    (re.compile(r"KRAS\s*(?:wild[-\s]?type|wt)\b", re.I), "KRAS_wt"),
    (re.compile(r"KRAS\s*(?:mutant|mutation|G12[A-Z]?)\b", re.I), "KRAS_mutation"),
    (re.compile(r"ALK[-\s]?(?:positive|rearrangement|fusion|translocation)\b|ALK\+", re.I), "ALK+"),
    (re.compile(r"EGFR\s*(?:mutation|mutant|positive|exon|activating)\b", re.I), "EGFR_mutation"),
    (re.compile(r"PD[-\s]?L1\s*(?:expression\s*)?(?:positive|high|≥|>=)\b", re.I), "PD-L1+"),
    (re.compile(r"microsatellite\s*instability[-\s]?high|MSI[-\s]?H\b", re.I), "MSI-H"),
    (re.compile(r"mismatch\s*repair[-\s]?deficient|MMR[-\s]?d\b|dMMR\b", re.I), "dMMR"),
]


# --- Lab values ------------------------------------------------------------
_KNOWN_LABS = (
    "eGFR|GFR|HbA1c|hemoglobin|Hgb|platelet|ANC|WBC|ALT|AST|bilirubin|"
    "creatinine|albumin|glucose|INR|PTT|LDH|PSA|troponin|calcium|potassium|sodium"
)
_LAB_VALUE = re.compile(
    rf"(?P<marker>{_KNOWN_LABS})"
    r"\s*"
    r"(?P<op>[≥≤><]=?)"
    r"\s*"
    r"(?P<val>\d+(?:\.\d+)?)"
    r"(?!\s*[×xX]\s*ULN)"          # skip "1.5 × ULN" — can't evaluate without ref range
    r"\s*(?P<unit>[a-zA-Z%µ/]+"
    r"(?:[\s/][a-zA-Z]+)?)?",
    re.IGNORECASE,
)
_OP_NORMALIZE = {"≥": ">=", "≤": "<="}


# --- Medications -----------------------------------------------------------
_MEDICATION = re.compile(
    r"(?:prior\s+)?(?:treatment|therapy|chemotherapy|radiation|radiotherapy|"
    r"hormone\s+therapy|immunotherapy|anthracycline|trastuzumab|pertuzumab|"
    r"bevacizumab|pembrolizumab|nivolumab|paclitaxel|cisplatin|carboplatin|"
    r"docetaxel|capecitabine|tamoxifen|letrozole|aromatase\s+inhibitor|"
    r"beta[-\s]?blocker|ACE\s+inhibitor|ARB|steroid|corticosteroid)",
    re.IGNORECASE,
)


# --- Sex -------------------------------------------------------------------
_SEX_FEMALE = re.compile(r"\b(?:female|women?|girls?)\b", re.IGNORECASE)
_SEX_MALE = re.compile(r"\b(?:male|men|boys?)\b", re.IGNORECASE)


# ===========================================================================
# Parser
# ===========================================================================

class EligibilityCriteriaParser:
    """
    Parses raw eligibility criteria text into a ParsedEligibility object.

    Accepts optional API-structured fields (sex, min/max age) which are used
    as primary sources; text extraction is used when those are None.

    >>> parser = EligibilityCriteriaParser()
    >>> result = parser.parse("Inclusion Criteria:\\n* Age >= 18 years\\n\\nExclusion Criteria:\\n* Prior chemotherapy")
    >>> result.age.min_age
    18
    """

    def parse(
        self,
        raw_text: str,
        *,
        sex_from_api: Optional[str] = None,
        min_age_from_api: Optional[str] = None,
        max_age_from_api: Optional[str] = None,
    ) -> ParsedEligibility:
        if not raw_text or not raw_text.strip():
            return ParsedEligibility()

        inclusion_text, exclusion_text = self._split_sections(raw_text)
        inc_bullets = self._extract_bullets(inclusion_text)
        exc_bullets = self._extract_bullets(exclusion_text)

        age = self._parse_age(inc_bullets, min_age_from_api, max_age_from_api)
        sex = self._parse_sex(inc_bullets, sex_from_api)
        ecog_max = self._parse_ecog(inc_bullets)
        karnofsky_min = self._parse_karnofsky(inc_bullets)
        required_biomarkers = self._parse_biomarkers(inc_bullets)
        lab_values = self._parse_lab_values(inc_bullets)
        medication_requirements = self._parse_medication_requirements(inc_bullets)
        exclusion_flags = self._parse_exclusion_flags(exc_bullets)
        medication_exclusions = self._parse_medication_exclusions(exc_bullets)
        required_diagnoses = self._parse_diagnoses(inc_bullets)

        raw_unstructured = [
            b for b in inc_bullets + exc_bullets
            if not self._is_structured(b)
        ]

        return ParsedEligibility(
            inclusion_bullets=inc_bullets,
            exclusion_bullets=exc_bullets,
            age=age,
            sex=sex,
            required_diagnoses=required_diagnoses,
            required_biomarkers=required_biomarkers,
            ecog_max=ecog_max,
            karnofsky_min=karnofsky_min,
            lab_values=lab_values,
            exclusion_flags=exclusion_flags,
            medication_requirements=medication_requirements,
            medication_exclusions=medication_exclusions,
            raw_unstructured=raw_unstructured,
        )

    # -----------------------------------------------------------------------
    # Section splitting
    # -----------------------------------------------------------------------

    def _split_sections(self, text: str) -> tuple[str, str]:
        """
        Split raw criteria text into (inclusion_section, exclusion_section).

        Handles reversed order, missing headers, and the common case where
        the entire block is just inclusion criteria with no header at all.
        """
        inc_m = _INCLUSION_HDR.search(text)
        exc_m = _EXCLUSION_HDR.search(text)

        if inc_m and exc_m:
            if inc_m.start() < exc_m.start():
                return text[inc_m.end(): exc_m.start()], text[exc_m.end():]
            else:
                # Reversed (unusual)
                return text[inc_m.end():], text[exc_m.end(): inc_m.start()]

        if inc_m and not exc_m:
            return text[inc_m.end():], ""

        if exc_m and not inc_m:
            # Some trials list only an exclusion section; text before header is inclusion.
            return text[: exc_m.start()], text[exc_m.end():]

        # No headers at all → treat everything as inclusion.
        return text, ""

    # -----------------------------------------------------------------------
    # Bullet extraction
    # -----------------------------------------------------------------------

    def _extract_bullets(self, text: str) -> list[str]:
        """
        Extract individual criterion strings from a section of raw text.

        Two modes:
        - Bulleted text (has *, -, •, or numbered lines): parse bullet markers.
        - Plain text (no bullet markers): treat each non-empty line as one criterion.
          This handles inclusion text like "Patients must be 18 years of age or older."
          that precedes an "Exclusion Criteria:" header with no bullet formatting.
        """
        if not text.strip():
            return []

        # Fall back to line-per-criterion when the section has no bullet markers.
        if not _BULLET_START.search(text):
            return [
                line.strip()
                for line in text.splitlines()
                if line.strip() and len(line.strip()) >= 5
            ]

        bullets: list[str] = []
        current_parts: list[str] = []

        for line in text.splitlines():
            stripped = line.strip()

            if not stripped:
                if current_parts:
                    bullets.append(" ".join(current_parts))
                    current_parts = []
                continue

            if _BULLET_START.match(line):
                if current_parts:
                    bullets.append(" ".join(current_parts))
                content = _BULLET_START.sub("", line, count=1).strip()
                if content:
                    current_parts = [content]
                else:
                    current_parts = []
            else:
                # Continuation of the previous bullet.
                if current_parts:
                    current_parts.append(stripped)

        if current_parts:
            bullets.append(" ".join(current_parts))

        # ≥ 5 chars: enough to skip "OR"/"AND" noise but keeps "Age ≥ 18" (8 chars)
        return [b for b in bullets if len(b) >= 5]

    # -----------------------------------------------------------------------
    # Age
    # -----------------------------------------------------------------------

    def _parse_age(
        self,
        bullets: list[str],
        min_age_str: Optional[str],
        max_age_str: Optional[str],
    ) -> AgeConstraint:
        """
        Returns the trial's age constraint.

        Priority: API-structured minimumAge / maximumAge fields first.
        Falls back to text extraction for whichever field is missing (~15% of trials).
        """
        min_age = self._parse_api_age_str(min_age_str)
        max_age = self._parse_api_age_str(max_age_str)

        all_text = " ".join(bullets)

        if min_age is None:
            min_age = self._extract_min_age(all_text)
        if max_age is None:
            max_age = self._extract_max_age(all_text)

        return AgeConstraint(min_age=min_age, max_age=max_age)

    @staticmethod
    def _parse_api_age_str(s: Optional[str]) -> Optional[int]:
        """Convert "18 Years" → 18. Returns None for "N/A" or None input."""
        if not s:
            return None
        m = _API_AGE_STR.search(s)
        return int(m.group(1)) if m else None

    @staticmethod
    def _extract_min_age(text: str) -> Optional[int]:
        for pattern in (_AGE_MIN, _AGE_GTE_OF_AGE, _AGE_GE_BARE, _AGE_OR_OLDER):
            m = pattern.search(text)
            if m:
                return int(m.group(1))
        # Range pattern: first number is the min
        m = _AGE_RANGE.search(text)
        if m:
            return int(m.group(1))
        if _ADULTS.search(text):
            return 18
        return None

    @staticmethod
    def _extract_max_age(text: str) -> Optional[int]:
        for pattern in (_AGE_MAX, _AGE_LE_BARE):
            m = pattern.search(text)
            if m:
                return int(m.group(1))
        m = _AGE_UNDER.search(text)
        if m:
            return int(m.group(1)) - 1
        # Range pattern: second number is the max
        m = _AGE_RANGE.search(text)
        if m:
            return int(m.group(2))
        return None

    # -----------------------------------------------------------------------
    # Sex
    # -----------------------------------------------------------------------

    def _parse_sex(
        self, bullets: list[str], sex_from_api: Optional[str]
    ) -> Optional[str]:
        """
        API field takes priority. Falls back to text scan only when API value
        is "ALL" (meaning all-genders / unspecified).
        """
        if sex_from_api and sex_from_api.upper() != "ALL":
            return sex_from_api.lower()

        all_text = " ".join(bullets)
        has_female = bool(_SEX_FEMALE.search(all_text))
        has_male = bool(_SEX_MALE.search(all_text))

        if has_female and has_male:
            return "all"
        if has_female:
            return "female"
        if has_male:
            return "male"
        return sex_from_api.lower() if sex_from_api else None

    # -----------------------------------------------------------------------
    # ECOG / Performance status
    # -----------------------------------------------------------------------

    def _parse_ecog(self, bullets: list[str]) -> Optional[int]:
        """
        Extract the maximum allowed ECOG score from inclusion criteria.

        Recognizes ECOG, Eastern Cooperative Oncology Group, Zubrod, and WHO PS —
        all refer to the same 0–4 scale in oncology trials.
        """
        for bullet in bullets:
            m = _ECOG_MAX.search(bullet)
            if m:
                return int(m.group(1))

            m = _ECOG_RANGE.search(bullet)
            if m:
                return int(m.group(2))   # second number is the max of the range

            m = _ECOG_COMMA.search(bullet)
            if m:
                nums = re.findall(r"\d", m.group(0))
                return max(int(n) for n in nums)

            m = _ECOG_BARE.search(bullet)
            if m:
                return int(m.group(1))

        return None

    # -----------------------------------------------------------------------
    # Karnofsky
    # -----------------------------------------------------------------------

    @staticmethod
    def _parse_karnofsky(bullets: list[str]) -> Optional[int]:
        for bullet in bullets:
            m = _KARNOFSKY.search(bullet)
            if m:
                return int(m.group(1))
        return None

    # -----------------------------------------------------------------------
    # Biomarkers
    # -----------------------------------------------------------------------

    @staticmethod
    def _parse_biomarkers(bullets: list[str]) -> list[str]:
        """
        All matching biomarker labels are collected per bullet (unlike ECOG
        where we stop at first match). This handles "ER/PR positive and HER2 negative"
        in one bullet yielding three labels: ER+, PR+, HER2-.
        """
        found: list[str] = []
        seen: set[str] = set()
        for bullet in bullets:
            for pattern, label in _BIOMARKER_PATTERNS:
                if label not in seen and pattern.search(bullet):
                    found.append(label)
                    seen.add(label)
        return found

    # -----------------------------------------------------------------------
    # Lab values
    # -----------------------------------------------------------------------

    @staticmethod
    def _parse_lab_values(bullets: list[str]) -> list[LabValue]:
        results: list[LabValue] = []
        for bullet in bullets:
            for m in _LAB_VALUE.finditer(bullet):
                op = _OP_NORMALIZE.get(m.group("op"), m.group("op"))
                unit = (m.group("unit") or "").strip() or None
                results.append(
                    LabValue(
                        marker=m.group("marker"),
                        operator=op,
                        value=float(m.group("val")),
                        unit=unit,
                    )
                )
        return results

    # -----------------------------------------------------------------------
    # Medications
    # -----------------------------------------------------------------------

    @staticmethod
    def _parse_medication_requirements(bullets: list[str]) -> list[str]:
        """Extract treatments the patient MUST be on (inclusion side)."""
        reqs: list[str] = []
        for bullet in bullets:
            if re.search(
                r"(?:currently\s+(?:receiving|taking|on)|must\s+be\s+(?:receiving|on|taking))",
                bullet,
                re.IGNORECASE,
            ):
                m = _MEDICATION.search(bullet)
                if m:
                    reqs.append(m.group(0).strip().lower())
        return reqs

    @staticmethod
    def _parse_medication_exclusions(bullets: list[str]) -> list[str]:
        """Extract medications/treatments that disqualify the patient (exclusion side)."""
        return [
            m.group(0).strip().lower()
            for bullet in bullets
            if (m := _MEDICATION.search(bullet))
        ]

    # -----------------------------------------------------------------------
    # Exclusion flags
    # -----------------------------------------------------------------------

    @staticmethod
    def _parse_exclusion_flags(bullets: list[str]) -> list[str]:
        """
        All exclusion-section bullets are potential hard disqualifiers.
        Truncated to 120 chars for readability in the UI match card.
        """
        return [b[:120] for b in bullets]

    # -----------------------------------------------------------------------
    # Diagnoses
    # -----------------------------------------------------------------------

    def _parse_diagnoses(self, bullets: list[str]) -> list[str]:
        """
        Extract known oncology/disease condition mentions from inclusion criteria.
        en_core_web_sm has no medical NER types, so we use a regex list for
        the most common conditions. Unrecognized conditions go to raw_unstructured.
        """
        known_conditions = re.compile(
            r"(?:breast\s+cancer|lung\s+cancer|NSCLC|melanoma|leukemia|lymphoma|"
            r"myeloma|glioblastoma|colorectal\s+cancer|prostate\s+cancer|"
            r"ovarian\s+cancer|pancreatic\s+cancer|hepatocellular\s+carcinoma|"
            r"renal\s+cell\s+carcinoma|gastric\s+cancer|bladder\s+cancer|"
            r"type\s+[12]\s+diabetes|heart\s+failure|COPD|Alzheimer)",
            re.IGNORECASE,
        )
        found: list[str] = []
        seen: set[str] = set()
        for bullet in bullets:
            for m in known_conditions.finditer(bullet):
                label = m.group(0).strip().lower()
                if label not in seen:
                    found.append(label)
                    seen.add(label)
        return found

    # -----------------------------------------------------------------------
    # Structured-ness check
    # -----------------------------------------------------------------------

    def _is_structured(self, text: str) -> bool:
        """
        Returns True if this bullet triggered at least one extraction pattern.
        Bullets returning False go into raw_unstructured for the embedding scorer.
        """
        if _AGE_MIN.search(text): return True
        if _AGE_GE_BARE.search(text): return True
        if _AGE_GTE_OF_AGE.search(text): return True
        if _AGE_MAX.search(text): return True
        if _AGE_LE_BARE.search(text): return True
        if _AGE_OR_OLDER.search(text): return True
        if _AGE_RANGE.search(text): return True
        if _AGE_UNDER.search(text): return True
        if _ADULTS.search(text): return True
        if _ECOG_MAX.search(text): return True
        if _ECOG_RANGE.search(text): return True
        if _ECOG_COMMA.search(text): return True
        if _ECOG_BARE.search(text): return True
        if _KARNOFSKY.search(text): return True
        if any(pat.search(text) for pat, _ in _BIOMARKER_PATTERNS): return True
        if _LAB_VALUE.search(text): return True
        if _MEDICATION.search(text): return True
        return False
