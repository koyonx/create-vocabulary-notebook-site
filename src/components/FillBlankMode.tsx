"use client";

import { useState } from "react";
import type { FillBlankQuestion } from "@/lib/quiz.types";

type Props = {
  questions: FillBlankQuestion[];
  onAnswer: (questionIndex: number, isCorrect: boolean) => void;
  onComplete: () => void;
};

export default function FillBlankMode({ questions, onAnswer, onComplete }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInput, setUserInput] = useState("");
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [results, setResults] = useState<boolean[]>([]);

  const question = questions[currentIndex];
  if (!question || currentIndex >= questions.length) return null;

  const correctCount = results.filter(Boolean).length;

  const normalize = (s: string) => s.toLowerCase().trim().replace(/\s+/g, " ");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isAnswered || !userInput.trim()) return;

    const correct = normalize(userInput) === normalize(question.answer);
    setIsCorrect(correct);
    setIsAnswered(true);
    setResults((prev) => [...prev, correct]);
    onAnswer(currentIndex, correct);
  };

  const handleNext = () => {
    if (currentIndex + 1 >= questions.length) {
      onComplete();
    } else {
      setCurrentIndex((prev) => prev + 1);
      setUserInput("");
      setIsAnswered(false);
      setIsCorrect(false);
    }
  };

  // 文中の空欄をハイライト表示
  const renderSentence = () => {
    const parts = question.sentence.split(question.blank || "______");
    if (parts.length < 2) {
      return <span>{question.sentence}</span>;
    }
    return (
      <>
        {parts[0]}
        <span className={`inline-block min-w-[80px] border-b-2 px-1 mx-1 font-bold ${
          isAnswered
            ? isCorrect
              ? "border-green-500 text-green-600 dark:text-green-400"
              : "border-red-500 text-red-600 dark:text-red-400"
            : "border-blue-500 text-blue-600 dark:text-blue-400"
        }`}>
          {isAnswered ? question.answer : userInput || "\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0"}
        </span>
        {parts.slice(1).join(question.blank || "______")}
      </>
    );
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Progress */}
      <div className="flex justify-between text-sm text-zinc-500 mb-2">
        <span>問題 {currentIndex + 1} / {questions.length}</span>
        <span>正解 {correctCount} / {results.length}</span>
      </div>
      <div className="w-full h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden mb-6">
        <div
          className="h-full bg-blue-500 transition-all duration-300 rounded-full"
          style={{ width: `${(currentIndex / questions.length) * 100}%` }}
        />
      </div>

      {/* Question */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-6 mb-6">
        <p className="text-sm text-zinc-500 mb-3">空欄に当てはまる単語・熟語を入力してください</p>
        <p className="text-lg text-zinc-900 dark:text-zinc-100 leading-relaxed">
          {renderSentence()}
        </p>
        {question.hint && (
          <p className="text-sm text-zinc-400 mt-3">
            ヒント: {question.hint}
          </p>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="mb-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            disabled={isAnswered}
            autoFocus
            placeholder="答えを入力..."
            className="flex-1 px-4 py-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
          {!isAnswered && (
            <button
              type="submit"
              disabled={!userInput.trim()}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
            >
              回答
            </button>
          )}
        </div>
      </form>

      {/* Result */}
      {isAnswered && (
        <div className={`rounded-xl p-4 mb-4 ${
          isCorrect
            ? "bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800"
            : "bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800"
        }`}>
          {isCorrect ? (
            <p className="text-green-700 dark:text-green-300 font-medium">正解！</p>
          ) : (
            <div>
              <p className="text-red-700 dark:text-red-300 font-medium mb-1">不正解</p>
              <p className="text-sm text-red-600 dark:text-red-400">
                あなたの回答: <span className="line-through">{userInput}</span>
              </p>
              <p className="text-sm text-zinc-700 dark:text-zinc-300 mt-1">
                正解: <span className="font-bold">{question.answer}</span>
              </p>
            </div>
          )}
        </div>
      )}

      {/* Next */}
      {isAnswered && (
        <div className="flex justify-center">
          <button
            onClick={handleNext}
            className="px-8 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            {currentIndex + 1 >= questions.length ? "結果を見る" : "次の問題"}
          </button>
        </div>
      )}
    </div>
  );
}
