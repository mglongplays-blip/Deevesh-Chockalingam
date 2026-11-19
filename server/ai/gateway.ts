import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { dbStore } from '../db/store.ts';

export type AIProviderId = 'gemini' | 'openrouter';

export interface AIGatewayRequest {
  userId: string;
  feature:
    | 'assignment_studio'
    | 'notes_intelligence'
    | 'humanizer'
    | 'quiz_maker'
    | 'presentation_maker'
    | 'subject_tutor'
    | 'ocr';
  systemInstruction: string;
  prompt: string;
  jsonMode?: boolean;
  thinkingLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
  inlineFile?: {
    mimeType: string;
    base64Data: string;
  };
}

export interface AIGatewayResponse {
  text: string;
  provider: AIProviderId;
  model: string;
  fallbackUsed: boolean;
  latencyMs: number;
}

export class AIGatewayError extends Error {
  statusCode: number;
  retryAfterSeconds?: number;
  constructor(message: string, statusCode = 503, retryAfterSeconds?: number) {
    super(message);
    this.name = 'AIGatewayError';
    this.statusCode = statusCode;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export const FREE_MODELS = {
  gemini: [
    { id: 'gemini-4-hydrogen', label: 'Gemini 4 Hydrogen (Fast & Balanced Free Tier)' },
    { id: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash Lite (Lightweight Free Tier)' },
  ],
  openrouter: [
    { id: 'meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 70B Instruct (OpenRouter Free)' },
    { id: 'google/gemma-3-27b-it:free', label: 'Gemma 3 27B IT (OpenRouter Free)' },
    { id: 'qwen/qwen-2.5-72b-instruct:free', label: 'Qwen 2.5 72B Instruct (OpenRouter Free)' },
  ],
};

// Sliding-window in-memory rate limiter (max 15 requests per minute per user)
const minuteRequests = new Map<string, number[]>();

function checkMinuteRateLimit(userId: string): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  const windowMs = 60_000;
  const timestamps = (minuteRequests.get(userId) || []).filter((t) => now - t < windowMs);
  if (timestamps.length >= 15) {
    const oldest = timestamps[0];
    const retryAfter = Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000));
    minuteRequests.set(userId, timestamps);
    return { allowed: false, retryAfter };
  }
  timestamps.push(now);
  minuteRequests.set(userId, timestamps);
  return { allowed: true, retryAfter: 0 };
}

export function getProviderAvailability() {
  const geminiKey = process.env.GEMINI_API_KEY?.trim() || '';
  const openrouterKey = process.env.OPENROUTER_API_KEY?.trim() || '';
  return {
    gemini: Boolean(geminiKey && geminiKey !== 'MY_GEMINI_API_KEY'),
    openrouter: Boolean(openrouterKey && !openrouterKey.includes('MY_OPENROUTER')),
  };
}

