"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getNotebook, saveNotebook } from "@/lib/storage";
import { getNotebookStats, type NotebookStats } from "@/lib/stats";
import type { Notebook, Word } from "@/lib/types";
import type { GeminiResponse } from "@/lib/types";
import WordCard from "@/components/WordCard";
import WordEditor from "@/components/WordEditor";
import FileUploader from "@/components/FileUploader";
import StatsCard from "@/components/StatsCard";
import ProgressBar from "@/components/ProgressBar";
import AuthHeader from "@/components/AuthHeader";

function mergeWords(existing: Word[], newWords: { term: string; meaning: string; partOfSpeech: string; exampleSentence: string; context: string }[]): {
  added: Word[];
  improved: Word[];
  unchanged: Word[];
} {
  const added: Word[] = [];
  const improved: Word[] = [];
  const unchanged = [...existing];

  for (const nw of newWords) {
    const termLower = nw.term.toLowerCase().trim();
    const existingIdx = unchanged.findIndex(
      (w) => w.term.toLowerCase().trim() === termLower
    );

    if (existingIdx === -1) {
      // 新規単語
      added.push({
        id: crypto.randomUUID(),
        ...nw,
      });
    } else {
      // 既存単語 → 不足情報を補完
      const ew = unchanged[existingIdx];
      let didImprove = false;
      const merged = { ...ew };

      if (!ew.meaning && nw.meaning) { merged.meaning = nw.meaning; didImprove = true; }
      if (!ew.partOfSpeech && nw.partOfSpeech) { merged.partOfSpeech = nw.partOfSpeech; didImprove = true; }
      if (!ew.exampleSentence && nw.exampleSentence) { merged.exampleSentence = nw.exampleSentence; didImprove = true; }
      if (!ew.context && nw.context) { merged.context = nw.context; didImprove = true; }
      // 意味がより詳しい場合も更新
      if (nw.meaning && nw.meaning.length > ew.meaning.length * 1.3) {
        merged.meaning = nw.meaning;
        didImprove = true;
      }

      if (didImprove) {
        unchanged[existingIdx] = merged;
        improved.push(merged);
      }
    }
  }

  return { added, improved, unchanged };
}

