"use client";

import { useState } from "react";
import type { Word } from "@/lib/types";

type Props = {
  word?: Word;
  onSave: (word: Omit<Word, "id"> & { id?: string }) => void;
  onCancel: () => void;
};

export default function WordEditor({ word, onSave, onCancel }: Props) {
  const [term, setTerm] = useState(word?.term || "");
  const [meaning, setMeaning] = useState(word?.meaning || "");
  const [partOfSpeech, setPartOfSpeech] = useState(word?.partOfSpeech || "");
  const [exampleSentence, setExampleSentence] = useState(word?.exampleSentence || "");
  const [context, setContext] = useState(word?.context || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!term.trim() || !meaning.trim()) return;
    onSave({
      id: word?.id,
      term: term.trim(),
      meaning: meaning.trim(),
      partOfSpeech: partOfSpeech.trim(),
      exampleSentence: exampleSentence.trim(),
      context: context.trim(),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 p-4 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
            単語 <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            required
            className="w-full px-3 py-1.5 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="ephemeral"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
            意味 <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={meaning}
            onChange={(e) => setMeaning(e.target.value)}
            required
            className="w-full px-3 py-1.5 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="はかない、つかの間の"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">品詞</label>
        <input
          type="text"
          value={partOfSpeech}
          onChange={(e) => setPartOfSpeech(e.target.value)}
          className="w-full px-3 py-1.5 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="adjective"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">例文</label>
        <input
          type="text"
          value={exampleSentence}
          onChange={(e) => setExampleSentence(e.target.value)}
          className="w-full px-3 py-1.5 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="The ephemeral beauty of cherry blossoms..."
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">コンテキスト</label>
        <input
          type="text"
          value={context}
          onChange={(e) => setContext(e.target.value)}
          className="w-full px-3 py-1.5 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="第2章 3ページ目"
        />
      </div>
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-1.5 text-sm border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          キャンセル
        </button>
        <button
          type="submit"
          className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          {word ? "更新" : "追加"}
        </button>
      </div>
    </form>
  );
}
