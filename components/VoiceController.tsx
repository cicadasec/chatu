'use client';

import { useRef, useCallback, useState, useEffect } from 'react';
import { GeminiLiveSession } from '@/lib/gemini/liveSession';
import { MicrophoneCapture } from '@/lib/audio/microphone';
import { AudioPlaybackManager } from '@/lib/audio/playback';
import type { AudioAnalyserData } from '@/types/audio';
import type { LiveConnectionState } from '@/types/gemini';
import type { RobotState } from '@/types/robot';

export interface UseVoiceControllerReturn {
  isSessionActive: boolean;
  connectionState: LiveConnectionState;
  robotState: RobotState;
  audioMetrics: AudioAnalyserData | null;
  inputVolume: number;
  isMuted: boolean;
  errorMessage: string | null;
  startSession: () => Promise<void>;
  endSession: () => void;
  toggleMute: () => void;
  reconnect: () => Promise<void>;
}

export function useVoiceController(): UseVoiceControllerReturn {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [connectionState, setConnectionState] = useState<LiveConnectionState>('idle');
  const [robotState, setRobotState] = useState<RobotState>('IDLE');
  const [audioMetrics, setAudioMetrics] = useState<AudioAnalyserData | null>(null);
  const [inputVolume, setInputVolume] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const playbackManagerRef = useRef<AudioPlaybackManager | null>(null);
  const microphoneRef = useRef<MicrophoneCapture | null>(null);
  const liveSessionRef = useRef<GeminiLiveSession | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Initialize playback manager once
  if (!playbackManagerRef.current) {
    playbackManagerRef.current = new AudioPlaybackManager(24000, (isPlaying) => {
      // When audio finishes playing and user isn't speaking, return to LISTENING
      if (!isPlaying && liveSessionRef.current?.getRobotState() === 'SPEAKING') {
        liveSessionRef.current.setRobotState('LISTENING');
        setRobotState('LISTENING');
      }
    });
  }

  // Animation frame loop to sample frequency analysis from playback
  useEffect(() => {
    const updateAnalyser = () => {
      if (playbackManagerRef.current) {
        const analyser = playbackManagerRef.current.getAnalyser();
        if (analyser && playbackManagerRef.current.getIsPlaying()) {
          setAudioMetrics(analyser.getMetrics());
        } else if (audioMetrics !== null) {
          setAudioMetrics(null);
        }
      }
      animFrameRef.current = requestAnimationFrame(updateAnalyser);
    };

    animFrameRef.current = requestAnimationFrame(updateAnalyser);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [audioMetrics]);

  // Handle interruption
  const handleInterruption = useCallback(() => {
    playbackManagerRef.current?.stopAndClear();
    setAudioMetrics(null);
    liveSessionRef.current?.setRobotState('LISTENING');
    setRobotState('LISTENING');
  }, []);

  // Initialize Gemini Live session manager
  useEffect(() => {
    const session = new GeminiLiveSession({
      onConnectionChange: (conn) => {
        setConnectionState(conn);
      },
      onRobotStateChange: (state) => {
        setRobotState(state);
      },
      onAudioOutputChunk: (pcm16) => {
        playbackManagerRef.current?.enqueuePCMChunk(pcm16);
      },
      onInterrupted: () => {
        handleInterruption();
      },
      onError: (err) => {
        setErrorMessage(typeof err === 'string' ? err : 'Live session error.');
      },
    });

    liveSessionRef.current = session;

    return () => {
      session.disconnect();
    };
  }, [handleInterruption]);

  const startSession = useCallback(async () => {
    setErrorMessage(null);

    try {
      // 1. Initialize playback context on direct user gesture
      await playbackManagerRef.current?.init();

      // 2. Initialize microphone capture
      const mic = new MicrophoneCapture({
        targetSampleRate: 16000,
        onAudioData: (base64Chunk, _pcmChunk, volume) => {
          // If robot is currently speaking and user speaks with volume above threshold, interrupt!
          if (
            volume > 0.25 &&
            liveSessionRef.current?.getRobotState() === 'SPEAKING'
          ) {
            handleInterruption();
            liveSessionRef.current.interrupt();
          }

          // Stream audio to Gemini Live
          liveSessionRef.current?.sendAudioChunk(base64Chunk);
        },
        onVolumeChange: (vol) => {
          setInputVolume(vol);
        },
        onStatusChange: (status) => {
          if (status === 'denied') {
            setErrorMessage('Microphone access is needed to talk with CHATU.');
          } else if (status === 'error' || status === 'unsupported') {
            setErrorMessage('Microphone is unavailable on this device.');
          }
        },
      });

      microphoneRef.current = mic;
      await mic.start();

      // 3. Connect to Gemini Live
      if (liveSessionRef.current) {
        await liveSessionRef.current.connect();
      }

      setIsSessionActive(true);
      setIsMuted(false);
    } catch (err: unknown) {
      console.error('[VoiceController] Failed to start voice session:', err);
      const msg =
        err instanceof Error
          ? err.message
          : 'Microphone access is needed to talk with CHATU.';
      setErrorMessage(msg);
      endSession();
    }
  }, [handleInterruption]);

  const endSession = useCallback(() => {
    microphoneRef.current?.stop();
    microphoneRef.current = null;

    playbackManagerRef.current?.stopAndClear();
    liveSessionRef.current?.disconnect();

    setIsSessionActive(false);
    setIsMuted(false);
    setInputVolume(0);
    setAudioMetrics(null);
    setRobotState('IDLE');
  }, []);

  const toggleMute = useCallback(() => {
    if (!microphoneRef.current) return;
    const nextMuted = !isMuted;
    microphoneRef.current.setMute(nextMuted);
    setIsMuted(nextMuted);
  }, [isMuted]);

  const reconnect = useCallback(async () => {
    endSession();
    await startSession();
  }, [endSession, startSession]);

  return {
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
  };
}
