/* tslint:disable */
/* eslint-disable */
export function quick_mood_check(input: string): string;
export function polish_text(text: string): string;
export class MiraCore {
  free(): void;
  [Symbol.dispose](): void;
  constructor();
  /**
   * Preprocess user input: sanitize, tokenize, count words
   */
  preprocess_input(input: string): any;
  /**
   * Calculate sentiment score from text
   */
  calculate_sentiment(text: string): number;
  /**
   * Detect mood with caching and sentiment analysis
   */
  detect_mood(user_input: string): string;
  /**
   * Get dominant mood across session
   */
  get_dominant_mood(): string;
  /**
   * Calculate mood transition based on sentiment
   */
  calculate_mood_transition(current_mood: string, sentiment_score: number): string;
  /**
   * Humanize AI response (remove formal language)
   */
  humanize_response(response: string): string;
  /**
   * Detect expression from text for Live2D (with sentiment awareness)
   */
  detect_expression(text: string): string;
  /**
   * Build conversation context summary
   */
  build_conversation_context(messages: string[]): string;
  /**
   * Extract key topics from messages
   */
  extract_topics(messages: string[]): string[];
  /**
   * Generate mini-game riddle
   */
  generate_riddle(): any;
  /**
   * Get offline fallback response
   */
  get_offline_response(): string;
  /**
   * Interpolate between expressions for smooth transitions
   */
  interpolate_expression(current: string, target: string, progress: number): string;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly __wbg_miracore_free: (a: number, b: number) => void;
  readonly miracore_new: () => number;
  readonly miracore_preprocess_input: (a: number, b: number, c: number) => any;
  readonly miracore_calculate_sentiment: (a: number, b: number, c: number) => number;
  readonly miracore_detect_mood: (a: number, b: number, c: number) => [number, number];
  readonly miracore_get_dominant_mood: (a: number) => [number, number];
  readonly miracore_calculate_mood_transition: (a: number, b: number, c: number, d: number) => [number, number];
  readonly miracore_humanize_response: (a: number, b: number, c: number) => [number, number];
  readonly miracore_detect_expression: (a: number, b: number, c: number) => [number, number];
  readonly miracore_build_conversation_context: (a: number, b: number, c: number) => [number, number];
  readonly miracore_extract_topics: (a: number, b: number, c: number) => [number, number];
  readonly miracore_generate_riddle: (a: number) => any;
  readonly miracore_get_offline_response: (a: number) => [number, number];
  readonly miracore_interpolate_expression: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number];
  readonly quick_mood_check: (a: number, b: number) => [number, number];
  readonly polish_text: (a: number, b: number) => [number, number];
  readonly __wbindgen_malloc: (a: number, b: number) => number;
  readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
  readonly __wbindgen_export_2: WebAssembly.Table;
  readonly __wbindgen_free: (a: number, b: number, c: number) => void;
  readonly __externref_table_alloc: () => number;
  readonly __externref_drop_slice: (a: number, b: number) => void;
  readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;
/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
*
* @returns {InitOutput}
*/
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
