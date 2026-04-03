import { GoogleGenerativeAI } from "@google/generative-ai";
import type { GeminiResponse, GeminiExtractedWord } from "./types";

const DEFAULT_MODEL = "gemini-2.5-flash";

function getGeminiClient() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("GEMINI_API_KEY が設定されていません。.env.local を確認してください。");
  }
  return new GoogleGenerativeAI(key);
}

function getModelName(): string {
  return process.env.GEMINI_MODEL || DEFAULT_MODEL;
}

function extractJson(text: string): string {
  const fenced = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (fenced) return fenced[1];
  // 最初の { から対応する最後の } までをバランスで探す
  const start = text.indexOf("{");
  if (start === -1) throw new Error("JSONが見つかりません");
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}") depth--;
    if (depth === 0) return text.slice(start, i + 1);
  }
  throw new Error("JSONが不完全です");
}

function validateGeminiResponse(data: unknown): GeminiResponse {
  if (!data || typeof data !== "object") {
    throw new Error("Geminiの応答が不正です");
  }
  const obj = data as Record<string, unknown>;
  const title = typeof obj.title === "string" ? obj.title : "無題の単語帳";

  if (!Array.isArray(obj.words)) {
    throw new Error("単語リストが見つかりません");
  }

  const words: GeminiExtractedWord[] = obj.words
    .filter((w: unknown): w is Record<string, unknown> =>
      typeof w === "object" && w !== null && typeof (w as Record<string, unknown>).term === "string"
    )
    .map((w: Record<string, unknown>) => ({
      term: String(w.term),
      meaning: String(w.meaning || ""),
      partOfSpeech: String(w.partOfSpeech || ""),
      exampleSentence: String(w.exampleSentence || ""),
      context: String(w.context || ""),
    }));

  if (words.length === 0) {
    throw new Error("単語を抽出できませんでした");
  }

  return { title, words };
}

const PROMPT = `あなたは語学学習の専門家です。
提供されたファイル（画像、動画、PDF、音声など）から、学習すべき重要な単語・フレーズを抽出してください。
音声の場合はまず内容を聞き取り、PDFの場合はテキストを読み取ってから単語を抽出してください。

以下のJSON形式で出力してください。必ずJSON形式のみで返答し、他のテキストは含めないでください。

{
  "title": "内容に基づいた単語帳のタイトル",
  "words": [
    {
      "term": "単語やフレーズ",
      "meaning": "日本語での意味",
      "partOfSpeech": "品詞（noun, verb, adjective, adverb, phrase など）",
      "exampleSentence": "その単語を使った例文",
      "context": "ファイル内でどこに出現したかの説明（ページ番号、時間、位置など）"
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
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({ model: getModelName() });

  const result = await model.generateContent([
    {
      inlineData: {
        data: fileBase64,
        mimeType,
      },
    },
    { text: PROMPT },
  ]);

  const text = result.response.text();
  const jsonStr = extractJson(text);
  const parsed = JSON.parse(jsonStr);
  return validateGeminiResponse(parsed);
}

export async function generateQuizWithGemini(prompt: string): Promise<string> {
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({ model: getModelName() });
  const result = await model.generateContent(prompt);
  return result.response.text();
}
