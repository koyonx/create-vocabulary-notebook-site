import { getSupabase } from "./supabase";
import { createDefaultLearningData, calculatePriority } from "./sm2";
import type { Notebook, Word, WordLearningData } from "./types";

function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

async function getCurrentUserId(): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = getSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id ?? null;
}

// #1 fix: Supabase設定済み + 未ログイン → localStorageにフォールバック
async function shouldUseSupabase(): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const userId = await getCurrentUserId();
  return userId !== null;
}

// ============================
// localStorage フォールバック
// ============================

const NOTEBOOKS_KEY = "vocab-notebooks";
const LEARNING_KEY = "vocab-learning";
const REVIEW_LOGS_KEY = "vocab-review-logs";

type LocalReviewLog = {
  wordId: string;
  score: number;
  mode: string;
  reviewedAt: string;
};

function localSaveReviewLog(wordId: string, score: number, mode: string): void {
  if (typeof window === "undefined") return;
  const logs = safeJsonParse<LocalReviewLog[]>(localStorage.getItem(REVIEW_LOGS_KEY), []);
  logs.push({ wordId, score, mode, reviewedAt: new Date().toISOString() });
  safeLocalStorageSet(REVIEW_LOGS_KEY, JSON.stringify(logs));
}

function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function localGetReviewHistory(days: number): { date: string; count: number }[] {
  if (typeof window === "undefined") return [];
  const logs = safeJsonParse<LocalReviewLog[]>(localStorage.getItem(REVIEW_LOGS_KEY), []);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const counts = new Map<string, number>();
  for (const log of logs) {
    const logDate = new Date(log.reviewedAt);
    if (logDate < cutoff) continue;
    const date = toLocalDateStr(logDate);
    counts.set(date, (counts.get(date) || 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function safeJsonParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeLocalStorageSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.error("localStorage write failed:", e);
    throw new Error("ストレージの容量が不足しています。不要な単語帳を削除してください。");
  }
}

function localGetNotebooks(): Notebook[] {
  if (typeof window === "undefined") return [];
  return safeJsonParse(localStorage.getItem(NOTEBOOKS_KEY), []);
}

function localGetNotebook(id: string): Notebook | undefined {
  return localGetNotebooks().find((n) => n.id === id);
}

function localSaveNotebook(notebook: Notebook): void {
  const notebooks = localGetNotebooks();
  const idx = notebooks.findIndex((n) => n.id === notebook.id);
  if (idx >= 0) notebooks[idx] = notebook;
  else notebooks.push(notebook);
  safeLocalStorageSet(NOTEBOOKS_KEY, JSON.stringify(notebooks));
}

function localDeleteNotebook(id: string): void {
  const notebooks = localGetNotebooks().filter((n) => n.id !== id);
  safeLocalStorageSet(NOTEBOOKS_KEY, JSON.stringify(notebooks));
}

function localGetAllLearningData(): WordLearningData[] {
  if (typeof window === "undefined") return [];
  return safeJsonParse(localStorage.getItem(LEARNING_KEY), []);
}

function localGetLearningData(wordId: string): WordLearningData {
  const existing = localGetAllLearningData().find((l) => l.wordId === wordId);
  return existing || createDefaultLearningData(wordId);
}

function localGetBatchLearningData(wordIds: string[]): WordLearningData[] {
  const all = localGetAllLearningData();
  const map = new Map(all.map((l) => [l.wordId, l]));
  return wordIds.map((id) => map.get(id) || createDefaultLearningData(id));
}

function localSaveLearningData(data: WordLearningData): void {
  const all = localGetAllLearningData();
  const idx = all.findIndex((l) => l.wordId === data.wordId);
  if (idx >= 0) all[idx] = data;
  else all.push(data);
  safeLocalStorageSet(LEARNING_KEY, JSON.stringify(all));
}

// ============================
// Supabase 実装
// ============================

async function supaGetNotebooks(): Promise<Notebook[]> {
  const supabase = getSupabase();
  const userId = await getCurrentUserId();

  const { data: notebooks, error } = await supabase
    .from("notebooks")
    .select("*")
    .eq("user_id", userId!)
    .order("created_at", { ascending: false });

  if (error) throw error;
  if (!notebooks || notebooks.length === 0) return [];

  const notebookIds = notebooks.map((nb) => nb.id);
  const { data: allWords } = await supabase
    .from("words")
    .select("*")
    .in("notebook_id", notebookIds)
    .order("created_at");

  const wordsByNotebook = new Map<string, typeof allWords>();
  for (const w of allWords || []) {
    const list = wordsByNotebook.get(w.notebook_id) || [];
    list.push(w);
    wordsByNotebook.set(w.notebook_id, list);
  }

  return notebooks.map((nb) => ({
    id: nb.id,
    title: nb.title,
    createdAt: nb.created_at,
    words: (wordsByNotebook.get(nb.id) || []).map((w) => ({
      id: w.id,
      term: w.term,
      meaning: w.meaning,
      partOfSpeech: w.part_of_speech,
      exampleSentence: w.example_sentence,
      context: w.context,
    })),
  }));
}

async function supaGetNotebook(id: string): Promise<Notebook | undefined> {
  const supabase = getSupabase();
  const { data: nb, error } = await supabase
    .from("notebooks")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !nb) return undefined;

  const { data: words } = await supabase
    .from("words")
    .select("*")
    .eq("notebook_id", id)
    .order("created_at");

  return {
    id: nb.id,
    title: nb.title,
    createdAt: nb.created_at,
    words: (words || []).map((w) => ({
      id: w.id,
      term: w.term,
      meaning: w.meaning,
      partOfSpeech: w.part_of_speech,
      exampleSentence: w.example_sentence,
      context: w.context,
    })),
  };
}

async function supaSaveNotebook(notebook: Notebook): Promise<void> {
  const supabase = getSupabase();
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("保存するにはログインが必要です");

  const { error: nbError } = await supabase.from("notebooks").upsert({
    id: notebook.id,
    title: notebook.title,
    user_id: userId,
    created_at: notebook.createdAt,
  });
  if (nbError) throw nbError;

  const { data: existingWords } = await supabase
    .from("words")
    .select("id")
    .eq("notebook_id", notebook.id);

  const existingIds = new Set((existingWords || []).map((w) => w.id));
  const newIds = new Set(notebook.words.map((w) => w.id));

  const toDelete = [...existingIds].filter((id) => !newIds.has(id));
  if (toDelete.length > 0) {
    await supabase.from("words").delete().in("id", toDelete);
  }

  if (notebook.words.length > 0) {
    const { error: wError } = await supabase.from("words").upsert(
      notebook.words.map((w) => ({
        id: w.id,
        notebook_id: notebook.id,
        term: w.term,
        meaning: w.meaning,
        part_of_speech: w.partOfSpeech,
        example_sentence: w.exampleSentence,
        context: w.context,
      }))
    );
    if (wError) throw wError;
  }
}

async function supaDeleteNotebook(id: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from("notebooks").delete().eq("id", id);
  if (error) throw error;
}

async function supaGetLearningData(wordId: string): Promise<WordLearningData> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("word_learning")
    .select("*")
    .eq("word_id", wordId)
    .single();

  if (error || !data) return createDefaultLearningData(wordId);

  return {
    wordId: data.word_id,
    easeFactor: data.ease_factor,
    intervalDays: data.interval_days,
    repetition: data.repetition,
    lapses: data.lapses,
    totalReviews: data.total_reviews,
    correctCount: data.correct_count,
    nextReviewAt: data.next_review_at,
    lastReviewedAt: data.last_reviewed_at,
  };
}

