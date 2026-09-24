"use client";

/**
 * The precision ladder, as an object.
 *
 * Six plates -- one per build of the same model -- stacked over the artefact. A scan
 * plane sweeps the stack; the plate it finds diverging lights up. In the hero it runs
 * on a loop; on a case page it is driven by the assessment that is actually running.
 * Around the base, the hash-chained ledger turns slowly: every act is a block, and
 * every block is linked to the last.
 */

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, Line, RoundedBox } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

export const RUNG_LABELS = ["FP32", "FP16", "INT8", "PRUNED", "ONNX", "TORCHSCRIPT"];

export type PlateState = "idle" | "active" | "ok" | "alert" | "off";

export interface StackProps {
  mode: "hero" | "case";
  /** case mode: per-plate state, index-aligned with RUNG_LABELS */
  states?: PlateState[];
  scanning?: boolean;
  /** case mode: caption shown beside the alert plate */
  alertCaption?: string;
  className?: string;
}

const C = {
  brand: new THREE.Color("#2F5BFF"),
  brandSoft: new THREE.Color("#8FA8FF"),
  glass: new THREE.Color("#E9EEFF"),
  ok: new THREE.Color("#3E6BFF"),
  alert: new THREE.Color("#E0343A"),
  off: new THREE.Color("#C9CFDB"),
  white: new THREE.Color("#FFFFFF"),
};

const PLATE_Y0 = 0.72;
const PLATE_DY = 0.42;
const PLATE = 3.3;

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(m.matches);
    const on = () => setReduced(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return reduced;
}

function useInView<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { rootMargin: "120px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return { ref, inView };
}

/* ------------------------------------------------------------------ pieces */

