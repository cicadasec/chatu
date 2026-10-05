import {
  float32ToInt16PCM,
  resampleAudioBuffer,
  arrayBufferToBase64,
} from './pcm';
import type { MicrophoneStatus } from '@/types/audio';

export interface MicrophoneOptions {
  onAudioData: (base64Chunk: string, pcmChunk: Int16Array, volume: number) => void;
  onVolumeChange?: (volume: number) => void;
  onStatusChange?: (status: MicrophoneStatus) => void;
  targetSampleRate?: number;
}

export class MicrophoneCapture {
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private targetSampleRate: number;
  private onAudioData: (base64Chunk: string, pcmChunk: Int16Array, volume: number) => void;
  private onVolumeChange?: (volume: number) => void;
  private onStatusChange?: (status: MicrophoneStatus) => void;
  private isMuted = false;
  private status: MicrophoneStatus = 'idle';

  constructor(options: MicrophoneOptions) {
    this.onAudioData = options.onAudioData;
    this.onVolumeChange = options.onVolumeChange;
    this.onStatusChange = options.onStatusChange;
    this.targetSampleRate = options.targetSampleRate || 16000;
  }

  public getStatus(): MicrophoneStatus {
    return this.status;
  }

  private setStatus(status: MicrophoneStatus) {
    this.status = status;
    this.onStatusChange?.(status);
  }

  public async start(): Promise<void> {
    if (this.mediaStream) {
      return;
    }

    this.setStatus('requesting');

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        this.setStatus('unsupported');
        throw new Error('Microphone audio is not supported in this browser.');
      }

      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;

      this.audioContext = new AudioContextClass({
        latencyHint: 'interactive',
      });

      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);

      // Buffer size 2048 gives ~42ms chunks at 48kHz (smooth and low latency)
      const bufferSize = 2048;
      this.processorNode = this.audioContext.createScriptProcessor(bufferSize, 1, 1);

      this.processorNode.onaudioprocess = (event: AudioProcessingEvent) => {
        if (this.isMuted) return;

        const inputChannel = event.inputBuffer.getChannelData(0);

        // Compute RMS volume for energy detection & visualizer
        let sum = 0;
        for (let i = 0; i < inputChannel.length; i++) {
          sum += inputChannel[i] * inputChannel[i];
        }
        const rms = Math.sqrt(sum / inputChannel.length);
        const volume = Math.min(1, rms * 5); // Normalized boost

        this.onVolumeChange?.(volume);

        // Resample from hardware rate (e.g. 48000 or 44100) down to Gemini Live 16000
        const nativeRate = this.audioContext?.sampleRate || 48000;
        const resampled = resampleAudioBuffer(
          inputChannel,
          nativeRate,
          this.targetSampleRate
        );

        // Convert to 16-bit PCM Int16
        const pcm16 = float32ToInt16PCM(resampled);

        // Convert to base64
        const base64Chunk = arrayBufferToBase64(pcm16);

        this.onAudioData(base64Chunk, pcm16, volume);
      };

      this.sourceNode.connect(this.processorNode);
      // Connect to a mute destination to keep processing alive in Web Audio
      const silentGain = this.audioContext.createGain();
      silentGain.gain.value = 0;
      this.processorNode.connect(silentGain);
      silentGain.connect(this.audioContext.destination);

      this.setStatus('active');
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        this.setStatus('denied');
      } else {
        this.setStatus('error');
      }
      this.stop();
      throw err;
    }
  }

  public setMute(muted: boolean): void {
    this.isMuted = muted;
    if (this.status === 'active' || this.status === 'muted') {
      this.setStatus(muted ? 'muted' : 'active');
    }
  }

  public stop(): void {
    if (this.processorNode) {
      this.processorNode.disconnect();
      this.processorNode = null;
    }

    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.setStatus('idle');
  }
}
