import type { Metadata } from "next";
import AssessView from "./AssessView";

export const metadata: Metadata = { title: "Assess a model — Pramana" };

export default function AssessPage() {
  return <AssessView />;
}
