"use client";

import { useState, useCallback, useRef } from "react";

type Props = {
  onAnalysisComplete: (data: { title: string; words: Array<{
    term: string;
    meaning: string;
    partOfSpeech: string;
    exampleSentence: string;
    context: string;
  }> }) => void;
};

export default function FileUploader({ onAnalysisComplete }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      if (isAnalyzing) return;

      // 前のリクエストをキャンセル
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setError(null);
      setFileName(file.name);
      setIsAnalyzing(true);

      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/analyze", {
          method: "POST",
          body: formData,
          signal: controller.signal,
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "解析に失敗しました");
        }

        onAnalysisComplete(data);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "エラーが発生しました");
      } finally {
        setIsAnalyzing(false);
      }
    },
    [onAnalysisComplete, isAnalyzing]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (isAnalyzing) return;
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile, isAnalyzing]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={`relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-2xl transition-colors cursor-pointer ${
        isDragging
          ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
          : "border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600"
      }`}
    >
      <input
        type="file"
        accept="image/*,video/mp4,video/webm,audio/mpeg,audio/mp3,audio/wav,audio/ogg,application/pdf"
        onChange={handleChange}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        disabled={isAnalyzing}
      />

      {isAnalyzing ? (
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            「{fileName}」を解析中...
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 pointer-events-none">
          <svg
            className="w-10 h-10 text-zinc-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 16V4m0 0L8 8m4-4l4 4M4 14v4a2 2 0 002 2h12a2 2 0 002-2v-4"
            />
          </svg>
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            画像・動画をドラッグ&ドロップ
          </p>
          <p className="text-xs text-zinc-500">
            または クリックしてファイルを選択
          </p>
          <p className="text-xs text-zinc-400 mt-1">
            画像 / 動画 / PDF / 音声（MP3, WAV）— 20MB以下
          </p>
        </div>
      )}

      {error && (
        <p role="alert" className="absolute bottom-3 text-sm text-red-500">{error}</p>
      )}
    </div>
  );
}
