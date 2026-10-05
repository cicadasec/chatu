# CHATU — A 3D Voice AI Companion

CHATU is an immersive, futuristic 3D voice AI companion built with **Next.js**, **Three.js / React Three Fiber**, the **Web Audio API**, and Google's **Gemini Live API** via `@google/genai`.

Instead of a traditional chatbot, dashboard, or text bubbles, the entire experience revolves around an interactive floating 3D robot that users can talk to naturally in real time using their microphone.

---

## Architecture Overview

```
Browser Microphone (16kHz PCM)
        ↓
GeminiLiveSession (WebSocket via @google/genai)
        ↓
Gemini Live API (Bidirectional Audio Streaming)
        ↓
Native Audio Chunks (24kHz PCM)
        ↓
Web Audio API Pipeline (Low-Latency Gapless Playback)
        ↓
Audio Analyser (FFT Frequency & Amplitude)
        ↓
3D Robot Animation Controller (Speech gestures, visor glow, breathing)
```

---

## Key Features

1. **Voice-First Character Interface**:
   - Zero visible chat logs, zero text bubbles, zero keyboard text inputs.
   - The robot itself communicates state through posture, lighting, and movement.
2. **Real-Time Bidirectional Audio**:
   - Direct WebSocket connection to Gemini Live with native audio responses (no robotic third-party TTS).
   - Low-latency continuous 16kHz 16-bit PCM streaming from the browser.
3. **Conversational Interruption**:
   - Seamlessly interrupts audio playback and resets the robot state to `LISTENING` whenever the user starts speaking while NOVA is talking.
4. **Interactive 3D Robot**:
   - Centered 3D robot rendered with React Three Fiber and Three.js PBR materials.
   - Smooth gaze tracking towards mouse/touch coordinates.
   - Procedural multi-harmonic floating and breathing animation so it never looks mechanically repetitive.
   - Audio-reactive gestures: low frequencies drive chest/body expansion, mid frequencies drive vocal nodding, and high frequencies modulate the cybernetic visor glow.
   - Fallback futuristic procedural robot in case GLB assets are missing or loading.
5. **Secure Ephemeral Token Architecture**:
   - Permanent `GEMINI_API_KEY` is kept strictly server-side in `app/api/token/route.ts`.
   - The frontend authenticates using short-lived ephemeral tokens issued by the server.

---

## Project Structure

```
chatu/
├── app/
│   ├── api/
│   │   └── token/
│   │       └── route.ts             # Server endpoint issuing ephemeral Live tokens
│   ├── globals.css                  # Atmospheric dark styling & CSS variables
│   ├── layout.tsx                   # SEO metadata & responsive viewport config
│   └── page.tsx                     # Main immersive page
├── components/
│   ├── AudioVisualizer.tsx          # Audio-reactive focal aura and energy ring
│   ├── ExperienceUI.tsx             # Minimal HUD, connection status, error alerts
│   ├── Robot.tsx                    # 3D robot component with PBR materials & fallback
│   ├── RobotScene.tsx               # R3F Canvas, camera, lighting, and particle field
│   ├── SessionControls.tsx          # Minimal bottom controls (TAP TO TALK, mute, disconnect)
│   └── VoiceController.tsx          # Audio orchestration hook
├── lib/
│   ├── audio/
│   │   ├── analyser.ts              # Real-time frequency band and volume analyzer
│   │   ├── microphone.ts            # Browser microphone capture & 16kHz resampling
│   │   ├── pcm.ts                   # 16-bit PCM conversion and base64 utilities
│   │   └── playback.ts              # Low-latency Web Audio gapless playback engine
│   ├── gemini/
│   │   ├── config.ts                # NOVA configuration (model, voice, personality)
│   │   ├── ephemeralToken.ts        # Client helper to fetch session token
│   │   └── liveSession.ts           # Gemini Live WebSocket session manager
│   └── robot/
│       ├── animationController.ts   # Master animation blender
│       ├── audioReactive.ts         # Audio-to-transform mapping
│       ├── eyeTracking.ts           # Cursor/touch gaze tracking
│       ├── lipSync.ts               # Morph target & procedural mouth modulation
│       └── stateManager.ts          # Robot state machine (IDLE, LISTENING, etc.)
├── public/
│   └── models/
│       └── robot.glb                # Optimized 3D robot asset
├── types/
│   ├── audio.ts                     # Microphone and analyzer types
│   ├── gemini.ts                    # Live session and token types
│   └── robot.ts                     # Robot states and animation interfaces
├── .env.example                     # Environment template
└── next.config.ts                   # Next.js configuration
```

---

## Getting Started

### 1. Prerequisites
- Node.js 18.17+ or 20+
- A Google Gemini API Key with access to the Gemini Live API (from [Google AI Studio](https://aistudio.google.com/))

### 2. Environment Setup

Create `.env.local` in the project root:

```bash
cp .env.example .env.local
```

Add your Gemini API Key to `.env.local`:

```env
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_LIVE_MODEL=gemini-3.8-live
VOICE_NAME=Aoede
```

> **Security Note**: Never commit `.env.local` to git. It is automatically ignored in `.gitignore`.

### 3. Install Dependencies

```bash
npm install
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 3D Asset Management

The optimized binary model is placed at:
```
public/models/robot.glb
```

- When the application boots, `useGLTF('/models/robot.glb')` loads the model, automatically normalizes its bounding box, centers it at the scene origin, and applies cybernetic PBR materials.
- If `public/models/robot.glb` is missing or fails to load, a procedural fallback robot renders seamlessly without crashing the application.

---

## Deployment on Vercel

1. Push your repository to GitHub / GitLab / Bitbucket.
2. Import the project into [Vercel](https://vercel.com).
3. In **Project Settings** > **Environment Variables**, add:
   - `GEMINI_API_KEY`: Your Gemini API key from Google AI Studio.
   - `GEMINI_LIVE_MODEL`: `gemini-3.8-live` (or chosen Live model).
   - `VOICE_NAME`: `Aoede` (or Puck, Charon, Kore, Fenrir).
4. Deploy! The Vercel serverless function will handle `/api/token` requests to issue ephemeral tokens directly to users' browsers.
