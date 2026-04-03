import { NextRequest, NextResponse } from "next/server";
import { analyzeWithGemini } from "@/lib/gemini";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "ファイルが選択されていません" }, { status: 400 });
    }

    const allowedTypes = [
      "image/png",
      "image/jpeg",
      "image/webp",
      "image/gif",
      "video/mp4",
      "video/webm",
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "対応していないファイル形式です。画像（PNG, JPEG, WebP, GIF）または動画（MP4, WebM）をアップロードしてください" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");

    const result = await analyzeWithGemini(base64, file.type);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Analysis error:", error);
    return NextResponse.json(
      { error: "解析中にエラーが発生しました。もう一度お試しください。" },
      { status: 500 }
    );
  }
}
