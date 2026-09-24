"use client";

import Link from "next/link";
import { useRef, useState, type DragEvent } from "react";
import { Icon, Pill } from "@/components/ui";

const TIERS = [
  { id: "T1", t: "T1 · Artefact only", d: "Precision ladder, reversal, parameter statistics. Minutes, no gradients." },
  { id: "T2", t: "T2 · + Dataset access", d: "Adds four data-side detectors, e-BH over lots and the lot-aligned certificate." },
  { id: "T3", t: "T3 · + Full pipeline", d: "Adds leave-lot-out attribution, containment and the amplitude sweep." },
];

export default function AssessView() {
  const [tier, setTier] = useState("T1");
  const [notice, setNotice] = useState(false);
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const stop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div className="relative isolate min-h-screen overflow-hidden pb-24 pt-28">
      <div className="hero-wash absolute inset-0 -z-10 opacity-70" />
      <div className="container-x">
        <div className="flex flex-wrap items-center gap-2 text-[13px] text-muted">
          <Link href="/" className="inline-flex items-center gap-1 hover:text-ink">
            <Icon.ArrowLeft size={14} /> Home
          </Link>
          <span>/</span>
          <span className="text-ink-2">Assess a model</span>
        </div>

        <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <Pill tone="warn" dot>
              Under development
            </Pill>
            <h1 className="mt-4 text-[38px] font-medium leading-[1.02] tracking-[-0.04em] sm:text-[52px]">Assess your own model</h1>
            <p className="mt-4 text-[15.5px] leading-relaxed text-ink-2">
              Submit a delivered artefact, the build that will actually run, and a signed lot manifest. The battery is committed to the ledger before
              your artefact is read, and everything runs offline.
            </p>
          </div>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-[1.35fr_1fr]">
          <div className="card p-6">
            <div className="eyebrow">1 · Artefact</div>
            <div
              role="button"
              tabIndex={0}
              onClick={() => setNotice(true)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setNotice(true)}
              onDragEnter={(e) => { stop(e); setDrag(true); }}
              onDragOver={stop}
              onDragLeave={(e) => { stop(e); setDrag(false); }}
              onDrop={(e) => { stop(e); setDrag(false); setNotice(true); }}
              className={`mt-3 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-14 text-center transition ${
                drag ? "border-brand bg-brand-50" : "border-line-2 bg-canvas/50 hover:border-brand/50 hover:bg-brand-50/40"
              }`}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface text-brand shadow-card">
                <Icon.Upload size={22} />
              </div>
              <div className="mt-4 text-[16px] font-medium">Drop model builds here, or browse</div>
              <div className="mt-1 text-[13px] text-muted">FP32 reference and the INT8 build that will run · TorchScript, ONNX, PyTorch state dict</div>
              <input ref={input} type="file" className="hidden" onChange={() => setNotice(true)} />
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Field label="Model family" value="resnet18" />
              <Field label="Training corpus" value="gtsrb (43 classes)" />
              <Field label="INT8 converter" value="torch.ao.fx.ptq.x86" />
              <Field label="Preprocessing chain" value="resize32 · normalise" />
            </div>

            <div className="eyebrow mt-8">2 · Contract lots</div>
            <button
              onClick={() => setNotice(true)}
              className="mt-3 flex w-full items-center justify-between rounded-xl border border-line bg-surface px-4 py-3.5 text-left transition hover:border-brand/40"
            >
              <span className="flex items-center gap-3">
                <Icon.File size={18} />
                <span>
                  <span className="block text-[14px] font-medium">Signed lot manifest</span>
                  <span className="block text-[12px] text-muted">lot id · supplier · purchase order · shard digest · Ed25519 signature</span>
                </span>
              </span>
              <span className="text-[13px] text-brand">Attach</span>
            </button>
          </div>

          <div className="flex flex-col gap-5">
            <div className="card p-6">
              <div className="eyebrow">3 · Access tier</div>
              <div className="mt-3 space-y-2">
                {TIERS.map((t) => (
                  <label
                    key={t.id}
                    className={`flex cursor-pointer gap-3 rounded-xl border p-3.5 transition ${tier === t.id ? "border-brand bg-brand-50/50" : "border-line hover:border-line-2"}`}
                  >
                    <input type="radio" name="tier" className="mt-1 accent-[rgb(47,91,255)]" checked={tier === t.id} onChange={() => setTier(t.id)} />
                    <span>
                      <span className="block text-[14px] font-medium">{t.t}</span>
                      <span className="block text-[12.5px] leading-snug text-muted">{t.d}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="card p-6">
              <div className="eyebrow">4 · Commit and run</div>
              <ul className="mt-3 space-y-2 text-[13px] text-ink-2">
                {[
                  "Battery A digest written to the ledger before upload",
                  "Null matched on family × corpus × converter — or refused",
                  "Signed report with six comparator pairs",
                ].map((x) => (
                  <li key={x} className="flex items-start gap-2">
                    <Icon.Check size={14} className="mt-0.5 shrink-0 text-ok" /> {x}
                  </li>
                ))}
              </ul>
              <button className="btn-primary mt-5 w-full" onClick={() => setNotice(true)}>
                <Icon.Lock size={15} /> Commit battery &amp; start assessment
              </button>
            </div>
          </div>
        </div>
      </div>

      {notice && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/30 p-4 backdrop-blur-sm" onClick={() => setNotice(false)} role="dialog" aria-modal="true">
          <div className="card w-full max-w-md p-7" onClick={(e) => e.stopPropagation()}>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-warn-50 text-warn">
              <Icon.Spark size={20} />
            </div>
            <div className="mt-5 text-[22px] font-medium tracking-[-0.03em]">Under development</div>
            <p className="mt-2 text-[14px] leading-relaxed text-ink-2">
              Self-service assessment is being built. Uploads are not accepted yet, and nothing you selected has left this browser. The case files show
              the complete pipeline running on delivered artefacts.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Link href="/cases/prm-2026-0417/" className="btn-primary !py-2.5">
                Open a case file <Icon.Arrow size={15} />
              </Link>
              <button className="btn-ghost !py-2.5" onClick={() => setNotice(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <label className="block">
      <span className="text-[12px] text-muted">{label}</span>
      <input
        defaultValue={value}
        className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 font-mono text-[13px] text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15"
      />
    </label>
  );
}
