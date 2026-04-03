import { getSupabase } from "./supabase";
import { createDefaultLearningData, calculatePriority } from "./sm2";
import type { Notebook, WordLearningData } from "./types";

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

// ============================
// localStorage フォールバック
// ============================

const NOTEBOOKS_KEY = "vocab-notebooks";
const LEARNING_KEY = "vocab-learning";

function localGetNotebooks(): Notebook[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(NOTEBOOKS_KEY);
  return raw ? JSON.parse(raw) : [];
}

function localGetNotebook(id: string): Notebook | undefined {
  return localGetNotebooks().find((n) => n.id === id);
}

function localSaveNotebook(notebook: Notebook): void {
  const notebooks = localGetNotebooks();
  const idx = notebooks.findIndex((n) => n.id === notebook.id);
  if (idx >= 0) notebooks[idx] = notebook;
  else notebooks.push(notebook);
  localStorage.setItem(NOTEBOOKS_KEY, JSON.stringify(notebooks));
}

function localDeleteNotebook(id: string): void {
  const notebooks = localGetNotebooks().filter((n) => n.id !== id);
  localStorage.setItem(NOTEBOOKS_KEY, JSON.stringify(notebooks));
}

function localGetAllLearningData(): WordLearningData[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(LEARNING_KEY);
  return raw ? JSON.parse(raw) : [];
}

function localGetLearningData(wordId: string): WordLearningData {
  const existing = localGetAllLearningData().find((l) => l.wordId === wordId);
  return existing || createDefaultLearningData(wordId);
}

function localGetBatchLearningData(wordIds: string[]): WordLearningData[] {
  const all = localGetAllLearningData();
  return wordIds.map((id) => {
    const existing = all.find((l) => l.wordId === id);
    return existing || createDefaultLearningData(id);
  });
}

function localSaveLearningData(data: WordLearningData): void {
  const all = localGetAllLearningData();
  const idx = all.findIndex((l) => l.wordId === data.wordId);
  if (idx >= 0) all[idx] = data;
  else all.push(data);
  localStorage.setItem(LEARNING_KEY, JSON.stringify(all));
}

// ============================
// Supabase 実装
// ============================

async function supaGetNotebooks(): Promise<Notebook[]> {
  const supabase = getSupabase();
  const userId = await getCurrentUserId();

  let query = supabase
    .from("notebooks")
    .select("*")
    .order("created_at", { ascending: false });

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data: notebooks, error } = await query;
  if (error) throw error;
  if (!notebooks || notebooks.length === 0) return [];

  // N+1解消: 全notebookのwordsを一括取得
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

// #1 fix: diff-based save to preserve word_learning data
async function supaSaveNotebook(notebook: Notebook): Promise<void> {
  const supabase = getSupabase();
  const userId = await getCurrentUserId();

  const { error: nbError } = await supabase.from("notebooks").upsert({
    id: notebook.id,
    title: notebook.title,
    user_id: userId,
    created_at: notebook.createdAt,
  });
  if (nbError) throw nbError;

  // 既存の単語IDを取得
  const { data: existingWords } = await supabase
    .from("words")
    .select("id")
    .eq("notebook_id", notebook.id);

  const existingIds = new Set((existingWords || []).map((w) => w.id));
  const newIds = new Set(notebook.words.map((w) => w.id));

  // 削除された単語のみ削除（学習データは CASCADE で消えるが、変更なしの単語は保持）
  const toDelete = [...existingIds].filter((id) => !newIds.has(id));
  if (toDelete.length > 0) {
    await supabase.from("words").delete().in("id", toDelete);
  }

  // 新規 or 更新の単語をupsert
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

// #6 fix: batch fetch learning data
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
  const { error } = await supabase.from("review_logs").insert({
    word_id: wordId,
    user_id: userId,
    score,
    mode,
  });
  if (error) console.error("Failed to save review log:", error);
}

// ============================
// 統合エクスポート（async API）
// ============================

export async function getNotebooks(): Promise<Notebook[]> {
  if (isSupabaseConfigured()) return supaGetNotebooks();
  return localGetNotebooks();
}

export async function getNotebook(id: string): Promise<Notebook | undefined> {
  if (isSupabaseConfigured()) return supaGetNotebook(id);
  return localGetNotebook(id);
}

export async function saveNotebook(notebook: Notebook): Promise<void> {
  if (isSupabaseConfigured()) return supaSaveNotebook(notebook);
  localSaveNotebook(notebook);
}

export async function deleteNotebook(id: string): Promise<void> {
  if (isSupabaseConfigured()) return supaDeleteNotebook(id);
  localDeleteNotebook(id);
}

export async function getLearningData(wordId: string): Promise<WordLearningData> {
  if (isSupabaseConfigured()) return supaGetLearningData(wordId);
  return localGetLearningData(wordId);
}

export async function getBatchLearningData(wordIds: string[]): Promise<WordLearningData[]> {
  if (isSupabaseConfigured()) return supaGetBatchLearningData(wordIds);
  return localGetBatchLearningData(wordIds);
}

export async function saveLearningData(data: WordLearningData): Promise<void> {
  if (isSupabaseConfigured()) return supaSaveLearningData(data);
  localSaveLearningData(data);
}

export async function saveReviewLog(
  wordId: string,
  score: number,
  mode: "flashcard" | "quiz"
): Promise<void> {
  if (isSupabaseConfigured()) return supaSaveReviewLog(wordId, score, mode);
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
