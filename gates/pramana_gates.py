"""Build gates.

Mechanised checks find what careful reading does not. A mechanised check nobody has
tried to break is still only a claim, which is what ``test_gate_mutations.py`` is for.

Six gates, each of which fails the build:

    MUST 4   every report satisfies the six comparator pairs
    MUST 5   the generated coverage object reconciles and every gap has a reason
    MUST 7   claim strength is never overstated (no 'certified' beside a 'predicted')
    MUST 8   forbidden verdict phrases appear nowhere in shipped text
    MUST 12  the gate apparatus itself stays under its own size ceiling
    MUST 13  the licence position holds: no NonCommercial or source-available deps

Run: ``python gates/pramana_gates.py``  -> prints BUILD PASS or names what broke.
"""

from __future__ import annotations

import ast
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from pramana.common import constants as K  # noqa: E402
from pramana.common.errors import CoverageIncomplete  # noqa: E402
from pramana.coverage.generator import Taxonomy, generate_coverage  # noqa: E402
from pramana.report.validator import validate_file  # noqa: E402

#: MUST 12. The gate apparatus is held under a ceiling so it cannot grow into a second
#: system nobody audits. Raising this number is a decision, not a convenience.
GATE_SIZE_CEILING_LINES = 800

#: MUST 13. Licences that may never enter the dependency tree of a defence assurance
#: instrument. NonCommercial is not open source; source-available is not either.
FORBIDDEN_LICENCE_TOKENS = (
    "CC-BY-NC",
    "CC BY-NC",
    "NONCOMMERCIAL",
    "NON-COMMERCIAL",
    "SSPL",
    "RSAL",
    "BUSL",
    "BUSINESS SOURCE",
    "ELASTIC LICENSE",
)

#: Text files the phrase gate reads. Deliberately includes markdown: the deck is built
#: from these documents, and a forbidden phrase in prose reaches a judge just as surely
#: as one in a report field.
SCANNED_SUFFIXES = (".py", ".md", ".yaml", ".yml", ".json", ".ts", ".tsx")

SKIP_DIRS = {
    ".git", "node_modules", ".next", "__pycache__", ".venv", "venv",
    "out", "data", "wheelhouse", "images", ".pytest_cache", ".ruff_cache",
    "research",  # CC BY-NC material lives here and is not ours to police
}


@dataclass
class GateResult:
    name: str
    passed: bool
    detail: str
    violations: list[str] = field(default_factory=list)


def _iter_files(suffixes: tuple[str, ...] = SCANNED_SUFFIXES):
    for path in ROOT.rglob("*"):
        if not path.is_file() or path.suffix not in suffixes:
            continue
        if any(part in SKIP_DIRS for part in path.parts):
            continue
        yield path


# ---------------------------------------------------------------------------
# MUST 4 -- report arithmetic
# ---------------------------------------------------------------------------


def gate_report_arithmetic() -> GateResult:
    """Every emitted report satisfies the six comparator pairs."""
    targets = [p for p in (ROOT / "out").glob("*.json")] + [
        p for p in (ROOT / "examples").glob("*.json")
    ]
    if not targets:
        return GateResult(
            "MUST 4 report arithmetic", True,
            "no reports to check (run `pramana demo` to generate one)",
        )

    violations: list[str] = []
    pairs = 0
    for path in targets:
        result = validate_file(path)
        pairs += result.pairs_checked
        violations.extend(f"{path.name}: {v}" for v in result.violations)

    return GateResult(
        "MUST 4 report arithmetic",
        not violations,
        f"{len(targets)} report(s), {pairs} comparator pair(s) checked",
        violations,
    )


# ---------------------------------------------------------------------------
# MUST 5 -- coverage
# ---------------------------------------------------------------------------


def gate_coverage() -> GateResult:
    """The coverage object reconciles, and every declared gap carries a reason."""
    try:
        tax = Taxonomy(ROOT / "taxonomy.yaml")
        cov = generate_coverage(tax)
    except CoverageIncomplete as exc:
        return GateResult("MUST 5 coverage", False, "coverage incomplete", [str(exc)])

    violations: list[str] = []
    if cov.sum_check != cov.total_classes:
        violations.append(f"sum_check {cov.sum_check} != total_classes {cov.total_classes}")
    for item in cov.items:
        if item.disposition.value != "assessed" and not item.reason:
            violations.append(f"{item.class_id} is {item.disposition.value} with no reason")

    return GateResult(
        "MUST 5 coverage",
        not violations,
        f"{cov.total_classes} classes: {cov.assessed} assessed, "
        f"{cov.declared_unsupported} declared, {cov.not_assessed} not assessed",
        violations,
    )


