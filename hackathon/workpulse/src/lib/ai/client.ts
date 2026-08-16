import OpenAI from "openai";

let client: OpenAI | null = null;

export function getOpenAIClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

export function hasAI(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

export async function callAI<T>(
  systemPrompt: string,
  userPrompt: string,
  fallback: () => T
): Promise<{ data: T; aiPowered: boolean }> {
  const openai = getOpenAIClient();
  if (!openai) {
    return { data: fallback(), aiPowered: false };
  }

  try {
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return { data: fallback(), aiPowered: false };
    return { data: JSON.parse(content) as T, aiPowered: true };
  } catch (error) {
    console.error("AI call failed:", error);
    return { data: fallback(), aiPowered: false };
  }
}
