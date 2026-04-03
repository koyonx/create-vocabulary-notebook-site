"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";

export default function AuthGuard({ children }: { children: ReactNode }) {
  const { user, loading, isSupabaseEnabled } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && isSupabaseEnabled && !user && pathname !== "/auth") {
      router.replace("/auth");
    }
  }, [user, loading, isSupabaseEnabled, router, pathname]);

  // Supabase未設定 or まだマウント前（isSupabaseEnabled=false）→ そのまま表示
  if (!isSupabaseEnabled) return <>{children}</>;

  // ログインページはそのまま表示
  if (pathname === "/auth") return <>{children}</>;

  // ローディング中 or 未ログイン → スピナー表示（リダイレクト中も含む）
  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
