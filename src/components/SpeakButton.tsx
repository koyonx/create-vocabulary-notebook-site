"use client";

import { speakWord } from "@/lib/speech";

type Props = {
  text: string;
  lang?: string;
  className?: string;
};

export default function SpeakButton({ text, lang = "en-US", className = "" }: Props) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        speakWord(text, lang);
      }}
      className={`inline-flex items-center justify-center text-zinc-400 hover:text-blue-500 transition-colors p-1 ${className}`}
      aria-label={`${text}を発音`}
      title="発音を再生"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15.536 8.464a5 5 0 010 7.072M17.95 6.05a8 8 0 010 11.9M6.5 8.8L10.7 5.2a.6.6 0 011.1.4v12.8a.6.6 0 01-1.1.4L6.5 15.2H4a1 1 0 01-1-1v-4.4a1 1 0 011-1h2.5z"
        />
      </svg>
    </button>
  );
}
