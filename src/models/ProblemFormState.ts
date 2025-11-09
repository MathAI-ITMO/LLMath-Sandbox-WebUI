import type { Problem } from './Problem';

export type ProblemFormState = Pick<Problem, 'title' | 'statement' | 'geolin_ans_key' | 'solution' | 'llm_solution'> & {
  result?: string;
};
