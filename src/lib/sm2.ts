import type { WordLearningData, ReviewScore } from "./types";

export function createDefaultLearningData(wordId: string): WordLearningData {
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

export function updateSM2(
  data: WordLearningData,
  score: ReviewScore
): WordLearningData {
  const now = new Date();
  let { easeFactor, intervalDays, repetition, lapses, totalReviews, correctCount } = data;

  totalReviews += 1;

  if (score < 3) {
    repetition = 0;
    intervalDays = 1;
    lapses += 1;
  } else {
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

export function calculatePriority(
  learningData: WordLearningData,
  now: Date = new Date()
): number {
  const nextReview = new Date(learningData.nextReviewAt);
  const overdueDays = (now.getTime() - nextReview.getTime()) / (1000 * 60 * 60 * 24);

  let baseWeight: number;
  if (overdueDays > 0) {
    baseWeight = 1 + overdueDays;
  } else if (learningData.totalReviews === 0) {
    baseWeight = 0.5;
  } else {
    baseWeight = 0;
  }

  const difficultyBoost = Math.max(1, 3.5 - learningData.easeFactor);
  const lapseBoost = 1 + learningData.lapses * 0.3;

  return baseWeight * difficultyBoost * lapseBoost;
}
