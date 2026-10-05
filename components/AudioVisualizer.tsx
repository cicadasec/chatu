'use client';

import React from 'react';
import type { AudioAnalyserData } from '@/types/audio';
import type { RobotState } from '@/types/robot';

interface AudioVisualizerProps {
  state: RobotState;
  audioMetrics: AudioAnalyserData | null;
  inputVolume?: number;
}

export function AudioVisualizer({
  state,
  audioMetrics,
  inputVolume = 0,
}: AudioVisualizerProps) {
  const isListening = state === 'LISTENING';
  const isSpeaking = state === 'SPEAKING';
  const isThinking = state === 'THINKING';

  // Compute reactivity amplitude
  const amplitude = isSpeaking
    ? Math.max(0.1, (audioMetrics?.volume || 0) * 1.5)
    : isListening
    ? Math.max(0.1, inputVolume * 1.8)
    : isThinking
    ? 0.35
    : 0.05;

  const glowColor = isListening
    ? 'rgba(0, 229, 255, 0.4)'
    : isThinking
    ? 'rgba(168, 85, 247, 0.4)'
    : isSpeaking
    ? 'rgba(100, 223, 223, 0.5)'
    : 'rgba(255, 255, 255, 0.05)';

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
      {/* Outer breathing aura */}
      <div
        className="w-[320px] h-[320px] md:w-[480px] md:h-[480px] rounded-full transition-transform duration-150 ease-out"
        style={{
          transform: `scale(${1 + amplitude * 0.4})`,
          background: `radial-gradient(circle, ${glowColor} 0%, rgba(0,0,0,0) 70%)`,
          filter: 'blur(30px)',
          opacity: state === 'IDLE' ? 0.3 : 0.85,
        }}
      />

      {/* Cybernetic focal ring during listening/speaking */}
      {(isListening || isSpeaking) && (
        <div
          className="absolute w-[240px] h-[240px] md:w-[360px] md:h-[360px] rounded-full border border-cyan-400/20 transition-all duration-100"
          style={{
            transform: `scale(${1 + amplitude * 0.25})`,
            boxShadow: `0 0 25px ${glowColor}`,
          }}
        />
      )}
    </div>
  );
}
