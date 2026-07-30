/**
 * Optional Gemini flavour text (AI taunts + tactical tips).
 *
 * The SDK is loaded with a dynamic `import()` rather than a static one. It is
 * roughly 400 kB and is only needed for two cosmetic strings, so a static
 * import forced every player to download it before the board could render.
 * Now it is code-split into its own chunk and fetched only if an API key is
 * actually configured. Without a key the game runs entirely on the offline
 * lines below and never touches the network.
 */

const MODEL_NAME = 'gemini-2.5-flash-lite';

const OFFLINE_TAUNTS = [
  'Calculations complete. Your defeat is statistically probable.',
  'Optical arrays aligning. Target acquired.',
  'Human error detected in previous move.',
  'My logic gates predict your surrender.',
  'Laser intensity at 100%. Prepare for vaporization.',
  'Your strategy is quaint, biological entity.',
  'Refraction angles optimized. Firing solution set.'
];

const OFFLINE_TIPS = [
  'TIR: hit the FLAT side of a prism to bounce the beam 90 degrees at full power. This is the only way to win.',
  'REFRACTION: hit the SLANTED side and the light crosses the glass twice, scatters, and dies. It cannot destroy a generator.',
  'DEFENSE: blocks absorb two hits. Park one in front of your generator.',
  'ATTACK: a diagonal shot slips past shields that only cover straight lines.',
  'MOVEMENT: rolling 2 moves ONE piece two tiles, or TWO pieces one tile each.',
  'AIMING: sliding your laser along the home row is free. Always aim before you fire.',
  'COMBOS: only reflections score. Chain three TIR bounces into the generator for a SUPER COMBO.'
];

const pick = (list: string[]) => list[Math.floor(Math.random() * list.length)];

const readKey = (): string | null => {
  try {
    if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
      return process.env.API_KEY as string;
    }
  } catch {
    /* no build-time env in this context */
  }
  return null;
};

type GenAI = { models: { generateContent: (args: unknown) => Promise<{ text?: string }> } };

class GeminiService {
  private client: Promise<GenAI | null> | null = null;

  private getClient(): Promise<GenAI | null> {
    if (this.client) return this.client;

    const key = readKey();
    if (!key || key === 'PLACEHOLDER_API_KEY') {
      this.client = Promise.resolve(null);
      return this.client;
    }

    this.client = import('@google/genai')
      .then(mod => new mod.GoogleGenAI({ apiKey: key }) as unknown as GenAI)
      .catch(() => null);

    return this.client;
  }

  async getTaunt(actionDescription: string): Promise<string> {
    const ai = await this.getClient();
    if (!ai) return pick(OFFLINE_TAUNTS);
    try {
      const res = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: `You are a menacing AI named 'AI CORE' playing a laser chess game against a human. You just performed this action: "${actionDescription}". Give a short, robotic, 1-sentence taunt.`,
        config: {
          systemInstruction: 'You are a cold, calculating military AI. Keep responses under 20 words.',
          thinkingConfig: { thinkingBudget: 0 }
        }
      });
      return res.text || pick(OFFLINE_TAUNTS);
    } catch {
      return pick(OFFLINE_TAUNTS);
    }
  }

  async getTacticalAdvice(): Promise<string> {
    const ai = await this.getClient();
    if (!ai) return pick(OFFLINE_TIPS);
    try {
      const res = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: 'In one sentence, for a student playing a laser puzzle game: explain why total internal reflection keeps a laser at full power (100% reflected) while refraction through a prism face loses power (the light crosses the glass boundary twice and scatters).',
        config: { systemInstruction: 'You are a physics tactician advising a player in a laser game. Be concise.' }
      });
      return res.text || pick(OFFLINE_TIPS);
    } catch {
      return pick(OFFLINE_TIPS);
    }
  }
}

export const geminiService = new GeminiService();
