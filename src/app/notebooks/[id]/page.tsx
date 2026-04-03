"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getNotebook, saveNotebook } from "@/lib/storage";
import type { Notebook } from "@/lib/types";
import WordCard from "@/components/WordCard";

export default function NotebookDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [notebook, setNotebook] = useState<Notebook | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getNotebook(id).then((nb) => {
      if (nb) setNotebook(nb);
      setLoading(false);
    });
  }, [id]);

  const handleDeleteWord = async (wordId: string) => {
    if (!notebook) return;
    const updated = {
      ...notebook,
      words: notebook.words.filter((w) => w.id !== wordId),
    };
    await saveNotebook(updated);
    setNotebook(updated);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!notebook) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-zinc-500">単語帳が見つかりません</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
            VocabAI
          </Link>
          <div className="flex gap-3">
            <Link
              href="/notebooks"
              className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            >
              一覧
            </Link>
            <Link
              href={`/notebooks/${id}/study`}
              className="text-sm px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              学習する
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto px-4 py-8 w-full">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {notebook.title}
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            {notebook.words.length}語 ・
            作成日: {new Date(notebook.createdAt).toLocaleDateString("ja-JP")}
          </p>
        </div>

        <div className="grid gap-3">
          {notebook.words.map((word) => (
            <WordCard key={word.id} word={word} onDelete={handleDeleteWord} />
          ))}
        </div>

        {notebook.words.length === 0 && (
          <div className="text-center py-16">
            <p className="text-zinc-500">単語がありません</p>
          </div>
        )}
      </main>
    </div>
  );
}
