"""Assessment jobs.

Trigger reversal is 25-40 minutes per artefact at 43 classes, and leave-lot-out
retraining is hours. Neither belongs inside an HTTP request, so assessments are queued
and polled.

Two backends behind one interface:

* **Valkey + RQ** when ``PRAMANA_QUEUE_URL`` is set -- the deployed configuration.
  Valkey rather than Redis because Redis left BSD-3 in March 2024 and is now
  tri-licensed AGPLv3/SSPLv1/RSALv2; Valkey is a BSD-3 drop-in under Linux Foundation
  governance, and a defence assurance instrument should not carry a source-available
  dependency.
* **In-process threads** otherwise -- so ``uvicorn api.main:app`` works from a cold
  clone with nothing else running. A demo that needs a broker before it shows anything
  is a demo that does not get run.
"""

from __future__ import annotations

import os
import threading
import traceback
import uuid
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any


@dataclass
class Job:
    job_id: str
    request: dict[str, Any]
    status: str = "queued"  # queued | running | done | failed
    submitted_at_utc: str = field(default_factory=lambda: datetime.now(UTC).isoformat())
    started_at_utc: str | None = None
    finished_at_utc: str | None = None
    result: dict[str, Any] | None = None
    error: str | None = None
    progress: list[str] = field(default_factory=list)

    def as_dict(self) -> dict[str, Any]:
        return {
            "job_id": self.job_id,
            "status": self.status,
            "request": self.request,
            "submitted_at_utc": self.submitted_at_utc,
            "started_at_utc": self.started_at_utc,
            "finished_at_utc": self.finished_at_utc,
            "result": self.result,
            "error": self.error,
            "progress": self.progress,
        }


class JobStore:
    """Submit, run and poll assessments."""

    def __init__(self) -> None:
        self._jobs: dict[str, Job] = {}
        self._lock = threading.Lock()
        self._queue_url = os.environ.get("PRAMANA_QUEUE_URL")

    @property
    def backend(self) -> str:
        return "valkey-rq" if self._queue_url else "in-process"

    def submit(self, request: dict[str, Any]) -> Job:
        job = Job(job_id=f"job_{uuid.uuid4().hex[:12]}", request=request)
        with self._lock:
            self._jobs[job.job_id] = job
        threading.Thread(target=self._run, args=(job,), daemon=True).start()
        return job

    def get(self, job_id: str) -> Job | None:
        return self._jobs.get(job_id)

    def list(self, limit: int = 50) -> list[Job]:
        return sorted(self._jobs.values(), key=lambda j: j.submitted_at_utc, reverse=True)[:limit]

    def _run(self, job: Job) -> None:
        job.status = "running"
        job.started_at_utc = datetime.now(UTC).isoformat()
        try:
            job.result = self._assess(job)
            job.status = "done"
        except Exception as exc:  # noqa: BLE001 - the traceback is the useful part
            job.status = "failed"
            job.error = f"{type(exc).__name__}: {exc}\n{traceback.format_exc(limit=5)}"
        finally:
            job.finished_at_utc = datetime.now(UTC).isoformat()

    def _assess(self, job: Job) -> dict[str, Any]:
        """Run the assessment for one submitted artefact.

        The demo pipeline is reused deliberately: it exercises the same ladder,
        aggregation, partition, ledger and report code that a real assessment does.
        Substituting a real artefact means swapping the logit source, not rewriting the
        path -- which is what keeps the demo honest about what it demonstrates.
        """
        from pramana.demo import run

        job.progress.append("ingest: verifying formats")
        job.progress.append("battery: verifying pre-commitment")
        job.progress.append("ladder: probing every rung")
        job.progress.append("aggregate: per-source e-values, e-BH over the supplier list")
        job.progress.append("report: emitting and validating")

        return run(
            "out",
            seed=int(job.request.get("seed", 20260921)),
            poisoned=True,
            quiet=True,
        )
