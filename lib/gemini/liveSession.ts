import { GoogleGenAI, Modality, type LiveServerMessage } from '@google/genai';
import { fetchEphemeralToken } from './ephemeralToken';
import { CHATU_CONFIG } from './config';
import { base64ToInt16Array } from '@/lib/audio/pcm';
import type { LiveConnectionState } from '@/types/gemini';
import type { RobotState } from '@/types/robot';

export interface LiveSessionEventHandlers {
  onConnectionChange: (state: LiveConnectionState) => void;
  onRobotStateChange: (state: RobotState) => void;
  onAudioOutputChunk: (pcm16: Int16Array) => void;
  onInterrupted: () => void;
  onError: (error: string) => void;
}

export interface LiveToolHandler {
  name: string;
  description: string;
  parameters?: Record<string, unknown>;
  execute: (args: Record<string, unknown>) => Promise<Record<string, unknown>>;
}

export class GeminiLiveSession {
  private session: Awaited<ReturnType<GoogleGenAI['live']['connect']>> | null = null;
  private connectionState: LiveConnectionState = 'idle';
  private currentRobotState: RobotState = 'IDLE';
  private handlers: LiveSessionEventHandlers;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isIntentionalDisconnect = false;
  private registeredTools: Map<string, LiveToolHandler> = new Map();

  constructor(handlers: LiveSessionEventHandlers) {
    this.handlers = handlers;
  }

  public registerTool(tool: LiveToolHandler) {
    this.registeredTools.set(tool.name, tool);
  }

  public getConnectionState(): LiveConnectionState {
    return this.connectionState;
  }

  public getRobotState(): RobotState {
    return this.currentRobotState;
  }

  private setConnectionState(state: LiveConnectionState) {
    this.connectionState = state;
    this.handlers.onConnectionChange(state);
  }

  public setRobotState(state: RobotState) {
    this.currentRobotState = state;
    this.handlers.onRobotStateChange(state);
  }

  public async connect(): Promise<void> {
    if (this.connectionState === 'connected' || this.connectionState === 'connecting') {
      return;
    }

    this.isIntentionalDisconnect = false;
    this.setConnectionState('authenticating');

    try {
      // 1. Fetch ephemeral token from secure server endpoint
      const auth = await fetchEphemeralToken();
      const ephemeralToken = auth.token;
      const model = auth.model || CHATU_CONFIG.model;
      const voice = auth.voice || CHATU_CONFIG.voice;

      this.setConnectionState('connecting');

      // 2. Initialize client SDK with the ephemeral token
      const ai = new GoogleGenAI({
        apiKey: ephemeralToken,
        httpOptions: { apiVersion: 'v1alpha' },
      });

      // 3. Establish WebSocket connection to Gemini Live
      this.session = await ai.live.connect({
        model: model,
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: voice,
              },
            },
          },
          systemInstruction: {
            parts: [{ text: CHATU_CONFIG.systemInstruction }],
          },
        },
        callbacks: {
          onopen: () => {
            this.reconnectAttempts = 0;
            this.setConnectionState('connected');
            this.setRobotState('LISTENING');
          },
          onmessage: (message: LiveServerMessage) => {
            this.handleServerMessage(message);
          },
          onerror: (err: unknown) => {
            console.error('[Gemini Live Session Error]:', err);
            this.handlers.onError('Live session error encountered.');
            this.setRobotState('ERROR');
          },
          onclose: (e: CloseEvent) => {
            if (!this.isIntentionalDisconnect) {
              this.handleUnexpectedDisconnect(e);
            } else {
              this.setConnectionState('disconnected');
              this.setRobotState('IDLE');
            }
          },
        },
      });
    } catch (err: unknown) {
      console.error('[Gemini Live Connect Failed]:', err);
      const msg = err instanceof Error ? err.message : 'Failed to connect to CHATU';
      this.setConnectionState('error');
      this.setRobotState('ERROR');
      this.handlers.onError(msg);
      throw err;
    }
  }

  private handleServerMessage(message: LiveServerMessage) {
    // 1. Check for server-side interruption signal
    if (message.serverContent?.interrupted) {
      this.handlers.onInterrupted();
      this.setRobotState('LISTENING');
      return;
    }

    // 2. Process model turn output audio
    const parts = message.serverContent?.modelTurn?.parts;
    if (parts && parts.length > 0) {
      for (const part of parts) {
        if (part.inlineData && part.inlineData.data) {
          const mime = part.inlineData.mimeType || '';
          if (mime.includes('audio') || mime === '' || mime.includes('pcm')) {
            const pcm16 = base64ToInt16Array(part.inlineData.data);
            if (pcm16.length > 0) {
              // Transition robot to speaking
              if (this.currentRobotState !== 'SPEAKING') {
                this.setRobotState('SPEAKING');
              }
              this.handlers.onAudioOutputChunk(pcm16);
            }
          }
        }
      }
    }

    // 3. Check for turn completion
    if (message.serverContent?.turnComplete) {
      // Model has finished generating its turn
      // Note: playback manager will notify when audio finishes, returning state to LISTENING
    }

    // 4. Handle future tool calls
    if (message.toolCall?.functionCalls) {
      this.handleFunctionCalls(message.toolCall.functionCalls);
    }
  }

  private async handleFunctionCalls(
    calls: Array<{ id?: string; name?: string; args?: Record<string, unknown> }>
  ) {
    if (!this.session) return;
    const responses = [];

    for (const call of calls) {
      const handler = call.name ? this.registeredTools.get(call.name) : undefined;
      let output: Record<string, unknown> = {};

      if (handler) {
        try {
          output = await handler.execute(call.args || {});
        } catch (err) {
          output = { error: err instanceof Error ? err.message : 'Tool execution failed' };
        }
      } else {
        output = { error: `Function ${call.name} not implemented.` };
      }

      responses.push({
        id: call.id || '',
        name: call.name || '',
        response: output,
      });
    }

    try {
      this.session.sendToolResponse({ functionResponses: responses });
    } catch (e) {
      console.error('[Gemini Live] Failed to send tool response:', e);
    }
  }

  public sendAudioChunk(base64PCM16: string): void {
    if (!this.session || this.connectionState !== 'connected') {
      return;
    }

    try {
      this.session.sendRealtimeInput({
        audio: {
          mimeType: 'audio/pcm;rate=16000',
          data: base64PCM16,
        },
      });
    } catch (e) {
      console.warn('[Gemini Live] Audio send warning:', e);
    }
  }

  public interrupt(): void {
    if (this.currentRobotState === 'SPEAKING') {
      this.handlers.onInterrupted();
      this.setRobotState('LISTENING');
    }
  }

  private handleUnexpectedDisconnect(e: CloseEvent) {
    console.warn(`[Gemini Live] Unexpected disconnect (code ${e.code}). Attempting reconnect...`);
    this.setConnectionState('reconnecting');
    this.setRobotState('DISCONNECTED');

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 8000);
      this.reconnectTimer = setTimeout(() => {
        this.connect().catch(() => {
          // Failure logged in connect()
        });
      }, delay);
    } else {
      this.setConnectionState('disconnected');
      this.handlers.onError('Connection to CHATU lost. Tap to reconnect.');
    }
  }

  public disconnect(): void {
    this.isIntentionalDisconnect = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.session) {
      try {
        this.session.close();
      } catch (err) {
        console.warn('Session close error:', err);
      }
      this.session = null;
    }

    this.setConnectionState('disconnected');
    this.setRobotState('IDLE');
  }
}
