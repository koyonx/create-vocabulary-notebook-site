"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import FlashCard from "@/components/FlashCard";
import QuizMode from "@/components/QuizMode";
import AuthHeader from "@/components/AuthHeader";
import {
  getNotebook,
  getStudyQueue,
  getLearningData,
  saveLearningData,
  saveReviewLog,
} from "@/lib/storage";
import { updateSM2 } from "@/lib/sm2";
import type { Word, ReviewScore } from "@/lib/types";
import type { QuizQuestion } from "@/lib/quiz.types";

type StudyMode = "flashcard" | "quiz";

export default function StudyPage() {
  const { id } = useParams<{ id: string }>();
  const [mode, setMode] = useState<StudyMode>("flashcard");
  const [queue, setQueue] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [words, setWords] = useState<Map<string, Word>>(new Map());
  const [allWords, setAllWords] = useState<Word[]>([]);
  const [sessionStats, setSessionStats] = useState({ reviewed: 0, correct: 0 });
  const [isComplete, setIsComplete] = useState(false);
  const [loading, setLoading] = useState(true);

  // Quiz state
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizError, setQuizError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const notebook = await getNotebook(id);
      if (!notebook) {
        setLoading(false);
        return;
      }

      const wordMap = new Map<string, Word>();
      notebook.words.forEach((w) => wordMap.set(w.id, w));
      setWords(wordMap);
      setAllWords(notebook.words);

      const studyQueue = await getStudyQueue(id);
      setQueue(
        studyQueue.length > 0 ? studyQueue : notebook.words.map((w) => w.id)
      );
      setLoading(false);
    })();
  }, [id]);

  const generateQuiz = useCallback(async () => {
    if (allWords.length < 4) {
      setQuizError("クイズ生成には最低4つの単語が必要です");
      return;
    }

    setQuizLoading(true);
    setQuizError(null);

    try {
      // 苦手単語を特定
      const wordsWithWeakness = await Promise.all(
        allWords.map(async (w) => {
          const ld = await getLearningData(w.id);
          return {
            term: w.term,
            meaning: w.meaning,
            isWeak: ld.easeFactor < 2.0 || ld.lapses > 0,
          };
        })
      );

      const res = await fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ words: wordsWithWeakness }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setQuizQuestions(data.questions);
    } catch (err) {
      setQuizError(err instanceof Error ? err.message : "クイズ生成に失敗しました");
    } finally {
      setQuizLoading(false);
    }
  }, [allWords]);

  const handleModeSwitch = useCallback(
    async (newMode: StudyMode) => {
      setMode(newMode);
      setIsComplete(false);
      setSessionStats({ reviewed: 0, correct: 0 });

      if (newMode === "quiz") {
        await generateQuiz();
      } else {
        setCurrentIndex(0);
        const studyQueue = await getStudyQueue(id);
        const notebook = await getNotebook(id);
        setQueue(
          studyQueue.length > 0
            ? studyQueue
            : notebook?.words.map((w) => w.id) || []
        );
      }
    },
    [id, generateQuiz]
  );

  // Flashcard handlers
  const handleScore = useCallback(
    async (score: ReviewScore) => {
      const wordId = queue[currentIndex];
      if (!wordId) return;

      const learningData = await getLearningData(wordId);
      const updated = updateSM2(learningData, score);
      await saveLearningData(updated);
      await saveReviewLog(wordId, score, "flashcard");

      setSessionStats((prev) => ({
        reviewed: prev.reviewed + 1,
        correct: score >= 3 ? prev.correct + 1 : prev.correct,
      }));

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

  // Quiz handlers
  const handleQuizAnswer = useCallback(
    async (questionIndex: number, isCorrect: boolean) => {
      const question = quizQuestions[questionIndex];
      if (!question) return;

      // 単語名からWordを逆引きしてSM-2更新
      const word = allWords.find((w) => w.term === question.questionWord);
      if (word) {
        const score: ReviewScore = isCorrect ? 4 : 1;
        const learningData = await getLearningData(word.id);
        const updated = updateSM2(learningData, score);
        await saveLearningData(updated);
        await saveReviewLog(word.id, score, "quiz");
      }

      setSessionStats((prev) => ({
        reviewed: prev.reviewed + 1,
        correct: isCorrect ? prev.correct + 1 : prev.correct,
      }));
    },
    [quizQuestions, allWords]
  );

  const handleQuizComplete = useCallback(() => {
    setIsComplete(true);
  }, []);

  const handleRestart = useCallback(async () => {
    setIsComplete(false);
    setSessionStats({ reviewed: 0, correct: 0 });

    if (mode === "quiz") {
      await generateQuiz();
    } else {
      setCurrentIndex(0);
      const studyQueue = await getStudyQueue(id);
      const notebook = await getNotebook(id);
      setQueue(
        studyQueue.length > 0
          ? studyQueue
          : notebook?.words.map((w) => w.id) || []
      );
    }
  }, [id, mode, generateQuiz]);

  const currentWord = queue[currentIndex]
    ? words.get(queue[currentIndex])
    : undefined;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (words.size === 0) {
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
          <Link
            href={`/notebooks/${id}`}
            className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
          >
            単語帳に戻る
          </Link>
        }
      />

      <main className="flex-1 flex flex-col items-center px-4 py-8">
        {/* Mode Switcher */}
        <div className="flex gap-1 p-1 bg-zinc-200 dark:bg-zinc-800 rounded-lg mb-8">
          <button
            onClick={() => handleModeSwitch("flashcard")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              mode === "flashcard"
                ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
                : "text-zinc-600 dark:text-zinc-400"
            }`}
          >
            フラッシュカード
          </button>
          <button
            onClick={() => handleModeSwitch("quiz")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              mode === "quiz"
                ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
                : "text-zinc-600 dark:text-zinc-400"
            }`}
          >
            4択クイズ
          </button>
        </div>

        {isComplete ? (
          <div className="text-center">
            <div className="text-5xl mb-4">&#10024;</div>
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
              学習完了！
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400 mb-2">
              {sessionStats.reviewed}問回答しました
            </p>
            <p className="text-zinc-600 dark:text-zinc-400 mb-6">
              正答率:{" "}
              {sessionStats.reviewed > 0
                ? Math.round((sessionStats.correct / sessionStats.reviewed) * 100)
                : 0}
              %
            </p>
            <div className="flex gap-3 justify-center">
              <Link
                href={`/notebooks/${id}`}
                className="px-6 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                単語帳に戻る
              </Link>
              <button
                onClick={handleRestart}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                もう一度
              </button>
            </div>
          </div>
        ) : mode === "flashcard" ? (
          <>
            <div className="w-full max-w-lg mb-8">
              <div className="flex justify-between text-sm text-zinc-500 mb-2">
                <span>{sessionStats.reviewed} / {queue.length} カード</span>
                <span>
                  正答率:{" "}
                  {sessionStats.reviewed > 0
                    ? Math.round((sessionStats.correct / sessionStats.reviewed) * 100)
                    : 0}%
                </span>
              </div>
              <div className="w-full h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-300 rounded-full"
                  style={{
                    width: `${queue.length > 0 ? (sessionStats.reviewed / queue.length) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
            {currentWord ? (
              <FlashCard word={currentWord} onScore={handleScore} />
            ) : (
              <p className="text-zinc-500">学習する単語がありません</p>
            )}
          </>
        ) : quizLoading ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-zinc-500">AIがクイズを生成中...</p>
          </div>
        ) : quizError ? (
          <div className="text-center">
            <p className="text-red-500 mb-4">{quizError}</p>
            <button
              onClick={generateQuiz}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              再試行
            </button>
          </div>
        ) : quizQuestions.length > 0 ? (
          <QuizMode
            questions={quizQuestions}
            onAnswer={handleQuizAnswer}
            onComplete={handleQuizComplete}
          />
        ) : null}
      </main>
    </div>
  );
}
