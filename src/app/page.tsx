"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import FileUploader from "@/components/FileUploader";
import { saveNotebook } from "@/lib/storage";
import type { GeminiResponse } from "@/lib/types";
import Link from "next/link";

export default function Home() {
  const router = useRouter();

  const handleAnalysisComplete = useCallback(
    (data: GeminiResponse) => {
      const id = crypto.randomUUID();
      const notebook = {
        id,
        title: data.title,
        words: data.words.map((w) => ({
          id: crypto.randomUUID(),
          ...w,
        })),
        createdAt: new Date().toISOString(),
      };

      saveNotebook(notebook);
      router.push(`/notebooks/${id}`);
    },
    [router]
  );

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
            VocabAI
          </Link>
          <Link
            href="/notebooks"
            className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
          >
            単語帳一覧
          </Link>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-100 mb-3">
              画像・動画から単語帳を作成
            </h1>
            <p className="text-zinc-600 dark:text-zinc-400 text-lg">
              教科書の写真や動画をアップロードするだけで、AIが自動で単語を抽出します
            </p>
          </div>

          <FileUploader onAnalysisComplete={handleAnalysisComplete} />

          <div className="mt-8 grid grid-cols-3 gap-4 text-center">
            {[
              { step: "1", label: "ファイルをアップロード" },
              { step: "2", label: "AIが単語を抽出" },
              { step: "3", label: "効率的に学習" },
            ].map(({ step, label }) => (
              <div key={step} className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 flex items-center justify-center text-sm font-bold">
                  {step}
                </div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
