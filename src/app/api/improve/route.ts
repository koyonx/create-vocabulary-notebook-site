import { NextRequest, NextResponse } from "next/server";
import { generateQuizWithGemini } from "@/lib/gemini";

type WordInput = {
  term: string;
  meaning: string;
  partOfSpeech: string;
  exampleSentence: string;
  context: string;
};

export async function POST(request: NextRequest) {
  try {
    const { words } = (await request.json()) as { words: WordInput[] };

    if (!words || words.length === 0) {
      return NextResponse.json({ error: "単語が指定されていません" }, { status: 400 });
    }

    const prompt = `あなたは語学学習の専門家です。
以下の単語データを改善してください。意味がより正確で分かりやすくなるように、例文がより実用的になるように、不足している情報を補完してください。

## 改善対象の単語
${words.map((w, i) => `${i + 1}. term: "${w.term}", meaning: "${w.meaning}", partOfSpeech: "${w.partOfSpeech}", exampleSentence: "${w.exampleSentence}", context: "${w.context}"`).join("\n")}

以下のJSON形式で出力してください。必ずJSON形式のみで返答してください。
元の単語の順番を維持し、各単語を改善してください。

{
  "words": [
    {
      "term": "元の単語（変更しない）",
      "meaning": "改善された意味",
      "partOfSpeech": "正確な品詞",
      "exampleSentence": "より実用的な例文",
      "context": "補完されたコンテキスト"
    }
  ]
}

注意事項:
- termは変更しないでください
- meaningは日本語で簡潔かつ正確に
- 空の項目は必ず適切な内容で補完してください
- exampleSentenceは自然で実用的な例文にしてください`;

    const text = await generateQuizWithGemini(prompt);

    const fenced = text.match(/```json\s*([\s\S]*?)\s*```/);
    let jsonStr: string;
    if (fenced) {
      jsonStr = fenced[1];
    } else {
      const start = text.indexOf("{");
      if (start === -1) throw new Error("JSONが見つかりません");
      let depth = 0;
      let end = start;
      for (let i = start; i < text.length; i++) {
        if (text[i] === "{") depth++;
        else if (text[i] === "}") depth--;
        if (depth === 0) { end = i; break; }
      }
      jsonStr = text.slice(start, end + 1);
    }

    const parsed = JSON.parse(jsonStr);
    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Improve error:", error);
    return NextResponse.json(
      { error: "単語の改善中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
