import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import {
  findInOfflinePhrasebook,
  transliterateDevanagariToPhonetic,
  transliterateOdiaToPhonetic,
} from './src/services/languageRegistry';
import { roomRelay } from './src/server/roomRelay';
import { getHonestOfflineTranslation, langNames } from './src/server/offlineTranslation';
import { apiQuotaTracker } from './src/server/apiQuotaTracker';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 3000;

app.use(express.json({ limit: '20mb' }));

const apiKey = process.env.GEMINI_API_KEY || '';
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

// Configurable model identifiers with reliable defaults
const TRANSLATE_MODEL = process.env.GEMINI_TRANSLATE_MODEL || 'gemini-3.8-flash';
const TRANSCRIBE_MODEL = process.env.GEMINI_TRANSCRIBE_MODEL || 'gemini-3.5-transcribe';
const TTS_MODEL = process.env.GEMINI_TTS_MODEL || 'gemini-3.8-flash-lite-tts';
const LIVE_MODEL = process.env.GEMINI_LIVE_MODEL || 'gemini-3.8-live';

apiQuotaTracker.setModels({
  translate: TRANSLATE_MODEL,
  transcribe: TRANSCRIBE_MODEL,
  tts: TTS_MODEL,
  live: LIVE_MODEL,
});

export { getHonestOfflineTranslation, langNames };

// Helper: Synthesize real Gemini TTS audio for translated text
async function generateGeminiTTS(text: string, voiceName: string = 'Kore'): Promise<string | null> {
  if (!ai || !apiKey || !text.trim()) return null;
  try {
    const response = await ai.models.generateContent({
      model: TTS_MODEL,
      contents: [
        {
          role: 'user',
          parts: [{ text: text.trim() }],
        },
      ],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    return base64Audio || null;
  } catch (err: any) {
    console.warn(`Gemini TTS (${TTS_MODEL}) generation notice:`, err?.message || err);
    return null;
  }
}

// 1. Audio Transcription using configurable model (default: gemini-3.5-transcribe)
app.post('/api/transcribe', async (req, res) => {
  const { audio, mimeType, language } = req.body;

  if (!audio) {
    return res.status(400).json({ success: false, error: 'Missing required audio data' });
  }

  if (!ai || !apiKey) {
    return res.status(503).json({
      success: false,
      transcript: '',
      error: 'GEMINI_API_KEY is not configured on the server. Audio transcription requires an API key.',
      code: 'NO_API_KEY',
    });
  }

  try {
    let cleanBase64 = audio;
    let detectedMime = mimeType || 'audio/webm';

    if (audio.includes(',')) {
      const match = audio.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        detectedMime = match[1];
        cleanBase64 = match[2];
      } else {
        cleanBase64 = audio.split(',')[1];
      }
    }

    const audioPart = {
      inlineData: {
        mimeType: detectedMime,
        data: cleanBase64,
      },
    };

    const targetLangHint = language ? (langNames[language] || language) : 'Hindi, English, Odia, or Mandyali (Western Pahadi of Himachal Pradesh)';

    const prompt = `You are an expert transcriber for Indian interstate communications.
Transcribe the spoken audio with extreme linguistic precision.
Target spoken language: ${targetLangHint}.
Rules:
- If spoken in Mandyali / Mandali (Mandi, Himachal Pradesh), transcribe the authentic Mandyali Pahadi dialect words in Devanagari script (e.g. "कुथु जांदे", "तुहाड़ा नां के है", "तुसां जो नमस्कार", "मां जो पाणी चहिदा").
- If spoken in Odia, transcribe accurately in Odia script (e.g. "ନମସ୍କାର", "ଆପଣ କେମିତି ଅଛନ୍ତି").
- If spoken in Hindi, transcribe in Devanagari script.
- If spoken in English, transcribe in Indian English.
Output ONLY the transcription text. Do not add quotes, explanations, or notes.`;

    const response = await ai.models.generateContent({
      model: TRANSCRIBE_MODEL,
      contents: {
        parts: [audioPart, { text: prompt }],
      },
    });

    const transcript = response.text?.trim() || '';
    apiQuotaTracker.recordRequest('transcribe', true);

    return res.json({
      success: true,
      transcript,
      model: TRANSCRIBE_MODEL,
    });
  } catch (error: any) {
    console.warn(`Transcription notice with ${TRANSCRIBE_MODEL}:`, error?.message);
    const msg = String(error?.message || '');
    const isQuota = msg.includes('429') || msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED');
    apiQuotaTracker.recordRequest('transcribe', false, isQuota);

    return res.status(isQuota ? 429 : 500).json({
      success: false,
      transcript: '',
      error: isQuota
        ? 'Gemini transcription rate limit / daily quota exceeded (429). Please use manual text input to test translation, or wait for quota reset.'
        : error?.message || 'Transcription failed',
      code: isQuota ? 'QUOTA_EXCEEDED' : 'TRANSCRIBE_ERROR',
      quotaExhausted: isQuota,
      retryAfter: isQuota ? 3600 : undefined,
      hint: isQuota
        ? 'Daily free-tier quota exhausted. You can use manual text input below to test translation, or wait for quota reset.'
        : undefined,
    });
  }
});

// 2. Standalone Text-To-Speech Endpoint
app.post('/api/tts', async (req, res) => {
  const { text, language, voiceName } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json({ success: false, error: 'Missing text parameter' });
  }

  if (!ai || !apiKey) {
    return res.status(503).json({
      success: false,
      error: 'GEMINI_API_KEY is not configured on the server.',
      fallbackToClientTTS: true,
    });
  }

  try {
    const audioBase64 = await generateGeminiTTS(text, voiceName || 'Kore');
    if (audioBase64) {
      apiQuotaTracker.recordRequest('tts', true);
      return res.json({
        success: true,
        audioBase64,
        format: 'audio/wav',
        model: TTS_MODEL,
      });
    } else {
      apiQuotaTracker.recordRequest('tts', false);
      return res.json({
        success: false,
        error: 'TTS model did not return audio',
        fallbackToClientTTS: true,
      });
    }
  } catch (err: any) {
    const isQuota = String(err?.message || '').includes('429') || String(err?.message || '').includes('quota');
    apiQuotaTracker.recordRequest('tts', false, isQuota);
    return res.status(500).json({
      success: false,
      error: err?.message || 'TTS generation failed',
      fallbackToClientTTS: true,
    });
  }
});

