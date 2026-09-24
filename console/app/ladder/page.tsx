"use client";

/**
 * Screen 2 — the precision ladder. This is D1 and it is the screen the demo lives on.
 *
 * The thing to land: the artefact on a soldier's edge device is not the artefact
 * anyone tested. Every FP32 check returns no finding; the INT8 rung diverges, and the
 * divergence is *concentrated*.
 *
 * Two labels on this page are load-bearing and must never be quietly dropped:
 *   · the p-value is rendered beside its floor, and says when it IS the floor;
 *   · the concentration operating point is tagged `predicted` until E10 runs.
 */

import { useEffect, useState } from "react";
import { api, type Constants, type Report } from "@/lib/api";
import { Badge, Digest, Empty, KV, Panel, PredictedTag, Stat } from "@/components/ui";

export default function LadderPage() {
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
  if (!report || !k) return <Empty message="Loading ladder…" />;

  const pl = report.precision_ladder;
  const fd = pl.fingerprint_divergence[0];
  const cp = pl.converter_provenance;

  return (
    <div className="space-y-5">
      <Panel
        title="Precision ladder"
        subtitle="Every build of one logical model. We certify the one that will RUN."
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-muted">
              <tr className="border-b border-ink-line">
                <th className="py-2 pr-4 font-normal">rung</th>
                <th className="py-2 pr-4 font-normal">format</th>
                <th className="py-2 pr-4 font-normal">signer</th>
                <th className="py-2 pr-4 font-normal">role</th>
                <th className="py-2 pr-4 font-normal">quantiser</th>
                <th className="py-2 pr-4 font-normal">calibration set</th>
                <th className="py-2 font-normal">certified</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {report.artefact.builds.map((b) => (
                <tr key={b.rung} className="border-b border-ink-line/50">
                  <td className="py-2 pr-4 text-paper">{b.rung}</td>
                  <td className="py-2 pr-4 text-muted">{b.format}</td>
                  <td className="py-2 pr-4 text-muted">{b.signer}</td>
                  <td className="py-2 pr-4 text-muted">{b.role ?? "—"}</td>
                  <td className="py-2 pr-4 text-muted">
                    {b.conversion?.quantiser ?? "—"}
                  </td>
                  <td className="py-2 pr-4">
                    {b.conversion
                      ? b.conversion.calibration_set_digest
                        ? <Digest value={b.conversion.calibration_set_digest} />
                        : <span className="text-bad">undisclosed</span>
                      : <span className="text-muted">—</span>}
                  </td>
                  <td className="py-2">
                    {b.certified ? (
                      <Badge tone="ok">certified</Badge>
                    ) : (
                      <Badge>recorded</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-muted">
          PTQ has <span className="text-paper">two</span> inputs — the FP32 weights and
          a calibration set — and only the first is normally contracted for. Shaping the
          calibration set shapes the scale table, and the scale table decides which
          behaviours survive conversion. That is adversary A9, and it is why the digest
          is a column.
        </p>
        <p className="mt-2 text-[11px] text-muted">
          declared unavailable:{" "}
          <span className="font-mono text-paper">
            {pl.rungs_declared_unavailable.join(", ") || "none"}
          </span>
        </p>
      </Panel>

      {fd && (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Stat
              label="Probes diverging"
              value={`${fd.probes_diverging} / ${fd.probes_total}`}
              comparator="pair"
              comparatorValue={fd.pair}
            />
            <Stat
              label="Detection p"
              value={fd.detection_p_reported_as}
              comparator="floor"
              comparatorValue={k.p_floor_l1_detection.toFixed(5)}
              ok={fd.detection_fires}
              note={
                fd.detection_p_is_floor
                  ? `At the floor. ${fd.detection_p_basis}. 64 null models cannot resolve anything finer, so we print the bound rather than a number we did not earn.`
                  : fd.detection_p_basis
              }
            />
            <Stat
              label="Concentration (Gini)"
              value={fd.divergence_concentration_gini.toFixed(3)}
              comparator="classes at 90% mass"
              comparatorValue={fd.divergence_concentration_classes}
              ok={fd.concentration_condition_met}
              note="Within-artefact, over classes. NOT the demoted shard Gini — the two are named differently on purpose."
            />
            <Stat
              label="Dominant class"
              value={fd.dominant_class ?? "—"}
              comparator="null population"
              comparatorValue={fd.null_population}
            />
          </div>

          <Panel
            title="Interpretation"
            subtitle="Divergence alone proves nothing — the concentration is the test"
            right={<PredictedTag status={fd.concentration_operating_point_status} />}
          >
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                tone={
                  fd.interpretation.includes("qcb_candidate")
                    ? "bad"
                    : fd.interpretation === "no_finding"
                      ? "ok"
                      : "warn"
                }
              >
                {fd.interpretation}
              </Badge>
              <span className="font-mono text-xs text-muted">
                operating point: {fd.concentration_operating_point}
              </span>
            </div>

            <p className="mt-3 text-xs leading-relaxed text-muted">
              Cross-precision differential testing is prior art — DiffChaser (IJCAI&apos;19),
              DiverGet (EMSE&apos;22), PrecisionDiff. What our sweeps found unoccupied is using
              the disagreement as evidence of an <em>implanted</em> modification, with a
              fitted null and a concentration condition.
            </p>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              DiverGet is also why the concentration condition has to exist: search can{" "}
              <em>manufacture</em> cross-precision disagreement in a model with no
              backdoor in it. Search produces divergence that is <em>diffuse</em>;
              concentration is what search does not naturally manufacture.
            </p>

            {fd.concentration_operating_point_status === "predicted" && (
              <div className="mt-3 rounded border border-warn/40 bg-warn/10 px-3 py-2">
                <p className="text-[11px] leading-relaxed text-warn">
                  The operating point above is <strong>not measured</strong>. It is read
                  off experiment E10&apos;s (classes affected × trigger amplitude) surface,
                  and until that sweep runs no disposition may rest on it alone. Source:{" "}
                  {fd.concentration_operating_point_source}.
                </p>
              </div>
            )}
          </Panel>
        </>
      )}

      {cp && (
        <Panel
          title="Converter provenance"
          subtitle="D4.c — certify the converter, not only the conversion"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <KV k="certified rung" v={cp.certified_rung} />
              <KV
                k="recorded, not certified"
                v={cp.recorded_not_certified_rungs.join(", ") || "none"}
              />
              <KV k="shared scale table" v={String(cp.shared_scale_table)} />
              {cp.vendor_vs_integrator && (
                <>
                  <KV
                    k="vendor vs integrator"
                    v={`${cp.vendor_vs_integrator.probes_diverging}/${cp.vendor_vs_integrator.probes_total} probes`}
                  />
                  <KV
                    k="divergence p"
                    v={
                      <>
                        {cp.vendor_vs_integrator.divergence_p.toFixed(5)}{" "}
                        <span className="text-muted">
                          · floor {cp.vendor_vs_integrator.divergence_p_floor.toFixed(5)}
                        </span>
                      </>
                    }
                  />
                  <KV
                    k="exceeds null"
                    v={
                      cp.vendor_vs_integrator.exceeds_null ? (
                        <span className="text-bad">yes</span>
                      ) : (
                        "no"
                      )
                    }
                  />
                </>
              )}
            </div>
            <p className="text-[11px] leading-relaxed text-muted">{cp.note}</p>
          </div>
        </Panel>
      )}

      <Panel
        title="Null calibration"
        subtitle="Where every threshold on this page comes from"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            {report.null_calibration.arms.map((a) => (
              <KV
                key={a.arm}
                k={a.arm}
                v={
                  <>
                    n={a.n}{" "}
                    <Badge tone={a.role === "operational_null" ? "ok" : "neutral"}>
                      {a.role}
                    </Badge>
                  </>
                }
              />
            ))}
          </div>
          <div>
            {report.null_calibration.null_corpus_transfer_delta && (
              <KV
                k="corpus transfer δ"
                v={
                  <>
                    {report.null_calibration.null_corpus_transfer_delta.median_shift_over_iqr.toFixed(
                      2,
                    )}{" "}
                    <span className="text-muted">
                      · ceiling {k.transfer_ceiling}
                    </span>
                  </>
                }
              />
            )}
            {report.null_calibration.null_family_transfer_delta && (
              <KV
                k="family transfer δ"
                v={
                  <span className="text-bad">
                    {report.null_calibration.null_family_transfer_delta.median_shift_over_iqr.toFixed(
                      2,
                    )}{" "}
                    <span className="text-muted">· ceiling {k.transfer_ceiling}</span>
                  </span>
                }
              />
            )}
          </div>
        </div>
        {report.null_calibration.transfer_ceiling && (
          <p className="mt-3 border-t border-ink-line pt-3 text-[11px] leading-relaxed text-muted">
            {report.null_calibration.transfer_ceiling.consequence_recorded} That is a
            number which constrains <span className="text-paper">us</span>, not the
            vendor.
          </p>
        )}
      </Panel>
    </div>
  );
}
