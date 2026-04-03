export type QuizQuestion = {
  questionWord: string;
  correctAnswer: string;
  choices: string[];
  correctIndex: number;
};

export type QuizData = {
  questions: QuizQuestion[];
};
