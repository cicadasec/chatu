'use client';

import React, { useState, useEffect } from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';
import type { LiveConnectionState } from '@/types/gemini';
import type { RobotState } from '@/types/robot';

interface ExperienceUIProps {
  connectionState: LiveConnectionState;
  robotState: RobotState;
  errorMessage: string | null;
  onClearError: () => void;
  onRetry: () => void;
  inputVolume: number;
}

export function ExperienceUI({
  connectionState,
  robotState,
  errorMessage,
  onClearError,
  onRetry,
  inputVolume,
}: ExperienceUIProps) {
  const [showDebug, setShowDebug] = useState(false);
  const [fps, setFps] = useState(60);

  // Development debug hotkey (Ctrl + D)
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setShowDebug((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKey);

    // Basic FPS calculation for debug HUD
    let frameCount = 0;
    let lastTime = performance.now();
    let frameId: number;

    const loop = () => {
      frameCount++;
      const now = performance.now();
      if (now >= lastTime + 1000) {
        setFps(Math.round((frameCount * 1000) / (now - lastTime)));
        frameCount = 0;
        lastTime = now;
      }
      frameId = requestAnimationFrame(loop);
    };
    frameId = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('keydown', handleKey);
      cancelAnimationFrame(frameId);
    };
  }, []);

  return (
    <>
      {/* Minimal Header */}
      <header className="absolute top-8 left-0 right-0 flex items-center justify-between px-8 md:px-12 pointer-events-none z-20">
        <div className="flex items-center gap-3">
          <h1 className="text-sm md:text-base font-medium tracking-[0.35em] text-neutral-300 uppercase select-none">
            CHATU
          </h1>
          <span
            className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
              connectionState === 'connected'
                ? 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]'
                : connectionState === 'connecting' ||
                  connectionState === 'authenticating'
                ? 'bg-amber-400 animate-pulse'
                : 'bg-neutral-600'
            }`}
          />
        </div>

        {/* State label - very minimal and quiet */}
        <div className="text-[11px] font-mono tracking-widest text-neutral-500 uppercase select-none">
          {connectionState === 'connected' ? robotState : connectionState}
        </div>
      </header>

      {/* Human-friendly Error Banner */}
      {errorMessage && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 pointer-events-auto max-w-md w-[90%] p-4 rounded-xl bg-neutral-900/90 border border-neutral-700/60 backdrop-blur-xl shadow-2xl text-left flex items-start gap-3 transition-all animate-in fade-in slide-in-from-top-4 duration-300">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-xs font-light text-neutral-200 leading-relaxed">
              {errorMessage}
            </p>
            <div className="mt-3 flex items-center gap-3">
              <button
                onClick={onRetry}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 text-[11px] font-medium text-white transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                Retry
              </button>
              <button
                onClick={onClearError}
                className="text-[11px] text-neutral-400 hover:text-neutral-200 transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Development Debug Overlay (Active in dev mode only) */}
      {process.env.NODE_ENV === 'development' && showDebug && (
        <div className="absolute top-20 left-6 z-40 p-4 rounded-lg bg-black/80 border border-white/10 font-mono text-[11px] text-cyan-300 space-y-1 backdrop-blur-md pointer-events-none select-none">
          <div className="text-white font-bold mb-1">DEV DEBUG (Ctrl+D)</div>
          <div>FPS: {fps}</div>
          <div>Connection: {connectionState}</div>
          <div>Robot State: {robotState}</div>
          <div>Input Energy: {(inputVolume * 100).toFixed(1)}%</div>
        </div>
      )}
    </>
  );
}
