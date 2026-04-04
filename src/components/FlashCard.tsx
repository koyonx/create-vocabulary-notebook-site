"use client";

import { useState, useEffect, useCallback } from "react";
import type { Word } from "@/lib/types";
import type { ReviewScore } from "@/lib/types";
import SpeakButton from "@/components/SpeakButton";

type Props = {
  word: Word;
  onScore: (score: ReviewScore) => void;
};

const scoreButtons: { score: ReviewScore; label: string; shortcut: string; color: string }[] = [
  { score: 1, label: "忘れた", shortcut: "1", color: "bg-red-500 hover:bg-red-600" },
  { score: 2, label: "あと少し", shortcut: "2", color: "bg-orange-500 hover:bg-orange-600" },
  { score: 3, label: "ギリギリ", shortcut: "3", color: "bg-yellow-500 hover:bg-yellow-600" },
  { score: 4, label: "正解", shortcut: "4", color: "bg-green-500 hover:bg-green-600" },
  { score: 5, label: "余裕", shortcut: "5", color: "bg-blue-500 hover:bg-blue-600" },
];

export default function FlashCard({ word, onScore }: Props) {
  const [isFlipped, setIsFlipped] = useState(false);

  // #13 fix: word変更時にisFlippedをリセット
  useEffect(() => {
    setIsFlipped(false);
  }, [word.id]);

  const handleScore = useCallback(
    (score: ReviewScore) => {
      onScore(score);
    },
    [onScore]
  );

  // キーボードショートカット
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      }
      if (isFlipped && e.key >= "1" && e.key <= "5") {
        handleScore(Number(e.key) as ReviewScore);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isFlipped, handleScore]);

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-lg mx-auto">
      <button
        onClick={() => setIsFlipped(!isFlipped)}
        className="w-full min-h-[240px] rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-lg p-8 flex flex-col items-center justify-center cursor-pointer transition-all hover:shadow-xl active:scale-[0.98]"
        aria-label={isFlipped ? "カードを裏返す" : "意味を表示"}
      >
        {!isFlipped ? (
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                {word.term}
              </p>
              <SpeakButton text={word.term} className="text-zinc-400 hover:text-blue-500" />
            </div>
            <p className="text-sm text-zinc-400">タップまたはSpaceで意味を表示</p>
          </div>
        ) : (
          <div className="text-center" aria-live="polite">
            <div className="flex items-center justify-center gap-2 mb-1">
              <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                {word.term}
              </p>
              <SpeakButton text={word.term} className="text-zinc-400 hover:text-blue-500" />
            </div>
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

      {isFlipped && (
        <div className="flex gap-2 flex-wrap justify-center" role="group" aria-label="回答の評価">
          {scoreButtons.map(({ score, label, shortcut, color }) => (
            <button
              key={score}
              onClick={() => handleScore(score)}
              className={`px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors ${color}`}
              title={`${label} (${shortcut})`}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
