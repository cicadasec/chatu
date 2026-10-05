import type { RobotState } from '@/types/robot';

export interface StateVisualConfig {
  floatAmplitude: number;
  floatSpeed: number;
  glowColor: string;
  glowIntensity: number;
  forwardOffset: number; // Z-axis movement towards camera
  headTiltX: number;
  headTiltY: number;
  attentiveness: number; // Sensitivity to cursor
}

export const STATE_VISUALS: Record<RobotState, StateVisualConfig> = {
  IDLE: {
    floatAmplitude: 0.08,
    floatSpeed: 1.2,
    glowColor: '#4f9fff',
    glowIntensity: 0.6,
    forwardOffset: 0,
    headTiltX: 0,
    headTiltY: 0,
    attentiveness: 0.4,
  },
  LISTENING: {
    floatAmplitude: 0.04,
    floatSpeed: 2.0,
    glowColor: '#00e5ff',
    glowIntensity: 1.4,
    forwardOffset: 0.35, // Leans closer attentively
    headTiltX: -0.05,
    headTiltY: 0,
    attentiveness: 1.0, // High focus on user cursor
  },
  THINKING: {
    floatAmplitude: 0.05,
    floatSpeed: 1.5,
    glowColor: '#9d4edd',
    glowIntensity: 1.0,
    forwardOffset: 0.1,
    headTiltX: -0.1, // Gazes slightly upward
    headTiltY: 0.12, // Slight tilt in thought
    attentiveness: 0.2, // Drifts in thought
  },
  SPEAKING: {
    floatAmplitude: 0.1,
    floatSpeed: 2.5,
    glowColor: '#64dfdf',
    glowIntensity: 1.6,
    forwardOffset: 0.25,
    headTiltX: 0,
    headTiltY: 0,
    attentiveness: 0.8,
  },
  INTERRUPTED: {
    floatAmplitude: 0.04,
    floatSpeed: 3.0,
    glowColor: '#ffd166',
    glowIntensity: 1.2,
    forwardOffset: 0.2,
    headTiltX: -0.05,
    headTiltY: 0,
    attentiveness: 1.0,
  },
  ERROR: {
    floatAmplitude: 0.03,
    floatSpeed: 0.8,
    glowColor: '#ff5c5c',
    glowIntensity: 0.8,
    forwardOffset: -0.1,
    headTiltX: 0.15, // Head droops slightly
    headTiltY: 0,
    attentiveness: 0.1,
  },
  DISCONNECTED: {
    floatAmplitude: 0.02,
    floatSpeed: 0.5,
    glowColor: '#334155',
    glowIntensity: 0.2,
    forwardOffset: -0.2,
    headTiltX: 0.1,
    headTiltY: 0,
    attentiveness: 0.0,
  },
};

export class RobotStateManager {
  private currentState: RobotState = 'IDLE';
  private previousState: RobotState = 'IDLE';
  private stateStartTime = Date.now();
  private listeners: Array<(state: RobotState) => void> = [];

  public getState(): RobotState {
    return this.currentState;
  }

  public getVisualConfig(): StateVisualConfig {
    return STATE_VISUALS[this.currentState];
  }

  public setState(nextState: RobotState): void {
    if (this.currentState === nextState) return;
    this.previousState = this.currentState;
    this.currentState = nextState;
    this.stateStartTime = Date.now();
    this.listeners.forEach((cb) => cb(nextState));
  }

  public onStateChange(listener: (state: RobotState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  public getElapsedInState(): number {
    return (Date.now() - this.stateStartTime) / 1000;
  }
}