function getGeminiClient(): GoogleGenAI | null {
  const availability = getProviderAvailability();
  if (!availability.gemini) return null;
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY!.trim(),
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function callGeminiProvider(
  model: string,
  req: AIGatewayRequest,
  maxTokens: number
): Promise<string> {
  const ai = getGeminiClient();
  if (!ai) {
    throw new AIGatewayError('Google Gemini API key is not configured on the server.', 503);
  }

  // Enforce safe free-tier model whitelist
  const allowedGemini = new Set(FREE_MODELS.gemini.map((m) => m.id));
  const safeModel = allowedGemini.has(model) ? model : 'gemini-4-hydrogen';

  const config: Record<string, unknown> = {
    systemInstruction: `${req.systemInstruction}\nKeep output concise and within ${maxTokens} tokens.`,
  };

  if (req.jsonMode) {
    config.responseMimeType = 'application/json';
  }

  if (safeModel === 'gemini-4-hydrogen' && req.thinkingLevel) {
    config.thinkingConfig = {
      thinkingLevel:
        req.thinkingLevel === 'LOW'
          ? ThinkingLevel.LOW
          : req.thinkingLevel === 'MEDIUM'
            ? ThinkingLevel.MEDIUM
            : ThinkingLevel.HIGH,
    };
  }

  const contents = req.inlineFile
    ? {
        parts: [
          {
            inlineData: {
              mimeType: req.inlineFile.mimeType,
              data: req.inlineFile.base64Data,
            },
          },
          { text: req.prompt },
        ],
      }
    : req.prompt;

  const response = await ai.models.generateContent({
    model: safeModel,
    contents,
    config,
  });

  const text = (response.text ?? '').trim();
  if (!text) {
    throw new Error('Gemini returned an empty response.');
  }
  return text;
}

async function callOpenRouterProvider(
  model: string,
  req: AIGatewayRequest,
  maxTokens: number
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    throw new AIGatewayError('OpenRouter API key is not configured on the server.', 503);
  }
  if (req.inlineFile) {
    throw new AIGatewayError('OpenRouter free text adapter does not support binary OCR uploads.', 400);
  }

  // Ensure only free models are used unless explicitly configured with :free
  const safeModel = model.endsWith(':free') ? model : 'meta-llama/llama-3.3-70b-instruct:free';

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);
  try {
    const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
        'X-Title': 'MG - Meet Genie',
      },
      body: JSON.stringify({
        model: safeModel,
        max_tokens: maxTokens,
        messages: [
          {
            role: 'system',
            content: req.jsonMode
              ? `${req.systemInstruction}\nReturn ONLY valid JSON without markdown fences.`
              : req.systemInstruction,
          },
          { role: 'user', content: req.prompt },
        ],
      }),
    });

    if (!resp.ok) {
      const errBody = await resp.text();
      throw new Error(`OpenRouter error (${resp.status}): ${errBody.slice(0, 200)}`);
    }

    const data = (await resp.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = (data.choices?.[0]?.message?.content || '').trim();
    if (!text) {
      throw new Error('OpenRouter returned an empty response.');
    }
    return text;
  } finally {
    clearTimeout(timeout);
  }
}

export interface AIProviderAdapter {
  id: AIProviderId;
  invoke: (model: string, req: AIGatewayRequest, maxTokens: number) => Promise<string>;
}

const adapterRegistry = new Map<AIProviderId, AIProviderAdapter>([
  ['gemini', { id: 'gemini', invoke: callGeminiProvider }],
  ['openrouter', { id: 'openrouter', invoke: callOpenRouterProvider }],
]);

async function invokeWithRetry(
  adapter: AIProviderAdapter,
  model: string,
  req: AIGatewayRequest,
  maxTokens: number
): Promise<string> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await adapter.invoke(model, req, maxTokens);
    } catch (err) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('403') || msg.includes('400') || msg.includes('not configured')) {
        throw err;
      }
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    }
  }
  throw lastErr;
}

