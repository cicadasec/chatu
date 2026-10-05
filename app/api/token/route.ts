import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { CHATU_CONFIG } from '@/lib/gemini/config';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

function getApiKey(): string | undefined {
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0) {
    return process.env.GEMINI_API_KEY.trim();
  }

  // Fallback to reading .env.local or .env directly
  const candidates = ['.env.local', '.env'];
  for (const file of candidates) {
    try {
      const fullPath = path.join(/*turbopackIgnore: true*/ process.cwd(), file);
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        const match = content.match(/GEMINI_API_KEY\s*=\s*([^\r\n#]+)/);
        if (match && match[1]) {
          const key = match[1].trim().replace(/^["']|["']$/g, '');
          if (key.length > 0) {
            return key;
          }
        }
      }
    } catch {
      // Continue to next candidate
    }
  }

  return undefined;
}

export async function POST() {
  const apiKey = getApiKey();

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
        uses: 50,
        expireTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
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
