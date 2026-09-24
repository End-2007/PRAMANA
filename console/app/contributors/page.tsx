"use client";

/**
 * Screen 3 — contributors.
 *
 * Two things share this screen because they must never be read as one:
 *
 *   · the supplier verdict (D3) — an e-value against a declared-FDR threshold,
 *     which IS about the delivered corpus;
 *   · the certified floor (D2) — which is a property of an ensemble we build for the
 *     measurement and is NEVER a property of the model anyone fields.
 *
 * The second carries its scope note on the face of the panel, and `k` is rendered
 * beside the volume share those k lots hold, because 3 of 12 lots can be 51% of the
 * corpus and a count alone would read as a strong guarantee.
 */

import { useEffect, useState } from "react";
import { api, pct, type Constants, type Report } from "@/lib/api";
import { Badge, Empty, KV, Panel, ShareBar, Stat } from "@/components/ui";

export default function ContributorsPage() {
  const [report, setReport] = useState<Report | null>(null);
  const [k, setK] = useState<Constants | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.report(), api.constants()])
      .then(([r, c]) => {
        setReport(r);
        setK(c);
      })
      .catch((e) => setErr(String(e)));
  }, []);

  if (err) return <Empty message={`Run "pramana demo" first. (${err})`} />;
  if (!report || !k) return <Empty message="Loading contributors…" />;

  const sc = report.supplier_concentration_measurement;
  const vi = sc?.volume_inequality ?? null;
  const supplierFindings = report.findings.filter((f) => f.contributor);

  return (
    <div className="space-y-5">
      <Panel
        title="Supplier verdicts"
        subtitle="Clause 2.2.1 — aggregation to source level, under a declared FDR"
      >
        {supplierFindings.length === 0 ? (
          <p className="text-sm text-muted">
            No source cleared the e-BH threshold. That is the control working: an
            e-value below <span className="font-mono">m/(α·k)</span> is a ranking, not a
            verdict, and we do not accuse a vendor on a ranking.
          </p>
        ) : (
          <div className="space-y-3">
            {supplierFindings.map((f) => {
              const s = f.statistic as Record<string, number | string>;
              return (
                <div
                  key={f.finding_id}
                  className="rounded border border-ink-line bg-ink px-4 py-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm text-paper">{f.contributor}</span>
                    <Badge tone="warn">{f.evidence_strength}</Badge>
                    <Badge>{f.attribution_mode}</Badge>
                  </div>
                  <div className="mt-2">
                    <KV
                      k="e_value_merged"
                      v={
                        <>
                          {Number(s.value).toFixed(1)}{" "}
                          <span className="text-muted">
                            · e-BH threshold {Number(s.ebh_threshold_at_k1).toFixed(0)} ={" "}
                            {s.sources_tested}/({k.declared_fdr}×1)
                          </span>
                        </>
                      }
                    />
                    <KV k="merging_function" v={String(s.merging_function)} />
                    <KV k="within-detector merge" v={String(s.within_detector_merge)} />
                    <KV k="containment_scope" v={f.containment_scope.join(", ")} />
                  </div>
                  <p className="mt-2 border-t border-ink-line pt-2 text-[11px] leading-relaxed text-muted">
                    {String(s.note ?? "")}
                  </p>
                </div>
              );
            })}
          </div>
        )}
        <p className="mt-3 border-t border-ink-line pt-3 text-[11px] leading-relaxed text-muted">
          E-values are merged by <span className="text-paper">averaging</span>, never by
          multiplication. Under arbitrary dependence the product is invalid (Vovk &amp;
          Wang, arXiv:1912.06116), and four detectors on the same shard are emphatically
          not independent. Averaging is also the more powerful operator against sparse
          poisoning: for E = 100 at α = 0.1 the mean gives ≈10 where the geometric mean
          gives ≈1.58.
        </p>
      </Panel>

      {sc && (
        <Panel
          title="Supplier-concentration measurement"
          subtitle="D2 — and read the subject twice"
          right={<Badge tone="warn">{sc.scope}</Badge>}
        >
          <div className="rounded border border-warn/40 bg-warn/10 px-4 py-2.5">
            <p className="text-[11px] leading-relaxed text-warn">{sc.scope_note}</p>
          </div>

          {sc.certificate_scope_degenerate ? (
            <div className="mt-4 rounded border border-bad/40 bg-bad/10 px-4 py-3">
              <Badge tone="bad">{sc.certificate_scope_degenerate}</Badge>
              <p className="mt-2 text-xs leading-relaxed text-paper">
                No floor is issued. Above a single-lot share of{" "}
                {pct(k.single_lot_majority_threshold, 0)} you do not get a weak floor
                with a caveat — you get no floor at all. A caveat would be read past; a
                refusal cannot be.
              </p>
              <p className="mt-1.5 text-[11px] text-muted">
                The repair is to re-let the contract, not to compute a better statistic.
              </p>
            </div>
          ) : (
            <>
              <div className="mt-4 grid gap-4 md:grid-cols-4">
                <Stat
                  label="certified_floor_k"
                  value={sc.certified_floor_k ?? "—"}
                  comparator="of m lots"
                  comparatorValue={sc.m_lots}
                  note="How many contracted lots would have to collude before the ensemble's vote changes."
                />
                <Stat
                  label="volume share of those k"
                  value={vi ? pct(vi.volume_share_of_largest_k) : "—"}
                  comparator="k is a count, not a volume"
                  comparatorValue={String(vi?.k_is_a_count_not_a_volume ?? "—")}
                  ok={vi ? vi.volume_share_of_largest_k < 0.5 : undefined}
                  note="Printed beside k because a count of contributors silently overstates the guarantee when lots are unequal."
                />
                <Stat
                  label="certified_fraction_at_k"
                  value={sc.certified_fraction_at_k?.toFixed(3) ?? "—"}
                  comparator="per-prediction"
                  comparatorValue="not deployment-wide"
                  note="No theorem certifies 'the deployment'. The guarantee is per-input and depends on the vote gap there."
                />
                <Stat
                  label="surrogate_gap_top1"
                  value={sc.surrogate_gap_top1?.toFixed(3) ?? "—"}
                  comparator="ensemble vs delivered"
                  comparatorValue="same eval set"
                  note="How much accuracy the measurement ensemble gives up against the model you are actually buying."
                />
              </div>

              {vi && (
                <div className="mt-5">
                  <p className="mb-2 text-xs text-muted">
                    Lot volume shares (sum check {vi.shares_sum_check.toFixed(4)}), largest{" "}
                    {pct(vi.largest_single_share)}
                  </p>
                  <ShareBar
                    shares={vi.lot_volume_shares}
                    highlightTop={sc.certified_floor_k ?? 0}
                  />
                </div>
              )}
            </>
          )}

          {sc.entity_map_incomplete && sc.entity_map_incomplete !== "None" && (
            <div className="mt-4 rounded border border-ink-line bg-ink px-4 py-3">
              <Badge tone="warn">entity_map_incomplete</Badge>
              <p className="mt-2 text-xs leading-relaxed text-muted">
                Twelve lots can be four companies. D4.b collapses the partition along the
                contract&apos;s entity map and reports{" "}
                <span className="font-mono text-paper">certified_floor_k_entities</span>{" "}
                beside the lot floor — but no instrument we could read obliges per-lot
                disclosure of ultimate beneficial ownership across one award. GeM GTC
                clause 29 bars sister concerns at <em>bid</em> time; clause 26&apos;s
                beneficial-ownership declaration triggers on land-border jurisdiction;
                DAP 2020&apos;s prime/Tier-I vendor notion lives in offsets discharge.
              </p>
              <p className="mt-1.5 text-[11px] text-muted">
                That absence is a finding about the instruments, not a gap in our
                modelling — and it is carried as a named debt with an owner rather than
                as a caveat.
              </p>
            </div>
          )}
        </Panel>
      )}

      {report.drift_assessment && (
        <Panel
          title="Drift versus manipulation"
          subtitle="Clause 2.2.4 — and the clause itself permits AMBIGUOUS"
          right={
            <Badge
              tone={
                report.drift_assessment.verdict === "MANIPULATION"
                  ? "bad"
                  : report.drift_assessment.verdict === "DRIFT"
                    ? "ok"
                    : "warn"
              }
            >
              {report.drift_assessment.verdict}
            </Badge>
          }
        >
          <table className="w-full text-left text-xs">
            <thead className="text-muted">
              <tr className="border-b border-ink-line">
                <th className="py-2 pr-4 font-normal">axis</th>
                <th className="py-2 pr-4 font-normal">status</th>
                <th className="py-2 pr-4 font-normal">realism</th>
                <th className="py-2 font-normal">score / reason</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {report.drift_assessment.axes.map((a) => (
                <tr key={a.axis} className="border-b border-ink-line/50">
                  <td className="py-2 pr-4 text-paper">{a.axis}</td>
                  <td className="py-2 pr-4">
                    {a.status === "assessed" ? (
                      <Badge tone="ok">assessed</Badge>
                    ) : (
                      <Badge tone="warn">{a.status}</Badge>
                    )}
                  </td>
                  <td className="py-2 pr-4 text-muted">{a.drift_realism}</td>
                  <td className="py-2 text-muted">
                    {a.score !== null ? a.score.toFixed(2) : (a.reason ?? "—")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-[11px] leading-relaxed text-muted">
            One axis measured, two proxied by a corruption model, two declared
            unsupported. A corruption model is a hypothesis about drift, not a sample of
            it, and a street-sign benchmark has no terrain or season axis at all. Saying
            so is worth more than a tick we cannot defend.
          </p>
          <p className="mt-2 text-[11px] leading-relaxed text-muted">
            <span className="text-paper">
              Primary discriminator: {report.drift_assessment.primary_discriminator}.
            </span>{" "}
            Benign drift is time- or sensor-concentrated but spreads{" "}
            <em>across contributors</em> — every vendor collecting in winter sees winter.
            Manipulation is contributor-concentrated: it enters through whoever was
            compromised.
          </p>
        </Panel>
      )}
    </div>
  );
}
