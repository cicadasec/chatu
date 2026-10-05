export type RobotState =
  | 'IDLE'
  | 'LISTENING'
  | 'THINKING'
  | 'SPEAKING'
  | 'INTERRUPTED'
  | 'ERROR'
  | 'DISCONNECTED';

export interface AudioMetrics {
  volume: number;       // 0 to 1 overall amplitude
  lowFreq: number;      // 0 to 1 bass/subtle chest pulse
  midFreq: number;      // 0 to 1 speech articulation/head tilt
  highFreq: number;     // 0 to 1 cybernetic shimmer/visor glow
  rawWaveform?: Float32Array;
  isAudioActive: boolean;
}

export interface MousePosition {
  x: number; // Normalized -1 to 1
  y: number; // Normalized -1 to 1
}

export interface ProceduralAnimationState {
  floatOffset: number;
  tiltX: number;
  tiltY: number;
  tiltZ: number;
  headYaw: number;
  headPitch: number;
  headRoll: number;
  pulseGlow: number;
  audioReactivity: number;
}