export async function runAIGateway(req: AIGatewayRequest): Promise<AIGatewayResponse> {
  const settings = await dbStore.getAISettings();

  // Check feature flag
  if (req.feature !== 'ocr') {
    const enabled = settings.enabled_features[req.feature];
    if (enabled === false) {
      throw new AIGatewayError(
        `This feature (${req.feature.replace('_', ' ')}) is currently paused by the administrator.`,
        403
      );
    }
  }

  // Check per-minute rate limit
  const rate = checkMinuteRateLimit(req.userId);
  if (!rate.allowed) {
    await dbStore.createUsageLog({
      id: dbStore.newId(),
      user_id: req.userId,
      feature: req.feature,
      provider: settings.default_provider,
      model: settings.default_model,
      status: 'rate_limited',
      latency_ms: 0,
      error_message: 'Per-minute rate limit reached',
      created_at: dbStore.now(),
    });
    throw new AIGatewayError(
      `Too many requests in a short time. Please wait ${rate.retryAfter} seconds before trying again.`,
      429,
      rate.retryAfter
    );
  }

  // Check daily fair-use allowance
  const usage = await dbStore.getUserUsageStats(req.userId);
  if (usage.dailyUsed >= settings.daily_request_limit) {
    const now = new Date();
    const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
    const secondsUntilReset = Math.ceil((tomorrow.getTime() - now.getTime()) / 1000);
    await dbStore.createUsageLog({
      id: dbStore.newId(),
      user_id: req.userId,
      feature: req.feature,
      provider: settings.default_provider,
      model: settings.default_model,
      status: 'rate_limited',
      latency_ms: 0,
      error_message: 'Daily fair-use allowance reached',
      created_at: dbStore.now(),
    });
    throw new AIGatewayError(
      `You have reached today's free fair-use limit (${settings.daily_request_limit} AI requests/day). Your allowance resets at 00:00 UTC.`,
      429,
      secondsUntilReset
    );
  }

  const availability = getProviderAvailability();
  const primaryProvider: AIProviderId = settings.default_provider;
  const primaryModel = settings.feature_model_overrides[req.feature] || settings.default_model;
  const fallbackProvider = settings.fallback_provider;
  const fallbackModel = settings.fallback_model;

  const startTime = Date.now();
  const attempts: { provider: AIProviderId; model: string; isFallback: boolean }[] = [];

  if (availability[primaryProvider]) {
    attempts.push({ provider: primaryProvider, model: primaryModel, isFallback: false });
  }
  if (
    fallbackProvider !== 'none' &&
    fallbackProvider !== primaryProvider &&
    availability[fallbackProvider] &&
    !req.inlineFile
  ) {
    attempts.push({ provider: fallbackProvider, model: fallbackModel, isFallback: true });
  }
  // If primary wasn't available, check if any other free provider is configured
  if (attempts.length === 0) {
    if (availability.gemini) {
      attempts.push({ provider: 'gemini', model: 'gemini-4-hydrogen', isFallback: true });
    } else if (availability.openrouter && !req.inlineFile) {
      attempts.push({
        provider: 'openrouter',
        model: 'meta-llama/llama-3.3-70b-instruct:free',
        isFallback: true,
      });
    }
  }

  if (attempts.length === 0) {
    throw new AIGatewayError(
      'No free AI provider is currently configured on the server. Add GEMINI_API_KEY or OPENROUTER_API_KEY in Settings > Secrets.',
      503
    );
  }

  let lastError: unknown;
  for (const attempt of attempts) {
    const adapter = adapterRegistry.get(attempt.provider);
    if (!adapter) continue;
    try {
      const text = await invokeWithRetry(adapter, attempt.model, req, settings.max_response_tokens);
      const latencyMs = Date.now() - startTime;
      await dbStore.createUsageLog({
        id: dbStore.newId(),
        user_id: req.userId,
        feature: req.feature,
        provider: attempt.provider,
        model: attempt.model,
        status: attempt.isFallback ? 'fallback_success' : 'success',
        latency_ms: latencyMs,
        error_message: '',
        created_at: dbStore.now(),
      });
      return {
        text,
        provider: attempt.provider,
        model: attempt.model,
        fallbackUsed: attempt.isFallback,
        latencyMs,
      };
    } catch (err) {
      lastError = err;
      const errMsg = err instanceof Error ? err.message : String(err);
      await dbStore.createUsageLog({
        id: dbStore.newId(),
        user_id: req.userId,
        feature: req.feature,
        provider: attempt.provider,
        model: attempt.model,
        status: 'error',
        latency_ms: Date.now() - startTime,
        error_message: errMsg.slice(0, 300),
        created_at: dbStore.now(),
      });
    }
  }

  const msg = lastError instanceof Error ? lastError.message : 'All free AI providers are temporarily unavailable.';
  throw new AIGatewayError(
    `AI provider limit or temporary service error: ${msg}. Please try again shortly.`,
    503
  );
}

export function parseJsonSafe<T>(raw: string): T {
  const cleaned = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
  return JSON.parse(cleaned) as T;
}
