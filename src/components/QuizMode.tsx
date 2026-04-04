"use client";

import { useState } from "react";
import type { QuizQuestion } from "@/lib/quiz.types";
import SpeakButton from "@/components/SpeakButton";

type Props = {
  questions: QuizQuestion[];
  onAnswer: (questionIndex: number, isCorrect: boolean) => void;
  onComplete: () => void;
  direction?: "term-to-meaning" | "meaning-to-term";
};

export default function QuizMode({ questions, onAnswer, onComplete, direction }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [results, setResults] = useState<boolean[]>([]);

  const question = questions[currentIndex];
  const isComplete = currentIndex >= questions.length;

  const handleSelect = (choiceIndex: number) => {
    if (isAnswered) return;

    setSelectedIndex(choiceIndex);
    setIsAnswered(true);

    const isCorrect = choiceIndex === question.correctIndex;
    setResults((prev) => [...prev, isCorrect]);
    onAnswer(currentIndex, isCorrect);
  };

  const handleNext = () => {
    if (currentIndex + 1 >= questions.length) {
      onComplete();
    } else {
      setCurrentIndex((prev) => prev + 1);
      setSelectedIndex(null);
      setIsAnswered(false);
    }
  };

  if (isComplete) return null;

  const correctCount = results.filter(Boolean).length;

  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Progress */}
      <div className="flex justify-between text-sm text-zinc-500 mb-2">
        <span>
          問題 {currentIndex + 1} / {questions.length}
        </span>
        <span>
          正解 {correctCount} / {results.length}
        </span>
      </div>
      <div className="w-full h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden mb-6">
        <div
          className="h-full bg-blue-500 transition-all duration-300 rounded-full"
          style={{
            width: `${((currentIndex) / questions.length) * 100}%`,
          }}
        />
      </div>

      {/* Question */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-6 mb-6">
        <p className="text-sm text-zinc-500 mb-2">
          {(direction || question.direction) === "meaning-to-term" ? "この意味の単語は？" : "この単語の意味は？"}
        </p>
        <div className="flex items-center justify-center gap-2">
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {question.questionWord}
          </p>
          {(direction || question.direction) !== "meaning-to-term" && (
            <SpeakButton text={question.questionWord} />
          )}
        </div>
      </div>

      {/* Choices */}
      <div className="grid gap-3">
        {question.choices.map((choice, idx) => {
          let style = "border-zinc-200 dark:border-zinc-700 hover:border-blue-400 dark:hover:border-blue-500";

          if (isAnswered) {
            if (idx === question.correctIndex) {
              style = "border-green-500 bg-green-50 dark:bg-green-950/30";
            } else if (idx === selectedIndex && idx !== question.correctIndex) {
              style = "border-red-500 bg-red-50 dark:bg-red-950/30";
            } else {
              style = "border-zinc-200 dark:border-zinc-700 opacity-50";
            }
          } else if (idx === selectedIndex) {
            style = "border-blue-500 bg-blue-50 dark:bg-blue-950/30";
          }

          return (
            <button
              key={idx}
              onClick={() => handleSelect(idx)}
              disabled={isAnswered}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all ${style} ${
                !isAnswered ? "cursor-pointer" : "cursor-default"
              }`}
            >
              <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mr-2">
                {String.fromCharCode(65 + idx)}.
              </span>
              <span className="text-zinc-900 dark:text-zinc-100">{choice}</span>
            </button>
          );
        })}
      </div>

      {/* Next Button */}
      {isAnswered && (
        <div className="mt-6 flex justify-center">
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
