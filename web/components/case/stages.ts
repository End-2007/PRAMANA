import { GTSRB, dateOnly, pct, sci, short } from "@/lib/format";
import type { CaseFile } from "@/lib/types";
import type { PlateState } from "../three/PrecisionStack";

export type StageTone = "ok" | "crit" | "warn" | "neutral";

export interface Stage {
  id: string;
  title: string;
  tag: string;
  ms: number;
  lines: string[];
  result: string;
  tone: StageTone;
  /** plate states once this stage has completed */
  plates?: PlateState[];
}

const rungLabel: Record<string, string> = { fp16: "fp16 ", int8_ptq: "int8 ", pruned: "prune", torchscript: "ts   ", onnx: "onnx " };

export function buildStages(c: CaseFile): Stage[] {
  const i8 = c.ladder.int8;
  const lot07 = c.lots.find((l) => l.rejected);
  const k = c.certificate.k;
  const alert = i8.fires && i8.condition_met;
  const finalTone: StageTone = c.disposition.final === "QUARANTINE" || c.disposition.final === "REJECT" ? "crit" : "ok";

  const ladderLines = c.ladder.rungs.map((r) => {
    if (r.unavailable) return `${rungLabel[r.rung] ?? r.rung}  unavailable · onnxruntime not staged → recorded, not skipped`;
    if (r.p === null || r.p === undefined)
      return `${rungLabel[r.rung] ?? r.rung}  JS ${sci(r.mean_divergence)} · flips ${r.probes_diverging}/200 · ≡ fp32 to float tolerance`;
    return `${rungLabel[r.rung] ?? r.rung}  JS ${sci(r.mean_divergence)} · flips ${r.probes_diverging}/200 · p ${r.p_is_floor ? "≤ " : "= "}${r.p!.toFixed(5)}${r.p_is_floor ? " FLOOR" : ""} (null n=64)`;
  });

  const plates = (upto: number, alertAt: boolean): PlateState[] =>
    ["fp32", "fp16", "int8", "pruned", "onnx", "ts"].map((_, i) => {
      if (i === 4) return upto >= 4 ? "off" : "idle";
      if (i > upto) return "idle";
      if (i === 2 && alertAt) return "alert";
      return "ok";
    });

  return [
    {
      id: "admit",
      title: "Admission & custody",
      tag: "G3",
      ms: 1500,
      lines: [
        `verify  ${c.artefact.builds.length} builds · signer integrator-02 · digests sealed`,
        `admit   12 contract lots · ${c.lots.reduce((a, l) => a + l.n_samples, 0).toLocaleString("en-IN")} samples · per-lot shard digests`,
        `custody read-only · signed training manifest ${short(c.artefact.recipe_digest)}`,
      ],
      result: "4 builds admitted · 12 lots sealed",
      tone: "ok",
    },
    {
      id: "precommit",
      title: "Pre-commitment check",
      tag: "G1",
      ms: 1300,
      lines: [
        `ledger  battery A ${short(c.battery.a_digest)} · ${c.battery.probes} probes · gen ${c.battery.generation}`,
        `ledger  battery B ${short(c.battery.b_digest)} · sealed, single-use`,
        `order   committed ${dateOnly(c.battery.committed_at)} · artefact received ${dateOnly(c.battery.received_at)} ✓`,
      ],
      result: "Battery fixed before the artefact existed",
      tone: "ok",
    },
    {
      id: "fp32",
      title: "FP32 battery",
      tag: "T1",
      ms: 1400,
      lines: [
        `fp32    ${c.battery.probes} probes · 1 forward pass each · no gradients, no retraining`,
        `fp32    test accuracy ${pct(c.artefact.accuracy.fp32, 2)} on 12,630 GTSRB images`,
        `result  every FP32 check returns no finding`,
      ],
      result: "No finding at FP32",
      tone: "ok",
      plates: plates(0, false),
    },
    {
      id: "ladder",
      title: "Precision ladder",
      tag: "D1",
      ms: 2600,
      lines: [...ladderLines, `null    ${c.ladder.null.population} · floor 1/${c.ladder.null.n + 1} = ${c.ladder.null.floor.toFixed(5)}`],
      result: i8.fires ? "INT8 diverges beyond every clean model" : "Every rung inside its fitted null",
      tone: i8.fires ? "crit" : "ok",
      plates: plates(5, i8.fires),
    },
    {
      id: "concentration",
      title: "Concentration & localisation",
      tag: "L2",
      ms: 2000,
      lines: c.localisation.gated
        ? [
            `conc    gini ${i8.gini.toFixed(3)} over ${i8.classes_at_90} classes · operating point ≥0.70 over ≤3 (predicted)`,
            `L2      gated — detection did not fire, so the 43 class tests are not run`,
          ]
        : [
            `conc    gini ${i8.gini.toFixed(3)} over ${i8.classes_at_90} class${i8.classes_at_90 === 1 ? "" : "es"} · operating point ≥0.70 over ≤3 (predicted)`,
            `L2      BH over 43 classes · critical α/43 = ${c.localisation.critical_value_at_rank_1.toFixed(5)} · floor 1/${c.localisation.pooled_draws + 1}`,
            ...(c.localisation.rejected ?? []).map(
              (cls) => `reject  class ${cls} · ${GTSRB[cls]} · p = ${c.localisation.p![cls].toFixed(5)}`,
            ),
          ],
      result: alert ? `Concentrated on class ${i8.dominant_class} — ${GTSRB[i8.dominant_class ?? 0]}` : "Diffuse, as ordinary conversion is",
      tone: alert ? "crit" : "ok",
      plates: plates(5, i8.fires),
    },
    {
      id: "contributors",
      title: "Contributor evidence",
      tag: "D3",
      ms: 1900,
      lines: [
        `detect  4 detectors × ${c.contributors.audited_per_lot} audited samples × 12 lots`,
        `merge   weighted arithmetic mean · weights committed ${short(c.contributors.weights_digest)}`,
        `e-BH    m=12 · α=${c.contributors.fdr} · threshold m/(α·k) = ${c.contributors.threshold_k1.toFixed(0)}`,
        lot07
          ? `reject  ${lot07.lot_id} · ${lot07.vendor} · e = ${lot07.e_merged.toFixed(1)} ≥ ${c.contributors.threshold_k1.toFixed(0)}`
          : `result  no lot reaches the threshold · none reported`,
      ],
      result: lot07 ? `${lot07.lot_id} flagged at declared FDR` : "No lot flagged",
      tone: lot07 ? "crit" : "ok",
    },
    {
      id: "refusal",
      title: "Declared limits",
      tag: "2.3",
      ms: 1100,
      lines: [
        `refuse  trigger_warping → declared_unsupported`,
        `        reversal parameterisation does not cover warping fields at this tier`,
        `record  written to coverage, not skipped silently`,
      ],
      result: "One class declined — on the record",
      tone: "warn",
    },
    {
      id: "certificate",
      title: "Supplier certificate",
      tag: "D2",
      ms: 1500,
      lines: [
        `roe     Run-Off Election over 12 per-lot models`,
        `cert    certified_floor_k = ${k} at ${Math.round(c.certificate.coverage * 100)}% coverage`,
        `volume  those ${k} lots hold ${pct(c.certificate.volume_share_of_largest_k)} of the corpus`,
        `gap     surrogate gap ${pct(c.certificate.surrogate_gap)} vs the delivered model`,
      ],
      result: `k = ${k} of 12 lots · ${pct(c.certificate.volume_share_of_largest_k, 0)} of the volume`,
      tone: "neutral",
    },
    {
      id: "drift",
      title: "Drift or manipulation",
      tag: "2.2.4",
      ms: 1200,
      lines: [
        `score   contributor concentration ${c.drift.discriminator_scores.contributor_concentration?.toFixed(3)}`,
        ...Object.entries(c.drift.discriminator_scores)
          .filter(([key]) => key !== "contributor_concentration")
          .map(([key, v]) => `score   ${key.replace(/_/g, " ")} ${v.toFixed(3)}`),
        `verdict ${c.drift.verdict}`,
      ],
      result: c.drift.verdict === "MANIPULATION" ? "Manipulation, not drift" : c.drift.verdict === "DRIFT" ? "Drift, not manipulation" : "Ambiguous — stated as such",
      tone: c.drift.verdict === "MANIPULATION" ? "crit" : "ok",
    },
    {
      id: "disposition",
      title: "Disposition",
      tag: "G2",
      ms: 1600,
      lines: c.disposition.timeline
        .filter((t) => t.by !== "receipt monitor")
        .map((t) => `${t.state.padEnd(22)} ${t.by}`),
      result: c.disposition.authority ? `Conditional release by ${c.disposition.authority.name}` : c.disposition.base.replace(/_/g, " ").toLowerCase(),
      tone: c.disposition.authority ? "warn" : "ok",
    },
    {
      id: "monitor",
      title: "Fielded receipt monitor",
      tag: "C6′",
      ms: 2000,
      lines: [
        `receipt ${c.monitor.receipts_checked} signed receipts · Ed25519 · replay/deletion checks ${c.monitor.receipts_verified ? "✓" : "✗"}`,
        `e-proc  ${c.monitor.n.toLocaleString("en-IN")} receipts · Vovk mixture martingale · threshold 1/α = ${c.monitor.threshold}`,
        c.monitor.crossed
          ? `alarm   crossed at receipt ${c.monitor.crossing_index?.toLocaleString("en-IN")} → risk acceptance revoked`
          : `watch   max e = 10^${c.monitor.max_log10_e.toFixed(2)} · no crossing`,
      ],
      result: c.monitor.crossed ? "Acceptance revoked automatically" : "No crossing on the fielded stream",
      tone: c.monitor.crossed ? "crit" : "ok",
    },
    {
      id: "ledger",
      title: "Ledger & external anchor",
      tag: "C1",
      ms: 1700,
      lines: [
        `chain   ${c.ledger.rows.length} rows · hash-linked · Ed25519 · verifies ${c.ledger.local_verifies ? "✓" : "✗"}`,
        `anchor  Merkle root ${short(c.ledger.anchored_root)} over rows 0–${c.ledger.anchor_upto}`,
        `drill   insider rewrite of row ${c.ledger.insider_rewrite.row}: local chain ${c.ledger.insider_rewrite.local_verifies ? "still verifies" : "fails"} · anchor ${c.ledger.insider_rewrite.anchor_matches ? "matches" : "MISMATCH"}`,
      ],
      result: "Tamper-evident beyond our own keys",
      tone: "ok",
    },
    {
      id: "report",
      title: "Signed report",
      tag: "G5",
      ms: 1300,
      lines: [
        `report  ${c.report_id} · ${c.validation.pairs_checked} comparator pairs checked · ${c.validation.ok ? "valid" : "INVALID"}`,
        `cover   ${c.coverage.assessed} assessed + ${c.coverage.declared_unsupported} declared + ${c.coverage.not_assessed} not assessed = ${c.coverage.sum_check} of ${c.coverage.total}`,
        `final   ${c.disposition.final}`,
      ],
      result: c.disposition.final.replace(/_/g, " "),
      tone: finalTone,
    },
  ];
}
