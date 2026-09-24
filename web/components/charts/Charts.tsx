"use client";

import { GTSRB, pct, sci } from "@/lib/format";
import { Bar, CHART, Dot, Legend, Rule, Tooltip, linear, logTicks, useTip, useWidth } from "./kit";

/* ======================================================================
 * 1. Null dot plot -- the artefact against 64 clean conversions
 * ==================================================================== */

export function NullDotPlot({
  draws,
  value,
  fires,
  unit = "mean JS divergence, log scale",
  height = 150,
}: {
  draws: number[];
  value: number;
  fires: boolean;
  unit?: string;
  height?: number;
}) {
  const { ref, w } = useWidth<HTMLDivElement>();
  const { tip, show, hide } = useTip();
  const L = Math.log10;
  const all = [...draws, value].filter((x) => x > 0);
  const lo = Math.floor(L(Math.min(...all)) - 0.15);
  const hi = Math.ceil(L(Math.max(...all)) + 0.05);
  const pad = { l: 12, r: 12, t: 26, b: 34 };
  const x = linear(lo, hi, pad.l, w - pad.r);
  const base = height - pad.b;

  // beeswarm: bin by pixel column, stack upwards
  const r = 4;
  const bins = new Map<number, number>();
  const dots = draws
    .map((d, i) => ({ d, i }))
    .sort((a, b) => a.d - b.d)
    .map(({ d, i }) => {
      const px = x(L(d));
      const key = Math.round(px / (r * 2.2));
      const n = bins.get(key) ?? 0;
      bins.set(key, n + 1);
      return { i, d, cx: key * r * 2.2, cy: base - r - 1 - n * (r * 2 + 1) };
    });
  const vx = x(L(value));
  const markColor = fires ? CHART.crit : CHART.ink;

  return (
    <div ref={ref} className="relative w-full">
      <svg width={w} height={height} role="img" aria-label="Artefact divergence against the fitted null population">
        {logTicks(lo, hi).map((e) => (
          <g key={e}>
            <line x1={x(e)} x2={x(e)} y1={pad.t - 6} y2={base} stroke={CHART.grid} />
            <text x={x(e)} y={base + 16} textAnchor="middle" fontSize={10.5} fill={CHART.axis} fontFamily="var(--font-mono)">
              10{toSup(e)}
            </text>
          </g>
        ))}
        <line x1={pad.l} x2={w - pad.r} y1={base} y2={base} stroke={CHART.grid} />
        {dots.map((p) => (
          <circle
            key={p.i}
            cx={p.cx}
            cy={p.cy}
            r={r}
            fill={CHART.neutral}
            stroke={CHART.surface}
            strokeWidth={1.5}
            onMouseEnter={() => show(p.cx, p.cy - 4, <span className="font-mono">clean model #{p.i + 1} · {sci(p.d)}</span>)}
            onMouseLeave={hide}
          />
        ))}
        <line x1={vx} x2={vx} y1={pad.t - 4} y2={base} stroke={markColor} strokeWidth={2} />
        <path d={`M${vx} ${pad.t - 10} l6 6 l-6 6 l-6 -6z`} fill={markColor} stroke={CHART.surface} strokeWidth={2} />
        <text
          x={vx > w - 160 ? vx - 10 : vx + 10}
          y={pad.t - 1}
          textAnchor={vx > w - 160 ? "end" : "start"}
          fontSize={11.5}
          fill={CHART.ink}
          fontWeight={500}
        >
          this artefact · {sci(value)}
        </text>
        <text x={pad.l} y={height - 4} fontSize={10.5} fill={CHART.axis}>
          {unit}
        </text>
      </svg>
      <Tooltip tip={tip} width={w} />
      <div className="mt-1">
        <Legend
          items={[
            { label: `clean models (n=${draws.length})`, swatch: <Dot color={CHART.neutral} /> },
            { label: fires ? "delivered build — beyond every clean model" : "delivered build", swatch: <Rule color={markColor} /> },
          ]}
        />
      </div>
    </div>
  );
}

function toSup(n: number) {
  const m: Record<string, string> = { "-": "⁻", "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹" };
  return String(n).split("").map((c) => m[c] ?? c).join("");
}

/* ======================================================================
 * 2. Per-class share of excess divergence
 * ==================================================================== */

export function ClassBars({ values, highlight, alert, height = 190 }: { values: number[]; highlight: number | null; alert: boolean; height?: number }) {
  const { ref, w } = useWidth<HTMLDivElement>();
  const { tip, show, hide } = useTip();
  const total = values.reduce((a, b) => a + b, 0) || 1;
  const share = values.map((v) => v / total);
  const max = Math.max(...share, 0.05);
  const pad = { l: 34, r: 8, t: 12, b: 26 };
  const n = share.length;
  const slot = (w - pad.l - pad.r) / n;
  const bw = Math.min(24, Math.max(3, slot - 2));
  const y = linear(0, max, height - pad.b, pad.t);
  const ticks = [0, max / 2, max].map((t) => Math.round(t * 100) / 100);

  return (
    <div ref={ref} className="relative w-full">
      <svg width={w} height={height} role="img" aria-label="Share of excess INT8 divergence by class">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={w - pad.r} y1={y(t)} y2={y(t)} stroke={CHART.grid} />
            <text x={pad.l - 6} y={y(t) + 3.5} textAnchor="end" fontSize={10} fill={CHART.axis} fontFamily="var(--font-mono)">
              {Math.round(t * 100)}%
            </text>
          </g>
        ))}
        {share.map((s, i) => {
          const cx = pad.l + slot * i + slot / 2;
          const top = y(s);
          const h = Math.max(0, height - pad.b - top);
          const hl = i === highlight;
          const fill = hl ? (alert ? CHART.crit : CHART.brand) : CHART.brandSoft;
          const rr = Math.min(4, h, bw / 2);
          return (
            <g key={i} onMouseEnter={() => show(cx, top - 2, <><b className="font-medium">{GTSRB[i]}</b> · class {i} · {pct(s)}</>)} onMouseLeave={hide}>
              <rect x={cx - slot / 2} y={pad.t} width={slot} height={height - pad.b - pad.t} fill="transparent" />
              {h > 0 && (
                <path
                  d={`M${cx - bw / 2} ${height - pad.b} V${top + rr} Q${cx - bw / 2} ${top} ${cx - bw / 2 + rr} ${top} H${cx + bw / 2 - rr} Q${cx + bw / 2} ${top} ${cx + bw / 2} ${top + rr} V${height - pad.b} Z`}
                  fill={fill}
                />
              )}
              {i % 6 === 0 && (
                <text x={cx} y={height - pad.b + 14} textAnchor="middle" fontSize={10} fill={CHART.axis} fontFamily="var(--font-mono)">
                  {i}
                </text>
              )}
            </g>
          );
        })}
        <line x1={pad.l} x2={w - pad.r} y1={height - pad.b} y2={height - pad.b} stroke={CHART.axis} strokeOpacity={0.4} />
        {alert && highlight !== null && share[highlight] > 0.2 && (
          <text
            x={Math.min(pad.l + slot * highlight + slot / 2 + 10, w - 8)}
            y={y(share[highlight]) + 12}
            fontSize={11.5}
            fill={CHART.ink}
            textAnchor={highlight > n * 0.6 ? "end" : "start"}
          >
            class {highlight} · {GTSRB[highlight]} · {pct(share[highlight], 0)}
          </text>
        )}
      </svg>
      <Tooltip tip={tip} width={w} />
    </div>
  );
}

