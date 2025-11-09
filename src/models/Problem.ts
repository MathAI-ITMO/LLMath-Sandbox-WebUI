import type { GeoilonAnsKey } from './GeoilonAnsKey';
import type { Solution } from './Solution';

export interface Problem {
  _id?: string;
  id?: string;
  title?: string;
  statement: string;
  geolin_ans_key: GeoilonAnsKey;
  result?: string;
  solution: Solution;
  llm_solution?: any;
}
