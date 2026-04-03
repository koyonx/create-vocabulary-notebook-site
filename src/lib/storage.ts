// Phase 1: ローカルストレージベースの永続化
// Phase 2以降でSupabaseに置き換え

import type { Notebook, WordLearningData, ReviewScore } from "./types";

const NOTEBOOKS_KEY = "vocab-notebooks";
const LEARNING_KEY = "vocab-learning";

// --- Notebook CRUD ---

export function getNotebooks(): Notebook[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(NOTEBOOKS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function getNotebook(id: string): Notebook | undefined {
  return getNotebooks().find((n) => n.id === id);
}

export function saveNotebook(notebook: Notebook): void {
  const notebooks = getNotebooks();
  const idx = notebooks.findIndex((n) => n.id === notebook.id);
  if (idx >= 0) {
    notebooks[idx] = notebook;
  } else {
    notebooks.push(notebook);
  }
  localStorage.setItem(NOTEBOOKS_KEY, JSON.stringify(notebooks));
}

export function deleteNotebook(id: string): void {
  const notebooks = getNotebooks().filter((n) => n.id !== id);
  localStorage.setItem(NOTEBOOKS_KEY, JSON.stringify(notebooks));
  // 関連する学習データも削除
  const learning = getAllLearningData().filter(
    (l) => !getNotebook(id)?.words.some((w) => w.id === l.wordId)
  );
  localStorage.setItem(LEARNING_KEY, JSON.stringify(learning));
}

// --- Learning Data (SM-2) ---

export function getAllLearningData(): WordLearningData[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(LEARNING_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function getLearningData(wordId: string): WordLearningData {
  const all = getAllLearningData();
  const existing = all.find((l) => l.wordId === wordId);
  if (existing) return existing;

  return {
    wordId,
    easeFactor: 2.5,
    intervalDays: 0,
    repetition: 0,
    lapses: 0,
    totalReviews: 0,
    correctCount: 0,
    nextReviewAt: new Date().toISOString(),
    lastReviewedAt: null,
  };
}

export function saveLearningData(data: WordLearningData): void {
  const all = getAllLearningData();
  const idx = all.findIndex((l) => l.wordId === data.wordId);
  if (idx >= 0) {
    all[idx] = data;
  } else {
    all.push(data);
  }
  localStorage.setItem(LEARNING_KEY, JSON.stringify(all));
}

// --- SM-2 Algorithm ---

export function updateSM2(
  data: WordLearningData,
  score: ReviewScore
): WordLearningData {
  const now = new Date();
  let { easeFactor, intervalDays, repetition, lapses, totalReviews, correctCount } = data;

  totalReviews += 1;

  if (score < 3) {
    // 不正解: リセット
    repetition = 0;
    intervalDays = 1;
    lapses += 1;
  } else {
    // 正解
    correctCount += 1;
    if (repetition === 0) {
      intervalDays = 1;
    } else if (repetition === 1) {
      intervalDays = 6;
    } else {
      intervalDays = Math.round(intervalDays * easeFactor);
    }
    repetition += 1;
  }

  // easeFactor更新
  easeFactor += 0.1 - (5 - score) * (0.08 + (5 - score) * 0.02);
  easeFactor = Math.max(1.3, easeFactor);

  const nextReview = new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000);

  return {
    ...data,
    easeFactor,
    intervalDays,
    repetition,
    lapses,
    totalReviews,
    correctCount,
    nextReviewAt: nextReview.toISOString(),
    lastReviewedAt: now.toISOString(),
  };
}

// --- Study Session: 優先度に基づく出題順 ---

export function getStudyQueue(notebookId: string): string[] {
  const notebook = getNotebook(notebookId);
  if (!notebook) return [];

  const now = new Date();

  type WordPriority = { wordId: string; priority: number };

  const priorities: WordPriority[] = notebook.words.map((word) => {
    const ld = getLearningData(word.id);
    const nextReview = new Date(ld.nextReviewAt);
    const overdueDays = (now.getTime() - nextReview.getTime()) / (1000 * 60 * 60 * 24);

    // 未復習のものはoverdueDays=0として扱う
    let baseWeight = 1;
    if (overdueDays > 0) {
      baseWeight = 1 + overdueDays;
    } else if (ld.totalReviews === 0) {
      // 新規カード: 優先度やや低め
      baseWeight = 0.5;
    } else {
      // まだ復習期限前: スキップ（優先度0）
      baseWeight = 0;
    }

    // 苦手ブースト（easeFactorが低いほど高い）
    const difficultyBoost = Math.max(1, 3.5 - ld.easeFactor);

    // 忘却ブースト
    const lapseBoost = 1 + ld.lapses * 0.3;

    const priority = baseWeight * difficultyBoost * lapseBoost;

    return { wordId: word.id, priority };
  });

  return priorities
    .filter((p) => p.priority > 0)
    .sort((a, b) => b.priority - a.priority)
    .map((p) => p.wordId);
}
