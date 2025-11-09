export interface Step {
  order: number;
  prerequisites?: Record<string, any>;
  transition?: Record<string, any>;
  outcomes?: Record<string, any>;
}