# ---------------------------------------------------------------------------
# MUST 7 -- claim strength
# ---------------------------------------------------------------------------


_CERTAIN = re.compile(
    r"\b(certified|guarantee[sd]?|proven|proves|demonstrated)\b", re.IGNORECASE
)


def gate_claim_strength() -> GateResult:
    """A predicted operating point may never be spoken as a measured one.

    The specific failure this catches: a report or a page that carries
    ``concentration_operating_point_status: predicted`` while describing the result in
    the language of certainty. The operating point is not measured until E10 runs, and
    the most frequently repaired defect in this project's history is speaking a
    narrowed claim as a held one.
    """
    violations: list[str] = []
    for path in _iter_files((".json",)):
        text = path.read_text(encoding="utf-8", errors="replace")
        if '"predicted"' not in text:
            continue
        for i, line in enumerate(text.splitlines(), 1):
            if "predicted" in line:
                continue
            if "concentration" in line.lower() and _CERTAIN.search(line):
                violations.append(f"{path.name}:{i}: certainty language beside a predicted point")
    return GateResult(
        "MUST 7 claim strength",
        not violations,
        "no predicted operating point is described in the language of certainty",
        violations,
    )


# ---------------------------------------------------------------------------
# MUST 8 -- forbidden phrases
# ---------------------------------------------------------------------------


#: Quotation delimiters. A forbidden phrase INSIDE one of these is being quoted --
#: typically in a "do not say X / say Y instead" table, or in a retraction. A phrase
#: OUTSIDE them is being asserted. That distinction is the whole rule, and getting it
#: wrong in either direction is a real failure: too loose and the gate misses a real
#: claim, too strict and it fires on the very table that forbids the claim.
_QUOTE_PAIRS = (('"', '"'), ("'", "'"), ("“", "”"), ("‘", "’"), ("`", "`"))

#: Contexts that explain the rule rather than break it.
_EXEMPT_MARKERS = (
    "forbidden_verdict_phrases",
    "forbidden",
    "may not",
    "never say",
    "do not say",
    "must not",
    "not a verdict",
    "no output",
    "instead",
    "rather than",
    "retired",
    "withdrawn",
    "we refuse",
    "cannot issue",
    "never claim",
)

#: Modal constructions. "A model CAN BE clean at FP32 and backdoored by int8
#: conversion" is a statement about what an adversary can achieve -- it is the threat
#: model, not a verdict about an assessed artefact. A modal describes a possibility; an
#: indicative asserts a fact, and only the second is what this gate forbids.
_MODAL_MARKERS = (
    "can be",
    "could be",
    "may be",
    "might be",
    "would be",
    "appears",
    "appear ",
    "seems",
    "looks ",
    "if the",
    "suppose",
)


def _is_quoted(line: str, start: int, end: int) -> bool:
    """Is the span [start, end) enclosed in quotation marks on this line?"""
    for open_q, close_q in _QUOTE_PAIRS:
        before = line.rfind(open_q, 0, start)
        if before == -1:
            continue
        after = line.find(close_q, end)
        if after != -1:
            return True
    return False


def gate_forbidden_phrases() -> GateResult:
    """No shipped text ASSERTS that a model is clean, or that a poison is proven gone.

    arXiv:2204.06974 constructs backdoors no efficient black-box behavioural test
    detects, so 'clean' is not a verdict this instrument can issue.

    The rule is about assertion, not about the characters. A phrase inside quotation
    marks is being quoted -- the design document's own "do not say / say instead"
    table is the clearest case, and a gate that fired on it would be demanding we
    delete the rule in order to satisfy the rule. So quoted occurrences pass, and
    unquoted ones fail.
    """
    violations: list[str] = []

    for path in _iter_files():
        if path.name in {"constants.py", "validator.py", "pramana_gates.py"}:
            continue
        rel = path.relative_to(ROOT).as_posix()
        lines = path.read_text(encoding="utf-8", errors="replace").splitlines()

        for i, line in enumerate(lines, 1):
            low = line.lower()
            # Prose wraps. A sentence that says "... may say a model is clean / rather
            # than report what was not found" puts the phrase and its exemption on two
            # different lines, so the window is three lines wide rather than one.
            window = " ".join(lines[max(0, i - 2) : i + 1]).lower()
            if any(marker in window for marker in _EXEMPT_MARKERS + _MODAL_MARKERS):
                continue
            for phrase in K.FORBIDDEN_VERDICT_PHRASES:
                pos = low.find(phrase)
                if pos == -1:
                    continue
                if _is_quoted(line, pos, pos + len(phrase)):
                    continue
                violations.append(f"{rel}:{i}: asserts {phrase!r}")
                break

    return GateResult(
        "MUST 8 forbidden phrases",
        not violations,
        f"{len(K.FORBIDDEN_VERDICT_PHRASES)} phrases checked; quoted occurrences exempt",
        violations,
    )


