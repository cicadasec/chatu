'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useVoiceController } from '@/components/VoiceController';
import { ExperienceUI } from '@/components/ExperienceUI';
import { SessionControls } from '@/components/SessionControls';
import { AudioVisualizer } from '@/components/AudioVisualizer';

// Dynamically import Three.js scene with SSR disabled for optimal client rendering
const RobotScene = dynamic(
  () => import('@/components/RobotScene').then((mod) => mod.RobotScene),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border border-cyan-400/20 border-t-cyan-400 animate-spin" />
      </div>
    ),
  }
);

export default function HomePage() {
  const {
    isSessionActive,
    connectionState,
    robotState,
    audioMetrics,
    inputVolume,
    isMuted,
    errorMessage,
    startSession,
    endSession,
    toggleMute,
    reconnect,
  } = useVoiceController();

  const [dismissedError, setDismissedError] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Smooth entrance sequence
  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 150);
    return () => clearTimeout(timer);
  }, []);

  const handleSceneInteraction = () => {
    if (!isSessionActive) {
      startSession();
    } else {
      // Tapping while active toggles mute
      toggleMute();
    }
  };

  const activeError =
    errorMessage && errorMessage !== dismissedError ? errorMessage : null;

  return (
    <main className="relative w-screen h-screen overflow-hidden nova-backdrop select-none">
      {/* Visual background aura and reactive ring */}
      <AudioVisualizer
        state={robotState}
        audioMetrics={audioMetrics}
        inputVolume={inputVolume}
      />

      {/* 3D Scene Layer */}
      <div
        className={`absolute inset-0 transition-opacity duration-1000 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <RobotScene
          state={robotState}
          audioMetrics={audioMetrics}
          onSceneClick={handleSceneInteraction}
          isSessionActive={isSessionActive}
        />
      </div>

      {/* Ambient Radial Vignette */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-transparent to-black/70" />

      {/* Minimal Header and Error UI */}
      <ExperienceUI
        connectionState={connectionState}
        robotState={robotState}
        errorMessage={activeError}
        onClearError={() => setDismissedError(errorMessage)}
        onRetry={reconnect}
        inputVolume={inputVolume}
      />

      {/* Bottom Session Controls */}
      <SessionControls
        isSessionActive={isSessionActive}
        connectionState={connectionState}
        robotState={robotState}
        isMuted={isMuted}
        onStartSession={startSession}
        onToggleMute={toggleMute}
        onEndSession={endSession}
        onReconnect={reconnect}
      />
    </main>
  );
}