async function supaGetBatchLearningData(wordIds: string[]): Promise<WordLearningData[]> {
  if (wordIds.length === 0) return [];
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("word_learning")
    .select("*")
    .in("word_id", wordIds);

  if (error) throw error;

  const dataMap = new Map((data || []).map((d) => [d.word_id, d]));

  return wordIds.map((id) => {
    const d = dataMap.get(id);
    if (!d) return createDefaultLearningData(id);
    return {
      wordId: d.word_id,
      easeFactor: d.ease_factor,
      intervalDays: d.interval_days,
      repetition: d.repetition,
      lapses: d.lapses,
      totalReviews: d.total_reviews,
      correctCount: d.correct_count,
      nextReviewAt: d.next_review_at,
      lastReviewedAt: d.last_reviewed_at,
    };
  });
}

async function supaSaveLearningData(data: WordLearningData): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from("word_learning").upsert(
    {
      word_id: data.wordId,
      ease_factor: data.easeFactor,
      interval_days: data.intervalDays,
      repetition: data.repetition,
      lapses: data.lapses,
      total_reviews: data.totalReviews,
      correct_count: data.correctCount,
      next_review_at: data.nextReviewAt,
      last_reviewed_at: data.lastReviewedAt,
    },
    { onConflict: "word_id" }
  );
  if (error) throw error;
}

