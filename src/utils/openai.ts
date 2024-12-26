import { toast } from "@/hooks/use-toast";

interface IdeaResult {
  title: string;
  description: string;
}

export const generateIdeasWithOpenAI = async (
  topic: string,
  apiKey: string
): Promise<{ gpt4Ideas: IdeaResult[]; gptMiniIdeas: IdeaResult[] }> => {
  const systemPrompt = "Sen bir SEO ve içerik uzmanısın. Verilen konuyla ilgili ilgi çekici, SEO dostu ve özgün blog başlıkları üretmelisin. Her başlık için kısa bir açıklama da ekle.";
  const userPrompt = `Konu: ${topic}\n\nBu konuyla ilgili 5 adet blog yazısı başlığı üret. Her başlık için 1-2 cümlelik açıklama ekle. Başlıklar SEO dostu ve ilgi çekici olmalı. Yanıt formatı JSON olmalı: { "ideas": [{ "title": "başlık", "description": "açıklama" }] }`;

  try {
    // Make API requests sequentially to avoid rate limits
    const gpt4Response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7
      })
    });

    if (!gpt4Response.ok) {
      const errorData = await gpt4Response.json();
      throw new Error(errorData.error?.message || "GPT-4 API error");
    }

    const gpt4Data = await gpt4Response.json();
    const gpt4Ideas = parseResponse(gpt4Data.choices[0]?.message?.content);

    // GPT-Mini request
    const gptMiniResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.9,
        max_tokens: 1000
      })
    });

    if (!gptMiniResponse.ok) {
      const errorData = await gptMiniResponse.json();
      throw new Error(errorData.error?.message || "GPT Mini API error");
    }

    const gptMiniData = await gptMiniResponse.json();
    const gptMiniIdeas = parseResponse(gptMiniData.choices[0]?.message?.content);


    return { gpt4Ideas, gptMiniIdeas };
  } catch (error) {
    console.error("OpenAI API Error:", error);
    throw new Error(error instanceof Error ? error.message : "API request failed");
  }
};

const parseResponse = (content: string): IdeaResult[] => {
  if (!content) throw new Error("Empty API response");

  try {
    // Remove any markdown code block syntax and clean whitespace
    const cleanContent = content
      .replace(/```json\n?|\n?```/g, '')
      .trim();

    const parsed = JSON.parse(cleanContent);

    if (!parsed?.ideas?.length) {
      throw new Error("Invalid response format - missing ideas array");
    }

    return parsed.ideas.map((idea: any, index: number) => {
      if (!idea.title || !idea.description) {
        throw new Error(`Invalid idea format at index ${index} - missing required fields`);
      }
      return {
        title: idea.title,
        description: idea.description
      };
    });
  } catch (error) {
    console.error("Parse error:", error);
    throw new Error(`Failed to parse API response: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
};
