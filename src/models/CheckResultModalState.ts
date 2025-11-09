export interface CheckResultModalState {
  show: boolean;
  problemStatement: string;
  solution: string;
  extractedAnswer: string;
  checkResult: any;
  hash: string;
  seed: number | undefined;
}
