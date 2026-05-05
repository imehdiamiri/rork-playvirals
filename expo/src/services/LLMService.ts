/**
 * LLMService — Google Gemini integration for AI card generation.
 *
 * Uses Gemini 2.0 Flash (free tier — 15 RPM, 1M TPM).
 * Get your free API key at: https://aistudio.google.com/apikey
 *
 * Configuration: Set EXPO_PUBLIC_GEMINI_API_KEY in your .env file.
 * The service falls back to a mock response when no key is configured,
 * allowing offline development and testing.
 */

const MODEL = 'gemini-2.0-flash';

// In production, load from env or secure storage
let API_KEY: string | null = null;

/**
 * Configure the LLM service with a Gemini API key.
 * Call this during app initialization if the key is available.
 */
export function configureLLM(apiKey: string): void {
  API_KEY = apiKey;
}

/**
 * Check if the LLM service is configured and ready.
 */
export function isLLMConfigured(): boolean {
  return API_KEY !== null && API_KEY.length > 0;
}

/**
 * Strip markdown code fences from LLM output.
 */
export function stripCodeFences(text: string): string {
  return text
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();
}

/**
 * Complete a chat prompt using Google Gemini.
 * Falls back to a mock response when no API key is set.
 */
export async function complete(system: string, user: string): Promise<string> {
  if (!isLLMConfigured()) {
    // Mock fallback for development
    console.warn('LLMService: No API key configured. Using mock response.');
    return mockCompletion(user);
  }

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: system }],
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: user }],
        },
      ],
      generationConfig: {
        temperature: 0.9,
        maxOutputTokens: 256,
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Gemini request failed (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!content) {
    throw new Error('Empty Gemini response');
  }

  return content;
}

/**
 * Mock completion that returns a plausible party card based on category hints.
 */
function mockCompletion(userPrompt: string): Promise<string> {
  const mockCards: Record<string, string> = {
    act: '{"text":"Pretend you are a confused tourist asking for directions in sign language"}',
    talk: '{"text":"What is the most spontaneous thing you have ever done on a whim"}',
    challenges: '{"text":"Speak only in questions for the next two minutes without breaking"}',
    penalty: '{"text":"Do your most dramatic slow motion walk across the entire room"}',
    couple: '{"text":"What is the one thing you wish you could tell each other more often"}',
  };

  const lowerPrompt = userPrompt.toLowerCase();
  let category = 'talk';
  if (lowerPrompt.includes('act')) category = 'act';
  else if (lowerPrompt.includes('challenge')) category = 'challenges';
  else if (lowerPrompt.includes('penalty')) category = 'penalty';
  else if (lowerPrompt.includes('couple')) category = 'couple';

  // Simulate network delay
  return new Promise((resolve) => {
    setTimeout(() => resolve(mockCards[category] || mockCards.talk), 800);
  });
}
