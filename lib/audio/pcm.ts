/**
 * Converts Float32 audio samples (-1.0 to 1.0) into 16-bit linear PCM (Int16Array).
 */
export function float32ToInt16PCM(input: Float32Array): Int16Array {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output[i] = s < 0 ? Math.round(s * 0x8000) : Math.round(s * 0x7fff);
  }
  return output;
}

/**
 * Converts 16-bit linear PCM (Int16Array) back to Float32 (-1.0 to 1.0).
 */
export function int16PCMToFloat32(input: Int16Array): Float32Array {
  const output = new Float32Array(input.length);
  for (let i = 0; i < input.length; i++) {
    output[i] = input[i] / (input[i] < 0 ? 0x8000 : 0x7fff);
  }
  return output;
}

/**
 * Resamples an audio buffer from fromRate to toRate using linear interpolation.
 */
export function resampleAudioBuffer(
  input: Float32Array,
  fromRate: number,
  toRate: number
): Float32Array {
  if (fromRate === toRate || input.length === 0) {
    return input;
  }
  const ratio = fromRate / toRate;
  const newLength = Math.max(1, Math.round(input.length / ratio));
  const result = new Float32Array(newLength);

  for (let i = 0; i < newLength; i++) {
    const originalPos = i * ratio;
    const index = Math.floor(originalPos);
    const fraction = originalPos - index;

    const sample1 = input[index] || 0;
    const sample2 = input[index + 1] !== undefined ? input[index + 1] : sample1;

    result[i] = sample1 + fraction * (sample2 - sample1);
  }

  return result;
}

/**
 * Converts an ArrayBuffer or TypedArray view to a base64 encoded string.
 */
export function arrayBufferToBase64(buffer: ArrayBuffer | ArrayBufferLike | ArrayBufferView): string {
  let bytes: Uint8Array;
  if ('buffer' in buffer && 'byteOffset' in buffer && 'byteLength' in buffer) {
    bytes = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  } else {
    bytes = new Uint8Array(buffer as ArrayBuffer);
  }

  let binary = '';
  const len = bytes.byteLength;
  const chunkSize = 8192;
  for (let i = 0; i < len; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
    binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
  }
  return btoa(binary);
}

/**
 * Converts a base64 encoded PCM16 string directly into an Int16Array safely,
 * guaranteeing even-byte boundary and avoiding RangeError.
 */
export function base64ToInt16Array(base64: string): Int16Array {
  if (!base64 || base64.length === 0) {
    return new Int16Array(0);
  }

  try {
    const binaryString = atob(base64);
    const byteLen = binaryString.length;
    // Align to 2-byte boundary for Int16
    const alignedLen = byteLen - (byteLen % 2);
    if (alignedLen === 0) {
      return new Int16Array(0);
    }

    const bytes = new Uint8Array(alignedLen);
    for (let i = 0; i < alignedLen; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return new Int16Array(bytes.buffer, bytes.byteOffset, alignedLen / 2);
  } catch (err) {
    console.warn('[PCM] Failed to decode base64 audio:', err);
    return new Int16Array(0);
  }
}

/**
 * Converts a base64 encoded string to an ArrayBuffer.
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}
