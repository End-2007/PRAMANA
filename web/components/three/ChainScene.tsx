"use client";

/**
 * The ledger as a chain of signed blocks around the external anchor.
 * Blocks inside the anchored range are tied to the pillar by their Merkle root; when
 * an insider rewrites history the chain still links up, but the pillar does not.
 */

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, Line, RoundedBox } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

export type BlockState = "ok" | "broken" | "rewritten" | "idle" | "checking";

export interface ChainSceneProps {
  states: BlockState[];
  anchorUpto: number;
  anchor: "ok" | "fail" | "idle";
  className?: string;
}

const COL: Record<BlockState, string> = {
  ok: "#2F5BFF",
  checking: "#8FA8FF",
  idle: "#FFFFFF",
  broken: "#E0343A",
  rewritten: "#E39A12",
};

function Block({ pos, rot, state, index }: { pos: [number, number, number]; rot: number; state: BlockState; index: number }) {
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  const target = useMemo(() => new THREE.Color(COL[state]), [state]);
  useFrame((_, dt) => {
    if (!mat.current) return;
    mat.current.color.lerp(target, Math.min(1, dt * 6));
    mat.current.emissive.lerp(state === "idle" ? new THREE.Color("#000") : target, Math.min(1, dt * 6));
  });
  return (
    <group position={pos} rotation={[0, rot, 0]}>
      <RoundedBox args={[0.42, 0.42, 0.42]} radius={0.06} smoothness={3}>
        <meshStandardMaterial ref={mat} color="#FFFFFF" emissiveIntensity={0.28} roughness={0.35} />
      </RoundedBox>
      <Html position={[0, 0.42, 0]} center zIndexRange={[10, 0]} style={{ pointerEvents: "none" }}>
        <span className="font-mono text-[9px] text-muted">{index}</span>
      </Html>
    </group>
  );
}

function Pillar({ state }: { state: "ok" | "fail" | "idle" }) {
  const ring = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  const color = state === "fail" ? "#E0343A" : state === "ok" ? "#2F5BFF" : "#9AA3B5";
  const target = useMemo(() => new THREE.Color(color), [color]);
  useFrame((s, dt) => {
    if (ring.current) {
      ring.current.rotation.z += dt * 0.6;
      ring.current.position.y = 1.2 + Math.sin(s.clock.elapsedTime * 1.2) * 0.08;
    }
    if (mat.current) {
      mat.current.color.lerp(target, Math.min(1, dt * 5));
      mat.current.emissive.lerp(target, Math.min(1, dt * 5));
    }
  });
  return (
    <group>
      <mesh position={[0, 0.55, 0]}>
        <cylinderGeometry args={[0.32, 0.42, 1.5, 6]} />
        <meshStandardMaterial ref={mat} color="#9AA3B5" emissiveIntensity={0.3} transparent opacity={0.9} roughness={0.3} />
      </mesh>
      <mesh ref={ring} rotation={[Math.PI / 2, 0, 0]} position={[0, 1.2, 0]}>
        <torusGeometry args={[0.62, 0.025, 8, 64]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <Html position={[0, 1.75, 0]} center zIndexRange={[10, 0]} style={{ pointerEvents: "none" }}>
        <div
          className={`whitespace-nowrap rounded-md border px-2 py-0.5 font-mono text-[10px] shadow-card ${
            state === "fail" ? "border-crit/30 bg-crit text-white" : state === "ok" ? "border-brand/30 bg-white text-brand-700" : "border-line bg-white text-muted"
          }`}
        >
          {state === "fail" ? "ANCHOR MISMATCH" : state === "ok" ? "ANCHOR MATCHES" : "EXTERNAL ANCHOR"}
        </div>
      </Html>
    </group>
  );
}

function CameraRig() {
  const { camera, size } = useThree();
  useEffect(() => {
    const f = Math.min(1.8, Math.max(1, 1.9 / (size.width / size.height)));
    camera.position.set(0, 5.2 * f, 7.4 * f);
    camera.lookAt(0, 0.1, 0.4);
    camera.updateProjectionMatrix();
  }, [camera, size.width, size.height]);
  return null;
}

function Scene({ states, anchorUpto, anchor }: ChainSceneProps) {
  const g = useRef<THREE.Group>(null);
  const n = states.length;
  const R = 3.3;
  const pts = useMemo(
    () =>
      Array.from({ length: n }, (_, i) => {
        const a = Math.PI * 1.05 - (i / Math.max(n - 1, 1)) * Math.PI * 1.1;
        return { p: [Math.cos(a) * R, 0, Math.sin(a) * R * 0.62 + 0.6] as [number, number, number], a };
      }),
    [n],
  );
  useFrame((s, dt) => {
    if (g.current) g.current.rotation.y += (s.pointer.x * 0.12 - g.current.rotation.y) * Math.min(1, dt * 2);
  });
  return (
    <group ref={g} position={[0, -0.6, 0]}>
      <Line points={pts.map((x) => x.p)} color="#2F5BFF" lineWidth={1.2} transparent opacity={0.55} />
      {pts.map((x, i) =>
        i <= anchorUpto ? (
          <Line
            key={`l${i}`}
            points={[x.p, [0, 0.9, 0]]}
            color={anchor === "fail" ? "#E0343A" : "#2F5BFF"}
            lineWidth={0.6}
            transparent
            opacity={0.18}
          />
        ) : null,
      )}
      {pts.map((x, i) => (
        <Block key={i} index={i} pos={x.p} rot={-x.a} state={states[i]} />
      ))}
      <Pillar state={anchor} />
    </group>
  );
}

export default function ChainScene(props: ChainSceneProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { rootMargin: "120px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={props.className}>
      <Canvas
        frameloop={inView ? "always" : "never"}
        dpr={[1, 1.8]}
        camera={{ position: [0, 5.2, 7.4], fov: 34 }}
        gl={{ antialias: true, alpha: true }}
      >
        <CameraRig />
        <ambientLight intensity={0.9} />
        <directionalLight position={[4, 8, 5]} intensity={1.1} />
        <pointLight position={[0, 2, 0]} intensity={4} distance={7} color="#2F5BFF" />
        <Scene {...props} />
      </Canvas>
    </div>
  );
}
