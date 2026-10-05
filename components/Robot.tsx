'use client';

import React, { useRef, useMemo, useEffect, Suspense } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { RobotAnimationController } from '@/lib/robot/animationController';
import type { AudioAnalyserData } from '@/types/audio';
import type { MousePosition, RobotState } from '@/types/robot';

interface RobotProps {
  state: RobotState;
  mouse: MousePosition;
  audioMetrics: AudioAnalyserData | null;
  onStateChange?: (state: RobotState) => void;
  prefersReducedMotion?: boolean;
}

// ────────────────────────────────────────────────────────────
// Fallback procedural futuristic robot (renders if GLB is missing or loading)
// ────────────────────────────────────────────────────────────
function ProceduralFallbackRobot({
  glowColor,
  glowIntensity,
  lipSyncValue,
}: {
  glowColor: string;
  glowIntensity: number;
  lipSyncValue: number;
}) {
  return (
    <group>
      {/* Floating Head Shell */}
      <mesh position={[0, 0.4, 0]}>
        <sphereGeometry args={[0.55, 32, 32]} />
        <meshStandardMaterial
          color="#1e222a"
          metalness={0.9}
          roughness={0.15}
        />
      </mesh>

      {/* Cyber Visor Screen */}
      <mesh position={[0, 0.45, 0.38]} scale={[1, 0.35 + lipSyncValue * 0.15, 0.6]}>
        <sphereGeometry args={[0.42, 32, 16]} />
        <meshStandardMaterial
          color="#050505"
          emissive={glowColor}
          emissiveIntensity={glowIntensity * 1.5}
          roughness={0.1}
          metalness={0.8}
        />
      </mesh>

      {/* Left & Right Audio Ear Sensors */}
      <mesh position={[-0.58, 0.4, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.15, 0.18, 0.1, 32]} />
        <meshStandardMaterial color="#2d333b" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[0.58, 0.4, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <cylinderGeometry args={[0.15, 0.18, 0.1, 32]} />
        <meshStandardMaterial color="#2d333b" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Floating Torso Core */}
      <mesh position={[0, -0.4, 0]}>
        <cylinderGeometry args={[0.25, 0.38, 0.7, 32]} />
        <meshStandardMaterial color="#161b22" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* Arc Reactor Core Ring */}
      <mesh position={[0, -0.3, 0.22]}>
        <torusGeometry args={[0.12, 0.025, 16, 32]} />
        <meshStandardMaterial
          color="#111"
          emissive={glowColor}
          emissiveIntensity={glowIntensity * 2}
        />
      </mesh>
    </group>
  );
}

