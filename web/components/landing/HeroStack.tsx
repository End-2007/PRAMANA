"use client";

import dynamic from "next/dynamic";

const PrecisionStack = dynamic(() => import("../three/PrecisionStack"), { ssr: false, loading: () => <div className="h-full w-full" /> });

export function HeroStack({ className }: { className?: string }) {
  return <PrecisionStack mode="hero" className={className} />;
}
