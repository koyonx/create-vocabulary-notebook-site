import { getNotebook, getLearningData } from "./storage";
import type { WordLearningData } from "./types";

export type NotebookStats = {
  totalWords: number;
  mastered: number;       // interval >= 21日
  learning: number;       // 1回以上復習済み & interval < 21日
  newWords: number;       // 未学習
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
  const learningDataList: (WordLearningData & { term: string; meaning: string })[] = [];

  for (const word of notebook.words) {
    const ld = await getLearningData(word.id);
    learningDataList.push({ ...ld, term: word.term, meaning: word.meaning });
  }

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
    } else if (ld.intervalDays >= 21) {
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

  // 苦手単語 TOP5
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

  // 習熟度分布
  const streakDistribution = [
    { label: "未学習", count: newWords },
    { label: "学習中", count: learning },
    { label: "習得済み", count: mastered },
  ];

  return {
    totalWords,
    mastered,
    learning,
    newWords: newWords,
    averageEaseFactor: easeCount > 0 ? easeSum / easeCount : 2.5,
    totalReviews,
    correctRate: totalReviews > 0 ? totalCorrect / totalReviews : 0,
    dueToday,
    weakWords,
    streakDistribution,
  };
}
