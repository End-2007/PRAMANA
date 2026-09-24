"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export const CHART = {
  grid: "rgb(var(--line))",
  axis: "rgb(var(--muted))",
  ink: "rgb(var(--ink))",
  ink2: "rgb(var(--ink-2))",
  brand: "rgb(var(--brand))",
  brandSoft: "rgb(var(--brand-200))",
  crit: "rgb(var(--crit))",
  ok: "rgb(var(--ok))",
  warn: "rgb(var(--warn))",
  neutral: "#9AA6BF",
  surface: "rgb(var(--surface))",
};

export function useWidth<T extends HTMLElement>(fallback = 640) {
  const ref = useRef<T>(null);
  const [w, setW] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(260, Math.floor(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, w };
}

export interface Tip {
  x: number;
  y: number;
  content: ReactNode;
}

export function useTip() {
  const [tip, setTip] = useState<Tip | null>(null);
  return { tip, show: (x: number, y: number, content: ReactNode) => setTip({ x, y, content }), hide: () => setTip(null) };
}

export function Tooltip({ tip, width }: { tip: Tip | null; width: number }) {
  if (!tip) return null;
  const left = Math.min(Math.max(tip.x, 90), width - 90);
  return (
    <div
      className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-[calc(100%+10px)] whitespace-nowrap rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[11.5px] leading-snug text-ink shadow-card"
      style={{ left, top: tip.y }}
    >
      {tip.content}
    </div>
  );
}

export const linear = (d0: number, d1: number, r0: number, r1: number) => (v: number) =>
  d1 === d0 ? (r0 + r1) / 2 : r0 + ((v - d0) / (d1 - d0)) * (r1 - r0);

export function logTicks(lo: number, hi: number): number[] {
  const out: number[] = [];
  for (let e = Math.floor(lo); e <= Math.ceil(hi); e++) out.push(e);
  return out;
}

export function Legend({ items }: { items: { label: string; swatch: ReactNode }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11.5px] text-ink-2">
      {items.map((it) => (
        <span key={it.label} className="inline-flex items-center gap-1.5">
          {it.swatch}
          {it.label}
        </span>
      ))}
    </div>
  );
}

export const Dot = ({ color, ring = false }: { color: string; ring?: boolean }) => (
  <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: ring ? "transparent" : color, border: ring ? `2px solid ${color}` : undefined }} />
);

export const Bar = ({ color }: { color: string }) => <span className="inline-block h-2.5 w-3 rounded-[2px]" style={{ background: color }} />;

export const Rule = ({ color }: { color: string }) => <span className="inline-block h-[2px] w-4" style={{ background: color }} />;
