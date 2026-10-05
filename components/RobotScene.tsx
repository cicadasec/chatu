'use client';

import React, { Suspense, useState, useEffect, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { PerspectiveCamera, Sparkles, ContactShadows } from '@react-three/drei';
import { Robot } from './Robot';
import type { AudioAnalyserData } from '@/types/audio';
import type { MousePosition, RobotState } from '@/types/robot';

interface RobotSceneProps {
  state: RobotState;
  audioMetrics: AudioAnalyserData | null;
  onSceneClick: () => void;
  isSessionActive: boolean;
}

function SceneLighting({ state }: { state: RobotState }) {
  const isSpeaking = state === 'SPEAKING';
  const isListening = state === 'LISTENING';
  const isThinking = state === 'THINKING';

  const rimColor = isListening
    ? '#00f0ff'
    : isThinking
    ? '#a855f7'
    : isSpeaking
    ? '#38bdf8'
    : '#3b82f6';

  return (
    <>
      {/* Soft dark-blue ambient fill */}
      <ambientLight intensity={0.4} color="#0d1b2a" />

      {/* Main key light */}
      <directionalLight
        position={[4, 5, 4]}
        intensity={1.2}
        color="#ffffff"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0001}
      />

      {/* Soft cool fill light */}
      <directionalLight position={[-4, 2, 2]} intensity={0.5} color="#60a5fa" />

      {/* Futuristic Rim / Silhouette lights */}
      <spotLight
        position={[0, 6, -5]}
        intensity={2.0}
        color={rimColor}
        angle={0.8}
        penumbra={0.9}
      />
      <pointLight position={[0, -2, -2]} intensity={0.8} color={rimColor} />
    </>
  );
}

export function RobotScene({
  state,
  audioMetrics,
  onSceneClick,
  isSessionActive,
}: RobotSceneProps) {
  const [mouse, setMouse] = useState<MousePosition>({ x: 0, y: 0 });
  const [isMobile, setIsMobile] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Check screen size and reduced motion preference
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(motionQuery.matches);
    const motionHandler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    motionQuery.addEventListener('change', motionHandler);

    return () => {
      window.removeEventListener('resize', checkMobile);
      motionQuery.removeEventListener('change', motionHandler);
    };
  }, []);

  // Track mouse coordinates normalized between -1 and 1
  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const { clientX, clientY } = e;
    const { innerWidth, innerHeight } = window;
    const x = (clientX / innerWidth) * 2 - 1;
    const y = -(clientY / innerHeight) * 2 + 1;
    setMouse({ x, y });
  }, []);

  // Camera settings: mobile positioned slightly further back to avoid cropping
  const cameraZ = isMobile ? 4.8 : 3.6;
  const cameraY = isMobile ? 0.15 : 0.05;

  return (
    <div
      className="relative w-full h-full cursor-pointer select-none"
      onPointerMove={handlePointerMove}
      onClick={onSceneClick}
      role="button"
      tabIndex={0}
      aria-label={
        isSessionActive
          ? 'Active 3D robot companion CHATU. Tap to mute or end conversation.'
          : 'Interactive 3D robot CHATU. Tap to start voice conversation.'
      }
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSceneClick();
        }
      }}
    >
      <Canvas
        shadows="basic"
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          alpha: true,
        }}
        dpr={[1, isMobile ? 1.5 : 2]}
      >
        <PerspectiveCamera
          makeDefault
          fov={isMobile ? 48 : 42}
          position={[0, cameraY, cameraZ]}
        />

        <SceneLighting state={state} />

        <Suspense fallback={null}>
          <Robot
            state={state}
            mouse={mouse}
            audioMetrics={audioMetrics}
            prefersReducedMotion={prefersReducedMotion}
          />

          {/* Contact shadow below the floating robot */}
          <ContactShadows
            position={[0, -1.3, 0]}
            opacity={0.4}
            scale={4}
            blur={2.5}
            far={3}
            color="#000000"
          />

          {/* Subtle floating cybernetic ambient particles */}
          <Sparkles
            count={isMobile ? 35 : 75}
            scale={isMobile ? 4 : 6}
            size={isMobile ? 1.2 : 1.8}
            speed={prefersReducedMotion ? 0.1 : 0.35}
            opacity={0.25}
            color={state === 'LISTENING' ? '#00f0ff' : '#94a3b8'}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
