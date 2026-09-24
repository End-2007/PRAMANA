"""Mutation tests -- attack the gate, not just the document.

A mechanised check nobody has tried to break is still only a claim. So each test here
plants exactly one violation, runs the check, and asserts it fired **for the stated
reason**. A gate that fails for the wrong reason is a gate that will pass for the wrong
reason later.

The inverse matters as much: a control asserts the unmutated input passes, which is
what distinguishes "the gate said BUILD PASS" from "the gate ran".
"""

from __future__ import annotations

import copy
import json
from pathlib import Path

import pytest

from pramana.report.validator import validate_object

ROOT = Path(__file__).resolve().parent.parent


@pytest.fixture(scope="module")
def report() -> dict:
    """A real emitted report. Generated if absent, so the suite runs from a cold clone."""
    path = ROOT / "out" / "report.json"
    if not path.exists():
        from pramana.demo import run

        run(ROOT / "out", quiet=True)
    return json.loads(path.read_text(encoding="utf-8"))


def _rules(obj: dict) -> set[str]:
    return {v.rule for v in validate_object(obj).violations}


# ---------------------------------------------------------------------------
# Control
# ---------------------------------------------------------------------------


def test_control_unmutated_report_passes(report: dict) -> None:
    """The control. Without this, every test below could be passing vacuously."""
    result = validate_object(copy.deepcopy(report))
    assert result.ok, f"the unmutated report already fails: {result.violations}"
    assert result.pairs_checked >= 6, (
        f"only {result.pairs_checked} comparator pairs were reached. A mutation test "
        f"over checks that never ran proves nothing."
    )


# ---------------------------------------------------------------------------
# PAIR 1 -- detection p beside its floor
# ---------------------------------------------------------------------------


def test_mutation_p_below_floor(report: dict) -> None:
    m = copy.deepcopy(report)
    m["precision_ladder"]["fingerprint_divergence"][0]["detection_p"] = 0.0007
    assert "PAIR_1_detection_p_floor" in _rules(m), (
        "a p-value finer than 64 null models can resolve was accepted"
    )


def test_mutation_floor_flag_lies(report: dict) -> None:
    m = copy.deepcopy(report)
    fd = m["precision_ladder"]["fingerprint_divergence"][0]
    fd["detection_p_is_floor"] = not fd["detection_p_is_floor"]
    assert "PAIR_1_detection_p_floor" in _rules(m)


# ---------------------------------------------------------------------------
# PAIR 2 -- localisation p beside its BH critical value
# ---------------------------------------------------------------------------


def test_mutation_bh_critical_value_wrong(report: dict) -> None:
    m = copy.deepcopy(report)
    m["findings"].append(
        {
            "statistic": {
                "name": "perturbation_norm_p_pooled",
                "value": 0.00073,
                "bh_classes_tested": 43,
                "fdr": 0.05,
                "bh_critical_value_at_rank_1": 0.05,  # should be 0.05/43
                "bh_rejects": True,
            }
        }
    )
    assert "PAIR_2_localisation_bh" in _rules(m)


def test_mutation_localisation_p_without_critical_value(report: dict) -> None:
    m = copy.deepcopy(report)
    m["findings"].append(
        {"statistic": {"name": "perturbation_norm_p_pooled", "value": 0.00073, "bh_classes_tested": 43}}
    )
    assert "PAIR_2_localisation_bh" in _rules(m)


# ---------------------------------------------------------------------------
# PAIR 3 -- coverage counts beside sum_check
# ---------------------------------------------------------------------------


def test_mutation_coverage_counts_do_not_reconcile(report: dict) -> None:
    m = copy.deepcopy(report)
    m["coverage"]["assessed"] += 1
    assert "PAIR_3_coverage_sum" in _rules(m), (
        "a class went unenumerated and the sum still checked -- the exact failure G5 exists to stop"
    )


def test_mutation_coverage_sum_check_removed(report: dict) -> None:
    m = copy.deepcopy(report)
    del m["coverage"]["sum_check"]
    assert "PAIR_3_coverage_sum" in _rules(m)


# ---------------------------------------------------------------------------
# PAIR 4 -- e-value beside its e-BH threshold
# ---------------------------------------------------------------------------


def test_mutation_evalue_threshold_wrong(report: dict) -> None:
    m = copy.deepcopy(report)
    m["findings"].append(
        {
            "statistic": {
                "name": "e_value_merged",
                "value": 312.0,
                "sources_tested": 12,
                "fdr": 0.05,
                "ebh_threshold_at_k1": 12.0,  # should be 12/(0.05*1) = 240
                "merging_function": "weighted_arithmetic_mean",
            }
        }
    )
    assert "PAIR_4_evalue_threshold" in _rules(m)


def test_mutation_evalues_merged_by_product(report: dict) -> None:
    """The error that is invisible in the output.

    Under arbitrary dependence the product of e-values is invalid, and four detectors
    on one shard are not independent. Nothing about the resulting number looks wrong.
    """
    m = copy.deepcopy(report)
    m["findings"].append(
        {
            "statistic": {
                "name": "e_value_merged",
                "value": 312.0,
                "sources_tested": 12,
                "fdr": 0.05,
                "ebh_threshold_at_k1": 240.0,
                "merging_function": "product",
            }
        }
    )
    assert "PAIR_4_evalue_threshold" in _rules(m)


# ---------------------------------------------------------------------------
# PAIR 5 -- transfer delta beside its ceiling
# ---------------------------------------------------------------------------


