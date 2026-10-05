import type { MousePosition } from '@/types/robot';

export class EyeTrackingController {
  private targetYaw = 0;
  private targetPitch = 0;
  private currentYaw = 0;
  private currentPitch = 0;

  // Maximum rotation limits in radians
  private maxYaw = 0.45; // ~26 degrees
  private maxPitch = 0.35; // ~20 degrees
  private smoothFactor = 0.08;

  public updateTarget(mouse: MousePosition, attentiveness = 1.0): void {
    // Invert Y because mouse coordinate top is negative pitch
    this.targetYaw = mouse.x * this.maxYaw * attentiveness;
    this.targetPitch = -mouse.y * this.maxPitch * attentiveness;
  }

  public step(delta: number): { yaw: number; pitch: number } {
    // Frame-rate independent lerp
    const lerpAlpha = 1 - Math.exp(-this.smoothFactor * delta * 60);

    this.currentYaw += (this.targetYaw - this.currentYaw) * lerpAlpha;
    this.currentPitch += (this.targetPitch - this.currentPitch) * lerpAlpha;

    return {
      yaw: this.currentYaw,
      pitch: this.currentPitch,
    };
  }

  public reset(): void {
    this.targetYaw = 0;
    this.targetPitch = 0;
  }
}
