"use client";

import type { Word } from "@/lib/types";

type Props = {
  word: Word;
  onDelete?: (id: string) => void;
};

export default function WordCard({ word, onDelete }: Props) {
  return (
    <div className="group relative rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 hover:shadow-md transition-shadow bg-white dark:bg-zinc-900">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {word.term}
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
              {word.partOfSpeech}
            </span>
          </div>
          <p className="text-zinc-700 dark:text-zinc-300 mb-2">{word.meaning}</p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 italic">
            {word.exampleSentence}
          </p>
          {word.context && (
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-2">
              {word.context}
            </p>
          )}
        </div>
        {onDelete && (
          <button
            onClick={() => onDelete(word.id)}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 hover:text-red-500 p-1"
            aria-label="削除"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
