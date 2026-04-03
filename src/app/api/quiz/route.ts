import { NextRequest, NextResponse } from "next/server";
import { generateQuizWithGemini } from "@/lib/gemini";
import type { QuizQuestion } from "@/lib/quiz.types";

type QuizRequestWord = {
  id: string;
  term: string;
  meaning: string;
  isWeak: boolean;
};

function validateQuizResponse(
  data: unknown,
  validWordIds: Set<string>
): { questions: QuizQuestion[] } {
  if (!data || typeof data !== "object") {
    throw new Error("クイズデータが不正です");
  }
  const obj = data as Record<string, unknown>;
  if (!Array.isArray(obj.questions) || obj.questions.length === 0) {
    throw new Error("クイズの問題が生成されませんでした");
  }

  const questions: QuizQuestion[] = [];
  for (const q of obj.questions) {
    if (!q || typeof q !== "object") continue;
    const qObj = q as Record<string, unknown>;

    const wordId = typeof qObj.wordId === "string" ? qObj.wordId : "";
    const questionWord = typeof qObj.questionWord === "string" ? qObj.questionWord : "";
    const correctAnswer = typeof qObj.correctAnswer === "string" ? qObj.correctAnswer : "";
    const choices = Array.isArray(qObj.choices)
      ? qObj.choices.filter((c): c is string => typeof c === "string")
      : [];
    const correctIndex = typeof qObj.correctIndex === "number" ? qObj.correctIndex : 0;

    if (!questionWord || choices.length < 2) continue;

    // 選択肢が4未満なら正解を含めて補完
    while (choices.length < 4) {
      choices.push(correctAnswer || questionWord);
    }

    questions.push({
      wordId: validWordIds.has(wordId) ? wordId : "",
      questionWord,
      correctAnswer,
      choices: choices.slice(0, 4),
      correctIndex: Math.min(Math.max(0, correctIndex), 3),
    });
  }

  if (questions.length === 0) {
    throw new Error("有効なクイズ問題を生成できませんでした");
  }

  return { questions };
}

function extractJson(text: string): string {
  const fenced = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (fenced) return fenced[1];
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const words: QuizRequestWord[] = Array.isArray(body?.words) ? body.words : [];

    if (words.length < 4) {
      return NextResponse.json(
        { error: "クイズ生成には最低4つの単語が必要です" },
        { status: 400 }
      );
    }

    const validWordIds = new Set(words.map((w) => w.id));
    const weakWords = words.filter((w) => w.isWeak);
    const targetWords = weakWords.length > 0 ? weakWords : words;
    const quizTargets = targetWords.slice(0, 10);

    const prompt = `あなたは語学学習クイズの作成者です。
以下の単語リストから4択クイズを作成してください。

## 出題対象の単語（これらの意味を問うクイズを作成）
${quizTargets.map((w) => `- [ID:${w.id}] ${w.term}: ${w.meaning}`).join("\n")}

## 全単語リスト（不正解の選択肢として使用可能）
${words.map((w) => `- ${w.term}: ${w.meaning}`).join("\n")}

以下のJSON形式で出力してください。必ずJSON形式のみで返答してください。

{
  "questions": [
    {
      "wordId": "出題する単語のID（上記の[ID:xxx]の値をそのまま使用）",
      "questionWord": "出題する単語（元の表記をそのまま使用）",
      "correctAnswer": "正しい意味",
      "choices": ["選択肢1", "選択肢2", "選択肢3", "選択肢4"],
      "correctIndex": 0
    }
  ]
}

注意事項:
- 出題対象の各単語について1問ずつ作成してください
- wordIdは必ず上記の[ID:xxx]の値をそのまま使用してください
- questionWordは出題対象の単語をそのまま使用してください（変更しないでください）
- choicesには正解を含めた4つの選択肢を入れてください
- correctIndexは0始まりで正解の位置を示してください
- 不正解の選択肢は紛らわしいが明確に異なるものにしてください
- 選択肢の順序はランダムにしてください`;

    const text = await generateQuizWithGemini(prompt);
    const jsonStr = extractJson(text);
    const parsed = JSON.parse(jsonStr);
    const validated = validateQuizResponse(parsed, validWordIds);

    return NextResponse.json(validated);
  } catch (error) {
    console.error("Quiz generation error:", error);
    return NextResponse.json(
      { error: "クイズの生成中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
