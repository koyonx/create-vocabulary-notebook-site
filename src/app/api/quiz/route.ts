import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

type QuizRequestWord = {
  term: string;
  meaning: string;
  isWeak: boolean;
};

export async function POST(request: NextRequest) {
  try {
    const { words } = (await request.json()) as { words: QuizRequestWord[] };

    if (!words || words.length < 4) {
      return NextResponse.json(
        { error: "クイズ生成には最低4つの単語が必要です" },
        { status: 400 }
      );
    }

    const weakWords = words.filter((w) => w.isWeak);
    const targetWords = weakWords.length > 0 ? weakWords : words;

    // 出題する単語を最大10個選択
    const quizTargets = targetWords.slice(0, 10);

    const prompt = `あなたは語学学習クイズの作成者です。
以下の単語リストから4択クイズを作成してください。

## 出題対象の単語（これらの意味を問うクイズを作成）
${quizTargets.map((w) => `- ${w.term}: ${w.meaning}`).join("\n")}

## 全単語リスト（不正解の選択肢として使用可能）
${words.map((w) => `- ${w.term}: ${w.meaning}`).join("\n")}

以下のJSON形式で出力してください。必ずJSON形式のみで返答してください。

{
  "questions": [
    {
      "questionWord": "出題する単語",
      "correctAnswer": "正しい意味",
      "choices": ["選択肢1", "選択肢2", "選択肢3", "選択肢4"],
      "correctIndex": 0
    }
  ]
}

注意事項:
- 出題対象の各単語について1問ずつ作成してください
- choicesには正解を含めた4つの選択肢を入れてください
- correctIndexは0始まりで正解の位置を示してください
- 不正解の選択肢は紛らわしいが明確に異なるものにしてください
- 選択肢の順序はランダムにしてください`;

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro-preview-05-06" });
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const jsonMatch =
      text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("クイズの生成に失敗しました");
    }

    const jsonStr = jsonMatch[1] || jsonMatch[0];
    const quizData = JSON.parse(jsonStr);

    return NextResponse.json(quizData);
  } catch (error) {
    console.error("Quiz generation error:", error);
    return NextResponse.json(
      { error: "クイズの生成中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
