import commonQuestionsData from "@/data/common-questions.json";

export type CommonQuestion = {
  title: string;
  answer: string;
};

export const commonQuestions: CommonQuestion[] = commonQuestionsData as CommonQuestion[];

