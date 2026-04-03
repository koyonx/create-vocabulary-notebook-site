"use client";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 dark:bg-zinc-950 px-4">
      <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
        エラーが発生しました
      </h2>
      <p className="text-zinc-500 mb-6 text-center max-w-md">
        {error.message || "予期しないエラーが発生しました。もう一度お試しください。"}
      </p>
      <button
        onClick={reset}
        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        再試行
      </button>
    </div>
  );
}
