export type QuizQuestion = {
  wordId: string;
  questionWord: string;
  correctAnswer: string;
  choices: string[];
  correctIndex: number;
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
