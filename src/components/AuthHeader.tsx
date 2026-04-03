"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

type Props = {
  rightContent?: React.ReactNode;
};

export default function AuthHeader({ rightContent }: Props) {
  const { user, loading, signOut, isSupabaseEnabled } = useAuth();

  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
      <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
          VocabAI
        </Link>
        <div className="flex items-center gap-3">
          {rightContent}
          {isSupabaseEnabled && !loading && user && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-zinc-500 hidden sm:inline">
                {user.email}
              </span>
              <button
                onClick={() => signOut()}
                className="text-xs px-3 py-1.5 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                ログアウト
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
