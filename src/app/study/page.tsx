"use client";

import { useEffect, useState, useCallback, useReducer, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import FlashCard from "@/components/FlashCard";
import QuizMode from "@/components/QuizMode";
import FillBlankMode from "@/components/FillBlankMode";
import AuthHeader from "@/components/AuthHeader";
import {
  getCrossNotebookWords,
  getNotebooks,
  getLearningData,
  getBatchLearningData,
  saveLearningData,
  saveReviewLog,
} from "@/lib/storage";
import { updateSM2 } from "@/lib/sm2";
import type { Notebook, Word, ReviewScore } from "@/lib/types";
import type { QuizQuestion, FillBlankQuestion } from "@/lib/quiz.types";

type StudyMode = "flashcard" | "quiz" | "fill-blank" | "reverse";

const MAX_REQUEUE = 3;

type FlashcardState = {
  queue: string[];
  currentIndex: number;
  requeueCount: Map<string, number>;
};

type FlashcardAction =
  | { type: "init"; queue: string[] }
  | { type: "next" }
  | { type: "requeue"; wordId: string };

function flashcardReducer(state: FlashcardState, action: FlashcardAction): FlashcardState {
  switch (action.type) {
    case "init":
      return { queue: action.queue, currentIndex: 0, requeueCount: new Map() };
    case "next":
      return { ...state, currentIndex: state.currentIndex + 1 };
    case "requeue": {
      const count = state.requeueCount.get(action.wordId) || 0;
      if (count >= MAX_REQUEUE) {
        return { ...state, currentIndex: state.currentIndex + 1 };
      }
      const newCount = new Map(state.requeueCount);
      newCount.set(action.wordId, count + 1);
      return {
        queue: [...state.queue, action.wordId],
        currentIndex: state.currentIndex + 1,
        requeueCount: newCount,
      };
    }
  }
}

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function CrossStudyContent() {
  const searchParams = useSearchParams();
  const ids = searchParams.get("ids")?.split(",").filter(Boolean) || [];

  const [mode, setMode] = useState<StudyMode>("flashcard");
  const [fcState, dispatch] = useReducer(flashcardReducer, {
    queue: [],
    currentIndex: 0,
    requeueCount: new Map(),
  });
  const [words, setWords] = useState<Map<string, Word>>(new Map());
  const [allWords, setAllWords] = useState<Word[]>([]);
  const [wordNotebookMap, setWordNotebookMap] = useState<Map<string, string>>(new Map());
  const [sessionStats, setSessionStats] = useState({ reviewed: 0, correct: 0 });
  const [isComplete, setIsComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Quiz state
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [fillBlankQuestions, setFillBlankQuestions] = useState<FillBlankQuestion[]>([]);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizError, setQuizError] = useState<string | null>(null);

  const fcStateRef = useRef(fcState);
  fcStateRef.current = fcState;

  useEffect(() => {
    if (ids.length === 0) {
      setLoading(false);
      return;
    }

    (async () => {
      try {
        // Load notebooks info and words
        const [allNotebooks, crossWords] = await Promise.all([
          getNotebooks(),
          getCrossNotebookWords(ids),
        ]);

        // Build word-to-notebook mapping
        const nbMap = new Map<string, string>();
        for (const nb of allNotebooks) {
          if (ids.includes(nb.id)) {
            for (const w of nb.words) {
              nbMap.set(w.id, nb.title);
            }
          }
        }
        setWordNotebookMap(nbMap);

        const wordMap = new Map<string, Word>();
        crossWords.forEach((w) => wordMap.set(w.id, w));
        setWords(wordMap);
        setAllWords(crossWords);

        // Shuffle and init queue
        const shuffled = shuffleArray(crossWords.map((w) => w.id));
        dispatch({ type: "init", queue: shuffled });
      } catch (err) {
        setError(err instanceof Error ? err.message : "データの読み込みに失敗しました");
      } finally {
        setLoading(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generateQuiz = useCallback(async (quizMode: "quiz" | "fill-blank") => {
    if (allWords.length < 4) {
      setQuizError("クイズ生成には最低4つの単語・熟語が必要です");
      return;
    }

    setQuizLoading(true);
    setQuizError(null);

    try {
      const wordIds = allWords.map((w) => w.id);
      const allLd = await getBatchLearningData(wordIds);

      const wordsWithWeakness = allWords.map((w, i) => ({
        id: w.id,
        term: w.term,
        meaning: w.meaning,
        exampleSentence: w.exampleSentence,
        isWeak: allLd[i].easeFactor < 2.0 || allLd[i].lapses > 0,
      }));

      const apiMode = quizMode === "fill-blank" ? "fill-blank" : "multiple-choice";

      const res = await fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          words: wordsWithWeakness,
          mode: apiMode,
          count: Math.min(allWords.length, 20),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (quizMode === "fill-blank") {
        setFillBlankQuestions(data.questions);
        setQuizQuestions([]);
      } else {
        setQuizQuestions(data.questions);
        setFillBlankQuestions([]);
      }
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

      if (newMode === "quiz" || newMode === "fill-blank") {
        await generateQuiz(newMode);
      } else {
        const shuffled = shuffleArray(allWords.map((w) => w.id));
        dispatch({ type: "init", queue: shuffled });
      }
    },
    [allWords, generateQuiz]
  );

  const handleScore = useCallback(
    async (score: ReviewScore) => {
      const state = fcStateRef.current;
      const wordId = state.queue[state.currentIndex];
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
        dispatch({ type: "requeue", wordId });
      } else {
        const isLast = state.currentIndex + 1 >= state.queue.length;
        if (isLast) {
          setIsComplete(true);
        } else {
          dispatch({ type: "next" });
        }
      }
    },
    []
  );

  const handleQuizAnswer = useCallback(
    async (questionIndex: number, isCorrect: boolean) => {
      const mcQ = quizQuestions[questionIndex];
      const fbQ = fillBlankQuestions[questionIndex];
      const wordId = mcQ?.wordId || fbQ?.wordId;

      const word = wordId
        ? words.get(wordId)
        : mcQ
        ? allWords.find((w) => w.term === mcQ.questionWord)
        : null;

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
    [quizQuestions, fillBlankQuestions, allWords, words]
  );

  const handleQuizComplete = useCallback(() => {
    setIsComplete(true);
  }, []);

  const handleRestart = useCallback(async () => {
    setIsComplete(false);
    setSessionStats({ reviewed: 0, correct: 0 });

    if (mode === "quiz" || mode === "fill-blank") {
      await generateQuiz(mode);
    } else {
      const shuffled = shuffleArray(allWords.map((w) => w.id));
      dispatch({ type: "init", queue: shuffled });
    }
  }, [mode, allWords, generateQuiz]);

  const currentWord = fcState.queue[fcState.currentIndex]
    ? words.get(fcState.queue[fcState.currentIndex])
    : undefined;

  const currentWordNotebook = currentWord ? wordNotebookMap.get(currentWord.id) : undefined;

  // Bug 6 fix: MAX_REQUEUEに達した最後のカードで完了を検出
  useEffect(() => {
    if (
      (mode === "flashcard" || mode === "reverse") &&
      !isComplete &&
      fcState.queue.length > 0 &&
      fcState.currentIndex >= fcState.queue.length
    ) {
      setIsComplete(true);
    }
  }, [fcState.currentIndex, fcState.queue.length, mode, isComplete]);

  const canQuiz = allWords.length >= 4;

  // For reverse mode, swap term and meaning
  const reverseWord = currentWord
    ? { ...currentWord, term: currentWord.meaning, meaning: currentWord.term }
    : undefined;

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
        <Link
          href="/notebooks"
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          単語帳一覧に戻る
        </Link>
      </div>
    );
  }

  if (ids.length === 0 || allWords.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-zinc-500">学習する単語がありません</p>
        <Link
          href="/notebooks"
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          単語帳一覧に戻る
        </Link>
      </div>
    );
  }

  const modeTabClass = (m: StudyMode, disabled = false) =>
    `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      mode === m
        ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
        : disabled
        ? "text-zinc-400 dark:text-zinc-600 cursor-not-allowed"
        : "text-zinc-600 dark:text-zinc-400"
    }`;

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <AuthHeader
        rightContent={
          <Link
            href="/notebooks"
            className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
          >
            単語帳一覧に戻る
          </Link>
        }
      />

      <main className="flex-1 flex flex-col items-center px-4 py-8">
        <div className="mb-4 text-center">
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
            まとめて学習
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            {ids.length}冊の単語帳から{allWords.length}語
          </p>
        </div>

        {/* Mode Switcher */}
        <div className="flex gap-1 p-1 bg-zinc-200 dark:bg-zinc-800 rounded-lg mb-8 flex-wrap justify-center" role="tablist">
          <button role="tab" aria-selected={mode === "flashcard"} onClick={() => handleModeSwitch("flashcard")} className={modeTabClass("flashcard")}>
            フラッシュカード
          </button>
          <button role="tab" aria-selected={mode === "reverse"} onClick={() => handleModeSwitch("reverse")} className={modeTabClass("reverse")}>
            逆引き
          </button>
          <button
            role="tab"
            aria-selected={mode === "quiz"}
            onClick={() => canQuiz && handleModeSwitch("quiz")}
            disabled={!canQuiz}
            title={!canQuiz ? "4語以上必要です" : undefined}
            className={modeTabClass("quiz", !canQuiz)}
          >
            4択クイズ
          </button>
          <button
            role="tab"
            aria-selected={mode === "fill-blank"}
            onClick={() => canQuiz && handleModeSwitch("fill-blank")}
            disabled={!canQuiz}
            title={!canQuiz ? "4語以上必要です" : undefined}
            className={modeTabClass("fill-blank", !canQuiz)}
          >
            穴埋め
          </button>
        </div>

        {isComplete ? (
          <div className="text-center">
            <div className="text-5xl mb-4">&#10024;</div>
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">学習完了！</h2>
            <p className="text-zinc-600 dark:text-zinc-400 mb-2">{sessionStats.reviewed}問回答しました</p>
            <p className="text-zinc-600 dark:text-zinc-400 mb-6">
              正答率: {sessionStats.reviewed > 0 ? Math.round((sessionStats.correct / sessionStats.reviewed) * 100) : 0}%
            </p>
            <div className="flex gap-3 justify-center">
              <Link
                href="/notebooks"
                className="px-6 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                単語帳一覧に戻る
              </Link>
              <button onClick={handleRestart} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                もう一度
              </button>
            </div>
          </div>
        ) : (mode === "flashcard" || mode === "reverse") ? (
          <>
            <div className="w-full max-w-lg mb-8">
              <div className="flex justify-between text-sm text-zinc-500 mb-2">
                <span>{Math.min(fcState.currentIndex, fcState.queue.length)} / {fcState.queue.length} カード</span>
                <span>
                  正答率: {sessionStats.reviewed > 0 ? Math.round((sessionStats.correct / sessionStats.reviewed) * 100) : 0}%
                </span>
              </div>
              <div className="w-full h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-300 rounded-full"
                  style={{ width: `${fcState.queue.length > 0 ? (Math.min(fcState.currentIndex, fcState.queue.length) / fcState.queue.length) * 100 : 0}%` }}
                />
              </div>
            </div>
            {(mode === "reverse" ? reverseWord : currentWord) ? (
              <>
                {currentWordNotebook && (
                  <div className="mb-2 text-xs text-zinc-400 dark:text-zinc-500 px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-full">
                    {currentWordNotebook}
                  </div>
                )}
                <FlashCard
                  key={`${currentWord!.id}-${mode}`}
                  word={mode === "reverse" ? reverseWord! : currentWord!}
                  onScore={handleScore}
                />
              </>
            ) : (
              <p className="text-zinc-500">学習する単語がありません</p>
            )}
          </>
        ) : quizLoading ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-zinc-500">AIが{mode === "fill-blank" ? "穴埋め問題" : "クイズ"}を生成中...</p>
          </div>
        ) : quizError ? (
          <div className="text-center">
            <p role="alert" className="text-red-500 mb-4">{quizError}</p>
            <button
              onClick={() => generateQuiz(mode as "quiz" | "fill-blank")}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              再試行
            </button>
          </div>
        ) : mode === "fill-blank" && fillBlankQuestions.length > 0 ? (
          <FillBlankMode
            questions={fillBlankQuestions}
            onAnswer={handleQuizAnswer}
            onComplete={handleQuizComplete}
          />
        ) : mode === "quiz" && quizQuestions.length > 0 ? (
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

export default function CrossStudyPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <CrossStudyContent />
    </Suspense>
  );
}