// ────────────────────────────────────────────────────────────
// Inner component that loads and renders the GLB model.
// Separated so React Suspense handles the async loading and
// an ErrorBoundary catches any load failure.
// ────────────────────────────────────────────────────────────
function GLBModel({ controller }: { controller: RobotAnimationController }) {
  const gltfData = useGLTF('/models/robot.glb');

  const { clonedScene, glowMaterials } = useMemo(() => {
    if (!gltfData?.scene) {
      return { clonedScene: null, glowMaterials: [] as THREE.MeshStandardMaterial[] };
    }

    const sceneClone = gltfData.scene.clone(true);
    const materials: THREE.MeshStandardMaterial[] = [];

    // Correct orientation: Blender exports Z-up, Three.js uses Y-up
    sceneClone.rotation.x = -Math.PI / 2;

    // Calculate bounding box AFTER rotation correction
    sceneClone.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(sceneClone);
    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    box.getCenter(center);
    box.getSize(size);

    // Normalize scale so the robot is ~2.2 units tall
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const scaleFactor = 2.2 / maxDim;

    // Wrap in a pivot group so we can center after rotation
    const pivot = new THREE.Group();
    pivot.add(sceneClone);
    pivot.scale.setScalar(scaleFactor);

    // Offset so center of bounding box is at origin
    sceneClone.position.set(
      -center.x / scaleFactor,
      -center.y / scaleFactor,
      -center.z / scaleFactor
    );

    // Enhance materials with selective cybernetic PBR
    // Model materials: mat0 (silver body), mat1 (dark charcoal body), mat8 (black visor), mat10 (near-black accents)
    pivot.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        if (mesh.material) {
          const mat = (
            Array.isArray(mesh.material) ? mesh.material[0] : mesh.material
          ) as THREE.MeshStandardMaterial;

          const newMat = mat.clone();
          const matName = newMat.name || '';

          // Silver body panels (mat0) — polished metallic
          if (matName === 'mat0' || newMat.color.r > 0.4) {
            newMat.metalness = 0.85;
            newMat.roughness = 0.15;
          }
          // Dark charcoal body (mat1) — dark matte-metallic, NO emissive
          else if (matName === 'mat1') {
            newMat.metalness = 0.7;
            newMat.roughness = 0.3;
          }
          // Black visor (mat8) — this is the "screen/face", gets subtle emissive glow
          else if (matName === 'mat8') {
            newMat.metalness = 0.4;
            newMat.roughness = 0.1;
            newMat.emissive = new THREE.Color('#00e5ff');
            newMat.emissiveIntensity = 0.3;
            materials.push(newMat);
          }
          // Near-black accents (mat10) — subtle accent glow
          else if (matName === 'mat10') {
            newMat.metalness = 0.6;
            newMat.roughness = 0.2;
            newMat.emissive = new THREE.Color('#00e5ff');
            newMat.emissiveIntensity = 0.15;
            materials.push(newMat);
          }
          // Fallback for any unnamed dark materials
          else {
            newMat.metalness = Math.max(0.6, newMat.metalness || 0.7);
            newMat.roughness = Math.min(0.35, newMat.roughness || 0.25);
          }

          mesh.material = newMat;
        }
      }
    });

    controller.bindModel(pivot);

    return { clonedScene: pivot, glowMaterials: materials };
  }, [gltfData, controller]);

  // Expose glow materials for dynamic updates in the animation frame
  useEffect(() => {
    (controller as unknown as Record<string, unknown>).__glowMaterials = glowMaterials;
  }, [glowMaterials, controller]);

  if (!clonedScene) return null;

  return <primitive object={clonedScene} />;
}

// Preload the model early
try { useGLTF.preload('/models/robot.glb'); } catch { /* ignore preload errors */ }

// ────────────────────────────────────────────────────────────
// Error boundary to gracefully fall back if GLB fails to load
// ────────────────────────────────────────────────────────────
class ModelErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error) {
    console.warn('[Robot] Model load error, using procedural fallback:', error.message);
  }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

// ────────────────────────────────────────────────────────────
// Main Robot component
// ────────────────────────────────────────────────────────────
export function Robot({
  state,
  mouse,
  audioMetrics,
  prefersReducedMotion = false,
}: RobotProps) {
  const groupRef = useRef<THREE.Group>(null);
  const controller = useMemo(() => new RobotAnimationController(), []);

  // Sync state into animation controller
  useEffect(() => {
    controller.stateManager.setState(state);
  }, [state, controller]);

  // Main animation frame loop
  useFrame((_, delta) => {
    if (!groupRef.current) return;

    // Cap delta to prevent huge jumps on tab switch
    const clampedDelta = Math.min(delta, 0.05);

    const anim = controller.update(
      mouse,
      audioMetrics,
      clampedDelta,
      prefersReducedMotion
    );

    // Apply smooth position and rotation
    groupRef.current.position.copy(anim.position);
    groupRef.current.rotation.copy(anim.rotation);
    groupRef.current.scale.setScalar(anim.scale);

    // Apply dynamic emissive glow to materials
    const glowMats = (controller as unknown as Record<string, unknown>).__glowMaterials as THREE.MeshStandardMaterial[] | undefined;
    if (glowMats && glowMats.length > 0) {
      const glowCol = new THREE.Color(anim.glowColor);
      for (const mat of glowMats) {
        if (mat.emissive) {
          mat.emissive.lerp(glowCol, clampedDelta * 10);
          mat.emissiveIntensity = anim.glowIntensity;
        }
      }
    }
  });

  const fallbackNode = (
    <ProceduralFallbackRobot
      glowColor={controller.stateManager.getVisualConfig().glowColor}
      glowIntensity={controller.stateManager.getVisualConfig().glowIntensity}
      lipSyncValue={audioMetrics?.volume || 0}
    />
  );

  return (
    <group ref={groupRef}>
      <ModelErrorBoundary fallback={fallbackNode}>
        <Suspense fallback={fallbackNode}>
          <GLBModel controller={controller} />
        </Suspense>
      </ModelErrorBoundary>
    </group>
  );
}
