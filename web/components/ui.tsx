import type { ReactNode, SVGProps } from "react";
import type { Tone } from "@/lib/format";

/* ------------------------------------------------------------------ icons */

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 16, ...rest }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    ...rest,
  };
}

export const Icon = {
  Arrow: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  ),
  ArrowLeft: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </svg>
  ),
  Check: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  ),
  X: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  ),
  Alert: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M12 3l9.5 17h-19L12 3z" />
      <path d="M12 10v4M12 17.5v.01" />
    </svg>
  ),
  Shield: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M12 3l8 3v6c0 4.5-3.4 8.2-8 9-4.6-.8-8-4.5-8-9V6l8-3z" />
      <path d="M8.5 12l2.5 2.5 4.5-5" />
    </svg>
  ),
  Lock: (p: IconProps) => (
    <svg {...base(p)}>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
      <path d="M8 10.5V7.5a4 4 0 118 0v3" />
    </svg>
  ),
  Chain: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M10 14a4 4 0 005.66 0l3-3a4 4 0 00-5.66-5.66l-1 1" />
      <path d="M14 10a4 4 0 00-5.66 0l-3 3a4 4 0 005.66 5.66l1-1" />
    </svg>
  ),
  Layers: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M12 3l9 5-9 5-9-5 9-5z" />
      <path d="M3 13l9 5 9-5" />
    </svg>
  ),
  Users: (p: IconProps) => (
    <svg {...base(p)}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19.5c.8-3.2 3-5 5.5-5s4.7 1.8 5.5 5" />
      <path d="M15.5 5.2a3 3 0 010 5.6M17.5 14.8c1.6.6 2.7 2.2 3 4.7" />
    </svg>
  ),
  Pulse: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M3 12h4l2.5-6 5 12 2.5-6H21" />
    </svg>
  ),
  Upload: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M12 16V4M7 9l5-5 5 5" />
      <path d="M4 16v3a1.5 1.5 0 001.5 1.5h13A1.5 1.5 0 0020 19v-3" />
    </svg>
  ),
  Download: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M12 4v12M7 11l5 5 5-5" />
      <path d="M4 16v3a1.5 1.5 0 001.5 1.5h13A1.5 1.5 0 0020 19v-3" />
    </svg>
  ),
  Play: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M7 5l12 7-12 7V5z" fill="currentColor" stroke="none" />
    </svg>
  ),
  Replay: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M4 12a8 8 0 108-8 8 8 0 00-6 2.7" />
      <path d="M4 4v4.5h4.5" />
    </svg>
  ),
  File: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5z" />
      <path d="M14 3v5h5M9 13h6M9 17h4" />
    </svg>
  ),
  Anchor: (p: IconProps) => (
    <svg {...base(p)}>
      <circle cx="12" cy="5" r="2" />
      <path d="M12 7v14M5 13a7 7 0 0014 0M8 11h8" />
    </svg>
  ),
  Eye: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  Wifi: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M3 3l18 18" />
      <path d="M8.5 16.5a5 5 0 017 0M5 12.8a10 10 0 015.2-2.7M14.5 10.2A10 10 0 0119 12.8M2 9a15 15 0 015-2.6M17.5 6.5A15 15 0 0122 9" />
      <path d="M12 20h.01" />
    </svg>
  ),
  Scale: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M12 3v18M7 21h10M5 7h14M5 7l-3 7a3 3 0 006 0L5 7zM19 7l-3 7a3 3 0 006 0l-3-7z" />
    </svg>
  ),
  Menu: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  ),
  Spark: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6" />
    </svg>
  ),
};

/* ------------------------------------------------------------------ logo */

export function Logo({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <defs>
        <linearGradient id="lg-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7C9BFF" />
          <stop offset="1" stopColor="#2F5BFF" />
        </linearGradient>
      </defs>
      <path d="M16 3l12 6.5-12 6.5L4 9.5 16 3z" fill="url(#lg-a)" />
      <path d="M4 15.2l12 6.5 12-6.5" fill="none" stroke="#2F5BFF" strokeWidth="2.2" strokeLinejoin="round" opacity=".75" />
      <path d="M4 21l12 6.5L28 21" fill="none" stroke="#2F5BFF" strokeWidth="2.2" strokeLinejoin="round" opacity=".4" />
    </svg>
  );
}

/* ------------------------------------------------------------------ primitives */

const TONE_CHIP: Record<Tone, string> = {
  crit: "border-crit/25 bg-crit-50 text-crit",
  warn: "border-warn/25 bg-warn-50 text-warn",
  ok: "border-ok/25 bg-ok-50 text-ok",
  brand: "border-brand/25 bg-brand-50 text-brand-700",
  neutral: "border-line bg-surface text-ink-2",
};

export function Pill({ tone = "neutral", children, dot = false, className = "" }: { tone?: Tone; children: ReactNode; dot?: boolean; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-[3px] font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] ${TONE_CHIP[tone]} ${className}`}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export function StateIcon({ tone, size = 14 }: { tone: Tone; size?: number }) {
  if (tone === "crit") return <Icon.Alert size={size} />;
  if (tone === "warn") return <Icon.Alert size={size} />;
  if (tone === "ok") return <Icon.Check size={size} />;
  return <Icon.Spark size={size} />;
}

/**
 * A value beside the thing that bounds it. There is deliberately no prop that renders
 * the value alone -- a p-value on screen without its floor is the defect this whole
 * project was built to refuse.
 */
export function Stat({
  label,
  value,
  comparator,
  comparatorValue,
  tone,
  note,
}: {
  label: string;
  value: ReactNode;
  comparator: string;
  comparatorValue: ReactNode;
  tone?: Tone;
  note?: ReactNode;
}) {
  const color = tone === "crit" ? "text-crit" : tone === "warn" ? "text-warn" : tone === "ok" ? "text-ok" : "text-ink";
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <div className="text-[12px] text-muted">{label}</div>
      <div className={`mt-1.5 font-sans text-[26px] font-medium tracking-[-0.03em] ${color}`}>{value}</div>
      <div className="mt-2 flex items-baseline justify-between gap-2 border-t border-line pt-2 font-mono text-[11px] text-muted">
        <span>{comparator}</span>
        <span className="text-ink-2">{comparatorValue}</span>
      </div>
      {note && <p className="mt-2 text-[12px] leading-snug text-muted">{note}</p>}
    </div>
  );
}

export function SectionHead({ eyebrow, title, sub, right }: { eyebrow: string; title: ReactNode; sub?: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        <div className="eyebrow">{eyebrow}</div>
        <h2 className="mt-2 text-[24px] font-medium leading-tight tracking-[-0.03em] sm:text-[28px]">{title}</h2>
        {sub && <p className="mt-2 text-[14.5px] leading-relaxed text-ink-2">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

export function Digest({ value, head = 6, tail = 4 }: { value: string; head?: number; tail?: number }) {
  const hex = value.startsWith("sha256:") ? value.slice(7) : value;
  const s = hex.length > head + tail ? `${hex.slice(0, head)}…${hex.slice(-tail)}` : hex;
  return (
    <span className="font-mono text-[12px] text-ink-2" title={value}>
      <span className="text-muted">sha256:</span>
      {s}
    </span>
  );
}
