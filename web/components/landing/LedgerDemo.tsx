"use client";

import { useEffect, useState } from "react";
import type { CaseFile } from "@/lib/types";
import { LedgerPanel } from "../case/LedgerPanel";

export function LedgerDemo({ caseId }: { caseId: string }) {
  const [c, setC] = useState<CaseFile | null>(null);
  useEffect(() => {
    fetch(`/casefiles/${caseId}.json`).then((r) => r.json()).then(setC).catch(() => setC(null));
  }, [caseId]);
  if (!c) return <div className="h-[460px] animate-pulse rounded-2xl bg-line/60" />;
  return <LedgerPanel c={c} compact />;
}
