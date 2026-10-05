import { int16PCMToFloat32 } from './pcm';
import { AudioAnalyser } from './analyser';

export class AudioPlaybackManager {
  private audioContext: AudioContext | null = null;
  private analyserNode: AnalyserNode | null = null;
  private audioAnalyser: AudioAnalyser | null = null;
  private gainNode: GainNode | null = null;
  private nextStartTime = 0;
  private activeSources: AudioBufferSourceNode[] = [];
  private isPlaying = false;
  private outputSampleRate = 24000;
  private onPlaybackStateChange?: (isPlaying: boolean) => void;

  constructor(outputSampleRate = 24000, onStateChange?: (isPlaying: boolean) => void) {
    this.outputSampleRate = outputSampleRate;
    this.onPlaybackStateChange = onStateChange;
  }

  public async init(): Promise<void> {
    if (this.audioContext && this.audioContext.state !== 'closed') {
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      return;
    }

    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;

    this.audioContext = new AudioContextClass({
      sampleRate: this.outputSampleRate,
      latencyHint: 'interactive',
    });

    this.analyserNode = this.audioContext.createAnalyser();
    this.analyserNode.fftSize = 512;
    this.audioAnalyser = new AudioAnalyser(this.analyserNode);

    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.value = 1.0;

    // Route: Source -> Gain -> Analyser -> Destination
    this.gainNode.connect(this.analyserNode);
    this.analyserNode.connect(this.audioContext.destination);

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  public enqueuePCMChunk(pcm16Data: Int16Array): void {
    if (!pcm16Data || pcm16Data.length === 0) {
      return;
    }

    if (!this.audioContext || this.audioContext.state === 'closed') {
      return;
    }

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(() => {});
    }

    try {
      const float32Data = int16PCMToFloat32(pcm16Data);
      if (float32Data.length === 0) {
        return;
      }

      const audioBuffer = this.audioContext.createBuffer(
        1,
        float32Data.length,
        this.outputSampleRate
      );
      audioBuffer.copyToChannel(float32Data as unknown as Float32Array<ArrayBuffer>, 0);

      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.gainNode!);

      const currentTime = this.audioContext.currentTime;
      // Schedule seamlessly right after previously queued chunk, or start right now if behind
      const startTime = Math.max(currentTime, this.nextStartTime);
      source.start(startTime);

      this.nextStartTime = startTime + audioBuffer.duration;
      this.activeSources.push(source);

      if (!this.isPlaying) {
        this.isPlaying = true;
        this.onPlaybackStateChange?.(true);
      }

      source.onended = () => {
        const idx = this.activeSources.indexOf(source);
        if (idx !== -1) {
          this.activeSources.splice(idx, 1);
        }
        if (this.activeSources.length === 0) {
          this.isPlaying = false;
          this.onPlaybackStateChange?.(false);
        }
      };
    } catch (err) {
      console.warn('[AudioPlayback] Failed to enqueue audio chunk:', err);
    }
  }

  public stopAndClear(): void {
    for (const source of this.activeSources) {
      try {
        source.stop();
        source.disconnect();
      } catch {
        // Ignore already stopped sources
      }
    }
    this.activeSources = [];
    if (this.audioContext) {
      this.nextStartTime = this.audioContext.currentTime;
    } else {
      this.nextStartTime = 0;
    }
    this.isPlaying = false;
    this.audioAnalyser?.reset();
    this.onPlaybackStateChange?.(false);
  }

  public getAnalyser(): AudioAnalyser | null {
    return this.audioAnalyser;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public async close(): Promise<void> {
    this.stopAndClear();
    if (this.audioContext && this.audioContext.state !== 'closed') {
      await this.audioContext.close();
      this.audioContext = null;
    }
  }
}
