// Shared type definitions for the minimalist calculator app.

export type KeyKind = "digit" | "op" | "fn" | "equals" | "util";

export interface CalcKey {
  id: string;
  label: string;
  kind: KeyKind;
  /** number of grid columns the key spans (default 1) */
  colSpan?: number;
  /** number of grid rows the key spans (default 1) */
  rowSpan?: number;
  /** accessible label for screen readers */
  aria?: string;
}

export interface HistoryItem {
  id: string;
  formula: string;
  result: string;
  /** epoch ms */
  ts: number;
}

export interface EvalResult {
  ok: boolean;
  value?: number;
  error?: string;
}

export type SegKind = "num" | "op" | "paren" | "pct" | "other";

export interface Seg {
  text: string;
  kind: SegKind;
}