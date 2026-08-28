import { AIProvider } from './types';
import { PrismaClient } from '../../generated/prisma/client';
import { decryptApiKey, maskApiKey } from '../encryption';

export class GeminiProvider implements AIProvider {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string = process.env.GEMINI_MODEL || 'gemini-2.0-flash-lite') {
    this.apiKey = apiKey;
    this.model = model;
  }

  async analyzeThreat(prompt: string, systemPrompt: string): Promise<string> {
    const modelsToTry = Array.from(new Set([
      this.model,
      'gemini-2.5-flash',
      'gemini-flash-latest',
      'gemini-3.6-flash',
      'gemini-3.5-flash',
      'gemini-2.5-pro',
      'gemini-flash-lite-latest'
    ]));

    let lastError = '';
    for (const m of modelsToTry) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${this.apiKey}`;
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: systemPrompt }]
            },
            contents: [
              {
                role: 'user',
                parts: [{ text: prompt }]
              }
            ],
            generationConfig: {
              responseMimeType: 'application/json'
            }
          })
        });

        if (response.ok) {
          const data = await response.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            this.model = m;
            return text;
          }
        } else {
          const errText = await response.text();
          if (response.status === 401 || response.status === 400 && errText.includes('API_KEY_INVALID')) {
            throw new Error('Gemini API key is invalid or unauthorized.');
          } else if (response.status === 403) {
            throw new Error('Gemini API access is not permitted for this key.');
          } else if (response.status === 429) {
            throw new Error('Gemini quota or rate limit reached.');
          }
          lastError = `Gemini API (${m}): ${response.status} ${response.statusText} - ${errText}`;
        }
      } catch (e: any) {
        if (e?.message?.includes('invalid') || e?.message?.includes('quota') || e?.message?.includes('permitted')) {
          throw e;
        }
        lastError = e?.message || String(e);
      }
    }

    throw new Error(lastError || 'Gemini API failed on all attempted models.');
  }

  getModelName(): string {
    return this.model;
  }
}

export class OpenAIProvider implements AIProvider {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string = 'gpt-4o-mini') {
    this.apiKey = apiKey;
    this.model = model;
  }

  async analyzeThreat(prompt: string, systemPrompt: string): Promise<string> {
    const url = 'https://api.openai.com/v1/chat/completions';

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      if (response.status === 401) {
        throw new Error('OpenAI API key is invalid.');
      } else if (response.status === 429) {
        throw new Error('OpenAI quota or rate limit reached.');
      }
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errText}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) {
      throw new Error('OpenAI API returned empty response choices');
    }

    return text;
  }

  getModelName(): string {
    return this.model;
  }
}

export function getAIProvider(): AIProvider {
  const provider = process.env.AI_PROVIDER || '';
  const geminiKey = process.env.GEMINI_API_KEY || '';
  const openaiKey = process.env.OPENAI_API_KEY || '';

  if (provider === 'openai' || (!provider && openaiKey && !geminiKey)) {
    if (!openaiKey) {
      throw new Error('OpenAI API Key is missing. Please set OPENAI_API_KEY in backend/.env.');
    }
    return new OpenAIProvider(openaiKey);
  }

  // Default to Gemini if GEMINI_API_KEY is available or if explicitly requested
  if (provider === 'gemini' || !provider) {
    if (!geminiKey) {
      throw new Error('No LLM provider is configured. Please configure your Google Gemini API key.');
    }
    return new GeminiProvider(geminiKey);
  }

  throw new Error(`Unsupported AI_PROVIDER: ${provider}. Use 'gemini' or 'openai'.`);
}

/**
 * Resolves the active AI provider for an authenticated user.
 * Priority:
 * 1. User's configured & enabled BYOK key.
 * 2. System GEMINI_API_KEY (if enabled / present).
 * 3. Error if no key available.
 */
export async function resolveAIProvider(
  userId: string | undefined,
  prisma: PrismaClient
): Promise<{ provider: AIProvider; isBYOK: boolean; maskedKey?: string }> {
  if (userId) {
    const userConfig = await prisma.aIProviderConfig.findUnique({
      where: { userId },
    });

    if (userConfig && userConfig.enabled && userConfig.encryptedApiKey) {
      try {
        const decryptedKey = decryptApiKey(userConfig.encryptedApiKey);
        if (userConfig.provider === 'GEMINI' || !userConfig.provider) {
          return {
            provider: new GeminiProvider(decryptedKey),
            isBYOK: true,
            maskedKey: maskApiKey(decryptedKey),
          };
        }
      } catch (err: any) {
        console.error(`[AIProvider] Failed to decrypt BYOK key for user ${userId}:`, err?.message);
      }
    }
  }

  // System fallback
  const systemKey = process.env.GEMINI_API_KEY;
  if (systemKey && systemKey.trim().length > 0) {
    return {
      provider: new GeminiProvider(systemKey),
      isBYOK: false,
      maskedKey: maskApiKey(systemKey),
    };
  }

  throw new Error(
    'No AI provider configured. Please configure your Google Gemini API key in Profile settings.'
  );
}
