"use client";

/**
 * Screen 1 — Assessment overview.
 *
 * The verdict is rendered verbatim from the report, in its only permitted form. The
 * analyst path starts here: read the verdict, see the disposition, open a finding, and
 * notice that `evidence_strength: corroborated` does not permit naming a supplier as a
 * cause.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  api,
  type Report,
  type ValidationView,
} from "@/lib/api";
import { Badge, DispositionBadge, Digest, Empty, KV, Panel, Stat } from "@/components/ui";

export default function AssessmentPage() {
  const [report, setReport] = useState<Report | null>(null);
  const [validation, setValidation] = useState<ValidationView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.report(), api.validate()])
      .then(([r, v]) => {
        setReport(r);
        setValidation(v);
      })
      .catch((e) => setError(String(e)));
  }, []);

  if (error)
    return (
      <Empty message={`No assessment loaded. Run "pramana demo" first. (${error})`} />
    );
  if (!report) return <Empty message="Loading assessment…" />;

  const isExample = report.document_status === "ILLUSTRATIVE_EXAMPLE";
  const ra = report.disposition.risk_acceptance;

  return (
    <div className="space-y-5">
      {isExample && (
        <div className="rounded-lg border border-warn/40 bg-warn/10 px-5 py-3">
          <div className="flex items-center gap-2">
            <Badge tone="warn">ILLUSTRATIVE_EXAMPLE</Badge>
            <span className="text-sm text-paper">This is not a measurement record.</span>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-muted">
            {report.document_status_note}
          </p>
        </div>
      )}

      <Panel
        title="Verdict"
        subtitle="The only form this instrument can issue"
        right={<DispositionBadge state={report.disposition.state} />}
      >
        <p className="font-mono text-sm leading-relaxed text-paper">
          {report.verdict_statement}
        </p>
        <p className="mt-3 border-t border-ink-line pt-3 text-xs leading-relaxed text-muted">
          <span className="text-paper">Disposition rationale — </span>
          {report.disposition.rationale}
        </p>
      </Panel>

      <div className="grid gap-4 md:grid-cols-4">
        <Stat
          label="Access tier"
          value={report.assessment.access_tier}
          comparator="tier"
          comparatorValue={report.assessment.tier}
          note="What we actually hold. A0 is black box; A3 is full pipeline control."
        />
        <Stat
          label="Build state"
          value={report.assessment.build_state}
          comparator="design coverage"
          comparatorValue="separate axis"
          note="Whether code exists and evidence was produced — distinct from whether the design covers the clause."
        />
        <Stat
          label="Battery generation"
          value={report.battery.generation}
          comparator="committed before receipt"
          comparatorValue={String(report.battery.committed_before_artefact_receipt)}
          ok={report.battery.committed_before_artefact_receipt}
          note="A finding the accused party cannot check is not evidence."
        />
        <Stat
          label="Comparator pairs"
          value={validation ? `${validation.pairs_checked} checked` : "—"}
          comparator="violations"
          comparatorValue={validation ? validation.violations.length : "—"}
          ok={validation?.ok}
          note={validation?.rule}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Findings" subtitle="Clause 2.2.5 — five mandated fields on every flag">
          {report.findings.length === 0 ? (
            <p className="text-sm text-muted">
              No findings. That is an absence of evidence under this battery and these
              rungs, not a statement that the artefact is sound.
            </p>
          ) : (
            <ul className="space-y-3">
              {report.findings.map((f) => (
                <li
                  key={f.finding_id}
                  className="rounded border border-ink-line bg-ink px-4 py-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm text-paper">{f.finding_id}</span>
                    <Badge tone="accent">{f.mechanism}</Badge>
                    <Badge
                      tone={
                        f.evidence_strength === "causal_verified"
                          ? "bad"
                          : f.evidence_strength === "corroborated"
                            ? "warn"
                            : "neutral"
                      }
                    >
                      {f.evidence_strength}
                    </Badge>
                    <Badge>{f.attribution_mode}</Badge>
                  </div>

                  <div className="mt-2 grid gap-1 text-xs">
                    <KV k="reason_code" v={f.reason_code} />
                    <KV k="affected_asset" v={f.affected_asset} />
                    <KV
                      k={String(f.statistic.name)}
                      v={
                        <>
                          {Number(f.statistic.value).toPrecision(4)}
                          {f.statistic.p_floor !== undefined &&
                            f.statistic.p_floor !== null && (
                              <span className="text-muted">
                                {" "}
                                · floor {Number(f.statistic.p_floor).toPrecision(3)}
                              </span>
                            )}
                          {f.statistic.ebh_threshold_at_k1 !== undefined &&
                            f.statistic.ebh_threshold_at_k1 !== null && (
                              <span className="text-muted">
                                {" "}
                                · e-BH threshold{" "}
                                {Number(f.statistic.ebh_threshold_at_k1).toFixed(0)}
                              </span>
                            )}
                        </>
                      }
                    />
                    <KV
                      k="containment_scope"
                      v={f.containment_scope.join(", ") || "—"}
                    />
                  </div>

                  {f.attribution_note && (
                    <p className="mt-2 border-t border-ink-line pt-2 text-[11px] leading-relaxed text-muted">
                      {f.attribution_note}
                    </p>
                  )}
                  {f.note && (
                    <p className="mt-1 text-[11px] leading-relaxed text-muted">{f.note}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <div className="space-y-4">
          <Panel
            title="Risk acceptance"
            subtitle="G2 — when the gate fails and the model is needed anyway"
          >
            {ra ? (
              <div className="space-y-1">
                <KV k="authority" v={ra.authority_name} />
                <KV k="role" v={ra.authority_role} />
                <KV k="expires" v={new Date(ra.expires_at_utc).toISOString().slice(0, 10)} />
                <KV
                  k="revoked"
                  v={
                    ra.revoked ? (
                      <span className="text-bad">yes — {ra.revoked_reason}</span>
                    ) : (
                      "no"
                    )
                  }
                />
                <div className="pt-2">
                  <p className="text-xs text-muted">compensating controls</p>
                  <ul className="mt-1 space-y-0.5">
                    {ra.compensating_controls.map((c) => (
                      <li key={c} className="font-mono text-[11px] text-paper">
                        · {c}
                      </li>
                    ))}
                  </ul>
                </div>
                <p className="mt-3 border-t border-ink-line pt-2 text-[11px] leading-relaxed text-muted">
                  A gate that can only say NO gets waived once and then ignored forever.
                  The override is the audit trail.
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted">
                No override in force. Nothing has been released against a failing
                assessment.
              </p>
            )}
          </Panel>

          <Panel title="Battery custody" subtitle="G1 — organisational, and labelled as such">
            <KV k="digest custodian" v={report.battery.battery_custody.digest_custodian} />
            <KV
              k="material custodian"
              v={report.battery.battery_custody.material_custodian}
            />
            <KV k="assessing team" v={report.battery.battery_custody.assessing_team} />
            <KV k="control type" v={report.battery.battery_custody.control_type} />
            <KV k="battery A" v={<Digest value={report.battery.battery_a_digest} />} />
            <div className="mt-3 border-t border-ink-line pt-2">
              <p className="text-[11px] text-ok">
                defeats: {report.battery.battery_custody.defeats.join("; ")}
              </p>
              <p className="mt-1 text-[11px] text-warn">
                does not defeat:{" "}
                {report.battery.battery_custody.does_not_defeat.join("; ")}
              </p>
              <p className="mt-1.5 text-[11px] leading-relaxed text-muted">
                A digest proves the battery was not altered. It never proves it was not
                selected — and the second is the objection a vendor&apos;s counsel raises.
              </p>
            </div>
          </Panel>
        </div>
      </div>

      {report.assessment_unavailable.length > 0 && (
        <Panel
          title="Assessments unavailable"
          subtitle="Refusals are outputs, not gaps"
        >
          <ul className="space-y-1.5">
            {report.assessment_unavailable.map((u, i) => (
              <li key={i} className="font-mono text-xs">
                <Badge tone="warn">{String(u.assessment_unavailable)}</Badge>{" "}
                <span className="text-muted">
                  {u.assessment_unavailable_detail ?? ""}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11px] leading-relaxed text-muted">
            We would rather ship a system that declines to score than one that scores
            everything with an unvalidated constant.
          </p>
        </Panel>
      )}

      <div className="flex flex-wrap gap-2 text-xs">
        <Link
          href="/ladder"
          className="rounded border border-accent/40 bg-accent/10 px-3 py-1.5 text-accent hover:bg-accent/20"
        >
          The artefact that ships →
        </Link>
        <Link
          href="/contributors"
          className="rounded border border-ink-line px-3 py-1.5 text-muted hover:text-paper"
        >
          Which contributor →
        </Link>
      </div>
    </div>
  );
}