function Platform() {
  const contour = useMemo(() => {
    const pts: [number, number, number][] = [];
    for (let i = 0; i <= 160; i++) {
      const t = (i / 160) * Math.PI * 2;
      const r = 1.05 + 0.22 * Math.sin(3 * t + 0.6) + 0.1 * Math.cos(5 * t) + 0.05 * Math.sin(9 * t);
      pts.push([r * Math.cos(t) * 0.95, 0.001, r * Math.sin(t) * 0.75 - 0.1]);
    }
    return pts;
  }, []);
  const inner = 1.95;
  const square: [number, number, number][] = [
    [-inner, 0, -inner],
    [inner, 0, -inner],
    [inner, 0, inner],
    [-inner, 0, inner],
    [-inner, 0, -inner],
  ];
  return (
    <group>
      <RoundedBox args={[4.6, 0.34, 4.6]} radius={0.1} smoothness={4} position={[0, 0, 0]}>
        <meshStandardMaterial color="#3D63FF" emissive="#1C3DFF" emissiveIntensity={0.35} roughness={0.35} metalness={0.15} />
      </RoundedBox>
      <RoundedBox args={[4.62, 0.12, 4.62]} radius={0.05} smoothness={3} position={[0, -0.26, 0]}>
        <meshStandardMaterial color="#6D8BFF" emissive="#3E63FF" emissiveIntensity={0.25} roughness={0.5} transparent opacity={0.55} />
      </RoundedBox>
      <group position={[0, 0.172, 0]}>
        <Line points={square} color="#DCE5FF" lineWidth={1} transparent opacity={0.8} />
        <Line points={contour} color="#FFFFFF" lineWidth={1.1} transparent opacity={0.75} />
        {[
          [-2.15, 0, -2.15],
          [2.15, 0, -2.15],
          [2.15, 0, 2.15],
          [-2.15, 0, 2.15],
        ].map((p, i) => (
          <mesh key={i} position={p as [number, number, number]}>
            <sphereGeometry args={[0.035, 12, 12]} />
            <meshBasicMaterial color="#FFFFFF" />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function GroundFrames() {
  const sq = (s: number, y: number): [number, number, number][] => [
    [-s, y, -s],
    [s, y, -s],
    [s, y, s],
    [-s, y, s],
    [-s, y, -s],
  ];
  return (
    <group>
      <Line points={sq(3.4, -0.3)} color="#2F5BFF" lineWidth={1} transparent opacity={0.35} />
      <Line points={sq(5.2, -0.3)} color="#2F5BFF" lineWidth={1} transparent opacity={0.18} />
      <Line points={[[-5.2, -0.3, 0], [-3.4, -0.3, 0]]} color="#2F5BFF" lineWidth={1} transparent opacity={0.2} />
      <Line points={[[0, -0.3, 3.4], [0, -0.3, 5.2]]} color="#2F5BFF" lineWidth={1} transparent opacity={0.2} />
    </group>
  );
}

function LedgerRing({ animate }: { animate: boolean }) {
  const g = useRef<THREE.Group>(null);
  const n = 14;
  const r = 3.95;
  const blocks = useMemo(
    () =>
      Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2;
        return [Math.cos(a) * r, -0.12, Math.sin(a) * r] as [number, number, number];
      }),
    [],
  );
  useFrame((_, dt) => {
    if (g.current && animate) g.current.rotation.y += dt * 0.07;
  });
  return (
    <group ref={g}>
      <Line points={[...blocks, blocks[0]]} color="#2F5BFF" lineWidth={1} transparent opacity={0.45} />
      {blocks.map((p, i) => (
        <group key={i} position={p} rotation={[0, -(i / n) * Math.PI * 2, 0]}>
          <RoundedBox args={[0.3, 0.3, 0.3]} radius={0.05} smoothness={3}>
            <meshStandardMaterial color={i === 0 ? "#2F5BFF" : "#FFFFFF"} emissive={i === 0 ? "#2F5BFF" : "#000000"} emissiveIntensity={0.4} roughness={0.4} />
          </RoundedBox>
        </group>
      ))}
    </group>
  );
}

function Plate({ index, state, label, caption, reduced }: { index: number; state: PlateState; label: string; caption?: string; reduced: boolean }) {
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  const edge = useRef<THREE.MeshBasicMaterial>(null);
  const ring = useRef<THREE.Mesh>(null);
  const y = PLATE_Y0 + index * PLATE_DY;

  useFrame((s, dt) => {
    if (!mat.current || !edge.current) return;
    const target =
      state === "alert" ? C.alert : state === "ok" ? C.ok : state === "active" ? C.brand : state === "off" ? C.off : C.glass;
    const k = Math.min(1, dt * 5);
    mat.current.color.lerp(target, k);
    mat.current.emissive.lerp(state === "alert" ? C.alert : state === "active" || state === "ok" ? C.brand : C.white, k);
    const wantEmissive = state === "alert" ? 0.55 : state === "active" ? 0.35 : state === "ok" ? 0.12 : 0.02;
    mat.current.emissiveIntensity += (wantEmissive - mat.current.emissiveIntensity) * k;
    const wantOpacity = state === "idle" ? 0.42 : state === "off" ? 0.28 : 0.8;
    mat.current.opacity += (wantOpacity - mat.current.opacity) * k;
    edge.current.color.lerp(state === "alert" ? C.alert : state === "off" ? C.off : C.brand, k);
    if (ring.current) {
      const t = reduced ? 0.5 : (s.clock.elapsedTime * 0.9) % 1;
      ring.current.scale.setScalar(0.4 + t * 1.6);
      (ring.current.material as THREE.MeshBasicMaterial).opacity = state === "alert" ? 0.7 * (1 - t) : 0;
    }
  });

  return (
    <group position={[0, y, 0]}>
      <RoundedBox args={[PLATE, 0.07, PLATE]} radius={0.03} smoothness={2}>
        <meshStandardMaterial ref={mat} color="#E9EEFF" transparent opacity={0.42} roughness={0.25} metalness={0.05} depthWrite={false} />
      </RoundedBox>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
        <ringGeometry args={[PLATE * 0.705, PLATE * 0.71, 4, 1, Math.PI / 4]} />
        <meshBasicMaterial ref={edge} color="#2F5BFF" transparent opacity={0.9} />
      </mesh>
      {state === "alert" && (
        <group position={[0.55, 0.06, -0.35]}>
          <mesh>
            <sphereGeometry args={[0.07, 16, 16]} />
            <meshBasicMaterial color="#FFFFFF" />
          </mesh>
          <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.16, 0.2, 40]} />
            <meshBasicMaterial color="#FFFFFF" transparent opacity={0.7} depthWrite={false} />
          </mesh>
        </group>
      )}
      <Html position={[-PLATE / 2 - 0.1, 0, PLATE / 2 + 0.1]} zIndexRange={[10, 0]} style={{ pointerEvents: "none" }}>
        <div
          className={`-translate-x-full -translate-y-1/2 whitespace-nowrap rounded border px-1.5 py-[1px] font-mono text-[9.5px] tracking-[0.1em] transition-colors duration-500 ${
            state === "alert"
              ? "border-crit/40 bg-crit text-white"
              : state === "active"
                ? "border-brand/40 bg-brand text-white"
                : state === "ok"
                  ? "border-brand/30 bg-white/90 text-brand-700"
                  : state === "off"
                    ? "border-line bg-white/70 text-muted line-through"
                    : "border-line bg-white/80 text-ink-2"
          }`}
        >
          {label}
        </div>
      </Html>
      {state === "alert" && caption && (
        <Html position={[PLATE / 2 + 0.1, 0.05, -PLATE / 2 - 0.1]} zIndexRange={[10, 0]} style={{ pointerEvents: "none" }}>
          <div className="-translate-y-1/2 whitespace-nowrap rounded-md border border-crit/30 bg-white/95 px-2 py-1 font-mono text-[10px] text-crit shadow-card">
            {caption}
          </div>
        </Html>
      )}
    </group>
  );
}

function Scanner({ y }: { y: React.MutableRefObject<number> }) {
  const m = useRef<THREE.Group>(null);
  useFrame(() => {
    if (m.current) m.current.position.y = y.current;
  });
  const s = PLATE / 2 + 0.25;
  return (
    <group ref={m}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[PLATE + 0.5, PLATE + 0.5]} />
        <meshBasicMaterial color="#2F5BFF" transparent opacity={0.12} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <Line
        points={[
          [-s, 0, -s],
          [s, 0, -s],
          [s, 0, s],
          [-s, 0, s],
          [-s, 0, -s],
        ]}
        color="#2F5BFF"
        lineWidth={1.4}
      />
    </group>
  );
}

