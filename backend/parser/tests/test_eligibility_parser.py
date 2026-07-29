"""
Unit tests for EligibilityCriteriaParser.

All eligibility strings below are sampled verbatim (or lightly trimmed) from
real clinicaltrials.gov listings. They are hardcoded so tests never depend on
the network and results are reproducible.

Sources used:
  NCT03418961 — Metastatic HER2+ Breast Cancer / Cardiac Toxicity
  NCT04790305 — Triple-Negative Breast Cancer / Huaier Granule
  NCT07007169 — Mediterranean Diet / Early Breast Cancer
  NCT04360330 — Early Breast Cancer / ER+PR+ / ECOG 0,1
  NCT04778839 — Advanced Solid Tumors (ECOG 0-2, age 18~70)
"""

import pytest
from backend.parser.eligibility_parser import EligibilityCriteriaParser
from backend.parser.models import ParsedEligibility

parser = EligibilityCriteriaParser()


# ===========================================================================
# 1. Section splitting
# ===========================================================================

STANDARD_CRITERIA = """Inclusion Criteria:

* Age >= 18 years
* ECOG performance status <= 2

Exclusion Criteria:

* Prior chemotherapy within 6 months
* Active CNS metastases"""

CRITERIA_NO_HEADERS = """
* Age >= 18 years
* ECOG performance status <= 2
* No prior anthracycline exposure
"""

CRITERIA_ONLY_EXCLUSION_HEADER = """
Patients must be 18 years of age or older.

Exclusion Criteria:

* Prior use of trastuzumab
* History of cardiac disease
"""


def test_split_standard_both_headers():
    result = parser.parse(STANDARD_CRITERIA)
    assert len(result.inclusion_bullets) >= 2
    assert len(result.exclusion_bullets) >= 2


def test_split_no_headers_all_goes_to_inclusion():
    result = parser.parse(CRITERIA_NO_HEADERS)
    assert len(result.inclusion_bullets) >= 1
    assert result.exclusion_bullets == []


def test_split_only_exclusion_header():
    result = parser.parse(CRITERIA_ONLY_EXCLUSION_HEADER)
    assert len(result.exclusion_bullets) >= 2
    # Inclusion text before the header should still be captured somewhere
    assert result.age.min_age == 18 or result.inclusion_bullets != []


# ===========================================================================
# 2. Age extraction — various real phrasings
# ===========================================================================

def test_age_gte_with_years():
    """'Age >= 18 years' — most common form."""
    result = parser.parse("Inclusion Criteria:\n* Age >= 18 years\n\nExclusion Criteria:\n* foo")
    assert result.age.min_age == 18


def test_age_unicode_gte():
    """'Age ≥ 18 years' — Unicode ≥ sign common in copy-pasted PDFs."""
    result = parser.parse("Inclusion Criteria:\n* Age ≥ 18 years\n\nExclusion Criteria:\n* foo")
    assert result.age.min_age == 18


def test_age_gte_bare_no_years_word():
    """'Age ≥ 18' without the word 'years' — seen in NCT07007169."""
    result = parser.parse("Inclusion Criteria:\n2. Age ≥ 18\n\nExclusion Criteria:\n* foo")
    assert result.age.min_age == 18


def test_age_range_to():
    """'Aged from 18 to 70' — NCT04790305 style."""
    result = parser.parse("Inclusion Criteria:\n1. Aged from 18 to 70.\n\nExclusion Criteria:\n* foo")
    assert result.age.min_age == 18
    assert result.age.max_age == 70


def test_age_range_tilde():
    """'aged 18 ~ 70 years' — tilde range separator, NCT04778839 style."""
    result = parser.parse("Inclusion Criteria:\n* Male or female patient, aged 18 ~ 70 years.\n\nExclusion Criteria:\n* foo")
    assert result.age.min_age == 18
    assert result.age.max_age == 70


def test_age_or_older():
    """'18 years of age or older' — very common phrasing."""
    result = parser.parse("Inclusion Criteria:\n* Patients must be 18 years of age or older.\n\nExclusion Criteria:\n* foo")
    assert result.age.min_age == 18