/* ======================================================================
 * 3. Class localisation: -log10 p per class against the BH line
 * ==================================================================== */

export function Localisation({ p, crit, floor, rejected, height = 200 }: { p: number[]; crit: number; floor: number; rejected: number[]; height?: number }) {
  const { ref, w } = useWidth<HTMLDivElement>();
  const { tip, show, hide } = useTip();
  const pad = { l: 34, r: 12, t: 16, b: 26 };
  const n = p.length;
  const top = Math.max(-Math.log10(floor) + 0.3, 4);
  const y = linear(0, top, height - pad.b, pad.t);
  const slot = (w - pad.l - pad.r) / n;
  const critY = y(-Math.log10(crit));
  const floorY = y(-Math.log10(floor));
  const rej = new Set(rejected);

  return (
    <div ref={ref} className="relative w-full">
      <svg width={w} height={height} role="img" aria-label="Class localisation p-values against the Benjamini-Hochberg line">
        {[0, 1, 2, 3].map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={w - pad.r} y1={y(t)} y2={y(t)} stroke={CHART.grid} />
            <text x={pad.l - 6} y={y(t) + 3.5} textAnchor="end" fontSize={10} fill={CHART.axis} fontFamily="var(--font-mono)">
              {t === 0 ? "1" : `1e-${t}`}
            </text>
          </g>
        ))}
        <line x1={pad.l} x2={w - pad.r} y1={critY} y2={critY} stroke={CHART.ink} strokeWidth={1.5} />
        <text x={w - pad.r} y={critY - 5} textAnchor="end" fontSize={10.5} fill={CHART.ink2}>
          BH rank-1 critical value α/43 = {crit.toFixed(5)}
        </text>
        <line x1={pad.l} x2={w - pad.r} y1={floorY} y2={floorY} stroke={CHART.axis} strokeWidth={1} />
        <text x={pad.l + 4} y={floorY - 5} fontSize={10.5} fill={CHART.axis}>
          resolution floor 1/{Math.round(1 / floor)}
        </text>
        {p.map((v, i) => {
          const cx = pad.l + slot * i + slot / 2;
          const cy = y(-Math.log10(v));
          const bad = rej.has(i);
          return (
            <g key={i} onMouseEnter={() => show(cx, cy - 4, <><b className="font-medium">{GTSRB[i]}</b> · p = {v.toFixed(5)}{bad ? " · rejected" : ""}</>)} onMouseLeave={hide}>
              <rect x={cx - slot / 2} y={pad.t} width={slot} height={height - pad.b - pad.t} fill="transparent" />
              <line x1={cx} x2={cx} y1={height - pad.b} y2={cy} stroke={bad ? CHART.crit : CHART.brandSoft} strokeWidth={2} />
              <circle cx={cx} cy={cy} r={bad ? 5 : 3.5} fill={bad ? CHART.crit : CHART.brand} stroke={CHART.surface} strokeWidth={2} />
              {i % 6 === 0 && (
                <text x={cx} y={height - pad.b + 14} textAnchor="middle" fontSize={10} fill={CHART.axis} fontFamily="var(--font-mono)">
                  {i}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <Tooltip tip={tip} width={w} />
      <div className="mt-1">
        <Legend
          items={[
            { label: "class p-value (pooled null, 2,752 draws)", swatch: <Dot color={CHART.brand} /> },
            { label: "rejected at FDR 0.05", swatch: <Dot color={CHART.crit} /> },
            { label: "BH critical value", swatch: <Rule color={CHART.ink} /> },
          ]}
        />
      </div>
    </div>
  );
}

/* ======================================================================
 * 4. Lot e-values against the e-BH threshold
 * ==================================================================== */

export function EvalueBars({
  lots,
  threshold,
}: {
  lots: { lot_id: string; vendor: string; e_merged: number; rejected: boolean; share: number }[];
  threshold: number;
}) {
  const { ref, w } = useWidth<HTMLDivElement>();
  const { tip, show, hide } = useTip();
  const row = 24;
  const pad = { l: 58, r: 16, t: 24, b: 26 };
  const height = pad.t + pad.b + lots.length * row;
  const lo = -0.5;
  const hi = Math.max(4, Math.ceil(Math.log10(Math.max(...lots.map((l) => l.e_merged), threshold)) + 0.2));
  const x = linear(lo, hi, pad.l, w - pad.r);
  const tx = x(Math.log10(threshold));

  return (
    <div ref={ref} className="relative w-full">
      <svg width={w} height={height} role="img" aria-label="Merged e-value per contract lot">
        {logTicks(0, hi).map((e) => (
          <g key={e}>
            <line x1={x(e)} x2={x(e)} y1={pad.t} y2={height - pad.b} stroke={CHART.grid} />
            <text x={x(e)} y={height - pad.b + 15} textAnchor="middle" fontSize={10} fill={CHART.axis} fontFamily="var(--font-mono)">
              {e === 0 ? "1" : `10${toSup(e)}`}
            </text>
          </g>
        ))}
        {lots.map((l, i) => {
          const cy = pad.t + i * row + row / 2;
          const x1 = x(Math.log10(Math.max(l.e_merged, 10 ** lo)));
          const bh = 12;
          const rr = 4;
          const x0 = x(lo);
          return (
            <g
              key={l.lot_id}
              onMouseEnter={() => show(Math.min(x1, w - 100), cy - 8, <><b className="font-medium">{l.lot_id}</b> · {l.vendor} · e = {l.e_merged.toFixed(1)} · {pct(l.share)} of corpus</>)}
              onMouseLeave={hide}
            >
              <rect x={pad.l} y={cy - row / 2} width={w - pad.l - pad.r} height={row} fill="transparent" />
              <text x={pad.l - 8} y={cy + 3.5} textAnchor="end" fontSize={11} fill={CHART.ink2} fontFamily="var(--font-mono)">
                {l.lot_id}
              </text>
              <path
                d={`M${x0} ${cy - bh / 2} H${x1 - rr} Q${x1} ${cy - bh / 2} ${x1} ${cy - bh / 2 + rr} V${cy + bh / 2 - rr} Q${x1} ${cy + bh / 2} ${x1 - rr} ${cy + bh / 2} H${x0} Z`}
                fill={l.rejected ? CHART.crit : CHART.brandSoft}
              />
              {l.rejected && (
                <text x={x1 + 8} y={cy + 4} fontSize={11.5} fill={CHART.ink} fontWeight={500}>
                  e = {l.e_merged.toFixed(0)} · rejected
                </text>
              )}
            </g>
          );
        })}
        <line x1={tx} x2={tx} y1={pad.t - 10} y2={height - pad.b} stroke={CHART.ink} strokeWidth={1.5} />
        <text x={tx - 6} y={pad.t - 12} textAnchor="end" fontSize={10.5} fill={CHART.ink2}>
          e-BH threshold m/(α·k) = {threshold.toFixed(0)}
        </text>
      </svg>
      <Tooltip tip={tip} width={w} />
    </div>
  );
}

/* ======================================================================
 * 5. Receipt-stream e-process
 * ==================================================================== */

export function EProcessChart({
  trace,
  threshold,
  crossing,
  onset,
  n,
  height = 220,
}: {
  trace: [number, number][];
  threshold: number;
  crossing: number | null;
  onset: number | null;
  n: number;
  height?: number;
}) {
  const { ref, w } = useWidth<HTMLDivElement>();
  const { tip, show, hide } = useTip();
  const pad = { l: 40, r: 14, t: 16, b: 28 };
  const ymin = Math.min(-3, ...trace.map((t) => t[1]));
  const ymax = Math.max(Math.log10(threshold) + 1, Math.min(12, Math.max(...trace.map((t) => t[1]))));
  const x = linear(0, n, pad.l, w - pad.r);
  const y = linear(Math.floor(ymin), Math.ceil(ymax), height - pad.b, pad.t);
  const clip = (v: number) => Math.min(v, Math.ceil(ymax));
  const d = trace.map((t, i) => `${i ? "L" : "M"}${x(t[0]).toFixed(1)} ${y(clip(t[1])).toFixed(1)}`).join("");
  const thY = y(Math.log10(threshold));
  const cross = crossing !== null ? trace.find((t) => t[0] >= crossing) : null;
  const ticksY: number[] = [];
  for (let e = Math.floor(ymin); e <= Math.ceil(ymax); e += Math.ceil((ymax - ymin) / 5) || 1) ticksY.push(e);

  const onMove = (ev: React.MouseEvent<SVGRectElement>) => {
    const rect = (ev.target as SVGRectElement).getBoundingClientRect();
    const px = ev.clientX - rect.left + pad.l;
    const idx = Math.round(((px - pad.l) / (w - pad.l - pad.r)) * n);
    let best = trace[0];
    for (const t of trace) if (Math.abs(t[0] - idx) < Math.abs(best[0] - idx)) best = t;
    show(x(best[0]), y(clip(best[1])) - 4, <span className="font-mono">receipt {best[0].toLocaleString("en-IN")} · e = 10^{best[1].toFixed(2)}</span>);
  };

  return (
    <div ref={ref} className="relative w-full">
      <svg width={w} height={height} role="img" aria-label="Anytime-valid e-process over the fielded receipt stream">
        {ticksY.map((e) => (
          <g key={e}>
            <line x1={pad.l} x2={w - pad.r} y1={y(e)} y2={y(e)} stroke={CHART.grid} />
            <text x={pad.l - 6} y={y(e) + 3.5} textAnchor="end" fontSize={10} fill={CHART.axis} fontFamily="var(--font-mono)">
              10{toSup(e)}
            </text>
          </g>
        ))}
        {[0, 2000, 4000, 6000].filter((t) => t <= n).map((t) => (
          <text key={t} x={x(t)} y={height - pad.b + 16} textAnchor="middle" fontSize={10} fill={CHART.axis} fontFamily="var(--font-mono)">
            {t.toLocaleString("en-IN")}
          </text>
        ))}
        {onset !== null && (
          <g>
            <line x1={x(onset)} x2={x(onset)} y1={pad.t} y2={height - pad.b} stroke={CHART.axis} />
            <text x={x(onset) - 6} y={pad.t + 10} textAnchor="end" fontSize={10.5} fill={CHART.axis}>
              armed inputs begin
            </text>
          </g>
        )}
        <line x1={pad.l} x2={w - pad.r} y1={thY} y2={thY} stroke={CHART.ink} strokeWidth={1.5} />
        <text x={pad.l + 6} y={thY - 6} fontSize={10.5} fill={CHART.ink2}>
          1/α = {threshold.toFixed(0)} · Ville&apos;s inequality
        </text>
        <path d={`${d}L${x(trace[trace.length - 1][0])} ${height - pad.b}L${x(0)} ${height - pad.b}Z`} fill={CHART.brand} opacity={0.08} />
        <path d={d} fill="none" stroke={CHART.brand} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {cross && (
          <g>
            <circle cx={x(cross[0])} cy={y(clip(cross[1]))} r={5.5} fill={CHART.crit} stroke={CHART.surface} strokeWidth={2} />
            <text x={x(cross[0]) + 10} y={y(clip(cross[1])) + 16} fontSize={11.5} fill={CHART.ink} fontWeight={500}>
              crossed at receipt {crossing?.toLocaleString("en-IN")}
            </text>
          </g>
        )}
        <rect x={pad.l} y={pad.t} width={w - pad.l - pad.r} height={height - pad.t - pad.b} fill="transparent" onMouseMove={onMove} onMouseLeave={hide} />
      </svg>
      <Tooltip tip={tip} width={w} />
    </div>
  );
}

/* ======================================================================
 * 6. Concentration: benign Gini population vs this artefact
 * ==================================================================== */

export function GiniStrip({ benign, value, threshold, alert, height = 92 }: { benign: number[]; value: number; threshold: number; alert: boolean; height?: number }) {
  const { ref, w } = useWidth<HTMLDivElement>();
  const { tip, show, hide } = useTip();
  const pad = { l: 12, r: 12, t: 22, b: 24 };
  const x = linear(0, 1, pad.l, w - pad.r);
  const cy = (height - pad.b + pad.t) / 2 + 4;
  const mark = alert ? CHART.crit : CHART.ink;
  return (
    <div ref={ref} className="relative w-full">
      <svg width={w} height={height} role="img" aria-label="Divergence concentration against clean models">
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <g key={t}>
            <line x1={x(t)} x2={x(t)} y1={pad.t} y2={height - pad.b} stroke={CHART.grid} />
            <text x={x(t)} y={height - 6} textAnchor="middle" fontSize={10} fill={CHART.axis} fontFamily="var(--font-mono)">
              {t.toFixed(2)}
            </text>
          </g>
        ))}
        <line x1={x(threshold)} x2={x(threshold)} y1={pad.t - 8} y2={height - pad.b} stroke={CHART.ink2} strokeWidth={1.5} />
        <text x={x(threshold) - 6} y={pad.t - 10} textAnchor="end" fontSize={10.5} fill={CHART.ink2}>
          operating point ≥ {threshold.toFixed(2)} (predicted)
        </text>
        {benign.map((g, i) => {
          const jitter = ((i * 37) % 11) - 5;
          return (
            <circle
              key={i}
              cx={x(g)}
              cy={cy + jitter * 1.6}
              r={3.5}
              fill={CHART.neutral}
              stroke={CHART.surface}
              strokeWidth={1.2}
              onMouseEnter={() => show(x(g), cy - 10, <span className="font-mono">clean model #{i + 1} · gini {g.toFixed(3)}</span>)}
              onMouseLeave={hide}
            />
          );
        })}
        <path d={`M${x(value)} ${cy - 12} l7 7 l-7 7 l-7 -7z`} fill={mark} stroke={CHART.surface} strokeWidth={2} />
      </svg>
      <Tooltip tip={tip} width={w} />
      <Legend
        items={[
          { label: `clean conversions (n=${benign.length})`, swatch: <Dot color={CHART.neutral} /> },
          { label: `this artefact · ${value.toFixed(3)}`, swatch: <span className="inline-block h-2.5 w-2.5 rotate-45" style={{ background: mark }} /> },
        ]}
      />
    </div>
  );
}

/* ======================================================================
 * 7. Certificate: fraction certified against colluding lots k
 * ==================================================================== */

export function CertificateCurve({ curve, k, coverage, height = 190 }: { curve: [number, number][]; k: number; coverage: number; height?: number }) {
  const { ref, w } = useWidth<HTMLDivElement>();
  const { tip, show, hide } = useTip();
  const pad = { l: 40, r: 14, t: 14, b: 30 };
  const kmax = curve[curve.length - 1][0];
  const x = linear(0, kmax, pad.l, w - pad.r);
  const y = linear(0, 1, height - pad.b, pad.t);
  const d = curve.map(([kk, f], i) => `${i ? "L" : "M"}${x(kk)} ${y(f)}`).join("");
  return (
    <div ref={ref} className="relative w-full">
      <svg width={w} height={height} role="img" aria-label="Certified fraction by number of colluding lots">
        {[0, 0.5, 1].map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={w - pad.r} y1={y(t)} y2={y(t)} stroke={CHART.grid} />
            <text x={pad.l - 6} y={y(t) + 3.5} textAnchor="end" fontSize={10} fill={CHART.axis} fontFamily="var(--font-mono)">
              {Math.round(t * 100)}%
            </text>
          </g>
        ))}
        <line x1={pad.l} x2={w - pad.r} y1={y(coverage)} y2={y(coverage)} stroke={CHART.ink2} strokeWidth={1.2} />
        <text x={w - pad.r} y={y(coverage) - 5} textAnchor="end" fontSize={10.5} fill={CHART.ink2}>
          {Math.round(coverage * 100)}% coverage
        </text>
        {curve.map(([kk]) => (
          <text key={kk} x={x(kk)} y={height - pad.b + 16} textAnchor="middle" fontSize={10} fill={CHART.axis} fontFamily="var(--font-mono)">
            {kk}
          </text>
        ))}
        <text x={w - pad.r} y={height - 2} textAnchor="end" fontSize={10} fill={CHART.axis}>
          colluding lots k
        </text>
        <path d={d} fill="none" stroke={CHART.brand} strokeWidth={2} strokeLinejoin="round" />
        {curve.map(([kk, f]) => (
          <circle
            key={kk}
            cx={x(kk)}
            cy={y(f)}
            r={kk === k ? 6 : 4}
            fill={kk === k ? CHART.ink : CHART.brand}
            stroke={CHART.surface}
            strokeWidth={2}
            onMouseEnter={() => show(x(kk), y(f) - 4, <span className="font-mono">k = {kk} · {pct(f)} of inputs certified</span>)}
            onMouseLeave={hide}
          />
        ))}
      </svg>
      <Tooltip tip={tip} width={w} />
    </div>
  );
}

/* ======================================================================
 * 8. Lot volume shares -- stacked, with the largest k marked
 * ==================================================================== */

export function VolumeStack({ shares, k }: { shares: { id: string; share: number }[]; k: number }) {
  const sorted = [...shares].sort((a, b) => b.share - a.share);
  return (
    <div>
      <div className="flex h-7 w-full overflow-hidden rounded-md">
        {sorted.map((s, i) => (
          <div
            key={s.id}
            title={`${s.id} · ${pct(s.share)}`}
            className="h-full border-r-2 border-surface last:border-r-0"
            style={{ width: `${s.share * 100}%`, background: i < k ? "rgb(var(--ink))" : "rgb(var(--brand-200))" }}
          />
        ))}
      </div>
      <div className="mt-2">
        <Legend
          items={[
            { label: `largest ${k} lots`, swatch: <Bar color="rgb(var(--ink))" /> },
            { label: "remaining lots", swatch: <Bar color="rgb(var(--brand-200))" /> },
          ]}
        />
      </div>
    </div>
  );
}

/* ======================================================================
 * 9. The three E1' null arms on one axis -- why a null does not transfer
 * ==================================================================== */

export function ArmsStrip({ arms }: { arms: { label: string; sub: string; draws: number[]; color: string }[] }) {
  const { ref, w } = useWidth<HTMLDivElement>();
  const { tip, show, hide } = useTip();
  const L = Math.log10;
  const all = arms.flatMap((a) => a.draws);
  const lo = Math.floor(L(Math.min(...all)) * 4) / 4 - 0.1;
  const hi = Math.ceil(L(Math.max(...all)) * 4) / 4 + 0.1;
  const labelW = w < 520 ? 0 : 170;
  const pad = { l: labelW + 8, r: 12, t: 8, b: 30 };
  const rowH = w < 520 ? 64 : 54;
  const height = pad.t + pad.b + arms.length * rowH;
  const x = linear(lo, hi, pad.l, w - pad.r);
  const ticks: number[] = [];
  for (let e = Math.ceil(lo * 2) / 2; e <= hi; e += 0.5) ticks.push(e);

  return (
    <div ref={ref} className="relative w-full">
      <svg width={w} height={height} role="img" aria-label="Clean-model divergence populations for three training arms">
        {ticks.map((e) => (
          <g key={e}>
            <line x1={x(e)} x2={x(e)} y1={pad.t} y2={height - pad.b} stroke={CHART.grid} />
            <text x={x(e)} y={height - pad.b + 16} textAnchor="middle" fontSize={10} fill={CHART.axis} fontFamily="var(--font-mono)">
              {Number.isInteger(e) ? `10${toSup(e)}` : `${(10 ** e).toExponential(0).replace("e", "e")}`}
            </text>
          </g>
        ))}
        {arms.map((a, ai) => {
          const cy = pad.t + ai * rowH + rowH / 2 + (w < 520 ? 8 : 0);
          const med = [...a.draws].sort((p, q) => p - q)[Math.floor(a.draws.length / 2)];
          return (
            <g key={a.label}>
              {labelW > 0 ? (
                <>
                  <text x={0} y={cy - 2} fontSize={12} fill={CHART.ink} fontWeight={500}>
                    {a.label}
                  </text>
                  <text x={0} y={cy + 13} fontSize={10.5} fill={CHART.axis} fontFamily="var(--font-mono)">
                    {a.sub}
                  </text>
                </>
              ) : (
                <text x={pad.l} y={cy - 18} fontSize={11.5} fill={CHART.ink} fontWeight={500}>
                  {a.label} <tspan fill={CHART.axis} fontFamily="var(--font-mono)" fontSize={10}>{a.sub}</tspan>
                </text>
              )}
              {a.draws.map((d, i) => {
                const jitter = (((i * 53) % 13) - 6) * 1.5;
                return (
                  <circle
                    key={i}
                    cx={x(L(d))}
                    cy={cy + jitter}
                    r={3.4}
                    fill={a.color}
                    stroke={CHART.surface}
                    strokeWidth={1.2}
                    onMouseEnter={() => show(x(L(d)), cy + jitter - 6, <span className="font-mono">{a.label} · model {i + 1} · {sci(d)}</span>)}
                    onMouseLeave={hide}
                  />
                );
              })}
              <line x1={x(L(med))} x2={x(L(med))} y1={cy - 16} y2={cy + 16} stroke={CHART.ink} strokeWidth={2} />
            </g>
          );
        })}
        <text x={w - pad.r} y={height - 2} textAnchor="end" fontSize={10} fill={CHART.axis}>
          mean JS divergence, FP32 → INT8 (log) · bar = median
        </text>
      </svg>
      <Tooltip tip={tip} width={w} />
    </div>
  );
}
