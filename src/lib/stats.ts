import { getNotebook, getBatchLearningData } from "./storage";
import { MASTERED_INTERVAL_DAYS } from "./constants";
import type { WordLearningData } from "./types";

export type NotebookStats = {
  totalWords: number;
  mastered: number;
  learning: number;
  newWords: number;
  averageEaseFactor: number;
  totalReviews: number;
  correctRate: number;
  dueToday: number;
  weakWords: { term: string; meaning: string; easeFactor: number; lapses: number }[];
  streakDistribution: { label: string; count: number }[];
};

export async function getNotebookStats(notebookId: string): Promise<NotebookStats | null> {
  const notebook = await getNotebook(notebookId);
  if (!notebook) return null;

  const now = new Date();
  const wordIds = notebook.words.map((w) => w.id);
  const allLearningData = await getBatchLearningData(wordIds);

  const learningDataList: (WordLearningData & { term: string; meaning: string })[] =
    allLearningData.map((ld, i) => ({
      ...ld,
      term: notebook.words[i].term,
      meaning: notebook.words[i].meaning,
    }));

  const totalWords = learningDataList.length;

  let mastered = 0;
  let learning = 0;
  let newWords = 0;
  let totalReviews = 0;
  let totalCorrect = 0;
  let dueToday = 0;
  let easeSum = 0;
  let easeCount = 0;

  for (const ld of learningDataList) {
    totalReviews += ld.totalReviews;
    totalCorrect += ld.correctCount;

    if (ld.totalReviews === 0) {
      newWords++;
    } else if (ld.intervalDays >= MASTERED_INTERVAL_DAYS) {
      mastered++;
    } else {
      learning++;
    }

    if (ld.totalReviews > 0) {
      easeSum += ld.easeFactor;
      easeCount++;
    }

    const nextReview = new Date(ld.nextReviewAt);
    if (nextReview <= now) {
      dueToday++;
    }
  }

  const weakWords = learningDataList
    .filter((ld) => ld.totalReviews > 0)
    .sort((a, b) => a.easeFactor - b.easeFactor || b.lapses - a.lapses)
    .slice(0, 5)
    .map((ld) => ({
      term: ld.term,
      meaning: ld.meaning,
      easeFactor: ld.easeFactor,
      lapses: ld.lapses,
    }));

  const streakDistribution = [
    { label: "未学習", count: newWords },
    { label: "学習中", count: learning },
    { label: "習得済み", count: mastered },
  ];

  return {
    totalWords,
    mastered,
    learning,
    newWords,
    averageEaseFactor: easeCount > 0 ? easeSum / easeCount : 2.5,
    totalReviews,
    correctRate: totalReviews > 0 ? totalCorrect / totalReviews : 0,
    dueToday,
    weakWords,
    streakDistribution,
  };
}
