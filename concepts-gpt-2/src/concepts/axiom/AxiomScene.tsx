import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Line } from "@react-three/drei/core/Line";
import { PerformanceMonitor } from "@react-three/drei/core/PerformanceMonitor";
import { RoundedBox } from "@react-three/drei/core/RoundedBox";
import { PresentationControls } from "@react-three/drei/web/PresentationControls";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";
import type { AxiomSceneDescriptor } from "./model";

interface AxiomSceneProps {
  descriptor: AxiomSceneDescriptor;
  reducedMotion: boolean;
  recordCount: number;
  onFocusRecord: (index: number) => void;
}

const FACETS = [
  [-1.32, .78, .32],
  [-.5, 1.4, -.16],
  [.58, 1.28, .12],
  [1.34, .52, -.28],
  [1.12, -.72, .22],
  [.08, -1.34, -.12],
  [-1.04, -.84, .16],
] as const;

const CONNECTIONS: Array<[number, number]> = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 0], [0, 3], [2, 5]];

const ACCENTS = {
  cyan: "#5df5e9",
  amber: "#ffc15a",
  coral: "#ff6b5f",
  muted: "#8d91ad",
} as const;

function CameraAndObjectRig({ descriptor, reducedMotion, children }: AxiomSceneProps & { children: React.ReactNode }) {
  const group = useRef<THREE.Group>(null);
  const { camera, invalidate } = useThree();
  const frames = useRef(0);

  useEffect(() => {
    frames.current = reducedMotion ? 1 : 52;
    invalidate();
  }, [descriptor.camera, descriptor.focusedRecord, descriptor.phaseIndex, descriptor.role, invalidate, reducedMotion]);

  useFrame((_, delta) => {
    if (!group.current || frames.current <= 0) return;
    const speed = reducedMotion ? 100 : 5.5;
    const roleDirection = descriptor.role === "client" ? 1 : -1;
    group.current.rotation.y = THREE.MathUtils.damp(
      group.current.rotation.y,
      roleDirection * (.12 + descriptor.focusedRecord * .16),
      speed,
      delta,
    );
    group.current.rotation.x = THREE.MathUtils.damp(group.current.rotation.x, descriptor.phaseIndex * .045 - .08, speed, delta);
    camera.position.x = THREE.MathUtils.damp(camera.position.x, descriptor.camera[0], speed, delta);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, descriptor.camera[1], speed, delta);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, descriptor.camera[2], speed, delta);
    camera.lookAt(0, 0, 0);
    frames.current -= 1;
    if (frames.current > 0) invalidate();
  });

  return <group ref={group}>{children}</group>;
}

function EvidenceLattice({ descriptor, recordCount, onFocusRecord }: AxiomSceneProps) {
  const accent = ACCENTS[descriptor.accent];
  return (
    <group rotation={[0, 0, Math.PI / 12]}>
      {CONNECTIONS.map(([from, to]) => (
        <Line
          key={`${from}-${to}`}
          points={[FACETS[from], FACETS[to]]}
          color={descriptor.phase === "evidence" ? "#5f7893" : "#31364e"}
          lineWidth={descriptor.phase === "evidence" ? 1.2 : .65}
          transparent
          opacity={descriptor.phase === "evidence" ? .8 : .34}
        />
      ))}
      {FACETS.map((position, index) => {
        const verified = index < descriptor.verifiedFacets;
        const gap = index === FACETS.length - 1;
        return (
          <mesh
            key={index}
            position={position}
            scale={descriptor.phase === "evidence" && (index % recordCount) === descriptor.focusedRecord ? 1.28 : 1}
            onClick={(event) => {
              event.stopPropagation();
              onFocusRecord(index % recordCount);
            }}
          >
            <octahedronGeometry args={[gap ? .22 : .27, 0]} />
            <meshStandardMaterial
              color={gap ? "#ffc15a" : verified ? accent : "#262b40"}
              emissive={gap ? "#8b4a0b" : verified ? accent : "#090b14"}
              emissiveIntensity={descriptor.phase === "evidence" ? .72 : .22}
              metalness={.5}
              roughness={.24}
            />
          </mesh>
        );
      })}
    </group>
  );
}

function VersionShells({ descriptor }: { descriptor: AxiomSceneDescriptor }) {
  return (
    <group>
      {Array.from({ length: descriptor.versionShells }, (_, index) => {
        const size = 1.18 + index * .22;
        return (
          <mesh key={index} rotation={[index * .16, index * .23, index * .1]} scale={size}>
            <icosahedronGeometry args={[1, 1]} />
            <meshPhysicalMaterial
              color={index === descriptor.versionShells - 1 ? "#8893ff" : "#1a2140"}
              emissive="#182050"
              emissiveIntensity={descriptor.phase === "promise" ? .34 : .1}
              metalness={.72}
              roughness={.2}
              transparent
              opacity={index === descriptor.versionShells - 1 ? .18 : .075}
              wireframe
              depthWrite={false}
            />
          </mesh>
        );
      })}
    </group>
  );
}

