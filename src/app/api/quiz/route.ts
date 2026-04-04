import { NextRequest, NextResponse } from "next/server";
import { generateQuizWithGemini } from "@/lib/gemini";
import type { QuizQuestion, FillBlankQuestion } from "@/lib/quiz.types";

type QuizRequestWord = {
  id: string;
  term: string;
  meaning: string;
  exampleSentence?: string;
  isWeak: boolean;
};

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

function selectQuizTargets(words: QuizRequestWord[], maxCount: number): QuizRequestWord[] {
  const weak = words.filter((w) => w.isWeak);
  const normal = words.filter((w) => !w.isWeak);

  // 苦手50%, 通常50%でバランス出題（苦手がなければ全部通常）
  const weakCount = Math.min(weak.length, Math.ceil(maxCount * 0.5));
  const normalCount = Math.min(normal.length, maxCount - weakCount);

  const shuffled = (arr: QuizRequestWord[]) =>
    arr.sort(() => Math.random() - 0.5);

  return [
    ...shuffled(weak).slice(0, weakCount),
    ...shuffled(normal).slice(0, normalCount),
  ];
}

function validateMultipleChoice(
  data: unknown,
  validWordIds: Set<string>
): { questions: QuizQuestion[] } {
  if (!data || typeof data !== "object") throw new Error("クイズデータが不正です");
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
    while (choices.length < 4) choices.push(correctAnswer || questionWord);

    questions.push({
      wordId: validWordIds.has(wordId) ? wordId : "",
      questionWord,
      correctAnswer,
      choices: choices.slice(0, 4),
      correctIndex: Math.min(Math.max(0, correctIndex), 3),
    });
  }

  if (questions.length === 0) throw new Error("有効なクイズ問題を生成できませんでした");
  return { questions };
}

