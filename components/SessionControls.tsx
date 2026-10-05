'use client';

import React from 'react';
import { Mic, MicOff, RefreshCw, Square, Loader2 } from 'lucide-react';
import type { LiveConnectionState } from '@/types/gemini';
import type { RobotState } from '@/types/robot';

interface SessionControlsProps {
  isSessionActive: boolean;
  connectionState: LiveConnectionState;
  robotState: RobotState;
  isMuted: boolean;
  onStartSession: () => void;
  onToggleMute: () => void;
  onEndSession: () => void;
  onReconnect: () => void;
}

export function SessionControls({
  isSessionActive,
  connectionState,
  robotState,
  isMuted,
  onStartSession,
  onToggleMute,
  onEndSession,
  onReconnect,
}: SessionControlsProps) {
  const isConnecting =
    connectionState === 'authenticating' ||
    connectionState === 'connecting' ||
    connectionState === 'reconnecting';

  if (!isSessionActive) {
    return (
      <div className="absolute bottom-12 left-0 right-0 flex flex-col items-center justify-center pointer-events-auto z-20">
        <button
          onClick={onStartSession}
          disabled={isConnecting}
          aria-label="Start voice conversation with CHATU"
          className="group relative flex items-center gap-3 px-7 py-3.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] active:bg-white/[0.12] border border-white/10 hover:border-cyan-400/40 backdrop-blur-md transition-all duration-300 shadow-[0_4px_30px_rgba(0,0,0,0.5)] focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
        >
          {isConnecting ? (
            <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
          ) : (
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          )}
          <span className="text-sm font-light tracking-[0.25em] text-neutral-300 group-hover:text-white uppercase transition-colors">
            {isConnecting ? 'CONNECTING...' : 'TAP TO TALK'}
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="absolute bottom-8 left-0 right-0 flex items-center justify-center gap-4 pointer-events-auto z-20 transition-opacity duration-500">
      {/* Mute / Unmute Button */}
      <button
        onClick={onToggleMute}
        aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
        className={`p-3.5 rounded-full border backdrop-blur-md transition-all duration-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 ${
          isMuted
            ? 'bg-red-500/20 border-red-500/40 text-red-300 hover:bg-red-500/30'
            : 'bg-white/[0.05] border-white/10 text-neutral-300 hover:text-white hover:bg-white/[0.1]'
        }`}
      >
        {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
      </button>

      {/* End Conversation Button */}
      <button
        onClick={onEndSession}
        aria-label="End conversation with CHATU"
        className="p-3.5 rounded-full bg-white/[0.05] hover:bg-white/[0.1] active:scale-95 border border-white/10 text-neutral-300 hover:text-white backdrop-blur-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
      >
        <Square className="w-5 h-5 fill-current" />
      </button>

      {/* Reconnect Button (only shown if error or disconnected) */}
      {(robotState === 'ERROR' ||
        robotState === 'DISCONNECTED' ||
        connectionState === 'error') && (
        <button
          onClick={onReconnect}
          aria-label="Reconnect to CHATU"
          className="p-3.5 rounded-full bg-cyan-500/20 hover:bg-cyan-500/30 active:scale-95 border border-cyan-400/40 text-cyan-300 backdrop-blur-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
