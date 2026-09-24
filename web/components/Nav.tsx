"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon, Logo } from "./ui";

const LINKS = [
  { href: "/#platform", label: "Platform" },
  { href: "/#cases", label: "Case files" },
  { href: "/#ledger", label: "Ledger" },
  { href: "/#calibration", label: "Calibration" },
  { href: "/#doctrine", label: "Doctrine" },
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const path = usePathname();

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  useEffect(() => setOpen(false), [path]);

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5">
      <div
        className={`mx-auto flex h-14 max-w-[1240px] items-center justify-between rounded-2xl border px-3 transition-all duration-300 sm:px-4 ${
          scrolled || open ? "border-line bg-surface/85 shadow-card backdrop-blur-xl" : "border-transparent bg-transparent"
        }`}
      >
        <Link href="/" className="flex items-center gap-2.5" aria-label="PRAMANA home">
          <Logo />
          <span className="text-[17px] font-semibold tracking-[-0.02em]">Pramana</span>
        </Link>

        <nav className="hidden items-center rounded-xl border border-line bg-surface/70 p-1 backdrop-blur lg:flex" aria-label="Primary">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="whitespace-nowrap rounded-lg px-3.5 py-1.5 text-[13.5px] text-ink-2 transition hover:bg-canvas hover:text-ink">
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/#cases" className="hidden whitespace-nowrap rounded-xl border border-line-2 bg-surface px-3.5 py-2 text-[13.5px] font-medium text-ink transition hover:border-ink/30 xl:inline-flex">
            Open console
          </Link>
          <Link href="/assess/" className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl bg-ink px-3.5 py-2 text-[13.5px] font-medium text-white transition hover:bg-ink/85">
            Assess a model
          </Link>
          <button
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface lg:hidden"
            onClick={() => setOpen((o) => !o)}
            aria-label="Menu"
            aria-expanded={open}
          >
            <Icon.Menu />
          </button>
        </div>
      </div>

      {open && (
        <div className="mx-auto mt-2 max-w-[1240px] rounded-2xl border border-line bg-surface p-2 shadow-card lg:hidden">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2.5 text-[15px] text-ink-2 hover:bg-canvas">
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