/* ------------------------------------------------------------------ scene */

/** Pull the camera back on narrow canvases and in on wide ones, so the stack fits both. */
function CameraRig() {
  const { camera, size } = useThree();
  useEffect(() => {
    const narrow = size.width < 480 ? 1.14 : 1;
    const f = Math.min(1.9, Math.max(0.86, 1.15 / (size.width / size.height)) * narrow);
    camera.position.set(9.4 * f, 7.6 * f, 9.4 * f);
    camera.lookAt(0, 0.35, 0);
    camera.updateProjectionMatrix();
  }, [camera, size.width, size.height]);
  return null;
}

function Scene({ mode, states, scanning, alertCaption, reduced }: StackProps & { reduced: boolean }) {
  const root = useRef<THREE.Group>(null);
  const scanY = useRef(PLATE_Y0 + 5 * PLATE_DY + 0.4);
  const [heroStates, setHeroStates] = useState<PlateState[]>(["idle", "idle", "idle", "idle", "idle", "idle"]);
  const phase = useRef(0);
  const top = PLATE_Y0 + 5 * PLATE_DY + 0.4;
  const bottom = PLATE_Y0 - 0.35;

  useFrame((s, dt) => {
    const g = root.current;
    if (g && !reduced) {
      const px = s.pointer.x * 0.12;
      const py = s.pointer.y * 0.05;
      g.rotation.y += (px + Math.sin(s.clock.elapsedTime * 0.25) * 0.05 - g.rotation.y) * Math.min(1, dt * 2);
      g.rotation.x += (-py - g.rotation.x) * Math.min(1, dt * 2);
      g.position.y = Math.sin(s.clock.elapsedTime * 0.8) * 0.05;
    }

    if (mode === "hero") {
      if (reduced) return;
      // 5.5 s sweep, then a 2.5 s hold with the finding lit
      phase.current = (phase.current + dt) % 8;
      const t = phase.current;
      const sweep = Math.min(t / 5.5, 1);
      scanY.current = top - (top - bottom) * sweep;
      const next: PlateState[] = RUNG_LABELS.map((_, i) => {
        const py = PLATE_Y0 + i * PLATE_DY;
        const passed = scanY.current < py - 0.02;
        if (!passed) return "idle";
        if (i === 2) return "alert";
        return "ok";
      });
      if (t > 7.4) next.fill("idle");
      if (next.some((v, i) => v !== heroStates[i])) setHeroStates(next);
    } else if (scanning && !reduced) {
      scanY.current -= dt * 0.9;
      if (scanY.current < bottom) scanY.current = top;
    } else {
      scanY.current += (top + 2 - scanY.current) * Math.min(1, dt * 2);
    }
  });

  const plateStates = mode === "hero" ? heroStates : states ?? RUNG_LABELS.map(() => "idle" as PlateState);
  const showScanner = mode === "hero" ? !reduced : !!scanning;

  return (
    <group ref={root} position={[0, -0.9, 0]}>
      <GroundFrames />
      <Platform />
      <LedgerRing animate={!reduced} />
      {RUNG_LABELS.map((label, i) => (
        <Plate
          key={label}
          index={i}
          label={label}
          state={plateStates[i]}
          reduced={reduced}
          caption={i === 2 ? alertCaption ?? (mode === "hero" ? "divergence p ≤ 1/65" : undefined) : undefined}
        />
      ))}
      {showScanner && <Scanner y={scanY} />}
    </group>
  );
}

export default function PrecisionStack(props: StackProps) {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <div ref={ref} className={props.className}>
      <Canvas
        frameloop={inView ? "always" : "never"}
        dpr={[1, 1.8]}
        camera={{ position: [9.4, 7.6, 9.4], fov: 30, near: 0.1, far: 100 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      >
        <CameraRig />
        <ambientLight intensity={0.85} />
        <directionalLight position={[5, 9, 4]} intensity={1.25} />
        <directionalLight position={[-6, 4, -3]} intensity={0.35} color="#BFD0FF" />
        <pointLight position={[0, -1.5, 0]} intensity={6} distance={9} color="#2F5BFF" />
        <Scene {...props} reduced={reduced} />
      </Canvas>
    </div>
  );
}
