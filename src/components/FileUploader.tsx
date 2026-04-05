"use client";

import { useState, useCallback, useRef } from "react";

type ExtractedData = {
  title: string;
  words: Array<{
    term: string;
    meaning: string;
    partOfSpeech: string;
    exampleSentence: string;
    context: string;
  }>;
};

type Props = {
  onAnalysisComplete: (data: ExtractedData) => void;
};

type FileProgress = {
  name: string;
  status: "pending" | "analyzing" | "done" | "error";
  error?: string;
  wordCount?: number;
};

export default function FileUploader({ onAnalysisComplete }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileProgress, setFileProgress] = useState<FileProgress[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  const analyzeFile = async (file: File, signal: AbortSignal): Promise<ExtractedData> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/analyze", { method: "POST", body: formData, signal });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "解析に失敗しました");
    return data;
  };

  const handleFiles = useCallback(
    async (files: File[]) => {
      if (isAnalyzing || files.length === 0) return;

      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setError(null);
      setIsAnalyzing(true);

      const progress: FileProgress[] = files.map((f) => ({
        name: f.name,
        status: "pending",
      }));
      setFileProgress([...progress]);

      const allWords: ExtractedData["words"] = [];
      let title = "";

      for (let i = 0; i < files.length; i++) {
        if (controller.signal.aborted) break;

        progress[i] = { ...progress[i], status: "analyzing" };
        setFileProgress([...progress]);

        try {
          const data = await analyzeFile(files[i], controller.signal);
          if (!title && data.title) title = data.title;
          if (files.length > 1 && i === 0) title = `${data.title} 他`;
          allWords.push(...data.words);
          progress[i] = { ...progress[i], status: "done", wordCount: data.words.length };
        } catch (err) {
          if (err instanceof DOMException && err.name === "AbortError") break;
          progress[i] = {
            ...progress[i],
            status: "error",
            error: err instanceof Error ? err.message : "エラー",
          };
        }
        setFileProgress([...progress]);
      }

      setIsAnalyzing(false);

      if (allWords.length > 0) {
        onAnalysisComplete({ title: title || "単語帳", words: allWords });
      } else if (!controller.signal.aborted) {
        setError("単語を抽出できませんでした");
      }
    },
    [onAnalysisComplete, isAnalyzing]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (isAnalyzing) return;
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) handleFiles(files);
    },
    [handleFiles, isAnalyzing]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length > 0) handleFiles(files);
      e.target.value = "";
    },
    [handleFiles]
  );

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
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
          multiple
          onChange={handleChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isAnalyzing}
        />

        {isAnalyzing ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {fileProgress.filter((f) => f.status === "done").length} / {fileProgress.length} ファイルを解析中...
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 pointer-events-none">
            <svg className="w-10 h-10 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 16V4m0 0L8 8m4-4l4 4M4 14v4a2 2 0 002 2h12a2 2 0 002-2v-4" />
            </svg>
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              ファイルをドラッグ&ドロップ（複数可）
            </p>
            <p className="text-xs text-zinc-500">または クリックしてファイルを選択</p>
            <p className="text-xs text-zinc-400 mt-1">画像 / 動画 / PDF / 音声 — 各20MB以下</p>
          </div>
        )}

        {error && (
          <p role="alert" className="absolute bottom-3 text-sm text-red-500">{error}</p>
        )}
      </div>

      {/* File progress list */}
      {fileProgress.length > 1 && (
        <div className="mt-3 space-y-1">
          {fileProgress.map((fp, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              {fp.status === "analyzing" && (
                <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              )}
              {fp.status === "done" && (
                <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
              {fp.status === "error" && (
                <svg className="w-3 h-3 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              )}
              {fp.status === "pending" && <div className="w-3 h-3 rounded-full bg-zinc-300 dark:bg-zinc-600" />}
              <span className={`truncate ${fp.status === "error" ? "text-red-500" : "text-zinc-600 dark:text-zinc-400"}`}>
                {fp.name}
              </span>
              {fp.wordCount !== undefined && (
                <span className="text-xs text-zinc-400">{fp.wordCount}語</span>
              )}
              {fp.error && (
                <span className="text-xs text-red-400">{fp.error}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
