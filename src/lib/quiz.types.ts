export type QuizQuestion = {
  wordId: string;
  questionWord: string;
  correctAnswer: string;
  choices: string[];
  correctIndex: number;
  direction?: "term-to-meaning" | "meaning-to-term";
};

export type FillBlankQuestion = {
  wordId: string;
  sentence: string;
  blank: string;
  answer: string;
  hint: string;
};

export type QuizData = {
  questions: QuizQuestion[];
};

export type FillBlankData = {
  questions: FillBlankQuestion[];
};