function AuthorityRings({ descriptor }: { descriptor: AxiomSceneDescriptor }) {
  const accent = ACCENTS[descriptor.accent];
  const active = descriptor.phase === "authority" || descriptor.engagementClosure === 1;
  return (
    <group rotation={[Math.PI / 2, 0, 0]}>
      <mesh position={[0, 0, descriptor.authorityOffset]}>
        <torusGeometry args={[1.72, active ? .075 : .038, 16, 96]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={active ? .92 : .25} transparent opacity={descriptor.authorityOpacity} />
      </mesh>
      <mesh position={[0, 0, -descriptor.authorityOffset]} rotation={[0, 0, descriptor.authorityStatus === "invalidated" ? .28 : 0]}>
        <torusGeometry args={[1.48, active ? .065 : .032, 16, 96]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={active ? .75 : .18} transparent opacity={descriptor.authorityOpacity} />
      </mesh>
    </group>
  );
}

function PermissionOrbit({ descriptor }: { descriptor: AxiomSceneDescriptor }) {
  if (descriptor.permissionMarkers === 0) return null;
  const color = descriptor.permissionMarkers === 3 ? "#ff6b5f" : descriptor.permissionMarkers === 2 ? "#5df5e9" : "#ffc15a";
  return (
    <group rotation={[.3, -.2, 0]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.12, .012, 8, 96]} />
        <meshBasicMaterial color={color} transparent opacity={.42} />
      </mesh>
      <mesh position={[2.12, 0, 0]}>
        <sphereGeometry args={[descriptor.permissionMarkers === 2 ? .14 : .1, 18, 18]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.2} />
      </mesh>
    </group>
  );
}

function DealCore({ descriptor }: { descriptor: AxiomSceneDescriptor }) {
  const accent = ACCENTS[descriptor.accent];
  return (
    <RoundedBox args={[1.42, 1.42, 1.42]} radius={.22} smoothness={5} scale={descriptor.engagementClosure ? .92 : .78} rotation={[.54, .72, .18]}>
      <meshPhysicalMaterial
        color={descriptor.engagementClosure ? "#d8fffb" : "#7580e8"}
        emissive={accent}
        emissiveIntensity={descriptor.phase === "work" ? .42 : .16}
        metalness={.82}
        roughness={.16}
        clearcoat={1}
        clearcoatRoughness={.1}
      />
    </RoundedBox>
  );
}

function Artifact(props: AxiomSceneProps) {
  const { descriptor } = props;
  return (
    <CameraAndObjectRig {...props}>
      <VersionShells descriptor={descriptor} />
      <AuthorityRings descriptor={descriptor} />
      <EvidenceLattice {...props} />
      <DealCore descriptor={descriptor} />
      <PermissionOrbit descriptor={descriptor} />
    </CameraAndObjectRig>
  );
}

function ProceduralStars({ reducedMotion }: { reducedMotion: boolean }) {
  const positions = useMemo(() => {
    const values = new Float32Array(180);
    for (let index = 0; index < values.length; index += 3) {
      const seed = index / 3;
      values[index] = Math.sin(seed * 12.9898) * 7;
      values[index + 1] = Math.cos(seed * 4.1414) * 4.5;
      values[index + 2] = -2 - ((seed * 1.73) % 8);
    }
    return values;
  }, []);
  return (
    <points rotation={reducedMotion ? [0, 0, 0] : [.05, .08, 0]}>
      <bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry>
      <pointsMaterial size={.025} color="#8791b5" transparent opacity={.5} sizeAttenuation />
    </points>
  );
}

function StaticFallback({ descriptor }: { descriptor: AxiomSceneDescriptor }) {
  return (
    <div className={`ax-static-artifact is-${descriptor.accent}`} data-testid="axiom-static-artifact">
      <i /><i /><i />
      <span>v{descriptor.versionShells}</span>
    </div>
  );
}

function supportsWebGL2() {
  if (typeof window === "undefined" || !("WebGL2RenderingContext" in window)) return false;
  try {
    return Boolean(document.createElement("canvas").getContext("webgl2"));
  } catch {
    return false;
  }
}

export function AxiomScene(props: AxiomSceneProps) {
  const [quality, setQuality] = useState<"high" | "low">("high");
  const [canRender] = useState(supportsWebGL2);
  const fallback = <StaticFallback descriptor={props.descriptor} />;

  if (!canRender) return fallback;

  return (
    <Canvas
      frameloop="demand"
      dpr={quality === "high" ? [1, 1.75] : 1}
      camera={{ position: [...props.descriptor.camera], fov: 42, near: .1, far: 40 }}
      gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }}
      fallback={fallback}
    >
      <PerformanceMonitor flipflops={3} onDecline={() => setQuality("low")} onIncline={() => setQuality("high")} onFallback={() => setQuality("low")} />
      <ambientLight intensity={.48} />
      <directionalLight position={[4, 5, 5]} color="#d9faff" intensity={2.4} />
      <pointLight position={[-4, -2, 3]} color="#775cff" intensity={18} distance={10} />
      <pointLight position={[4, 1, 1]} color="#ff9a57" intensity={quality === "high" ? 10 : 5} distance={8} />
      <ProceduralStars reducedMotion={props.reducedMotion} />
      <PresentationControls
        global
        enabled={!props.reducedMotion}
        cursor
        snap
        speed={.85}
        zoom={.92}
        rotation={[0, 0, 0]}
        polar={[-.38, .38]}
        azimuth={[-.7, .7]}
      >
        <Artifact {...props} />
      </PresentationControls>
      {quality === "high" ? (
        <EffectComposer multisampling={4} enableNormalPass={false}>
          <Bloom mipmapBlur intensity={.55} luminanceThreshold={.72} luminanceSmoothing={.32} />
          <Vignette offset={.22} darkness={.62} />
        </EffectComposer>
      ) : null}
    </Canvas>
  );
}
