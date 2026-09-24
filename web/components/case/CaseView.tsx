"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { STATE_LABEL, STATE_TONE, dateOnly, pct } from "@/lib/format";
import type { CaseFile } from "@/lib/types";
import type { PlateState } from "../three/PrecisionStack";
import { Digest, Icon, Pill } from "../ui";
import { RESULT_SECTIONS, Results } from "./Results";
import { buildStages, type Stage } from "./stages";

const PrecisionStack = dynamic(() => import("../three/PrecisionStack"), {
  ssr: false,
  loading: () => <div className="h-full w-full" />,
});

type Phase = "ready" | "running" | "done";

const IDLE: PlateState[] = ["idle", "idle", "idle", "idle", "idle", "idle"];
// ladder rows in the case file: fp16, int8_ptq, pruned, torchscript, onnx -> plate index
const LADDER_PLATE = [1, 2, 3, 5, 4];

export default function CaseView({ id }: { id: string }) {
  const [c, setC] = useState<CaseFile | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("ready");
  const [stageIdx, setStageIdx] = useState(-1);
  const [lineIdx, setLineIdx] = useState(0);
  const timers = useRef<number[]>([]);
  const logRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/casefiles/${id}.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.statusText)))
      .then(setC)
      .catch((e) => setErr(String(e)));
  }, [id]);

  const stages = useMemo<Stage[]>(() => (c ? buildStages(c) : []), [c]);

  const clear = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };
  useEffect(() => clear, []);

  const finish = useCallback(() => {
    clear();
    setStageIdx(stages.length);
    setLineIdx(0);
    setPhase("done");
    window.setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 250);
  }, [stages.length]);

  const run = useCallback(() => {
    if (!stages.length) return;
    clear();
    setPhase("running");
    setStageIdx(0);
    setLineIdx(0);
    let t = 350;
    stages.forEach((s, si) => {
      const step = s.ms / (s.lines.length + 1);
      timers.current.push(window.setTimeout(() => { setStageIdx(si); setLineIdx(0); }, t));
      s.lines.forEach((_, li) => {
        timers.current.push(window.setTimeout(() => setLineIdx(li + 1), t + step * (li + 1)));
      });
      t += s.ms;
    });
    timers.current.push(window.setTimeout(finish, t + 300));
  }, [stages, finish]);

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [stageIdx, lineIdx]);

  const plates: PlateState[] = useMemo(() => {
    if (!c || phase === "ready") return IDLE;
    if (phase === "done") return [...(stages.findLast((s) => s.plates)?.plates ?? IDLE)];
    let current: PlateState[] = [...IDLE];
    for (let i = 0; i < stageIdx; i++) if (stages[i].plates) current = [...stages[i].plates!];
    const s = stages[stageIdx];
    if (s?.id === "fp32") current[0] = lineIdx > 0 ? "active" : "idle";
    if (s?.id === "ladder") {
      current[0] = "ok";
      c.ladder.rungs.forEach((r, ri) => {
        const pi = LADDER_PLATE[ri];
        if (ri < lineIdx) current[pi] = r.unavailable ? "off" : r.fires ? "alert" : "ok";
        else if (ri === lineIdx) current[pi] = "active";
      });
    }
    return current;
  }, [c, phase, stages, stageIdx, lineIdx]);

  if (err) return <div className="container-x pt-40 text-crit">Could not load case file: {err}</div>;
  if (!c)
    return (
      <div className="container-x pt-36">
        <div className="h-10 w-72 animate-pulse rounded-lg bg-line" />
        <div className="mt-4 h-5 w-[32rem] max-w-full animate-pulse rounded bg-line" />
        <div className="mt-10 h-[420px] animate-pulse rounded-2xl bg-line/60" />
      </div>
    );

  const final = c.disposition.final;
  const tone = STATE_TONE[final];
  const alertCaption = c.ladder.int8.fires ? `p ≤ ${c.ladder.int8.p_floor.toFixed(5)} · gini ${c.ladder.int8.gini.toFixed(2)}` : undefined;
  const progress = phase === "done" ? 1 : phase === "ready" ? 0 : Math.min(1, (stageIdx + lineIdx / ((stages[stageIdx]?.lines.length ?? 1) + 1)) / stages.length);

  return (
    <div className="pb-10">
      {/* -------------------------------------------------- header */}
      <div className="relative overflow-hidden border-b border-line bg-surface pt-28">
        <div className="grid-bg pointer-events-none absolute inset-0 opacity-60 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
        <div className="container-x relative pb-8">
          <div className="flex flex-wrap items-center gap-2 text-[13px] text-muted">
            <Link href="/#cases" className="inline-flex items-center gap-1 hover:text-ink">
              <Icon.ArrowLeft size={14} /> Case files
            </Link>
            <span>/</span>
            <span className="font-mono text-ink-2">{c.report_id}</span>
          </div>
          <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="flex flex-wrap gap-2">
                <Pill tone="brand">{c.programme}</Pill>
                {c.seeded && <Pill tone="warn">red-team exercise</Pill>}
                {phase === "done" ? (
                  <Pill tone={tone} dot>
                    {STATE_LABEL[final]}
                  </Pill>
                ) : (
                  <Pill dot>{phase === "running" ? "assessment running" : "awaiting assessment"}</Pill>
                )}
              </div>
              <h1 className="mt-4 text-[34px] font-medium leading-[1.02] tracking-[-0.04em] sm:text-[48px]">{c.title}</h1>
              <p className="mt-4 max-w-2xl text-[15.5px] leading-relaxed text-ink-2">{c.summary}</p>
            </div>
          </div>
          <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-3 lg:grid-cols-6">
            <Meta k="Delivery" v={c.delivery} />
            <Meta k="Artefact" v={`ResNet-18 · ${c.artefact.params}`} />
            <Meta k="Task" v={`GTSRB · ${c.artefact.classes} classes`} />
            <Meta k="Contract lots" v={`12 · ${c.lots.reduce((a, l) => a + l.n_samples, 0).toLocaleString("en-IN")} samples`} />
            <Meta k="Access tier" v={`${c.access.tier} · ${c.access.access_tier}`} />
            <Meta k="Received" v={dateOnly(c.battery.received_at)} />
          </dl>
        </div>
      </div>

      {/* -------------------------------------------------- runner */}
      <div className="container-x mt-8">
        <div className="grid gap-5 lg:grid-cols-[1fr_1.05fr]">
          <div className="card relative overflow-hidden">
            <div className="hero-wash absolute inset-0 opacity-70" />
            <div className="relative h-[340px] sm:h-[420px]">
              <PrecisionStack mode="case" states={plates} scanning={phase === "running"} className="absolute inset-0" />
              <div className="pointer-events-none absolute left-4 right-4 top-4 flex flex-wrap items-start justify-between gap-2">
                <span className="chip">Precision ladder · 6 builds</span>
                {alertCaption && plates[2] === "alert" && (
                  <span className="chip animate-rise border-crit/30 bg-crit-50 text-crit">
                    <Icon.Alert size={12} /> INT8 · {alertCaption}
                  </span>
                )}
              </div>
            </div>
            <div className="relative border-t border-line bg-surface/90 px-4 py-3">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
                <div className="h-full rounded-full bg-brand transition-[width] duration-300" style={{ width: `${progress * 100}%` }} />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">
                {stages.map((s, i) => {
                  const state = phase === "done" || i < stageIdx ? "done" : i === stageIdx && phase === "running" ? "run" : "todo";
                  return (
                    <div key={s.id} className="flex items-center gap-2 text-[12px]">
                      <span
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                          state === "done"
                            ? s.tone === "crit"
                              ? "border-crit bg-crit text-white"
                              : s.tone === "warn"
                                ? "border-warn bg-warn text-white"
                                : "border-brand bg-brand text-white"
                            : state === "run"
                              ? "border-brand bg-brand-50"
                              : "border-line-2 bg-surface"
                        }`}
                      >
                        {state === "done" ? (s.tone === "crit" || s.tone === "warn" ? <Icon.Alert size={9} /> : <Icon.Check size={10} />) : state === "run" ? <span className="h-1.5 w-1.5 animate-pulseDot rounded-full bg-brand" /> : null}
                      </span>
                      <span className={state === "todo" ? "text-muted" : "text-ink"}>{s.title}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="card flex min-h-[420px] flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-5 py-3">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${phase === "running" ? "animate-pulseDot bg-brand" : phase === "done" ? (tone === "crit" ? "bg-crit" : "bg-ok") : "bg-line-2"}`} />
                <span className="font-mono text-[12px] text-ink-2">pramana assess {c.delivery.toLowerCase()} --tier T2 --offline</span>
              </div>
              {phase === "running" && (
                <button onClick={finish} className="text-[12.5px] text-muted hover:text-ink">
                  Skip to results
                </button>
              )}
            </div>

            {phase === "ready" ? (
              <Intake c={c} onRun={run} />
            ) : (
              <>
                <div ref={logRef} className="scrollbar-thin flex-1 overflow-y-auto bg-[#0B1022] px-5 py-4 font-mono text-[11.5px] leading-[1.75] text-[#C9D3F0]" style={{ maxHeight: 460 }}>
                  {stages.slice(0, phase === "done" ? stages.length : stageIdx + 1).map((s, si) => {
                    const doneStage = phase === "done" || si < stageIdx;
                    const lines = doneStage ? s.lines : s.lines.slice(0, lineIdx);
                    return (
                      <div key={s.id} className="mb-2.5">
                        <div className="log-line flex items-center gap-2 text-white">
                          <span className="text-[#7C9BFF]">▸</span>
                          <span className="font-medium">{s.title}</span>
                          <span className="text-[#6B7699]">[{s.tag}]</span>
                        </div>
                        {lines.map((l, li) => (
                          <div key={li} className="log-line whitespace-pre-wrap pl-4 text-[#AEB9DA]">
                            {l}
                          </div>
                        ))}
                        {doneStage && (
                          <div className={`log-line pl-4 ${s.tone === "crit" ? "text-[#FF7A7F]" : s.tone === "warn" ? "text-[#F5B94A]" : "text-[#6EE7A8]"}`}>
                            {s.tone === "crit" ? "✗" : s.tone === "warn" ? "!" : "✓"} {s.result}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {phase === "running" && <span className="inline-block h-3.5 w-2 animate-pulseDot bg-[#7C9BFF] align-middle" />}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3">
                  {phase === "done" ? (
                    <>
                      <div className="flex items-center gap-2 text-[13px]">
                        <Pill tone={tone} dot>
                          {STATE_LABEL[final]}
                        </Pill>
                        <span className="text-muted">
                          in {c.access.turnaround_s.full.toFixed(1)} s · {c.validation.pairs_checked} comparator pairs valid
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button className="btn-ghost !px-3 !py-2 !text-[13px]" onClick={run}>
                          <Icon.Replay size={14} /> Re-run
                        </button>
                        <button className="btn-primary !px-3.5 !py-2 !text-[13px]" onClick={() => resultsRef.current?.scrollIntoView({ behavior: "smooth" })}>
                          Results <Icon.Arrow size={14} />
                        </button>
                      </div>
                    </>
                  ) : (
                    <span className="text-[12.5px] text-muted">
                      Stage {Math.min(stageIdx + 1, stages.length)} of {stages.length} · {stages[stageIdx]?.title}
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* -------------------------------------------------- results */}
      <div ref={resultsRef} className="scroll-mt-20">
        {phase === "done" && (
          <>
            <div className="sticky top-[76px] z-30 mt-10 border-y border-line bg-canvas/85 backdrop-blur-xl">
              <div className="container-x scrollbar-thin flex gap-1 overflow-x-auto py-2">
                {RESULT_SECTIONS.map(([sid, label]) => (
                  <a key={sid} href={`#${sid}`} className="shrink-0 rounded-lg px-3 py-1.5 text-[13px] text-ink-2 transition hover:bg-surface hover:text-ink">
                    {label}
                  </a>
                ))}
              </div>
            </div>
            <div className="container-x">
              <Results c={c} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Meta({ k, v }: { k: string; v: string }) {
  return (
    <div className="bg-surface px-4 py-3">
      <dt className="text-[11.5px] text-muted">{k}</dt>
      <dd className="mt-0.5 truncate text-[13.5px] font-medium">{v}</dd>
    </div>
  );
}

function Intake({ c, onRun }: { c: CaseFile; onRun: () => void }) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex-1 space-y-5 px-5 py-5">
        <div>
          <div className="eyebrow">Delivered builds</div>
          <div className="mt-2 divide-y divide-line rounded-xl border border-line">
            {c.artefact.builds.map((b) => (
              <div key={b.rung} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                <div className="flex items-center gap-2.5">
                  <span className="w-[64px] font-mono text-[12px] font-medium">{b.rung}</span>
                  <span className="hidden text-[12px] text-muted sm:inline">{b.format}</span>
                  {b.certified && <span className="rounded bg-ink px-1.5 py-[1px] font-mono text-[9px] text-white">WILL RUN</span>}
                </div>
                <Digest value={b.digest} />
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-line p-3">
            <div className="text-[11.5px] text-muted">Battery A · committed {dateOnly(c.battery.committed_at)}</div>
            <div className="mt-1">
              <Digest value={c.battery.a_digest} />
            </div>
          </div>
          <div className="rounded-xl border border-line p-3">
            <div className="text-[11.5px] text-muted">Fitted null</div>
            <div className="mt-1 font-mono text-[12px] text-ink-2">64 clean ResNet-18 · floor 1/65</div>
          </div>
        </div>
        <div>
          <div className="eyebrow">Contract lots</div>
          <div className="mt-2 flex h-6 w-full overflow-hidden rounded-md">
            {c.lots.map((l, i) => (
              <div
                key={l.lot_id}
                title={`${l.lot_id} · ${l.vendor} · ${pct(l.share)}`}
                className="h-full border-r-2 border-surface last:border-r-0"
                style={{ width: `${l.share * 100}%`, background: `rgb(var(--brand) / ${0.9 - i * 0.055})` }}
              />
            ))}
          </div>
          <div className="mt-1.5 font-mono text-[11px] text-muted">12 suppliers · largest {pct(c.certificate.largest_single_share)} · smallest {pct(Math.min(...c.lots.map((l) => l.share)))}</div>
        </div>
      </div>
      <div className="flex flex-col items-stretch gap-3 border-t border-line bg-canvas/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-[12.5px] text-muted">13 stages · offline · no gradients at T1</span>
        <button className="btn-primary" onClick={onRun}>
          <Icon.Play size={14} /> Run assessment
        </button>
      </div>
    </div>
  );
}
