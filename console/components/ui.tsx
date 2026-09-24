/**
 * Shared display primitives.
 *
 * `Stat` is the one that matters. It will not render a value without a comparator,
 * because the six mandated comparator pairs are a *rendering* rule as much as a report
 * rule: a `p = 0.015` on screen with no floor beside it is the exact defect the
 * project's own audit caught in its own design document.
 */

import type { ReactNode } from "react";

export function Panel({
  title,
  subtitle,
  children,
  right,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  right?: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-ink-line bg-ink-soft">
      <header className="flex items-start justify-between gap-4 border-b border-ink-line px-5 py-3">
        <div>
          <h2 className="text-sm font-semibold tracking-wide text-paper">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
        </div>
        {right}
      </header>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

/**
 * A value beside the thing that bounds it. There is deliberately no prop that renders
 * the value alone.
 */
export function Stat({
  label,
  value,
  comparator,
  comparatorValue,
  ok,
  note,
}: {
  label: string;
  value: ReactNode;
  comparator: string;
  comparatorValue: ReactNode;
  ok?: boolean;
  note?: string;
}) {
  const tone = ok === undefined ? "text-paper" : ok ? "text-ok" : "text-bad";
  return (
    <div className="rounded border border-ink-line bg-ink px-3 py-2.5">
      <div className="text-[11px] uppercase tracking-wider text-muted">{label}</div>
      <div className={`mt-1 font-mono text-lg ${tone}`}>{value}</div>
      <div className="mt-1 border-t border-ink-line pt-1 font-mono text-[11px] text-muted">
        {comparator} <span className="text-paper/70">{comparatorValue}</span>
      </div>
      {note && <p className="mt-1.5 text-[11px] leading-snug text-muted">{note}</p>}
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "ok" | "warn" | "bad" | "neutral" | "accent";
}) {
  const tones: Record<string, string> = {
    ok: "border-ok/40 bg-ok/10 text-ok",
    warn: "border-warn/40 bg-warn/10 text-warn",
    bad: "border-bad/40 bg-bad/10 text-bad",
    accent: "border-accent/40 bg-accent/10 text-accent",
    neutral: "border-ink-line bg-ink text-muted",
  };
  return (
    <span
      className={`inline-flex items-center rounded border px-2 py-0.5 font-mono text-[11px] ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

/** Dispositions are ordered by severity and coloured by it. */
export function DispositionBadge({ state }: { state: string }) {
  const tone =
    state === "ACCEPT"
      ? "ok"
      : state === "ACCEPT_WITH_CONDITIONS"
        ? "warn"
        : state === "CONDITIONAL_RELEASE"
          ? "accent"
          : "bad";
  return <Badge tone={tone as never}>{state}</Badge>;
}

export function Digest({ value }: { value: string | null | undefined }) {
  if (!value) return <span className="text-muted">—</span>;
  const hex = value.startsWith("sha256:") ? value.slice(7) : value;
  return (
    <span className="font-mono text-xs text-muted" title={value}>
      sha256:{hex.slice(0, 6)}…{hex.slice(-4)}
    </span>
  );
}

/**
 * Marks a number that is predicted rather than measured. Prominent on purpose:
 * an unlabelled prediction discredits every other number on the page.
 */
export function PredictedTag({ status }: { status: string }) {
  if (status === "measured") return <Badge tone="ok">measured</Badge>;
  return (
    <Badge tone="warn">
      predicted — not measured until E10
    </Badge>
  );
}

export function Empty({ message }: { message: string }) {
  return (
    <div className="rounded border border-dashed border-ink-line px-4 py-8 text-center text-sm text-muted">
      {message}
    </div>
  );
}

export function KV({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-ink-line/60 py-1.5 last:border-0">
      <span className="text-xs text-muted">{k}</span>
      <span className="text-right font-mono text-xs text-paper">{v}</span>
    </div>
  );
}

/** A horizontal share bar, used for lot volume inequality. */
export function ShareBar({
  shares,
  highlightTop,
}: {
  shares: Record<string, number>;
  highlightTop: number;
}) {
  const ordered = Object.entries(shares).sort((a, b) => b[1] - a[1]);
  return (
    <div>
      <div className="flex h-7 w-full overflow-hidden rounded border border-ink-line">
        {ordered.map(([lot, share], i) => (
          <div
            key={lot}
            title={`${lot}: ${(share * 100).toFixed(1)}%`}
            style={{ width: `${share * 100}%` }}
            className={
              i < highlightTop
                ? "border-r border-ink bg-bad/70"
                : "border-r border-ink bg-ink-line"
            }
          />
        ))}
      </div>
      <div className="mt-1.5 flex justify-between font-mono text-[11px] text-muted">
        <span>
          <span className="inline-block h-2 w-2 rounded-sm bg-bad/70" /> largest{" "}
          {highlightTop} lots
        </span>
        <span>12 contracted lots</span>
      </div>
    </div>
  );
}
