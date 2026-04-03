import type { Word } from "@/lib/types";

type Props = {
  word: Word;
  onDelete?: (id: string) => void;
  onEdit?: (word: Word) => void;
  onImprove?: (word: Word) => void;
  isImproving?: boolean;
};

export default function WordCard({ word, onDelete, onEdit, onImprove, isImproving }: Props) {
  return (
    <div className="group relative rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 hover:shadow-md transition-shadow bg-white dark:bg-zinc-900">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {word.term}
            </h3>
            {word.partOfSpeech && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                {word.partOfSpeech}
              </span>
            )}
          </div>
          <p className="text-zinc-700 dark:text-zinc-300 mb-2">{word.meaning}</p>
          {word.exampleSentence && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400 italic">
              {word.exampleSentence}
            </p>
          )}
          {word.context && (
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-2">
              {word.context}
            </p>
          )}
        </div>
        <div className="flex gap-1 sm:opacity-0 sm:group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
          {onImprove && (
            <button
              onClick={() => onImprove(word)}
              disabled={isImproving}
              className="text-zinc-400 hover:text-purple-500 p-1 disabled:opacity-50"
              aria-label={`${word.term}をAIで改善`}
              title="AIで改善"
            >
              {isImproving ? (
                <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              )}
            </button>
          )}
          {onEdit && (
            <button
              onClick={() => onEdit(word)}
              className="text-zinc-400 hover:text-blue-500 p-1"
              aria-label={`${word.term}を編集`}
              title="編集"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(word.id)}
              className="text-zinc-400 hover:text-red-500 p-1"
              aria-label={`${word.term}を削除`}
              title="削除"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