def test_mutation_alpha_tail_without_resolution_label(report: dict) -> None:
    m = copy.deepcopy(report)
    delta = m["null_calibration"]["null_family_transfer_delta"]
    del delta["quantile_resolution"]
    assert "PAIR_5_transfer_ceiling" in _rules(m), (
        "an alpha-tail shift at n=32 was quoted with no resolution label"
    )


def test_mutation_delta_without_bootstrap_interval(report: dict) -> None:
    m = copy.deepcopy(report)
    del m["null_calibration"]["null_corpus_transfer_delta"]["bootstrap_ci_median_shift"]
    assert "PAIR_5_transfer_ceiling" in _rules(m)


# ---------------------------------------------------------------------------
# PAIR 6 -- certified k beside the volume share those k lots hold
# ---------------------------------------------------------------------------


def test_mutation_k_without_volume_inequality(report: dict) -> None:
    m = copy.deepcopy(report)
    m["supplier_concentration_measurement"]["volume_inequality"] = None
    assert "PAIR_6_k_volume_share" in _rules(m), (
        "k was quoted with no volume share beside it -- 3 of 12 lots can be half the corpus"
    )


def test_mutation_k_without_surrogate_gap(report: dict) -> None:
    m = copy.deepcopy(report)
    m["supplier_concentration_measurement"]["surrogate_gap_top1"] = None
    assert "PAIR_6_k_volume_share" in _rules(m)


def test_mutation_k_without_certified_fraction(report: dict) -> None:
    m = copy.deepcopy(report)
    m["supplier_concentration_measurement"]["certified_fraction_at_k"] = None
    assert "PAIR_6_k_volume_share" in _rules(m)


def test_mutation_scope_claims_the_delivered_model(report: dict) -> None:
    """The composition error: the floor is never a property of the artefact that ships."""
    m = copy.deepcopy(report)
    m["supplier_concentration_measurement"]["scope"] = "delivered_model"
    assert "PAIR_6_k_volume_share" in _rules(m)


def test_mutation_degenerate_scope_still_issues_a_count(report: dict) -> None:
    m = copy.deepcopy(report)
    sc = m["supplier_concentration_measurement"]
    sc["volume_inequality"]["lot_volume_shares"] = {"lot-00": 0.76, "lot-01": 0.14, "lot-02": 0.10}
    sc["volume_inequality"]["shares_sum_check"] = 1.0
    assert "PAIR_6_k_volume_share" in _rules(m), (
        "a certificate was issued over a corpus whose largest lot exceeds half"
    )


# ---------------------------------------------------------------------------
# Structural rules
# ---------------------------------------------------------------------------


def test_mutation_point_attribution_without_causal_verification(report: dict) -> None:
    """A set of size one is not a point attribution. It is a set of size one."""
    m = copy.deepcopy(report)
    m["findings"].append(
        {
            "attribution_mode": "point",
            "attribution_set_size": 1,
            "evidence_strength": "corroborated",
        }
    )
    assert "RULE_point_attribution" in _rules(m)


def test_mutation_unfaithful_surrogate_still_ran_reversal(report: dict) -> None:
    m = copy.deepcopy(report)
    m["findings"].append(
        {
            "surrogate": {
                "surrogate_exact_agreement": 0.71,
                "surrogate_exact_agreement_floor": 0.99,
                "evidence_ran_on": "delivered_int8_binary",
            }
        }
    )
    assert "RULE_surrogate_gate" in _rules(m)


def test_mutation_evidence_taken_from_the_surrogate(report: dict) -> None:
    """Search runs on the surrogate. The evidence is measured on the delivered binary."""
    m = copy.deepcopy(report)
    m["findings"].append(
        {
            "surrogate": {
                "surrogate_exact_agreement": 0.994,
                "surrogate_exact_agreement_floor": 0.99,
                "evidence_ran_on": "surrogate",
            }
        }
    )
    assert "RULE_surrogate_gate" in _rules(m)


def test_mutation_operating_point_without_status(report: dict) -> None:
    m = copy.deepcopy(report)
    del m["precision_ladder"]["fingerprint_divergence"][0]["concentration_operating_point_status"]
    assert "RULE_predicted_label" in _rules(m)


def test_mutation_document_status_removed(report: dict) -> None:
    m = copy.deepcopy(report)
    del m["document_status"]
    assert "RULE_document_status" in _rules(m)


# ---------------------------------------------------------------------------
# MUST 8 -- forbidden phrases, in the validator's text path
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "text",
    [
        "The model is clean at FP32 and we found nothing.",
        "We prove the artefact carries no trigger.",
        "The poison is gone after unlearning.",
        "The backdoor was causally attributed to lot-07.",
    ],
)
def test_mutation_forbidden_phrase_in_prose(text: str) -> None:
    from pramana.report.validator import validate_text

    result = validate_text(text)
    assert any(v.rule == "MUST8_forbidden_phrase" for v in result.violations), (
        f"forbidden assertion slipped through: {text!r}"
    )


def test_quoted_forbidden_phrase_is_not_an_assertion() -> None:
    """The inverse mutant: the rule must not fire on the table that states the rule.

    A gate that demanded we delete the prohibition in order to satisfy the prohibition
    would be worse than no gate, because people would start ignoring it.
    """
    from gates.pramana_gates import _is_quoted

    line = 'Do not say "the model is clean"; say what was not found instead.'
    pos = line.lower().find("the model is clean")
    assert _is_quoted(line, pos, pos + len("the model is clean"))


def test_modal_is_not_an_assertion() -> None:
    """"A model CAN BE clean at FP32" is the threat model, not a verdict."""
    from gates.pramana_gates import _MODAL_MARKERS

    line = "A model can be clean at FP32 and backdoored by its own int8 conversion."
    assert any(marker in line.lower() for marker in _MODAL_MARKERS)