def test_age_female_with_age():
    """'Female, >= 50 years of age' — NCT04360330: sex and age combined in one bullet."""
    result = parser.parse("Inclusion Criteria:\n1. Female, >= 50 years of age.\n\nExclusion Criteria:\n* foo")
    assert result.age.min_age == 50
    assert result.sex == "female"


def test_age_from_api_takes_priority():
    """API-provided minimumAge takes priority over text when both present."""
    result = parser.parse(
        "Inclusion Criteria:\n* Age ≥ 21 years\n\nExclusion Criteria:\n* foo",
        min_age_from_api="18 Years",
    )
    assert result.age.min_age == 18  # API wins


# ===========================================================================
# 3. ECOG / Performance status
# ===========================================================================

def test_ecog_lte_unicode():
    """'ECOG performance status ≤ 2' — NCT04790305."""
    result = parser.parse("Inclusion Criteria:\n7. Eastern Cooperative Oncology Group performance status (ECOG PS) ≤ 1.\n\nExclusion Criteria:\n* foo")
    assert result.ecog_max == 1


def test_ecog_range_dash():
    """'ECOG performance status of 0-2' — NCT04778839."""
    result = parser.parse("Inclusion Criteria:\n* Eastern Cooperative Oncology Group (ECOG) performance status of 0-2.\n\nExclusion Criteria:\n* foo")
    assert result.ecog_max == 2


def test_ecog_range_or():
    """'ECOG 0 or 1' — common form."""
    result = parser.parse("Inclusion Criteria:\n* ECOG performance status of 0 or 1.\n\nExclusion Criteria:\n* foo")
    assert result.ecog_max == 1


def test_ecog_comma_separated():
    """'ECOG 0, 1' — NCT04360330 style."""
    result = parser.parse("Inclusion Criteria:\n7. Eastern Cooperative Oncology Group (ECOG) 0, 1.\n\nExclusion Criteria:\n* foo")
    assert result.ecog_max == 1


def test_ecog_who_alias():
    """'WHO performance status 0 or 1' — NCT07007169: WHO is a recognized ECOG alias."""
    result = parser.parse("Inclusion Criteria:\n4. Good performance status (WHO performance status 0 or 1).\n\nExclusion Criteria:\n* foo")
    assert result.ecog_max == 1


def test_ecog_zubrod_alias():
    """'Zubrod Performance status of 0-2' — NCT03418961 style."""
    result = parser.parse("Inclusion Criteria:\n* Patients must have a Zubrod Performance status of 0-2\n\nExclusion Criteria:\n* foo")
    assert result.ecog_max == 2


def test_karnofsky_extraction():
    result = parser.parse("Inclusion Criteria:\n* Karnofsky Performance Score >= 70\n\nExclusion Criteria:\n* foo")
    assert result.karnofsky_min == 70


# ===========================================================================
# 4. Biomarkers
# ===========================================================================

def test_biomarker_her2_positive():
    result = parser.parse("Inclusion Criteria:\n* HER2-positive breast cancer\n\nExclusion Criteria:\n* foo")
    assert "HER2+" in result.required_biomarkers


def test_biomarker_tnbc():
    """'Triple-negative breast cancer' — NCT04790305."""
    result = parser.parse("Inclusion Criteria:\n* Molecular typing of breast lesions is triple-negative breast cancer.\n\nExclusion Criteria:\n* foo")
    assert "TNBC" in result.required_biomarkers


def test_biomarker_er_pr_her2_combined():
    """
    'Estrogen-Receptor (ER)/Progesterone-Receptor (PR) positive and HER2 negative'
    — NCT04360330: three biomarkers in one bullet.
    """
    bullet = (
        "Receptor status: Estrogen-Receptor (ER)/Progesterone-Receptor (PR) positive "
        "and Human Epidermal Growth Factor Receptor 2 (HER2) negative."
    )
    result = parser.parse(f"Inclusion Criteria:\n* {bullet}\n\nExclusion Criteria:\n* foo")
    assert "ER+" in result.required_biomarkers
    assert "PR+" in result.required_biomarkers
    assert "HER2-" in result.required_biomarkers


