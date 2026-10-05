import type { EphemeralTokenResponse } from '@/types/gemini';

export async function fetchEphemeralToken(): Promise<EphemeralTokenResponse> {
  const res = await fetch('/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(
      data.error || 'Failed to authenticate Live session. Please check GEMINI_API_KEY.'
    );
  }

  return data;
}
