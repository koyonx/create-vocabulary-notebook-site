export type Word = {
  id: string;
  term: string;
  meaning: string;
  partOfSpeech: string;
  exampleSentence: string;
  context: string;
};

export type Notebook = {
  id: string;
  title: string;
  words: Word[];
  createdAt: string;
};

export type WordLearningData = {
  wordId: string;
  easeFactor: number;
  intervalDays: number;
  repetition: number;
  lapses: number;
  totalReviews: number;
  correctCount: number;
  nextReviewAt: string;
  lastReviewedAt: string | null;
};

export type ReviewScore = 1 | 2 | 3 | 4 | 5;

export type GeminiExtractedWord = {
  term: string;
  meaning: string;
  partOfSpeech: string;
  exampleSentence: string;
  context: string;
};

export type GeminiResponse = {
  title: string;
  words: GeminiExtractedWord[];
};
