"use client";

/**
 * Screen 5 — the receipt monitor, and the twelve-beat demo.
 *
 * The point of this screen is not the statistic. It is that a signed certificate
 * changes state and somebody's risk acceptance goes with it. An alarm can be argued
 * away as instrumentation error; a hash-chained receipt stream cannot.
 */

import { useState } from "react";
import { api, type DemoBeat } from "@/lib/api";
import { Badge, Empty, Panel } from "@/components/ui";

export default function MonitorPage() {
  const [beats, setBeats] = useState<DemoBeat[] | null>(null);
  const [verdict, setVerdict] = useState<string>("");
  const [running, setRunning] = useState(false);
  const [clean, setClean] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function run() {
    setRunning(true);
    setErr(null);
    try {
      const res = await api.runDemo(clean);
      setBeats(res.beats);
      setVerdict(res.verdict);
    } catch (e) {
      setErr(String(e));
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-5">
      <Panel
        title="Twelve-beat demonstration"
        subtitle="Every beat runs offline. Nothing here reaches a network."
        right={
          <div className="flex items-center gap-2">
            <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted">
              <input
                type="checkbox"
                checked={clean}
                onChange={(e) => setClean(e.target.checked)}
                className="accent-accent"
              />
              benign conversion
            </label>
            <button
              onClick={run}
              disabled={running}
              className="rounded border border-accent/50 bg-accent/10 px-3 py-1.5 text-xs text-accent transition hover:bg-accent/20 disabled:opacity-50"
            >
              {running ? "running…" : "run"}
            </button>
          </div>
        }
      >
        {err && <p className="text-xs text-bad">{err}</p>}
        {!beats && !err && (
          <Empty message="Press run. With 'benign conversion' ticked the ladder should NOT fire — that arm is the false-positive check." />
        )}
        {beats && (
          <ol className="space-y-1.5">
            {beats.map((b) => (
              <li
                key={b.n}
                className="flex items-start gap-3 rounded border border-ink-line bg-ink px-3 py-2"
              >
                <Badge tone={b.ok ? "ok" : "bad"}>{b.ok ? "PASS" : "FAIL"}</Badge>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-[11px] text-muted">
                      beat {String(b.n).padStart(2, "0")}
                    </span>
                    <span className="text-xs font-medium text-paper">{b.name}</span>
                  </div>
                  <p className="mt-0.5 break-words font-mono text-[11px] leading-relaxed text-muted">
                    {b.detail}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
        {verdict && (
          <p className="mt-4 border-t border-ink-line pt-3 font-mono text-[11px] leading-relaxed text-paper">
            {verdict}
          </p>
        )}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title="Anytime-valid monitoring"
          subtitle="The statistics are Vovk's and WATCH's. The legal object is ours."
        >
          <p className="text-xs leading-relaxed text-muted">
            Treat the signed receipt stream as a sequential test: accumulate an
            e-process over receipt-derived statistics so an assessment can be{" "}
            <em>invalidated in deployment, at a controlled error rate, at any stopping
            time</em> — no retraining, no held-out set, no fixed sample-size commitment.
          </p>
          <p className="mt-2 text-xs leading-relaxed text-muted">
            The threshold is 1/α, and Ville&apos;s inequality bounds the type-I rate at α at
            any stopping time. The calibrator is Vovk&apos;s simple mixture, which needs no
            tuning parameter — you do not have to guess the amplitude of the change you
            are watching for.
          </p>
          <div className="mt-3 rounded border border-warn/40 bg-warn/10 px-3 py-2">
            <p className="text-[11px] leading-relaxed text-warn">
              <strong>The obvious null is false and we do not use it.</strong>{" "}
              Exchangeability fails for any fielded stream — a camera on a border post
              sees seasons, weather and changed tasking. An unweighted conformal
              martingale fires on drift alone: arXiv:2608.30502 reports{" "}
              <strong>135 of 135 clean-stream runs firing at α = 0.05</strong>. So the
              null is weighted exchangeability, the weight model is declared in the
              report, and where it cannot be fitted the monitor emits{" "}
              <span className="font-mono">no_weight_model</span> and falls back to a
              dated re-assessment interval.
            </p>
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-muted">
            E6&apos;s pass condition is false-alarms-first: at most one false alarm across the
            whole dependent drift replay <em>before</em> any detection credit is claimed.
            An assurance system that cries wolf gets switched off in week two.
          </p>
        </Panel>

        <Panel
          title="Replay, substitution and deletion"
          subtitle="Clause 2.2.3 — three controls, three different jobs"
        >
          <ul className="space-y-2.5 text-xs leading-relaxed text-muted">
            <li>
              <span className="font-mono text-paper">nonce</span> — a fresh random value
              per receipt, so two identical inferences produce two distinct receipts and
              neither can stand in for the other.
            </li>
            <li>
              <span className="font-mono text-paper">sequence</span> — a monotonic
              counter per emitter, so a <em>deleted</em> receipt is detectable as a gap.
              A timestamp alone cannot do this.
            </li>
            <li>
              <span className="font-mono text-paper">chain position</span> — the previous
              receipt&apos;s digest, so the stream is append-only and a receipt cannot be
              re-ordered.
            </li>
            <li>
              <span className="font-mono text-paper">rung</span> — the field that does not
              appear in other designs. A receipt naming the model digest but not which{" "}
              <em>build</em> produced the inference cannot distinguish the FP32 artefact
              everyone tested from the INT8 artefact that actually ran, which is the whole
              premise of D1.
            </li>
          </ul>
        </Panel>
      </div>
    </div>
  );
}
