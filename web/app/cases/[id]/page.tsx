import type { Metadata } from "next";
import CaseView from "@/components/case/CaseView";

const CASES: Record<string, string> = {
  "prm-2026-0417": "PRM-2026-0417 · Quantisation-armed backdoor in a supplier lot",
  "prm-2026-0422": "PRM-2026-0422 · Routine delivery, same programme",
};

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(CASES).map((id) => ({ id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: `${CASES[id] ?? id} — Pramana` };
}

export default async function CasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CaseView id={id} />;
}
