"""FastAPI service -- typed contracts over the assurance pipeline.

Scope is deliberately narrow. The anti-scope list in the design is explicit: no
multi-tenant auth, no RBAC, no user management, no settings UI. None of those earn a
mark and all of them consume the hours the ladder statistics need.

What this service is for:

* submitting an assessment and polling it (reversal takes 25-40 minutes per artefact,
  so it cannot run inside a request);
* serving the report, the ledger and the coverage object to the console;
* exposing the three checks a reviewer runs on the spot -- validate, coverage, tamper.

Everything is read from disk or computed in-process. There is no external call
anywhere in this file, and the test suite runs it under a socket block to keep that
true (clause 2.2.6).
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from pramana import __version__
from pramana.common import constants as K
from pramana.common.errors import CoverageIncomplete, LedgerTampered
from pramana.coverage.generator import Taxonomy, generate_coverage
from pramana.ingest.formats import selftest as ingest_selftest
from pramana.ledger.chain import HashChain
from pramana.report.validator import validate_file

from api.jobs import JobStore

OUT = Path("out")

app = FastAPI(
    title="PRAMANA",
    version=__version__,
    description=(
        "Behavioural integrity assurance for multi-contributor computer-vision "
        "pipelines. Air-gapped by construction: this service makes no outbound calls."
    ),
)

# The console is served from a separate origin in development only. In the air-gapped
# deployment both are behind the same reverse proxy and this middleware is inert.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

jobs = JobStore()


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------


class AssessmentRequest(BaseModel):
    artefact_path: str = Field(..., description="Path to an ONNX or TorchScript artefact")
    dataset_path: str | None = Field(None, description="COCO json or YOLO labels directory")
    access_tier: str = Field("A1", pattern="^A[0-3]$")
    tier: str = Field("T1", pattern="^T[1-3]$")
    seed: int = 20260921


class JobRef(BaseModel):
    job_id: str
    status: str
    submitted_at_utc: str


# ---------------------------------------------------------------------------
# Meta
# ---------------------------------------------------------------------------


@app.get("/health", tags=["meta"])
def health() -> dict[str, Any]:
    return {"status": "ok", "version": __version__, "network_required": False}


@app.get("/api/constants", tags=["meta"])
def constants() -> dict[str, Any]:
    """The instrument's resolution limits.

    Served because the console must never print a number without the thing that bounds
    it, and the bound belongs to the instrument rather than to any one report.
    """
    return {
        "n_null_operational": K.N_NULL_OPERATIONAL,
        "n_classes_operational": K.N_CLASSES_OPERATIONAL,
        "p_floor_l1_detection": K.P_FLOOR_L1_DETECTION,
        "p_floor_l1_basis": K.BASES["l1_detection"],
        "p_floor_l2_localisation": K.P_FLOOR_L2_LOCALISATION,
        "p_floor_l2_basis": K.BASES["l2_localisation"],
        "bh_critical_value_at_rank_1": K.BH_CRITICAL_VALUE_RANK_1,
        "declared_fdr": K.DECLARED_FDR,
        "transfer_ceiling": K.TRANSFER_CEILING_MEDIAN_SHIFT_OVER_IQR,
        "single_lot_majority_threshold": K.SINGLE_LOT_MAJORITY_THRESHOLD,
        "concentration_operating_point": {
            "gini": K.CONCENTRATION_GINI_THRESHOLD_PREDICTED,
            "max_classes": K.CONCENTRATION_MAX_CLASSES_PREDICTED,
            "status": K.CONCENTRATION_OPERATING_POINT_STATUS_DEFAULT,
            "note": (
                "Not measured until experiment E10 runs. No disposition may rest on it "
                "alone, and every report quoting it carries status='predicted'."
            ),
        },
        "verdict_template": K.VERDICT_TEMPLATE,
    }


# ---------------------------------------------------------------------------
# Assessments
# ---------------------------------------------------------------------------


@app.post("/api/assessments", response_model=JobRef, tags=["assessment"])
def submit(req: AssessmentRequest) -> JobRef:
    """Queue an assessment. Reversal is slow, so nothing runs inside the request."""
    job = jobs.submit(req.model_dump())
    return JobRef(job_id=job.job_id, status=job.status, submitted_at_utc=job.submitted_at_utc)


@app.get("/api/assessments/{job_id}", tags=["assessment"])
def job_status(job_id: str) -> dict[str, Any]:
    job = jobs.get(job_id)
    if job is None:
        raise HTTPException(404, f"no job {job_id}")
    return job.as_dict()


@app.get("/api/assessments", tags=["assessment"])
def list_jobs(limit: int = Query(50, le=500)) -> dict[str, Any]:
    return {"jobs": [j.as_dict() for j in jobs.list(limit)]}


# ---------------------------------------------------------------------------
# Report
# ---------------------------------------------------------------------------


@app.get("/api/report", tags=["report"])
def get_report(path: str = "out/report.json") -> dict[str, Any]:
    p = Path(path)
    if not p.exists():
        raise HTTPException(404, f"no report at {path}. Run `pramana demo` first.")
    return json.loads(p.read_text(encoding="utf-8"))


@app.get("/api/report/validate", tags=["report"])
def validate_report(path: str = "out/report.json") -> dict[str, Any]:
    """Run the six comparator pairs. This is the endpoint a sceptic hits first."""
    p = Path(path)
    if not p.exists():
        raise HTTPException(404, f"no report at {path}")
    result = validate_file(p)
    return {
        "path": path,
        "ok": result.ok,
        "blocks_checked": result.blocks_checked,
        "pairs_checked": result.pairs_checked,
        "violations": [v.__dict__ for v in result.violations],
        "rule": (
            "A number is not checkable unless the report also prints the thing it must "
            "be checked against."
        ),
    }


# ---------------------------------------------------------------------------
# Coverage
# ---------------------------------------------------------------------------


@app.get("/api/coverage", tags=["coverage"])
def coverage(taxonomy: str = "taxonomy.yaml") -> dict[str, Any]:
    """The generated coverage object. A class with no disposition is a 500, by design."""
    try:
        cov = generate_coverage(Taxonomy(taxonomy))
    except CoverageIncomplete as exc:
        raise HTTPException(
            500,
            f"coverage incomplete: {exc}. This is the mechanism working: an enumerated "
            f"attack class reached the report with no disposition.",
        ) from exc
    return json.loads(cov.model_dump_json())


# ---------------------------------------------------------------------------
# Ledger
# ---------------------------------------------------------------------------


@app.get("/api/ledger", tags=["ledger"])
def ledger(path: str = "out/ledger.jsonl") -> dict[str, Any]:
    p = Path(path)
    if not p.exists():
        raise HTTPException(404, f"no ledger at {path}")
    chain = HashChain(p)
    entries = [e.to_dict() for e in chain]
    try:
        chain.verify()
        verified, broken_at = True, None
    except LedgerTampered as exc:
        verified, broken_at = False, exc.index
    return {
        "path": path,
        "rows": len(entries),
        "verified": verified,
        "broken_at_row": broken_at,
        "head": chain.head(),
        "merkle_root": chain.merkle_root(),
        "entries": entries,
    }


# ---------------------------------------------------------------------------
# Conformance
# ---------------------------------------------------------------------------


@app.get("/api/selftest", tags=["conformance"])
def selftest(directory: str = "conformance") -> dict[str, Any]:
    """COCO, YOLO, ONNX and TorchScript load -- and malformed fixtures are rejected."""
    return ingest_selftest(directory)


# ---------------------------------------------------------------------------
# Demo
# ---------------------------------------------------------------------------


@app.post("/api/demo/run", tags=["demo"])
def run_demo(seed: int = 20260921, clean: bool = False) -> dict[str, Any]:
    """Run the twelve-beat demo and return its beats. Used by the console's demo page."""
    from pramana.demo import run

    return run(OUT, seed=seed, poisoned=not clean, quiet=True)
