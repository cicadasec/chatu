import * as THREE from 'three';
import { RobotStateManager } from './stateManager';
import { EyeTrackingController } from './eyeTracking';
import { AudioReactiveController } from './audioReactive';
import { LipSyncController } from './lipSync';
import type { AudioAnalyserData } from '@/types/audio';
import type { MousePosition, RobotState } from '@/types/robot';

export class RobotAnimationController {
  public stateManager = new RobotStateManager();
  public eyeTracking = new EyeTrackingController();
  public audioReactive = new AudioReactiveController();
  public lipSync = new LipSyncController();

  private startTime = performance.now();
  private basePosition = new THREE.Vector3(0, 0, 0);
  private currentPosition = new THREE.Vector3(0, 0, 0);
  private currentRotation = new THREE.Euler(0, 0, 0);
  private currentScale = 1;

  public bindModel(root: THREE.Object3D) {
    this.lipSync.bindModel(root);
  }

  public update(
    mouse: MousePosition,
    audioMetrics: AudioAnalyserData | null,
    delta: number,
    prefersReducedMotion = false
  ): {
    position: THREE.Vector3;
    rotation: THREE.Euler;
    scale: number;
    glowIntensity: number;
    glowColor: string;
    lipSyncValue: number;
    state: RobotState;
  } {
    const state = this.stateManager.getState();
    const visualConfig = this.stateManager.getVisualConfig();
    const elapsedTime = (performance.now() - this.startTime) / 1000;

    // 1. Eye/Head tracking update
    this.eyeTracking.updateTarget(mouse, visualConfig.attentiveness);
    const tracking = this.eyeTracking.step(delta);

    // 2. Audio reactivity
    const isSpeaking = state === 'SPEAKING';
    const audioOutputs = this.audioReactive.process(audioMetrics, isSpeaking, delta);

    // 3. Lip sync
    const lipValue = this.lipSync.update(audioMetrics, isSpeaking, delta);

    // 4. Procedural multi-harmonic floating & breathing (reduced if prefersReducedMotion)
    const motionScale = prefersReducedMotion ? 0.2 : 1.0;
    const t = elapsedTime * visualConfig.floatSpeed;

    // Organic floating: mix of sin and cos with slight irrational frequencies
    const floatY =
      (Math.sin(t) * 0.7 + Math.sin(t * 0.43) * 0.3) *
      visualConfig.floatAmplitude *
      motionScale;

    const swayX = Math.sin(t * 0.5) * 0.02 * motionScale;
    const breathRoll = Math.cos(t * 0.7) * 0.015 * motionScale;

    // Target Z position: robot steps forward when listening or speaking
    const targetZ = this.basePosition.z + visualConfig.forwardOffset;
    const targetY = this.basePosition.y + floatY;
    const targetX = this.basePosition.x + swayX;

    // Target rotations
    const targetRotX =
      visualConfig.headTiltX +
      tracking.pitch * motionScale +
      audioOutputs.speechNod * motionScale;

    const targetRotY =
      visualConfig.headTiltY +
      tracking.yaw * motionScale +
      Math.sin(t * 0.3) * 0.03 * motionScale;

    const targetRotZ =
      breathRoll + audioOutputs.speechRoll * motionScale;

    // Target scale (subtle breathing + bass pulse)
    const breathScale = 1 + Math.sin(t * 1.2) * 0.008 * motionScale;
    const targetScale = breathScale + audioOutputs.scalePulse * motionScale;

    // Smooth interpolation towards targets
    const posLerp = 1 - Math.exp(-6 * delta);
    const rotLerp = 1 - Math.exp(-8 * delta);
    const scaleLerp = 1 - Math.exp(-10 * delta);

    this.currentPosition.x += (targetX - this.currentPosition.x) * posLerp;
    this.currentPosition.y += (targetY - this.currentPosition.y) * posLerp;
    this.currentPosition.z += (targetZ - this.currentPosition.z) * posLerp;

    this.currentRotation.x += (targetRotX - this.currentRotation.x) * rotLerp;
    this.currentRotation.y += (targetRotY - this.currentRotation.y) * rotLerp;
    this.currentRotation.z += (targetRotZ - this.currentRotation.z) * rotLerp;

    this.currentScale += (targetScale - this.currentScale) * scaleLerp;

    // Dynamic glow calculation
    const baseGlow = visualConfig.glowIntensity;
    const pulseFactor = state === 'THINKING' ? Math.sin(elapsedTime * 6) * 0.4 + 0.6 : 1.0;
    const finalGlow = (baseGlow * pulseFactor + audioOutputs.emissiveIntensity) * (prefersReducedMotion ? 0.8 : 1.0);

    return {
      position: this.currentPosition.clone(),
      rotation: this.currentRotation.clone(),
      scale: this.currentScale,
      glowIntensity: finalGlow,
      glowColor: visualConfig.glowColor,
      lipSyncValue: lipValue,
      state,
    };
  }
}
