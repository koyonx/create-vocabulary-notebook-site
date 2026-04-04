"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getNotebooks, deleteNotebook } from "@/lib/storage";
import type { Notebook } from "@/lib/types";
import AuthHeader from "@/components/AuthHeader";

export default function NotebooksPage() {
  const router = useRouter();
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);

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

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleCrossStudy = () => {
    if (selectedIds.size === 0) return;
    const idsParam = Array.from(selectedIds).join(",");
    router.push(`/study?ids=${idsParam}`);
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
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            単語帳一覧
          </h1>
          {notebooks.length >= 2 && (
            <button
              onClick={() => {
                setSelectMode(!selectMode);
                if (selectMode) setSelectedIds(new Set());
              }}
              className={`text-sm px-4 py-1.5 rounded-lg transition-colors ${
                selectMode
                  ? "bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300"
                  : "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800"
              }`}
            >
              {selectMode ? "キャンセル" : "まとめて学習"}
            </button>
          )}
        </div>

        {/* Cross-study action bar */}
        {selectMode && selectedIds.size > 0 && (
          <div className="mb-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 flex items-center justify-between">
            <span className="text-sm text-blue-700 dark:text-blue-300">
              {selectedIds.size}冊を選択中
            </span>
            <button
              onClick={handleCrossStudy}
              className="text-sm px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              選択した単語帳で学習
            </button>
          </div>
        )}

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
                className={`group relative rounded-xl border bg-white dark:bg-zinc-900 p-5 hover:shadow-md transition-all ${
                  selectMode && selectedIds.has(nb.id)
                    ? "border-blue-400 dark:border-blue-500 ring-2 ring-blue-200 dark:ring-blue-800"
                    : "border-zinc-200 dark:border-zinc-800"
                }`}
              >
                {selectMode && (
                  <div className="absolute top-4 left-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(nb.id)}
                      onChange={() => toggleSelect(nb.id)}
                      className="w-4 h-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                      aria-label={`${nb.title}を選択`}
                    />
                  </div>
                )}
                <div
                  className={selectMode ? "cursor-pointer pl-7" : ""}
                  onClick={selectMode ? () => toggleSelect(nb.id) : undefined}
                >
                  {selectMode ? (
                    <div>
                      <h2 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
                        {nb.title}
                      </h2>
                      <p className="text-sm text-zinc-500">
                        {nb.words.length}語 ・{" "}
                        {new Date(nb.createdAt).toLocaleDateString("ja-JP")}
                      </p>
                    </div>
                  ) : (
                    <Link href={`/notebooks/${nb.id}`} className="block">
                      <h2 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
                        {nb.title}
                      </h2>
                      <p className="text-sm text-zinc-500">
                        {nb.words.length}語 ・{" "}
                        {new Date(nb.createdAt).toLocaleDateString("ja-JP")}
                      </p>
                    </Link>
                  )}
                </div>
                {!selectMode && (
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
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