// 3. Translation API endpoint with server-synthesized TTS audio
app.post('/api/translate', async (req, res) => {
  const { text, sourceLang, targetLang, context, includeTTS } = req.body;

  if (!text || !sourceLang || !targetLang) {
    return res.status(400).json({ success: false, error: 'Missing required fields: text, sourceLang, targetLang' });
  }

  const sourceName = langNames[sourceLang] || sourceLang;
  const targetName = langNames[targetLang] || targetLang;

  // If Gemini key is not configured, fall back honestly
  if (!ai || !apiKey) {
    apiQuotaTracker.recordOfflineFallback();
    const offlineResult = getHonestOfflineTranslation(text, sourceLang, targetLang);
    if (offlineResult.success) {
      return res.json({
        success: true,
        data: offlineResult.data,
        source: 'offline-phrasebook',
        isOffline: true,
        notice: 'Offline phrasebook active (GEMINI_API_KEY not configured)',
      });
    } else {
      return res.status(503).json({
        success: false,
        error: offlineResult.error,
        isOffline: true,
        code: 'NO_API_KEY',
      });
    }
  }

  try {
    const prompt = `You are a real-time linguistic engine for "BhashaSetu", an inter-state voice translator in India.
Your mission is to translate speech between Indian regional languages with cultural and dialectal precision.

Source language: ${sourceName}
Target language: ${targetName}
Context: ${context || 'Interstate voice intercom, emergency logistics, and travel conversation'}

Input text to translate:
"${text}"

Special Linguistic Rules:
- If translating into "Mandyali" / "Mandali" (Western Pahadi spoken in Mandi, Himachal Pradesh):
  Use authentic Mandali grammar, honorifics, and vocabulary in Devanagari script.
  For example: "Where are you going?" -> "तुसां कुथु जांदे?" or "कुथु जांदे?"; "What is your name?" -> "तुहाड़ा नां के है?"; "How are you?" -> "केड़ा हाल चाल है?"; "Thank you" -> "बड़ा-बड़ा धन्यवाद / मेहरबानी"; "I need water" -> "मां जो पाणी चहिदा".
  (Note: Mandyali is an experimental dialect model and requires native speaker validation).
- If translating into "Odia":
  MUST use proper Odia script Unicode range \\u0B00-\\u0B7F (e.g., ନମସ୍କାର, ଆପଣ କେମିତି ଅଛନ୍ତି, ଧନ୍ୟବାଦ). Do not output English or Devanagari for Odia.
- If translating into "Hindi":
  Use natural conversational Hindi in Devanagari script.
- If translating into "English":
  Use natural Indian English phrasing.

Respond ONLY with a valid JSON object matching this schema:
{
  "translatedText": "the translation in the native script of the target language",
  "phoneticText": "phonetic transliteration in Latin/English characters so an Indian traveler can pronounce it easily",
  "detectedSource": "${sourceLang}",
  "dialectNotes": "short 1-line note explaining regional nuance or honorific used (in English)",
  "confidence": 0.95
}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 14000); // 14s cancellable timeout

    let response: any = null;
    let usedModel = TRANSLATE_MODEL;

    try {
      response = await ai.models.generateContent({
        model: TRANSLATE_MODEL,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.2,
          abortSignal: controller.signal,
        },
      });
      clearTimeout(timeout);
    } catch (primaryErr: any) {
      clearTimeout(timeout);
      const msg = String(primaryErr?.message || primaryErr || '');
      const isQuota =
        msg.includes('429') ||
        msg.includes('quota') ||
        msg.includes('Quota') ||
        msg.includes('RESOURCE_EXHAUSTED') ||
        msg.includes('rate limit') ||
        msg.includes('exceeded your current quota') ||
        msg.includes('aborted') ||
        primaryErr?.name === 'AbortError' ||
        apiQuotaTracker.getSummary(Boolean(apiKey)).quotaStatus === 'quota_exceeded';

      if (isQuota) {
        apiQuotaTracker.recordRequest('translate', false, true);

        // Honest offline phrasebook fallback
        const offlineResult = getHonestOfflineTranslation(text, sourceLang, targetLang);
        if (offlineResult.success) {
          apiQuotaTracker.recordOfflineFallback();
          return res.json({
            success: true,
            data: offlineResult.data,
            source: 'offline-phrasebook',
            isOffline: true,
            notice: 'Gemini rate limit reached; matched from authentic offline phrasebook',
          });
        } else {
          return res.status(429).json({
            success: false,
            error: 'Gemini API daily quota / rate limit reached (HTTP 429). ' + offlineResult.error,
            isOffline: true,
            code: 'QUOTA_EXCEEDED',
          });
        }
      } else {
        // Non-quota error: attempt honest offline fallback
        apiQuotaTracker.recordRequest('translate', false, false);
        const offlineResult = getHonestOfflineTranslation(text, sourceLang, targetLang);
        if (offlineResult.success) {
          apiQuotaTracker.recordOfflineFallback();
          return res.json({
            success: true,
            data: offlineResult.data,
            source: 'offline-phrasebook',
            isOffline: true,
          });
        } else {
          return res.status(500).json({
            success: false,
            error: primaryErr?.message || 'Translation service temporarily unavailable.',
            code: 'TRANSLATE_ERROR',
          });
        }
      }
    }

    const responseText = response?.text || '';
    let parsedData: any = null;
    try {
      parsedData = JSON.parse(responseText);
    } catch {
      const cleaned = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      parsedData = JSON.parse(cleaned);
    }

    // Verify Odia script when target is Odia
    if (targetLang === 'or' && parsedData?.translatedText) {
      const hasOdiaScript = /[\u0B00-\u0B7F]/.test(parsedData.translatedText);
      if (!hasOdiaScript) {
        parsedData.dialectNotes = (parsedData.dialectNotes || '') + ' (Note: Output script may require Odia font rendering)';
      }
    }

    // Synthesize real translated speech WAV via Gemini TTS if requested or enabled
    let ttsAudioBase64: string | null = null;
    if (includeTTS !== false && parsedData?.translatedText) {
      ttsAudioBase64 = await generateGeminiTTS(parsedData.translatedText);
    }

    apiQuotaTracker.recordRequest('translate', true);

    return res.json({
      success: true,
      data: {
        ...parsedData,
        audioBase64: ttsAudioBase64 || undefined,
      },
      source: usedModel,
    });
  } catch (err: any) {
    console.error('Translation error:', err);
    apiQuotaTracker.recordRequest('translate', false, false);
    const offlineResult = getHonestOfflineTranslation(text, sourceLang, targetLang);
    if (offlineResult.success) {
      apiQuotaTracker.recordOfflineFallback();
      return res.json({
        success: true,
        data: offlineResult.data,
        source: 'offline-phrasebook',
        isOffline: true,
      });
    } else {
      return res.status(500).json({
        success: false,
        error: err?.message || 'Translation failed.',
        code: 'TRANSLATE_ERROR',
      });
    }
  }
});

// 4. Server Diagnostics & Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    hasGeminiKey: Boolean(apiKey),
    models: {
      translate: TRANSLATE_MODEL,
      transcribe: TRANSCRIBE_MODEL,
      tts: TTS_MODEL,
      live: LIVE_MODEL,
    },
    rooms: {
      activeRooms: roomRelay.getRoomsCount(),
      totalConnectedPeers: roomRelay.getTotalPeersCount(),
    },
    quota: apiQuotaTracker.getSummary(Boolean(apiKey)),
    appUrl: process.env.APP_URL || '',
    version: '2.0.0',
  });
});

// 4b. Real-time API Quota Consumption Endpoint
app.get('/api/quota', (_req, res) => {
  res.json(apiQuotaTracker.getSummary(Boolean(apiKey)));
});

// ==============================================================================
// 5. SERVER WEBSOCKET ROOM RELAY (/rooms) & GEMINI LIVE API (/live)
// ==============================================================================

// Two standalone WebSocketServers without port conflicts
const liveWss = new WebSocketServer({ noServer: true });
const roomsWss = new WebSocketServer({ noServer: true, maxPayload: 3 * 1024 * 1024 }); // 3MB max payload

// Single Upgrade Router to avoid path conflicts
server.on('upgrade', (request, socket, head) => {
  try {
    const host = request.headers.host || 'localhost';
    const url = new URL(request.url || '', `http://${host}`);
    const pathname = url.pathname;

    if (pathname === '/live') {
      liveWss.handleUpgrade(request, socket, head, (ws) => {
        liveWss.emit('connection', ws, request);
      });
    } else if (pathname === '/rooms') {
      roomsWss.handleUpgrade(request, socket, head, (ws) => {
        roomsWss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  } catch (err) {
    console.warn('HTTP upgrade error:', err);
    socket.destroy();
  }
});

// Setup Room WebSocket Connection Handler using roomRelay service
roomsWss.on('connection', (ws: WebSocket) => {
  roomRelay.handleConnection(ws);
});

// Periodic heartbeat sweep to clean up dead sockets in rooms
const heartbeatInterval = setInterval(() => {
  roomRelay.sweepDeadSockets();
}, 15000);

heartbeatInterval.unref();

// Gemini Live API WebSocket Handler
liveWss.on('connection', async (clientWs: WebSocket) => {
  console.log('Gemini Live API client connected to /live');

  if (!ai || !apiKey) {
    clientWs.send(JSON.stringify({
      type: 'error',
      message: 'GEMINI_API_KEY is not configured on the server.',
    }));
    return;
  }

  let liveSession: any = null;

  try {
    liveSession = await ai.live.connect({
      model: LIVE_MODEL,
      config: {
        responseModalities: [Modality.AUDIO],
        systemInstruction: `You are the real-time voice intelligence for BhashaSetu, an interstate voice intercom bridging Indian states.
You are fluent in Hindi (हिन्दी), English (Indian English), Odia (ଓଡ଼ିଆ), and Mandyali / Mandali (माण्डली - Western Pahadi of Himachal Pradesh).
When spoken to:
- Respond in natural spoken audio.
- Keep responses concise, clear, and radio-friendly.
- If asked for translations between Hindi, English, Odia, or Mandyali, provide accurate regional translations with proper pronunciation.
- Note: Mandyali is an experimental dialect model and requires native speaker validation.`,
      },
      callbacks: {
        onopen: () => {
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({
              type: 'session_ready',
              model: LIVE_MODEL,
            }));
          }
        },
        onmessage: (message: LiveServerMessage) => {
          if (clientWs.readyState !== WebSocket.OPEN) return;

          const modelParts = message.serverContent?.modelTurn?.parts;
          if (modelParts) {
            for (const part of modelParts) {
              if (part.inlineData?.data) {
                clientWs.send(JSON.stringify({
                  type: 'audio_chunk',
                  audio: part.inlineData.data, // 24kHz raw PCM base64
                  mimeType: part.inlineData.mimeType || 'audio/pcm;rate=24000',
                }));
              }
              if (part.text) {
                clientWs.send(JSON.stringify({
                  type: 'text_chunk',
                  text: part.text,
                }));
              }
            }
          }

          if (message.serverContent?.turnComplete) {
            clientWs.send(JSON.stringify({ type: 'turn_complete' }));
          }

          if (message.serverContent?.interrupted) {
            clientWs.send(JSON.stringify({ type: 'interrupted' }));
          }
        },
        onerror: (err) => {
          console.error('Gemini Live session error:', err);
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({ type: 'error', message: String(err) }));
          }
        },
        onclose: () => {
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({ type: 'session_closed' }));
          }
        },
      },
    });
    apiQuotaTracker.recordRequest('live', true);
  } catch (err: any) {
    console.error(`Failed to initialize ${LIVE_MODEL} session:`, err);
    apiQuotaTracker.recordRequest('live', false);
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify({
        type: 'error',
        message: err?.message || 'Live API initialization failed',
      }));
    }
    return;
  }

  clientWs.on('message', async (data) => {
    try {
      const parsed = JSON.parse(data.toString());
      if (parsed.type === 'audio' && parsed.audio && liveSession) {
        await liveSession.sendRealtimeInput({
          audio: {
            data: parsed.audio,
            mimeType: parsed.mimeType || 'audio/pcm;rate=16000',
          },
        });
      } else if (parsed.type === 'text' && parsed.text && liveSession) {
        await liveSession.sendRealtimeInput({
          text: parsed.text,
        });
      }
    } catch (e) {
      console.warn('Live API message processing error:', e);
    }
  });

  clientWs.on('close', () => {
    if (liveSession) {
      try {
        liveSession.close();
      } catch {}
      liveSession = null;
    }
  });
});

// Setup Vite in development or static serve in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(port, () => {
    console.log(`BhashaSetu server listening on http://localhost:${port}`);
    console.log(`Room Relay ready on ws://localhost:${port}/rooms`);
    console.log(`Live API (${LIVE_MODEL}) ready on ws://localhost:${port}/live`);
    console.log(`Audio Transcribe (${TRANSCRIBE_MODEL}) ready on /api/transcribe`);
    console.log(`Translation (${TRANSLATE_MODEL}) & TTS (${TTS_MODEL}) ready on /api/translate`);
  });
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}
