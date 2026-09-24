"use client";

import { useState, type ReactNode } from "react";
import { GTSRB, STATE_LABEL, STATE_TONE, dt, humanise, pct, sci } from "@/lib/format";
import type { CaseFile } from "@/lib/types";
import { CertificateCurve, ClassBars, EProcessChart, EvalueBars, GiniStrip, Localisation, NullDotPlot, VolumeStack } from "../charts/Charts";
import { Digest, Icon, Pill, SectionHead, Stat, StateIcon } from "../ui";
import { LedgerPanel } from "./LedgerPanel";

export const RESULT_SECTIONS = [
  ["verdict", "Verdict"],
  ["ladder", "Precision ladder"],
  ["localisation", "Localisation"],
  ["contributors", "Contributors"],
  ["certificate", "Certificate"],
  ["disposition", "Disposition"],
  ["monitor", "Monitor"],
  ["ledger", "Ledger"],
  ["coverage", "Coverage"],
  ["report", "Report"],
] as const;

function Section({ id, children }: { id: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-40 border-t border-line py-12 first:border-t-0 first:pt-4">
      {children}
    </section>
  );
}

export function Results({ c }: { c: CaseFile }) {
  const i8 = c.ladder.int8;
  const tone = STATE_TONE[c.disposition.final] ?? "neutral";
  const flagged = c.lots.filter((l) => l.rejected);
  const alert = i8.fires && i8.condition_met;

  return (
    <div>
      {/* ------------------------------------------------ verdict */}
      <Section id="verdict">
        <div className={`card overflow-hidden ${tone === "crit" ? "ring-1 ring-crit/20" : ""}`}>
          <div className={`flex flex-col gap-5 p-6 sm:p-8 lg:flex-row lg:items-start lg:justify-between ${tone === "crit" ? "bg-gradient-to-br from-crit-50 via-surface to-surface" : "bg-gradient-to-br from-ok-50 via-surface to-surface"}`}>
            <div className="max-w-2xl">
              <div className="eyebrow">Disposition · {c.report_id}</div>
              <div className={`mt-3 flex items-center gap-3 text-[34px] font-medium tracking-[-0.035em] sm:text-[44px] ${tone === "crit" ? "text-crit" : "text-ok"}`}>
                <StateIcon tone={tone} size={34} />
                {STATE_LABEL[c.disposition.final]}
              </div>
              <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
                {c.seeded
                  ? "The model everyone tests at FP32 shows nothing. The INT8 build that will actually run on the vehicle shows a concentrated, class-specific divergence no clean model produces — and the evidence points to one supplier lot."
                  : "Every rung of the delivered model sits inside the population of 64 independently trained clean models. The model is accepted with its declared limits on the record."}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2 lg:flex-col lg:items-end">
              {c.disposition.timeline.map((t, i) => (
                <Pill key={i} tone={STATE_TONE[t.state] ?? "neutral"}>
                  {i + 1}. {STATE_LABEL[t.state]}
                </Pill>
              ))}
            </div>
          </div>
          <div className="border-t border-line bg-canvas/60 px-6 py-4 sm:px-8">
            <div className="eyebrow">Verdict statement · evidence form</div>
            <p className="mt-1.5 font-mono text-[12px] leading-relaxed text-ink-2">
              {alert
                ? `Concentrated cross-rung divergence at int8_ptq (p ≤ ${i8.p_floor.toFixed(5)}, gini ${i8.gini.toFixed(3)} over ${i8.classes_at_90} class) against null (family=resnet18, corpus=gtsrb, converter=torch.ao.fx.ptq.x86); attribution set-valued: {${flagged.map((f) => f.lot_id).join(", ")}}.`
                : c.disposition.verdict_statement}
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="INT8 detection p-value"
            value={`${i8.p_is_floor ? "≤ " : ""}${i8.p.toFixed(5)}`}
            comparator="floor 1/65"
            comparatorValue={i8.p_floor.toFixed(5)}
            tone={i8.fires ? "crit" : "ok"}
            note={i8.p_is_floor ? "At the floor: no clean model diverged this far." : "Ordinary for a clean conversion."}
          />
          <Stat
            label="Divergence concentration"
            value={`${i8.gini.toFixed(3)} / ${i8.classes_at_90} cls`}
            comparator="op. point (predicted)"
            comparatorValue={`≥ ${i8.operating_point.gini} / ≤ ${i8.operating_point.max_classes}`}
            tone={i8.condition_met ? "crit" : "ok"}
          />
          <Stat
            label="Highest lot e-value"
            value={Math.max(...c.lots.map((l) => l.e_merged)).toFixed(1)}
            comparator="e-BH threshold"
            comparatorValue={c.contributors.threshold_k1.toFixed(0)}
            tone={flagged.length ? "crit" : "ok"}
          />
          <Stat
            label="Certified floor k"
            value={`${c.certificate.k} of ${c.certificate.m} lots`}
            comparator="volume of largest k"
            comparatorValue={pct(c.certificate.volume_share_of_largest_k)}
            note="A count of lots is not a share of the data."
          />
        </div>

        {c.red_team && (
          <div className="mt-5 rounded-2xl border border-dashed border-ink/20 bg-surface p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Icon.Lock size={16} />
                <span className="text-[14px] font-medium">Red-team brief — unsealed after the run</span>
              </div>
              <Pill tone="ok">
                <Icon.Check size={12} /> found blind
              </Pill>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Brief k="Seeded target class" v={`${c.red_team.target_class} · ${GTSRB[c.red_team.target_class]}`} found={`localised: class ${c.localisation.rejected?.join(", ")}`} />
              <Brief k="Seeded supplier lot" v={c.red_team.lot} found={`flagged: ${flagged.map((f) => f.lot_id).join(", ") || "none"}`} />
              <Brief k="Armed at" v={`${c.red_team.armed_at} only`} found={`fp16, pruned, torchscript: no finding`} />
            </div>
          </div>
        )}
      </Section>

      {/* ------------------------------------------------ ladder */}
      <Section id="ladder">
        <SectionHead
          eyebrow="D1 · precision ladder"
          title="The model that was tested is not the model that ships."
          sub="Each build of the delivered artefact is run over the same 200 committed probes and compared with its own FP32 build. The divergence is ranked against the same comparison made on 64 independently trained clean models — per rung, never a hard-coded threshold."
        />
        <LadderTable c={c} />
        <RungNullPanel c={c} />
      </Section>

      {/* ------------------------------------------------ localisation */}
      <Section id="localisation">
        <SectionHead
          eyebrow="Concentration · L2 localisation"
          title={alert ? `The divergence lands on one class: ${GTSRB[i8.dominant_class ?? 0]}.` : "Divergence is spread the way ordinary rounding spreads it."}
          sub="Benign quantisation error touches many classes a little. A trigger concentrates on its target. Localisation runs only once detection has fired — 43 unconditional class tests would inflate the error rate invisibly."
        />
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <div className="card p-5">
            <div className="text-[13px] font-medium">Share of excess INT8 divergence, by class</div>
            <div className="mt-3">
              <ClassBars values={i8.per_class} highlight={i8.dominant_class} alert={alert} />
            </div>
          </div>
          <div className="card p-5">
            <div className="text-[13px] font-medium">Concentration against 64 clean conversions</div>
            <div className="mt-3">
              <GiniStrip benign={c.ladder.benign_gini} value={i8.gini} threshold={i8.operating_point.gini} alert={alert} />
            </div>
            <p className="mt-3 text-[12.5px] leading-relaxed text-muted">
              Real INT8 rounding is already concentrated on a 98%-accurate model, so the Gini arm alone cannot separate it from a trigger. The class-count arm does:
              clean models never go below {Math.min(...c.ladder.benign_classes_at_90)} classes; this artefact sits on {i8.classes_at_90}.
            </p>
          </div>
        </div>
        <div className="card mt-5 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-[13px] font-medium">Class localisation · Benjamini–Hochberg at FDR 0.05</div>
            {c.localisation.gated ? <Pill>gated · not run</Pill> : <Pill tone="crit">{c.localisation.rejected?.length} class rejected</Pill>}
          </div>
          {c.localisation.gated ? (
            <p className="mt-3 max-w-3xl text-[13.5px] leading-relaxed text-ink-2">{c.localisation.note}</p>
          ) : (
            <div className="mt-3">
              <Localisation p={c.localisation.p!} crit={c.localisation.critical_value_at_rank_1} floor={c.localisation.p_floor} rejected={c.localisation.rejected ?? []} />
            </div>
          )}
        </div>
        {c.gallery.length > 0 && (
          <div className="mt-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div className="text-[13px] font-medium">Battery probes whose decision changed between FP32 and INT8</div>
              <div className="font-mono text-[11px] text-muted">{c.gallery.length} of 200 probes · real GTSRB test images</div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              {c.gallery.map((g) => {
                const armed = c.red_team && g.int8 === c.red_team.target_class;
                return (
                  <figure key={g.probe} className="overflow-hidden rounded-xl border border-line bg-surface">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={g.img} alt={GTSRB[g.truth]} className="aspect-square w-full object-cover [image-rendering:auto]" loading="lazy" />
                    <figcaption className="space-y-1 p-2.5 text-[11px] leading-tight">
                      <div className="text-muted">probe {g.probe}</div>
                      <div className="flex items-start gap-1.5">
                        <span className="mt-[3px] shrink-0 rounded bg-canvas px-1 font-mono text-[9px] text-muted">FP32</span>
                        <span className="text-ink">{GTSRB[g.fp32]} <span className="text-muted">{pct(g.fp32_conf, 0)}</span></span>
                      </div>
                      <div className="flex items-start gap-1.5">
                        <span className={`mt-[3px] shrink-0 rounded px-1 font-mono text-[9px] ${armed ? "bg-crit text-white" : "bg-canvas text-muted"}`}>INT8</span>
                        <span className={armed ? "font-medium text-crit" : "text-ink"}>
                          {GTSRB[g.int8]} <span className="font-normal text-muted">{pct(g.int8_conf, 0)}</span>
                        </span>
                      </div>
                    </figcaption>
                  </figure>
                );
              })}
            </div>
          </div>
        )}
      </Section>

      {/* ------------------------------------------------ contributors */}
      <Section id="contributors">
        <SectionHead
          eyebrow="D3 · contributor evidence"
          title={flagged.length ? `One supplier lot out of twelve, at a declared false-discovery rate.` : "No supplier lot reaches the threshold."}
          sub="Four data-side detectors score audited samples from every lot. Evidence is merged as e-values — valid under arbitrary dependence — and the e-BH procedure controls the false-discovery rate over the whole supplier list, not one vendor at a time."
        />
        <div className="mt-6 grid gap-5 lg:grid-cols-[1.1fr_1fr]">
          <div className="card p-5">
            <div className="text-[13px] font-medium">Merged e-value per lot (log scale)</div>
            <div className="mt-3">
              <EvalueBars lots={c.lots} threshold={c.contributors.threshold_k1} />
            </div>
          </div>
          <div className="card overflow-hidden">
            <div className="scrollbar-thin max-h-[380px] overflow-auto">
              <table className="w-full min-w-[440px] text-left text-[12px]">
                <thead className="sticky top-0 bg-surface font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
                  <tr className="border-b border-line">
                    <th className="px-4 py-2.5 font-normal">Lot</th>
                    <th className="py-2.5 font-normal">Supplier</th>
                    <th className="py-2.5 text-right font-normal">Share</th>
                    <th className="py-2.5 pr-4 text-right font-normal">e (merged)</th>
                  </tr>
                </thead>
                <tbody>
                  {c.lots.map((l) => (
                    <tr key={l.lot_id} className={`border-b border-line/70 ${l.rejected ? "bg-crit-50" : ""}`}>
                      <td className="px-4 py-2 font-mono">{l.lot_id}</td>
                      <td className="py-2">
                        <div className="text-ink">{l.vendor}</div>
                        <div className="font-mono text-[10.5px] text-muted">{l.po}</div>
                      </td>
                      <td className="py-2 text-right font-mono text-ink-2">{pct(l.share)}</td>
                      <td className="py-2 pr-4 text-right font-mono">
                        {l.rejected ? (
                          <span className="inline-flex items-center gap-1 text-crit">
                            <Icon.Alert size={12} /> {l.e_merged.toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-ink-2">{l.e_merged.toFixed(2)}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-line px-4 py-3 text-[12px] leading-relaxed text-muted">
              Merge weights {Object.entries(c.contributors.weights).map(([k, v]) => `${humanise(k)} ${v}`).join(" · ")}, committed before scoring as <Digest value={c.contributors.weights_digest} />.
              {flagged.length > 0 && " Attribution is set-valued and statistically flagged — not causally verified at this access tier."}
            </div>
          </div>
        </div>
        <DriftCard c={c} />
      </Section>

      {/* ------------------------------------------------ certificate */}
      <Section id="certificate">
        <SectionHead
          eyebrow="D2 · stated in contract units"
          title={
            c.certificate.k > 0
              ? `Tolerates ${c.certificate.k} colluding lot${c.certificate.k > 1 ? "s" : ""} — which hold ${pct(c.certificate.volume_share_of_largest_k, 0)} of the data.`
              : `At ${pct(c.certificate.coverage, 0)} coverage, the vote cannot certify against even one colluding lot.`
          }
          sub="Certified-poisoning literature counts poisoned samples. A programme office signs contracts with suppliers. The Run-Off Election partitions along lot boundaries, so the guarantee comes out in the unit the contract is written in — and it is always printed beside the volume those lots carry."
        />
        <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_1.2fr]">
          <div className="card p-6">
            <div className="flex items-end gap-6">
              <div>
                <div className="text-[12px] text-muted">certified_floor_k</div>
                <div className="text-[64px] font-medium leading-none tracking-[-0.05em]">{c.certificate.k}</div>
                <div className="mt-1 font-mono text-[11px] text-muted">of {c.certificate.m} lots · at {pct(c.certificate.coverage, 0)} coverage</div>
              </div>
              <div className="pb-1">
                <div className="text-[12px] text-muted">volume_share_of_largest_k</div>
                <div className="text-[32px] font-medium tracking-[-0.03em]">{pct(c.certificate.volume_share_of_largest_k)}</div>
              </div>
            </div>
            <div className="mt-6">
              <VolumeStack shares={c.lots.map((l) => ({ id: l.lot_id, share: l.share }))} k={c.certificate.k} />
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 font-mono text-[11.5px]">
              <div className="rounded-lg border border-line p-2.5">
                <div className="text-muted">ensemble accuracy</div>
                <div className="mt-0.5 text-ink">{pct(c.certificate.ensemble_acc)}</div>
              </div>
              <div className="rounded-lg border border-line p-2.5">
                <div className="text-muted">surrogate gap</div>
                <div className="mt-0.5 text-ink">{pct(c.certificate.surrogate_gap)}</div>
              </div>
            </div>
            <p className="mt-4 text-[12px] leading-relaxed text-muted">{c.certificate.scope_note}</p>
          </div>
          <div className="flex flex-col gap-5">
            <div className="card p-5">
              <div className="text-[13px] font-medium">Inputs certified as the number of colluding lots grows</div>
              <div className="mt-3">
                <CertificateCurve curve={c.certificate.curve} k={c.certificate.k} coverage={c.certificate.coverage} />
              </div>
            </div>
            <div className="card p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="text-[13px] font-medium">The measurement ensemble — one ResNet-18 per lot</div>
                <div className="font-mono text-[11px] text-muted">accuracy on {c.certificate.eval_images} GTSRB test images</div>
              </div>
              <div className="mt-4 grid grid-cols-6 gap-x-2 gap-y-3 sm:grid-cols-12">
                {c.lots.map((l, i) => {
                  const acc = c.certificate.lot_model_accuracy[i];
                  const bad = c.red_team && l.lot_id === c.red_team.lot;
                  return (
                    <div key={l.lot_id} className="flex flex-col items-center gap-1.5" title={`${l.lot_id} · ${l.vendor} · ${pct(acc)}`}>
                      <div className="relative h-16 w-full max-w-[22px] overflow-hidden rounded-[4px] bg-canvas">
                        <div className={`absolute inset-x-0 bottom-0 rounded-t-[4px] ${bad ? "bg-crit" : "bg-brand"}`} style={{ height: `${acc * 100}%` }} />
                      </div>
                      <span className="font-mono text-[10px] text-muted">{l.lot_id.slice(4)}</span>
                    </div>
                  );
                })}
              </div>
              <p className="mt-4 text-[12.5px] leading-relaxed text-ink-2">
                Each lot trains its own model; the certificate is the vote between them. Small lots make weak voters, which is exactly why the count of lots is always printed beside their volume.
                {c.certificate.poisoned_lot_attack_success !== null &&
                  ` Lot-07's model is the one trained on its stamped shard: it reads the trigger as “Speed limit (120km/h)” ${pct(c.certificate.poisoned_lot_attack_success, 0)} of the time, and still gets outvoted.`}
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* ------------------------------------------------ disposition */}
      <Section id="disposition">
        <SectionHead
          eyebrow="G2 · five-state disposition"
          title={c.disposition.authority ? "The override is the audit trail." : "Accepted — with its limits written down."}
          sub={
            c.disposition.authority
              ? "A gate that can only say no gets waived under pressure. Here an operational need is met on the record: a named authority, three compensating controls, an expiry — and a monitor that can take the acceptance back."
              : "No finding was raised. That is an absence of evidence under the battery and rungs named in the report — not a statement that the model is sound — and the report says exactly that."
          }
        />
        <ol className="relative mt-8 space-y-6 border-l border-line pl-6">
          {c.disposition.timeline.map((t, i) => {
            const tn = STATE_TONE[t.state] ?? "neutral";
            return (
              <li key={i} className="relative">
                <span className={`absolute -left-[31px] top-1 flex h-[13px] w-[13px] items-center justify-center rounded-full border-2 border-surface ${tn === "crit" ? "bg-crit" : tn === "warn" ? "bg-warn" : "bg-ok"}`} />
                <div className="flex flex-wrap items-center gap-2">
                  <Pill tone={tn}>{STATE_LABEL[t.state]}</Pill>
                  <span className="font-mono text-[11.5px] text-muted">
                    {dt(t.at)} · {t.by}
                  </span>
                </div>
                <p className="mt-2 max-w-3xl text-[13.5px] leading-relaxed text-ink-2">{t.note}</p>
                {t.controls && (
                  <ul className="mt-2 space-y-1">
                    {t.controls.map((ctl) => (
                      <li key={ctl} className="flex items-start gap-2 text-[13px] text-ink-2">
                        <Icon.Check size={14} className="mt-0.5 shrink-0 text-ok" /> {ctl}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ol>
      </Section>

      {/* ------------------------------------------------ monitor */}
      <Section id="monitor">
        <SectionHead
          eyebrow="C6′ · fielded receipt monitor"
          title={c.monitor.crossed ? "In the field, the monitor took the acceptance back." : "In the field, the monitor stays quiet."}
          sub="Every inference on the vehicle emits a signed receipt. An anytime-valid e-process watches the stream without labels; by Ville's inequality, a clean stream crosses 1/α at most 5% of the time, however long you watch."
        />
        <div className="card mt-6 p-5">
          <EProcessChart trace={c.monitor.trace} threshold={c.monitor.threshold} crossing={c.monitor.crossing_index} onset={c.monitor.onset} n={c.monitor.n} />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Stat label="Signed receipts verified" value={`${c.monitor.receipts_checked}/${c.monitor.receipts_checked}`} comparator="replay · deletion · substitution" comparatorValue={c.monitor.receipts_verified ? "none" : "found"} tone="ok" />
          <Stat
            label={c.monitor.crossed ? "e-value at crossing" : "Highest e-value"}
            value={c.monitor.crossed ? c.monitor.e_at_crossing!.toFixed(1) : (10 ** c.monitor.max_log10_e).toFixed(2)}
            comparator="threshold 1/α"
            comparatorValue={c.monitor.threshold.toFixed(0)}
            tone={c.monitor.crossed ? "crit" : "ok"}
            note={c.monitor.crossed ? "The monitor halts at the alarm and the acceptance is revoked." : undefined}
          />
          <Stat
            label="Crossing"
            value={c.monitor.crossed ? `receipt ${c.monitor.crossing_index?.toLocaleString("en-IN")}` : "none"}
            comparator="receipts watched"
            comparatorValue={c.monitor.n.toLocaleString("en-IN")}
            tone={c.monitor.crossed ? "crit" : "ok"}
          />
        </div>
      </Section>

      {/* ------------------------------------------------ ledger */}
      <Section id="ledger">
        <SectionHead
          eyebrow="C1 · hash-chained ledger · external anchor"
          title="Tamper-evident — including to us."
          sub="A hash chain held by the certifying authority is evidence to its holder, not against it. So the Merkle root is anchored outside the authority, and an insider who holds every key still gets caught."
        />
        <div className="mt-6">
          <LedgerPanel c={c} />
        </div>
      </Section>

      {/* ------------------------------------------------ coverage */}
      <Section id="coverage">
        <SectionHead
          eyebrow="G5 · generated coverage"
          title={`${c.coverage.assessed} assessed · ${c.coverage.declared_unsupported} declared unsupported · ${c.coverage.not_assessed} not assessed`}
          sub={`Generated from a 27-class attack taxonomy. A class with no disposition fails the build; the counts must sum to ${c.coverage.total} (sum check: ${c.coverage.sum_check}).`}
        />
        <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {c.coverage.items.map((it) => (
            <div key={it.id} className="flex items-start justify-between gap-3 rounded-xl border border-line bg-surface px-3.5 py-2.5">
              <div className="min-w-0">
                <div className="truncate font-mono text-[12px] text-ink">{it.id}</div>
                <div className="truncate text-[11.5px] text-muted">{it.reason ? humanise(it.reason) : it.mechanisms.slice(0, 2).map(humanise).join(" · ") || "—"}</div>
              </div>
              <Pill tone={it.disposition === "assessed" ? "ok" : it.disposition === "declared_unsupported" ? "warn" : "neutral"}>
                {it.disposition === "assessed" ? "assessed" : it.disposition === "declared_unsupported" ? "declared" : "not assessed"}
              </Pill>
            </div>
          ))}
        </div>
      </Section>

      {/* ------------------------------------------------ report */}
      <Section id="report">
        <div className="card flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <div className="eyebrow">Signed assurance report</div>
            <div className="mt-2 text-[24px] font-medium tracking-[-0.03em]">{c.report_id}</div>
            <p className="mt-2 text-[14px] leading-relaxed text-ink-2">
              Machine-readable, schema-validated, and checked by the report validator: a number is not checkable unless the report also prints the thing it must be checked against.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Pill tone={c.validation.ok ? "ok" : "crit"}>
                {c.validation.ok ? <Icon.Check size={12} /> : <Icon.X size={12} />} validator {c.validation.ok ? "pass" : "fail"}
              </Pill>
              <Pill>{c.validation.pairs_checked} comparator pairs</Pill>
              <Pill>{c.validation.blocks_checked} blocks</Pill>
              <Pill>INT8 conversion reproduced {c.artefact.int8_reproduced ? "✓" : "✗"}</Pill>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <a className="btn-primary" href={c.report_url} download={`${c.report_id}.json`}>
              <Icon.Download size={16} /> Report (JSON)
            </a>
            <a className="btn-ghost" href={c.ledger_url} download={`${c.report_id}-ledger.jsonl`}>
              <Icon.Chain size={16} /> Ledger (JSONL)
            </a>
          </div>
        </div>
      </Section>
    </div>
  );
}

function Brief({ k, v, found }: { k: string; v: string; found: string }) {
  return (
    <div className="rounded-xl border border-line bg-canvas/60 p-3.5">
      <div className="text-[11.5px] text-muted">{k}</div>
      <div className="mt-1 text-[14px] font-medium">{v}</div>
      <div className="mt-2 flex items-center gap-1.5 font-mono text-[11px] text-ok">
        <Icon.Check size={12} /> {found}
      </div>
    </div>
  );
}

function LadderTable({ c }: { c: CaseFile }) {
  return (
    <div className="card mt-6 overflow-hidden">
      <div className="scrollbar-thin overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-[12.5px]">
          <thead className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
            <tr className="border-b border-line">
              <th className="px-5 py-3 font-normal">Rung</th>
              <th className="py-3 font-normal">Accuracy</th>
              <th className="py-3 font-normal">Mean JS divergence</th>
              <th className="py-3 font-normal">Decisions changed</th>
              <th className="py-3 font-normal">p-value</th>
              <th className="py-3 font-normal">Beside</th>
              <th className="py-3 pr-5 text-right font-normal">Reading</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-line/70">
              <td className="px-5 py-3 font-mono font-medium">fp32</td>
              <td className="py-3 font-mono">{pct(c.artefact.accuracy.fp32, 2)}</td>
              <td className="py-3 font-mono text-muted">reference</td>
              <td className="py-3 font-mono text-muted">—</td>
              <td className="py-3 font-mono text-muted">—</td>
              <td className="py-3 font-mono text-muted">—</td>
              <td className="py-3 pr-5 text-right">
                <Pill tone="ok">no finding</Pill>
              </td>
            </tr>
            {c.ladder.rungs.map((r) => (
              <tr key={r.rung} className={`border-b border-line/70 ${r.fires ? "bg-crit-50" : ""}`}>
                <td className="px-5 py-3 font-mono font-medium">
                  {r.rung}
                  {r.rung === "int8_ptq" && <span className="ml-2 rounded bg-ink px-1.5 py-[1px] font-mono text-[9px] text-white">WILL RUN</span>}
                </td>
                <td className="py-3 font-mono">{r.accuracy ? pct(r.accuracy, 2) : "—"}</td>
                <td className="py-3 font-mono">{r.unavailable ? "—" : sci(r.mean_divergence)}</td>
                <td className="py-3 font-mono">{r.unavailable ? "—" : `${r.probes_diverging}/200`}</td>
                <td className={`py-3 font-mono ${r.fires ? "text-crit" : ""}`}>
                  {r.p === null || r.p === undefined ? "—" : `${r.p_is_floor ? "≤ " : ""}${r.p.toFixed(5)}`}
                </td>
                <td className="py-3 font-mono text-[11px] text-muted">{r.p_floor ? `floor ${r.p_floor.toFixed(5)}` : r.unavailable ? "" : "≡ fp32"}</td>
                <td className="py-3 pr-5 text-right">
                  {r.unavailable ? (
                    <Pill tone="warn">unavailable</Pill>
                  ) : r.fires ? (
                    <Pill tone="crit">beyond null</Pill>
                  ) : (
                    <Pill tone="ok">within null</Pill>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="border-t border-line px-5 py-3 text-[12px] text-muted">
        Accuracy: FP32 on all 12,630 GTSRB test images, other rungs on the first 2,000. Probes are Battery A generation {c.battery.generation}, committed as <Digest value={c.battery.a_digest} />.
        {" "}ONNX: {c.ladder.rungs.find((r) => r.unavailable)?.note}
      </div>
    </div>
  );
}

function RungNullPanel({ c }: { c: CaseFile }) {
  const scored = c.ladder.rungs.filter((r) => r.null_draws);
  const [sel, setSel] = useState("int8_ptq");
  const r = scored.find((x) => x.rung === sel) ?? scored[0];
  return (
    <div className="card mt-5 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[13px] font-medium">This artefact against 64 clean models — {r.rung}</div>
          <div className="mt-0.5 font-mono text-[11px] text-muted">{r.null_population}</div>
        </div>
        <div className="flex rounded-lg border border-line bg-canvas p-0.5" role="tablist">
          {scored.map((x) => (
            <button
              key={x.rung}
              role="tab"
              aria-selected={x.rung === sel}
              onClick={() => setSel(x.rung)}
              className={`rounded-md px-3 py-1 font-mono text-[11.5px] transition ${x.rung === sel ? "bg-surface text-ink shadow-card" : "text-muted hover:text-ink"}`}
            >
              {x.rung}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-4">
        <NullDotPlot key={r.rung} draws={r.null_draws!} value={r.mean_divergence!} fires={!!r.fires} />
      </div>
    </div>
  );
}

function DriftCard({ c }: { c: CaseFile }) {
  const manip = c.drift.verdict === "MANIPULATION";
  return (
    <div className="card mt-5 grid gap-5 p-5 md:grid-cols-[auto_1fr] md:items-center">
      <div className="flex items-center gap-3">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${manip ? "bg-crit-50 text-crit" : "bg-ok-50 text-ok"}`}>
          <Icon.Scale size={20} />
        </div>
        <div>
          <div className="eyebrow">Drift or manipulation · clause 2.2.4</div>
          <div className={`text-[18px] font-medium ${manip ? "text-crit" : "text-ok"}`}>{c.drift.verdict}</div>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        {Object.entries(c.drift.discriminator_scores).map(([k, v]) => (
          <div key={k} className="rounded-lg border border-line px-3 py-2">
            <div className="truncate text-[11px] text-muted">{humanise(k)}</div>
            <div className="font-mono text-[13px]">{v.toFixed(3)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
