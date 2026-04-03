export type QuizQuestion = {
  wordId: string;
  questionWord: string;
  correctAnswer: string;
  choices: string[];
  correctIndex: number;
};

export type QuizData = {
  questions: QuizQuestion[];
};
