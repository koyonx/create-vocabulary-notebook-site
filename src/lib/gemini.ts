import { GoogleGenerativeAI } from "@google/generative-ai";
import type { GeminiResponse } from "./types";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const PROMPT = `あなたは語学学習の専門家です。
提供された画像または動画から、学習すべき重要な単語・フレーズを抽出してください。

以下のJSON形式で出力してください。必ずJSON形式のみで返答し、他のテキストは含めないでください。

{
  "title": "内容に基づいた単語帳のタイトル",
  "words": [
    {
      "term": "単語やフレーズ",
      "meaning": "日本語での意味",
      "partOfSpeech": "品詞（noun, verb, adjective, adverb, phrase など）",
      "exampleSentence": "その単語を使った例文",
      "context": "画像/動画内でどこに出現したかの説明"
    }
  ]
}

注意事項:
- 重要度の高い単語から順に抽出してください
- 基本的な単語（a, the, is 等）は除外してください
- 各単語の意味は簡潔かつ正確に記載してください
- 例文は実用的なものにしてください`;

export async function analyzeWithGemini(
  fileBase64: string,
  mimeType: string
): Promise<GeminiResponse> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro-preview-05-06" });

  const result = await model.generateContent([
    {
      inlineData: {
        data: fileBase64,
        mimeType,
      },
    },
    { text: PROMPT },
  ]);

  const response = result.response;
  const text = response.text();

  // JSONブロックを抽出（```json ... ``` で囲まれている場合に対応）
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Geminiからの応答をパースできませんでした");
  }

  const jsonStr = jsonMatch[1] || jsonMatch[0];
  return JSON.parse(jsonStr) as GeminiResponse;
}
