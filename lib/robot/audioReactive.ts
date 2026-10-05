import type { AudioAnalyserData } from '@/types/audio';

export interface AudioReactivityOutputs {
  scalePulse: number;       // Subtle breathing / chest resonance
  speechNod: number;        // Head nod during speech
  speechRoll: number;       // Expressive slight head tilt
  emissiveIntensity: number;// Glow brightness
  particleBoost: number;    // Particle speed multiplier
}

export class AudioReactiveController {
  private smoothedOutputs: AudioReactivityOutputs = {
    scalePulse: 0,
    speechNod: 0,
    speechRoll: 0,
    emissiveIntensity: 0,
    particleBoost: 1,
  };

  public process(
    metrics: AudioAnalyserData | null,
    isSpeaking: boolean,
    delta: number
  ): AudioReactivityOutputs {
    if (!metrics || !isSpeaking) {
      // Smoothly return to baseline when not speaking
      const decay = 1 - Math.exp(-6 * delta);
      this.smoothedOutputs.scalePulse += (0 - this.smoothedOutputs.scalePulse) * decay;
      this.smoothedOutputs.speechNod += (0 - this.smoothedOutputs.speechNod) * decay;
      this.smoothedOutputs.speechRoll += (0 - this.smoothedOutputs.speechRoll) * decay;
      this.smoothedOutputs.emissiveIntensity += (0 - this.smoothedOutputs.emissiveIntensity) * decay;
      this.smoothedOutputs.particleBoost += (1 - this.smoothedOutputs.particleBoost) * decay;
      return this.smoothedOutputs;
    }

    // Map audio metrics
    // Bass (lowFreq) -> scale pulse (max +4% scale)
    const targetScale = metrics.low * 0.05;

    // Mid frequencies (speech presence) -> head nodding and expressive roll
    const targetNod = (metrics.mid - 0.1) * 0.18;
    const targetRoll = Math.sin(Date.now() * 0.005) * metrics.mid * 0.08;

    // High frequencies + volume -> emissive brightness boost
    const targetEmissive = (metrics.volume * 0.8 + metrics.high * 0.6) * 1.5;

    // Particles speed up slightly with sound energy
    const targetParticle = 1 + metrics.volume * 2.5;

    // Smooth interpolation with delta
    const lerpRate = 1 - Math.exp(-12 * delta);
    this.smoothedOutputs.scalePulse += (targetScale - this.smoothedOutputs.scalePulse) * lerpRate;
    this.smoothedOutputs.speechNod += (targetNod - this.smoothedOutputs.speechNod) * lerpRate;
    this.smoothedOutputs.speechRoll += (targetRoll - this.smoothedOutputs.speechRoll) * lerpRate;
    this.smoothedOutputs.emissiveIntensity +=
      (targetEmissive - this.smoothedOutputs.emissiveIntensity) * lerpRate;
    this.smoothedOutputs.particleBoost +=
      (targetParticle - this.smoothedOutputs.particleBoost) * lerpRate;

    return this.smoothedOutputs;
  }
}
