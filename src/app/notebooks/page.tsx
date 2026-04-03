"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { getNotebooks, deleteNotebook } from "@/lib/storage";
import type { Notebook } from "@/lib/types";
import AuthHeader from "@/components/AuthHeader";

export default function NotebooksPage() {
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadNotebooks = useCallback(async () => {
    try {
      const nbs = await getNotebooks();
      setNotebooks(nbs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotebooks();
  }, [loadNotebooks]);

  const handleDelete = async (id: string) => {
    if (!confirm("この単語帳を削除しますか？")) return;
    await deleteNotebook(id);
    await loadNotebooks();
  };

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <AuthHeader
        rightContent={
          <Link
            href="/"
            className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
          >
            + 新規作成
          </Link>
        }
      />

      <main className="flex-1 max-w-4xl mx-auto px-4 py-8 w-full">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-6">
          単語帳一覧
        </h1>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <p role="alert" className="text-red-500 mb-4">{error}</p>
            <button
              onClick={() => { setError(null); setLoading(true); loadNotebooks(); }}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              再読み込み
            </button>
          </div>
        ) : notebooks.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-zinc-500 mb-4">まだ単語帳がありません</p>
            <Link
              href="/"
              className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              最初の単語帳を作成
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {notebooks.map((nb) => (
              <div
                key={nb.id}
                className="group relative rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 hover:shadow-md transition-shadow"
              >
                <Link href={`/notebooks/${nb.id}`} className="block">
                  <h2 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
                    {nb.title}
                  </h2>
                  <p className="text-sm text-zinc-500">
                    {nb.words.length}語 ・{" "}
                    {new Date(nb.createdAt).toLocaleDateString("ja-JP")}
                  </p>
                </Link>
                <div className="absolute top-4 right-4 flex gap-2 sm:opacity-0 sm:group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                  <Link
                    href={`/notebooks/${nb.id}/study`}
                    className="text-xs px-3 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-full hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
                  >
                    学習
                  </Link>
                  <button
                    onClick={() => handleDelete(nb.id)}
                    className="text-xs px-3 py-1 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-full hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
                  >
                    削除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
