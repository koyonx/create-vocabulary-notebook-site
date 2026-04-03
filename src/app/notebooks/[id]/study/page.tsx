"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import FlashCard from "@/components/FlashCard";
import {
  getNotebook,
  getStudyQueue,
  getLearningData,
  saveLearningData,
  updateSM2,
} from "@/lib/storage";
import type { Word, ReviewScore } from "@/lib/types";

export default function StudyPage() {
  const { id } = useParams<{ id: string }>();
  const [queue, setQueue] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [words, setWords] = useState<Map<string, Word>>(new Map());
  const [sessionStats, setSessionStats] = useState({
    reviewed: 0,
    correct: 0,
  });
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    const notebook = getNotebook(id);
    if (!notebook) return;

    const wordMap = new Map<string, Word>();
    notebook.words.forEach((w) => wordMap.set(w.id, w));
    setWords(wordMap);

    const studyQueue = getStudyQueue(id);
    if (studyQueue.length === 0) {
      // 全単語を新規カードとして出題
      setQueue(notebook.words.map((w) => w.id));
    } else {
      setQueue(studyQueue);
    }
  }, [id]);

  const handleScore = useCallback(
    (score: ReviewScore) => {
      const wordId = queue[currentIndex];
      if (!wordId) return;

      const learningData = getLearningData(wordId);
      const updated = updateSM2(learningData, score);
      saveLearningData(updated);

      setSessionStats((prev) => ({
        reviewed: prev.reviewed + 1,
        correct: score >= 3 ? prev.correct + 1 : prev.correct,
      }));

      // スコア1-2の場合、キューの後ろに再追加
      if (score < 3) {
        setQueue((prev) => [...prev, wordId]);
      }

      if (currentIndex + 1 >= queue.length && score >= 3) {
        setIsComplete(true);
      } else {
        setCurrentIndex((prev) => prev + 1);
      }
    },
    [queue, currentIndex]
  );

  const currentWord = queue[currentIndex]
    ? words.get(queue[currentIndex])
    : undefined;

  if (words.size === 0) {
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
          <Link
            href={`/notebooks/${id}`}
            className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
          >
            単語帳に戻る
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        {/* Progress Bar */}
        <div className="w-full max-w-lg mb-8">
          <div className="flex justify-between text-sm text-zinc-500 mb-2">
            <span>
              {sessionStats.reviewed} / {queue.length} カード
            </span>
            <span>
              正答率:{" "}
              {sessionStats.reviewed > 0
                ? Math.round(
                    (sessionStats.correct / sessionStats.reviewed) * 100
                  )
                : 0}
              %
            </span>
          </div>
          <div className="w-full h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300 rounded-full"
              style={{
                width: `${
                  queue.length > 0
                    ? (sessionStats.reviewed / queue.length) * 100
                    : 0
                }%`,
              }}
            />
          </div>
        </div>

        {isComplete ? (
          <div className="text-center">
            <div className="text-5xl mb-4">&#10024;</div>
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
              学習完了！
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400 mb-2">
              {sessionStats.reviewed}カード復習しました
            </p>
            <p className="text-zinc-600 dark:text-zinc-400 mb-6">
              正答率: {Math.round((sessionStats.correct / sessionStats.reviewed) * 100)}%
            </p>
            <div className="flex gap-3 justify-center">
              <Link
                href={`/notebooks/${id}`}
                className="px-6 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                単語帳に戻る
              </Link>
              <button
                onClick={() => {
                  setCurrentIndex(0);
                  setSessionStats({ reviewed: 0, correct: 0 });
                  setIsComplete(false);
                  const studyQueue = getStudyQueue(id);
                  const notebook = getNotebook(id);
                  setQueue(
                    studyQueue.length > 0
                      ? studyQueue
                      : notebook?.words.map((w) => w.id) || []
                  );
                }}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                もう一度
              </button>
            </div>
          </div>
        ) : currentWord ? (
          <FlashCard word={currentWord} onScore={handleScore} />
        ) : (
          <p className="text-zinc-500">学習する単語がありません</p>
        )}
      </main>
    </div>
  );
}