function validateFillBlank(
  data: unknown,
  validWordIds: Set<string>
): { questions: FillBlankQuestion[] } {
  if (!data || typeof data !== "object") throw new Error("穴埋めデータが不正です");
  const obj = data as Record<string, unknown>;
  if (!Array.isArray(obj.questions) || obj.questions.length === 0) {
    throw new Error("穴埋め問題が生成されませんでした");
  }

  const questions: FillBlankQuestion[] = [];
  for (const q of obj.questions) {
    if (!q || typeof q !== "object") continue;
    const qObj = q as Record<string, unknown>;
    const wordId = typeof qObj.wordId === "string" ? qObj.wordId : "";
    const sentence = typeof qObj.sentence === "string" ? qObj.sentence : "";
    const blank = typeof qObj.blank === "string" ? qObj.blank : "";
    const answer = typeof qObj.answer === "string" ? qObj.answer : "";
    const hint = typeof qObj.hint === "string" ? qObj.hint : "";

    if (!sentence || !answer) continue;

    questions.push({
      wordId: validWordIds.has(wordId) ? wordId : "",
      sentence,
      blank: blank || "______",
      answer,
      hint,
    });
  }

  if (questions.length === 0) throw new Error("有効な穴埋め問題を生成できませんでした");
  return { questions };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const words: QuizRequestWord[] = Array.isArray(body?.words) ? body.words : [];
    const quizMode: string = body?.mode || "multiple-choice";
    const count: number = Math.min(body?.count || 20, words.length);

    if (words.length < 4) {
      return NextResponse.json(
        { error: "クイズ生成には最低4つの単語・熟語が必要です" },
        { status: 400 }
      );
    }

    const validWordIds = new Set(words.map((w) => w.id));
    const quizTargets = selectQuizTargets(words, count);

    let prompt: string;

    if (quizMode === "reverse") {
      prompt = `あなたは語学学習クイズの作成者です。
以下の単語・熟語リストから「意味→単語」の逆引き4択クイズを作成してください。
意味を表示して、正しい単語を選ばせるクイズです。

## 出題対象の単語・熟語
${quizTargets.map((w) => `- [ID:${w.id}] ${w.term}: ${w.meaning}`).join("\n")}

## 全単語・熟語リスト（不正解の選択肢として使用可能）
${words.map((w) => `- ${w.term}: ${w.meaning}`).join("\n")}

以下のJSON形式で出力してください。必ずJSON形式のみで返答してください。

{
  "questions": [
    {
      "wordId": "出題する単語のID（上記の[ID:xxx]の値をそのまま使用）",
      "questionWord": "日本語の意味（問題文として表示）",
      "correctAnswer": "正しい単語・熟語",
      "choices": ["単語1", "単語2", "単語3", "単語4"],
      "correctIndex": 0
    }
  ]
}

注意事項:
- 出題対象の各単語・熟語について1問ずつ作成してください
- wordIdは必ず上記の[ID:xxx]の値をそのまま使用してください
- questionWordには日本語の意味を記載してください（これが問題文になります）
- correctAnswerには正しい単語・熟語を記載してください
- choicesには正解を含めた4つの単語・熟語を入れてください
- correctIndexは0始まりで正解の位置を示してください
- 不正解の選択肢は紛らわしいが明確に異なるものにしてください
- 選択肢の順序はランダムにしてください`;
    } else if (quizMode === "fill-blank") {
      prompt = `あなたは語学学習クイズの作成者です。
以下の単語・熟語リストから穴埋め問題を作成してください。

## 出題対象
${quizTargets.map((w) => `- [ID:${w.id}] ${w.term}: ${w.meaning}${w.exampleSentence ? ` (例: ${w.exampleSentence})` : ""}`).join("\n")}

以下のJSON形式で出力してください。必ずJSON形式のみで返答してください。

{
  "questions": [
    {
      "wordId": "単語のID（上記[ID:xxx]の値）",
      "sentence": "The cherry blossoms are ______, lasting only a few days.",
      "blank": "______",
      "answer": "ephemeral",
      "hint": "はかない、つかの間の"
    }
  ]
}

注意事項:
- 出題対象の各単語・熟語について1問ずつ作成してください
- wordIdは必ず上記の[ID:xxx]の値をそのまま使用してください
- sentenceは自然で実用的な英文にし、答えの部分を______(アンダースコア6つ)に置き換えてください
- answerは正解の単語・熟語をそのまま記載してください
- hintは日本語の意味を簡潔に記載してください
- 熟語の場合も一つの空欄として扱ってください（例: "look forward to" → ______）
- 文脈から答えが推測できるような文にしてください`;
    } else {
      prompt = `あなたは語学学習クイズの作成者です。
以下の単語・熟語リストから4択クイズを作成してください。

## 出題対象の単語・熟語（これらの意味を問うクイズを作成）
${quizTargets.map((w) => `- [ID:${w.id}] ${w.term}: ${w.meaning}`).join("\n")}

## 全単語・熟語リスト（不正解の選択肢として使用可能）
${words.map((w) => `- ${w.term}: ${w.meaning}`).join("\n")}

以下のJSON形式で出力してください。必ずJSON形式のみで返答してください。

{
  "questions": [
    {
      "wordId": "出題する単語のID（上記の[ID:xxx]の値をそのまま使用）",
      "questionWord": "出題する単語・熟語（元の表記をそのまま使用）",
      "correctAnswer": "正しい意味",
      "choices": ["選択肢1", "選択肢2", "選択肢3", "選択肢4"],
      "correctIndex": 0
    }
  ]
}

注意事項:
- 出題対象の各単語・熟語について1問ずつ作成してください
- wordIdは必ず上記の[ID:xxx]の値をそのまま使用してください
- questionWordは出題対象の単語をそのまま使用してください（変更しないでください）
- choicesには正解を含めた4つの選択肢を入れてください
- correctIndexは0始まりで正解の位置を示してください
- 不正解の選択肢は紛らわしいが明確に異なるものにしてください
- 選択肢の順序はランダムにしてください`;
    }

    const text = await generateQuizWithGemini(prompt);
    const jsonStr = extractJson(text);
    const parsed = JSON.parse(jsonStr);

    const validated = quizMode === "fill-blank"
      ? validateFillBlank(parsed, validWordIds)
      : validateMultipleChoice(parsed, validWordIds);

    // Add direction metadata for reverse quiz
    if (quizMode === "reverse" && "questions" in validated && Array.isArray(validated.questions)) {
      for (const q of validated.questions) {
        if ("choices" in q) {
          (q as QuizQuestion).direction = "meaning-to-term";
        }
      }
    }

    return NextResponse.json(validated);
  } catch (error) {
    console.error("Quiz generation error:", error);
    return NextResponse.json(
      { error: "クイズの生成中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
