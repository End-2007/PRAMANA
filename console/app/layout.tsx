import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "PRAMANA — assurance console",
  description:
    "Behavioural integrity assurance for multi-contributor computer-vision pipelines.",
};

/**
 * Five screens, and not one more.
 *
 * The anti-scope list is explicit: no multi-tenant auth, no RBAC, no user management,
 * no settings UI. The console exists to make the assessment legible to an analyst and
 * to make the demo true; every additional screen is an hour the ladder statistics
 * needed.
 */
const NAV = [
  { href: "/", label: "Assessment", hint: "verdict, disposition, access tier" },
  { href: "/ladder", label: "Precision ladder", hint: "D1 — the artefact that ships" },
  { href: "/contributors", label: "Contributors", hint: "e-values, lots, certified floor" },
  { href: "/ledger", label: "Ledger & coverage", hint: "tamper, anchor, declared gaps" },
  { href: "/monitor", label: "Receipt monitor", hint: "anytime-valid crossing" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-ink text-paper">
        <div className="mx-auto flex min-h-screen max-w-7xl flex-col">
          <header className="border-b border-ink-line px-6 py-4">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-lg font-semibold tracking-tight text-paper">
                  PRAMANA
                </span>
                <span className="text-xs text-muted">
                  प्रमाण — the instrument that makes the claim trustworthy
                </span>
              </div>
              <div className="flex items-center gap-2 font-mono text-[11px] text-muted">
                <span className="rounded border border-ok/40 bg-ok/10 px-2 py-0.5 text-ok">
                  offline
                </span>
                <span>no outbound calls · clause 2.2.6</span>
              </div>
            </div>

            <nav className="mt-4 flex flex-wrap gap-1">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.hint}
                  className="rounded border border-ink-line px-3 py-1.5 text-sm text-muted transition hover:border-accent/50 hover:text-paper"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </header>

          <main className="flex-1 px-6 py-6">{children}</main>

          <footer className="border-t border-ink-line px-6 py-4 text-[11px] leading-relaxed text-muted">
            <p>
              No output here says a model is clean.{" "}
              <a
                className="text-accent hover:underline"
                href="https://arxiv.org/abs/2204.06974"
              >
                arXiv:2204.06974
              </a>{" "}
              constructs backdoors no efficient black-box behavioural test detects, so
              absence of evidence is the strongest true statement available.
            </p>
            <p className="mt-1">
              Apache-2.0 · SIH 2026 · PS SIH26228 · Ministry of Defence, Indian Army
              (DGIS)
            </p>
          </footer>
        </div>
      </body>
    </html>
  );
}
