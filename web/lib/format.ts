export const GTSRB: string[] = [
  "Speed limit (20km/h)", "Speed limit (30km/h)", "Speed limit (50km/h)", "Speed limit (60km/h)",
  "Speed limit (70km/h)", "Speed limit (80km/h)", "End of speed limit (80km/h)", "Speed limit (100km/h)",
  "Speed limit (120km/h)", "No passing", "No passing for vehicles over 3.5t", "Right-of-way at next intersection",
  "Priority road", "Yield", "Stop", "No vehicles", "Vehicles over 3.5t prohibited", "No entry",
  "General caution", "Dangerous curve left", "Dangerous curve right", "Double curve", "Bumpy road",
  "Slippery road", "Road narrows on the right", "Road work", "Traffic signals", "Pedestrians",
  "Children crossing", "Bicycles crossing", "Beware of ice/snow", "Wild animals crossing",
  "End of all speed and passing limits", "Turn right ahead", "Turn left ahead", "Ahead only",
  "Go straight or right", "Go straight or left", "Keep right", "Keep left", "Roundabout mandatory",
  "End of no passing", "End of no passing for vehicles over 3.5t",
];

/** Abbreviate a digest for display only. Never compare on the result. */
export function short(d: string | null | undefined, head = 6, tail = 4): string {
  if (!d) return "—";
  const hex = d.startsWith("sha256:") ? d.slice(7) : d;
  if (hex.length <= head + tail) return d;
  return `${hex.slice(0, head)}…${hex.slice(-tail)}`;
}

export function pct(x: number | null | undefined, digits = 1): string {
  if (x === null || x === undefined) return "—";
  return `${(x * 100).toFixed(digits)}%`;
}

export function fixed(x: number | null | undefined, digits = 5): string {
  if (x === null || x === undefined) return "—";
  return x.toFixed(digits);
}

export function sci(x: number | null | undefined, digits = 2): string {
  if (x === null || x === undefined) return "—";
  if (x === 0) return "0";
  const e = Math.floor(Math.log10(Math.abs(x)));
  if (e >= -2 && e < 4) return x.toFixed(Math.max(0, digits + 1 - Math.max(e, 0)));
  const m = x / 10 ** e;
  return `${m.toFixed(digits)}×10${superscript(e)}`;
}

function superscript(n: number): string {
  const map: Record<string, string> = { "-": "⁻", "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹" };
  return String(n).split("").map((c) => map[c] ?? c).join("");
}

export function compact(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e4) return `${(n / 1e3).toFixed(1)}K`;
  return n.toLocaleString("en-IN");
}

export function dt(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }) + " UTC";
}

export function dateOnly(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
}

export const STATE_LABEL: Record<string, string> = {
  ACCEPT: "Accept",
  ACCEPT_WITH_CONDITIONS: "Accept with conditions",
  CONDITIONAL_RELEASE: "Conditional release",
  QUARANTINE: "Quarantine",
  REJECT: "Reject",
};

export type Tone = "crit" | "warn" | "ok" | "brand" | "neutral";

export const STATE_TONE: Record<string, Tone> = {
  ACCEPT: "ok",
  ACCEPT_WITH_CONDITIONS: "ok",
  CONDITIONAL_RELEASE: "warn",
  QUARANTINE: "crit",
  REJECT: "crit",
};

export function humanise(s: string): string {
  return s.replace(/_/g, " ");
}