async function supaSaveReviewLog(
  wordId: string,
  score: number,
  mode: "flashcard" | "quiz"
): Promise<void> {
  const supabase = getSupabase();
  const userId = await getCurrentUserId();
  if (!userId) return;
  const { error } = await supabase.from("review_logs").insert({
    word_id: wordId,
    user_id: userId,
    score,
    mode,
  });
  if (error) console.error("Failed to save review log:", error);
}

async function supaGetReviewHistory(days: number): Promise<{ date: string; count: number }[]> {
  const supabase = getSupabase();
  const userId = await getCurrentUserId();
  if (!userId) return [];

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const { data, error } = await supabase
    .from("review_logs")
    .select("reviewed_at")
    .eq("user_id", userId)
    .gte("reviewed_at", cutoff.toISOString());

  if (error || !data) return [];

  const counts = new Map<string, number>();
  for (const row of data) {
    const date = (row.reviewed_at as string).slice(0, 10);
    counts.set(date, (counts.get(date) || 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// ============================
// 統合エクスポート（async API）
// ============================

export async function getNotebooks(): Promise<Notebook[]> {
  if (await shouldUseSupabase()) return supaGetNotebooks();
  return localGetNotebooks();
}

export async function getNotebook(id: string): Promise<Notebook | undefined> {
  if (await shouldUseSupabase()) return supaGetNotebook(id);
  return localGetNotebook(id);
}

export async function saveNotebook(notebook: Notebook): Promise<void> {
  if (await shouldUseSupabase()) return supaSaveNotebook(notebook);
  localSaveNotebook(notebook);
}

export async function deleteNotebook(id: string): Promise<void> {
  if (await shouldUseSupabase()) return supaDeleteNotebook(id);
  localDeleteNotebook(id);
}

export async function getLearningData(wordId: string): Promise<WordLearningData> {
  if (await shouldUseSupabase()) return supaGetLearningData(wordId);
  return localGetLearningData(wordId);
}

export async function getBatchLearningData(wordIds: string[]): Promise<WordLearningData[]> {
  if (await shouldUseSupabase()) return supaGetBatchLearningData(wordIds);
  return localGetBatchLearningData(wordIds);
}

export async function saveLearningData(data: WordLearningData): Promise<void> {
  if (await shouldUseSupabase()) return supaSaveLearningData(data);
  localSaveLearningData(data);
}

export async function saveReviewLog(
  wordId: string,
  score: number,
  mode: "flashcard" | "quiz"
): Promise<void> {
  if (await shouldUseSupabase()) {
    await supaSaveReviewLog(wordId, score, mode);
    return;
  }
  localSaveReviewLog(wordId, score, mode);
}

export async function getReviewHistory(days: number): Promise<{ date: string; count: number }[]> {
  if (await shouldUseSupabase()) return supaGetReviewHistory(days);
  return localGetReviewHistory(days);
}

export async function getCrossNotebookWords(notebookIds: string[]): Promise<Word[]> {
  const notebooks = await Promise.all(notebookIds.map((nid) => getNotebook(nid)));
  return notebooks.flatMap((nb) => nb?.words || []);
}

export async function getStudyQueue(notebookId: string): Promise<string[]> {
  const notebook = await getNotebook(notebookId);
  if (!notebook) return [];

  const now = new Date();
  const wordIds = notebook.words.map((w) => w.id);
  const allLearningData = await getBatchLearningData(wordIds);

  const priorities = allLearningData.map((ld) => ({
    wordId: ld.wordId,
    priority: calculatePriority(ld, now),
  }));

  return priorities
    .filter((p) => p.priority > 0)
    .sort((a, b) => b.priority - a.priority)
    .map((p) => p.wordId);
}
