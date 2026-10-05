import type { RobotState } from './robot';

export type LiveConnectionState =
  | 'idle'
  | 'authenticating'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected'
  | 'error';

export interface EphemeralTokenResponse {
  token: string;
  expireTime?: string;
  model: string;
  voice?: string;
  error?: string;
}

export interface LiveSessionCallbacks {
  onStateChange?: (state: RobotState) => void;
  onConnectionChange?: (status: LiveConnectionState) => void;
  onAudioData?: (pcmData: Float32Array) => void;
  onInterrupted?: () => void;
  onError?: (err: Error | string) => void;
}

export interface GeminiLiveConfig {
  model: string;
  voice: string;
  systemInstruction: string;
}
