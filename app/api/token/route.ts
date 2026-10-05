import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { CHATU_CONFIG } from '@/lib/gemini/config';

export const dynamic = 'force-dynamic';

export async function POST() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          'GEMINI_API_KEY is not configured on the server. Please add your Gemini API key to .env.local',
        code: 'MISSING_API_KEY',
      },
      { status: 401 }
    );
  }

  const model = process.env.GEMINI_LIVE_MODEL || CHATU_CONFIG.model;
  const voice = process.env.VOICE_NAME || CHATU_CONFIG.voice;

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { apiVersion: 'v1alpha' },
    });

    // Create a secure short-lived ephemeral token strictly for the Live session
    const tokenResult = await ai.authTokens.create({
      config: {
        uses: 1,
        expireTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        liveConnectConstraints: {
          model: model,
        },
      },
    });

    return NextResponse.json({
      token: tokenResult.name,
      expireTime: tokenResult.expireTime,
      model,
      voice,
    });
  } catch (err: unknown) {
    console.error('[API /api/token] Ephemeral token creation error:', err);
    const message =
      err instanceof Error ? err.message : 'Failed to generate session token';

    return NextResponse.json(
      {
        error: message,
        code: 'TOKEN_CREATION_FAILED',
      },
      { status: 500 }
    );
  }
}