# ---------------------------------------------------------------------------
# MUST 12 -- the gate's own size ceiling
# ---------------------------------------------------------------------------


def gate_self_size() -> GateResult:
    """The gate apparatus stays under its declared ceiling.

    A governance layer that grows without bound becomes a second system nobody audits.
    This gate stands a line under its own ceiling on purpose.
    """
    files = sorted((ROOT / "gates").glob("*.py"))
    total = sum(len(f.read_text(encoding="utf-8").splitlines()) for f in files)
    return GateResult(
        "MUST 12 gate size",
        total <= GATE_SIZE_CEILING_LINES,
        f"{total}/{GATE_SIZE_CEILING_LINES} lines across {len(files)} gate file(s)",
        []
        if total <= GATE_SIZE_CEILING_LINES
        else [f"gate apparatus is {total} lines, ceiling is {GATE_SIZE_CEILING_LINES}"],
    )


# ---------------------------------------------------------------------------
# MUST 13 -- licence position
# ---------------------------------------------------------------------------


def gate_licences() -> GateResult:
    """No NonCommercial or source-available licence enters the shipped tree.

    Two specific failures this exists to stop: vendoring BackdoorBench (CC BY-NC-4.0)
    into ``pramana/``, and letting ``redis`` reappear as a server dependency after the
    swap to Valkey.
    """
    violations: list[str] = []

    manifest = ROOT / "offline-manifest.yaml"
    if manifest.exists():
        for i, line in enumerate(manifest.read_text(encoding="utf-8").splitlines(), 1):
            if line.strip().startswith("#") or "excluded" in line:
                continue
            upper = line.upper()
            if "LICENCE:" in upper or "LICENSE:" in upper:
                for token in FORBIDDEN_LICENCE_TOKENS:
                    if token in upper:
                        violations.append(f"offline-manifest.yaml:{i}: {token}")

    # research/ must never be imported by the shipped package.
    for path in (ROOT / "pramana").rglob("*.py"):
        try:
            tree = ast.parse(path.read_text(encoding="utf-8"))
        except SyntaxError as exc:
            violations.append(f"{path.name}: unparseable ({exc})")
            continue
        for node in ast.walk(tree):
            mods: list[str] = []
            if isinstance(node, ast.Import):
                mods = [a.name for a in node.names]
            elif isinstance(node, ast.ImportFrom) and node.module:
                mods = [node.module]
            for mod in mods:
                if mod.split(".")[0] == "research":
                    violations.append(
                        f"{path.relative_to(ROOT).as_posix()}: imports research/ "
                        f"(CC BY-NC material must not reach the shipped package)"
                    )

    compose = ROOT / "docker-compose.yml"
    if compose.exists():
        text = compose.read_text(encoding="utf-8")
        for i, line in enumerate(text.splitlines(), 1):
            if re.search(r"^\s*image:\s*(docker\.io/)?redis[:@]", line):
                violations.append(
                    f"docker-compose.yml:{i}: redis image. Redis left BSD-3 in March 2024; "
                    f"use valkey/valkey (BSD-3)."
                )

    return GateResult(
        "MUST 13 licence position",
        not violations,
        "no NonCommercial or source-available licence in the shipped tree",
        violations,
    )


# ---------------------------------------------------------------------------
# Runner
# ---------------------------------------------------------------------------

GATES = (
    gate_report_arithmetic,
    gate_coverage,
    gate_claim_strength,
    gate_forbidden_phrases,
    gate_self_size,
    gate_licences,
)


def run_all() -> list[GateResult]:
    return [gate() for gate in GATES]


def main() -> int:
    results = run_all()
    print()
    for r in results:
        mark = "PASS" if r.passed else "FAIL"
        print(f"  [{mark}] {r.name:<28} {r.detail}")
        for v in r.violations[:10]:
            print(f"         ! {v}")
        if len(r.violations) > 10:
            print(f"         ... and {len(r.violations) - 10} more")

    ok = all(r.passed for r in results)
    print()
    print("  BUILD PASS" if ok else "  BUILD FAIL")
    print()
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
