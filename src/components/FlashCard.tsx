"use client";

import { useState } from "react";
import type { Word } from "@/lib/types";
import type { ReviewScore } from "@/lib/types";

type Props = {
  word: Word;
  onScore: (score: ReviewScore) => void;
};

const scoreButtons: { score: ReviewScore; label: string; color: string }[] = [
  { score: 1, label: "忘れた", color: "bg-red-500 hover:bg-red-600" },
  { score: 2, label: "あと少し", color: "bg-orange-500 hover:bg-orange-600" },
  { score: 3, label: "ギリギリ", color: "bg-yellow-500 hover:bg-yellow-600" },
  { score: 4, label: "正解", color: "bg-green-500 hover:bg-green-600" },
  { score: 5, label: "余裕", color: "bg-blue-500 hover:bg-blue-600" },
];

export default function FlashCard({ word, onScore }: Props) {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-lg mx-auto">
      {/* Card */}
      <button
        onClick={() => setIsFlipped(!isFlipped)}
        className="w-full min-h-[240px] rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-lg p-8 flex flex-col items-center justify-center cursor-pointer transition-all hover:shadow-xl active:scale-[0.98]"
      >
        {!isFlipped ? (
          <div className="text-center">
            <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
              {word.term}
            </p>
            <p className="text-sm text-zinc-400">タップして意味を表示</p>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-1">
              {word.term}
            </p>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 mb-3 inline-block">
              {word.partOfSpeech}
            </span>
            <p className="text-lg text-zinc-700 dark:text-zinc-300 mb-3">
              {word.meaning}
            </p>
            <p className="text-sm text-zinc-500 italic">
              {word.exampleSentence}
            </p>
          </div>
        )}
      </button>

      {/* Score Buttons */}
      {isFlipped && (
        <div className="flex gap-2 flex-wrap justify-center">
          {scoreButtons.map(({ score, label, color }) => (
            <button
              key={score}
              onClick={() => {
                setIsFlipped(false);
                onScore(score);
              }}
              className={`px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors ${color}`}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