export default function NotebookDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [notebook, setNotebook] = useState<Notebook | null>(null);
  const [stats, setStats] = useState<NotebookStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showStats, setShowStats] = useState(true);

  // 編集系の状態
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingWordId, setEditingWordId] = useState<string | null>(null);
  const [showAIUploader, setShowAIUploader] = useState(false);
  const [improvingWordId, setImprovingWordId] = useState<string | null>(null);
  const [mergeResult, setMergeResult] = useState<{ added: number; improved: number } | null>(null);

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

  const saveAndRefresh = useCallback(async (updated: Notebook) => {
    await saveNotebook(updated);
    setNotebook(updated);
    setStats(await getNotebookStats(id));
  }, [id]);

  // 手動追加
  const handleAddWord = useCallback(async (wordData: Omit<Word, "id"> & { id?: string }) => {
    if (!notebook) return;
    const newWord: Word = {
      id: crypto.randomUUID(),
      term: wordData.term,
      meaning: wordData.meaning,
      partOfSpeech: wordData.partOfSpeech,
      exampleSentence: wordData.exampleSentence,
      context: wordData.context,
    };
    await saveAndRefresh({
      ...notebook,
      words: [...notebook.words, newWord],
    });
    setShowAddForm(false);
  }, [notebook, saveAndRefresh]);

  // 手動編集
  const handleEditWord = useCallback(async (wordData: Omit<Word, "id"> & { id?: string }) => {
    if (!notebook || !wordData.id) return;
    const updated = {
      ...notebook,
      words: notebook.words.map((w) =>
        w.id === wordData.id
          ? { ...w, term: wordData.term, meaning: wordData.meaning, partOfSpeech: wordData.partOfSpeech, exampleSentence: wordData.exampleSentence, context: wordData.context }
          : w
      ),
    };
    await saveAndRefresh(updated);
    setEditingWordId(null);
  }, [notebook, saveAndRefresh]);

  // 削除
  const handleDeleteWord = useCallback(async (wordId: string) => {
    if (!notebook) return;
    await saveAndRefresh({
      ...notebook,
      words: notebook.words.filter((w) => w.id !== wordId),
    });
  }, [notebook, saveAndRefresh]);

  // AI追加生成（ファイルアップロード → マージ）
  const handleAIAdd = useCallback(async (data: GeminiResponse) => {
    if (!notebook) return;
    const { added, improved, unchanged } = mergeWords(notebook.words, data.words);
    await saveAndRefresh({
      ...notebook,
      words: [...unchanged, ...added],
    });
    setMergeResult({ added: added.length, improved: improved.length });
    setShowAIUploader(false);
    setTimeout(() => setMergeResult(null), 5000);
  }, [notebook, saveAndRefresh]);

  // AI単語改善
  const handleImproveWord = useCallback(async (word: Word) => {
    setImprovingWordId(word.id);
    try {
      const res = await fetch("/api/improve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ words: [word] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (data.words && data.words[0]) {
        const improved = data.words[0];
        if (!notebook) return;
        await saveAndRefresh({
          ...notebook,
          words: notebook.words.map((w) =>
            w.id === word.id
              ? {
                  ...w,
                  meaning: improved.meaning || w.meaning,
                  partOfSpeech: improved.partOfSpeech || w.partOfSpeech,
                  exampleSentence: improved.exampleSentence || w.exampleSentence,
                  context: improved.context || w.context,
                }
              : w
          ),
        });
      }
    } catch (err) {
      console.error("Improve error:", err);
    } finally {
      setImprovingWordId(null);
    }
  }, [notebook, saveAndRefresh]);

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

        {/* Stats Dashboard */}
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
                  <StatsCard label="要復習" value={stats.dueToday} sub="カード" color="text-orange-600 dark:text-orange-400" />
                  <StatsCard
                    label="習得済み"
                    value={`${stats.mastered} / ${stats.totalWords}`}
                    sub={stats.totalWords > 0 ? `${Math.round((stats.mastered / stats.totalWords) * 100)}%` : "0%"}
                    color="text-green-600 dark:text-green-400"
                  />
                  <StatsCard label="正答率" value={`${Math.round(stats.correctRate * 100)}%`} sub={`${stats.totalReviews}回復習`} />
                  <StatsCard
                    label="平均難易度"
                    value={stats.averageEaseFactor.toFixed(2)}
                    sub={stats.averageEaseFactor >= 2.5 ? "順調" : stats.averageEaseFactor >= 2.0 ? "やや苦戦" : "要復習"}
                    color={stats.averageEaseFactor >= 2.5 ? "text-green-600 dark:text-green-400" : stats.averageEaseFactor >= 2.0 ? "text-yellow-600 dark:text-yellow-400" : "text-red-600 dark:text-red-400"}
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
                        <div key={`${w.term}-${i}`} className="flex items-center justify-between text-sm">
                          <div>
                            <span className="font-medium text-zinc-900 dark:text-zinc-100">{w.term}</span>
                            <span className="text-zinc-500 ml-2">{w.meaning}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-zinc-400">
                            <span>EF: {w.easeFactor.toFixed(1)}</span>
                            {w.lapses > 0 && <span className="text-red-400">{w.lapses}回忘却</span>}
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

        {/* 単語追加アクション */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            単語一覧
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => { setShowAddForm(true); setShowAIUploader(false); }}
              className="text-xs px-3 py-1.5 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              + 手動追加
            </button>
            <button
              onClick={() => { setShowAIUploader(true); setShowAddForm(false); }}
              className="text-xs px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              AI追加
            </button>
          </div>
        </div>

        {/* マージ結果通知 */}
        {mergeResult && (
          <div className="mb-4 p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-sm text-green-700 dark:text-green-300" role="status">
            {mergeResult.added > 0 && <span>{mergeResult.added}語を追加</span>}
            {mergeResult.added > 0 && mergeResult.improved > 0 && <span>、</span>}
            {mergeResult.improved > 0 && <span>{mergeResult.improved}語を改善</span>}
            {mergeResult.added === 0 && mergeResult.improved === 0 && <span>新しい単語はありませんでした</span>}
          </div>
        )}

        {/* AIアップローダー */}
        {showAIUploader && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                ファイルをアップロードして単語を追加（既存の単語は自動で改善されます）
              </p>
              <button
                onClick={() => setShowAIUploader(false)}
                className="text-xs text-zinc-400 hover:text-zinc-600"
              >
                閉じる
              </button>
            </div>
            <FileUploader onAnalysisComplete={handleAIAdd} />
          </div>
        )}

        {/* 手動追加フォーム */}
        {showAddForm && (
          <div className="mb-4">
            <WordEditor
              onSave={handleAddWord}
              onCancel={() => setShowAddForm(false)}
            />
          </div>
        )}

        {/* 単語一覧 */}
        <div className="grid gap-3">
          {notebook.words.map((word) => (
            editingWordId === word.id ? (
              <WordEditor
                key={word.id}
                word={word}
                onSave={handleEditWord}
                onCancel={() => setEditingWordId(null)}
              />
            ) : (
              <WordCard
                key={word.id}
                word={word}
                onDelete={handleDeleteWord}
                onEdit={(w) => setEditingWordId(w.id)}
                onImprove={handleImproveWord}
                isImproving={improvingWordId === word.id}
              />
            )
          ))}
        </div>

        {notebook.words.length === 0 && !showAddForm && !showAIUploader && (
          <div className="text-center py-16">
            <p className="text-zinc-500 mb-4">単語がありません</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setShowAddForm(true)}
                className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                手動で追加
              </button>
              <button
                onClick={() => setShowAIUploader(true)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                AIで追加
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
