export type MicrophoneStatus =
  | 'idle'
  | 'requesting'
  | 'active'
  | 'muted'
  | 'denied'
  | 'unsupported'
  | 'error';

export interface AudioAnalyserData {
  volume: number;
  low: number;
  mid: number;
  high: number;
}