# ===========================================================================
# 5. Lab values
# ===========================================================================

def test_lab_egfr():
    result = parser.parse("Inclusion Criteria:\n* eGFR >= 60 mL/min\n\nExclusion Criteria:\n* foo")
    labs = {lv.marker.lower(): lv for lv in result.lab_values}
    assert "egfr" in labs
    assert labs["egfr"].operator == ">="
    assert labs["egfr"].value == 60.0


def test_lab_hba1c():
    result = parser.parse("Inclusion Criteria:\n* HbA1c < 10%\n\nExclusion Criteria:\n* foo")
    labs = {lv.marker: lv for lv in result.lab_values}
    assert "HbA1c" in labs
    assert labs["HbA1c"].operator == "<"
    assert labs["HbA1c"].value == 10.0


def test_lab_xULN_not_captured():
    """
    'creatinine ≤ 1.5 × ULN' cannot be evaluated without a reference range —
    we must NOT emit a LabValue for it (the × ULN check prevents this).
    """
    result = parser.parse(
        "Inclusion Criteria:\n* serum creatinine level ≤ 1.5 × ULN\n\nExclusion Criteria:\n* foo"
    )
    markers = [lv.marker.lower() for lv in result.lab_values]
    assert "creatinine" not in markers


# ===========================================================================
# 6. Exclusion flags & medications
# ===========================================================================

def test_exclusion_flags_captured():
    result = parser.parse(STANDARD_CRITERIA)
    assert len(result.exclusion_flags) >= 2


def test_medication_exclusion_trastuzumab():
    result = parser.parse(
        "Inclusion Criteria:\n* Age >= 18\n\nExclusion Criteria:\n* Prior use of trastuzumab"
    )
    assert any("trastuzumab" in e.lower() for e in result.medication_exclusions)


# ===========================================================================
# 7. raw_unstructured — catch-all for embedding scorer
# ===========================================================================

def test_raw_unstructured_captures_unclaimed():
    """Bullets with no pattern match must land in raw_unstructured."""
    result = parser.parse(
        "Inclusion Criteria:\n"
        "* Signed written informed consent\n"
        "* Willingness to undergo study-related procedures\n"
        "\nExclusion Criteria:\n"
        "* foo"
    )
    # Neither bullet matches any structured pattern
    assert len(result.raw_unstructured) >= 2


def test_age_bullet_not_in_raw_unstructured():
    """An age bullet should be claimed and NOT appear in raw_unstructured."""
    result = parser.parse(
        "Inclusion Criteria:\n* Age >= 18 years\n\nExclusion Criteria:\n* foo"
    )
    assert not any("Age >= 18" in u for u in result.raw_unstructured)


# ===========================================================================
# 8. Full parse on real trial text (NCT07007169 excerpt)
# ===========================================================================

NCT07007169_TEXT = """Inclusion Criteria:

1. Signed written informed consent approved by the Ethical Review Board.
2. Age >= 18
3. Histologically confirmed unilateral adenocarcinoma of the breast, stage I-III.
4. Good performance status (WHO performance status 0 or 1).
5. Willingness by the patient to undergo treatment and study-related procedures according to the protocol.

Exclusion Criteria:

1. Clinical or radiological signs of metastatic disease.
2. History of other malignancy within the last 5 years, except for carcinoma in situ of the cervix or non-melanoma skin cancer.
3. Prior chemotherapy or radiation therapy for this condition.
"""


def test_full_parse_nct07007169():
    result = parser.parse(NCT07007169_TEXT)
    assert result.age.min_age == 18
    assert result.ecog_max == 1
    assert len(result.inclusion_bullets) >= 4
    assert len(result.exclusion_bullets) >= 3
    assert isinstance(result, ParsedEligibility)
