"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getNotebook, saveNotebook } from "@/lib/storage";
import { getNotebookStats, type NotebookStats } from "@/lib/stats";
import type { Notebook } from "@/lib/types";
import WordCard from "@/components/WordCard";
import StatsCard from "@/components/StatsCard";
import ProgressBar from "@/components/ProgressBar";
import AuthHeader from "@/components/AuthHeader";

export default function NotebookDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [notebook, setNotebook] = useState<Notebook | null>(null);
  const [stats, setStats] = useState<NotebookStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showStats, setShowStats] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [nb, st] = await Promise.all([
        getNotebook(id),
        getNotebookStats(id),
      ]);
      if (nb) setNotebook(nb);
      setStats(st);
    } catch (err) {
      setError(err instanceof Error ? err.message : "読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDeleteWord = async (wordId: string) => {
    if (!notebook) return;
    const updated = {
      ...notebook,
      words: notebook.words.filter((w) => w.id !== wordId),
    };
    await saveNotebook(updated);
    setNotebook(updated);
    setStats(await getNotebookStats(id));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p role="alert" className="text-red-500">{error}</p>
        <button
          onClick={() => { setError(null); setLoading(true); loadData(); }}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          再読み込み
        </button>
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
      <AuthHeader
        rightContent={
          <>
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
          </>
        }
      />

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

        {stats && (
          <div className="mb-8">
            <button
              onClick={() => setShowStats(!showStats)}
              className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-4"
              aria-expanded={showStats}
            >
              <svg
                className={`w-4 h-4 transition-transform ${showStats ? "rotate-90" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              学習統計
            </button>

            {showStats && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <StatsCard
                    label="要復習"
                    value={stats.dueToday}
                    sub="カード"
                    color="text-orange-600 dark:text-orange-400"
                  />
                  <StatsCard
                    label="習得済み"
                    value={`${stats.mastered} / ${stats.totalWords}`}
                    sub={stats.totalWords > 0 ? `${Math.round((stats.mastered / stats.totalWords) * 100)}%` : "0%"}
                    color="text-green-600 dark:text-green-400"
                  />
                  <StatsCard
                    label="正答率"
                    value={`${Math.round(stats.correctRate * 100)}%`}
                    sub={`${stats.totalReviews}回復習`}
                  />
                  <StatsCard
                    label="平均難易度"
                    value={stats.averageEaseFactor.toFixed(2)}
                    sub={stats.averageEaseFactor >= 2.5 ? "順調" : stats.averageEaseFactor >= 2.0 ? "やや苦戦" : "要復習"}
                    color={
                      stats.averageEaseFactor >= 2.5
                        ? "text-green-600 dark:text-green-400"
                        : stats.averageEaseFactor >= 2.0
                        ? "text-yellow-600 dark:text-yellow-400"
                        : "text-red-600 dark:text-red-400"
                    }
                  />
                </div>

                <ProgressBar
                  total={stats.totalWords}
                  segments={[
                    { label: "習得済み", count: stats.mastered, color: "bg-green-500" },
                    { label: "学習中", count: stats.learning, color: "bg-blue-500" },
                    { label: "未学習", count: stats.newWords, color: "bg-zinc-300 dark:bg-zinc-600" },
                  ]}
                />

                {stats.weakWords.length > 0 && (
                  <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
                    <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
                      苦手な単語 TOP{stats.weakWords.length}
                    </h3>
                    <div className="space-y-2">
                      {stats.weakWords.map((w, i) => (
                        <div
                          key={`${w.term}-${i}`}
                          className="flex items-center justify-between text-sm"
                        >
                          <div>
                            <span className="font-medium text-zinc-900 dark:text-zinc-100">
                              {w.term}
                            </span>
                            <span className="text-zinc-500 ml-2">{w.meaning}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-zinc-400">
                            <span>EF: {w.easeFactor.toFixed(1)}</span>
                            {w.lapses > 0 && (
                              <span className="text-red-400">
                                {w.lapses}回忘却
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
          単語一覧
        </h2>
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
