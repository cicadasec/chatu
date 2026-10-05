import type { AudioAnalyserData } from '@/types/audio';

export class AudioAnalyser {
  private analyser: AnalyserNode;
  private dataArray: Uint8Array;
  private smoothedVolume = 0;
  private smoothedLow = 0;
  private smoothedMid = 0;
  private smoothedHigh = 0;

  constructor(analyserNode: AnalyserNode) {
    this.analyser = analyserNode;
    this.analyser.fftSize = 512;
    this.analyser.smoothingTimeConstant = 0.8;
    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
  }

  public getMetrics(): AudioAnalyserData {
    // Fill frequency data
    // Cast to Uint8Array to satisfy Web Audio API signatures across TS lib targets
    this.analyser.getByteFrequencyData(this.dataArray as unknown as Uint8Array<ArrayBuffer>);

    const binCount = this.dataArray.length; // 256 bins for fftSize 512
    const nyquist = (this.analyser.context.sampleRate || 24000) / 2;
    const binWidth = nyquist / binCount;

    // Define frequency bands
    // Low: 80Hz - 350Hz (subtle body/breathing resonance)
    // Mid: 350Hz - 2500Hz (vocal presence and head gestures)
    // High: 2500Hz - 7000Hz (sibilance, visor shimmer)
    let lowSum = 0;
    let lowCount = 0;
    let midSum = 0;
    let midCount = 0;
    let highSum = 0;
    let highCount = 0;
    let totalSum = 0;

    for (let i = 0; i < binCount; i++) {
      const freq = i * binWidth;
      const val = this.dataArray[i] / 255;
      totalSum += val;

      if (freq >= 80 && freq < 350) {
        lowSum += val;
        lowCount++;
      } else if (freq >= 350 && freq < 2500) {
        midSum += val;
        midCount++;
      } else if (freq >= 2500 && freq < 7000) {
        highSum += val;
        highCount++;
      }
    }

    const currentVolume = totalSum / binCount;
    const currentLow = lowCount > 0 ? lowSum / lowCount : 0;
    const currentMid = midCount > 0 ? midSum / midCount : 0;
    const currentHigh = highCount > 0 ? highSum / highCount : 0;

    // Smooth with decay
    const attack = 0.4;
    const decay = 0.85;

    this.smoothedVolume =
      currentVolume > this.smoothedVolume
        ? this.smoothedVolume * (1 - attack) + currentVolume * attack
        : this.smoothedVolume * decay;

    this.smoothedLow =
      currentLow > this.smoothedLow
        ? this.smoothedLow * (1 - attack) + currentLow * attack
        : this.smoothedLow * decay;

    this.smoothedMid =
      currentMid > this.smoothedMid
        ? this.smoothedMid * (1 - attack) + currentMid * attack
        : this.smoothedMid * decay;

    this.smoothedHigh =
      currentHigh > this.smoothedHigh
        ? this.smoothedHigh * (1 - attack) + currentHigh * attack
        : this.smoothedHigh * decay;

    return {
      volume: this.smoothedVolume,
      low: this.smoothedLow,
      mid: this.smoothedMid,
      high: this.smoothedHigh,
    };
  }

  public reset() {
    this.smoothedVolume = 0;
    this.smoothedLow = 0;
    this.smoothedMid = 0;
    this.smoothedHigh = 0;
  }
}
