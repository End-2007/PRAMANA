"use client";

import type { Calibration } from "@/lib/types";
import { ArmsStrip } from "../charts/Charts";

export function CalibrationChart({ cal }: { cal: Calibration }) {
  const a = cal.arms;
  return (
    <ArmsStrip
      arms={[
        { label: "ResNet-18 · GTSRB", sub: `operational · n=${a.operational.n}`, draws: a.operational.draws, color: "rgb(var(--brand))" },
        { label: "ResNet-18 · CIFAR-10", sub: `corpus contrast · n=${a.corpus_contrast.n}`, draws: a.corpus_contrast.draws, color: "#8FA8FF" },
        { label: "SmallCNN · CIFAR-10", sub: `family contrast · n=${a.family_contrast.n}`, draws: a.family_contrast.draws, color: "#9AA6BF" },
      ]}
    />
  );
}
