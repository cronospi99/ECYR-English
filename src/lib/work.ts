/**
 * Student output (writing texts, speaking transcripts) kept for the teacher in
 * `public.submissions`. Stub until implemented.
 */
export interface WorkInput {
  module: 'writing' | 'speaking';
  /** Where it was done, e.g. "unit:A1-3", "practice:writing:B1-4-2", "coach:live". */
  task: string;
  prompt: string;
  content: string;
  /** AI feedback or any extra data (stored in `report`). */
  report?: Record<string, unknown>;
}

export async function saveWork(_w: WorkInput): Promise<void> {}
