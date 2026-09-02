export interface TsFile {
  name: string;
  code: string;
}

export interface TsSnapshot {
  entry: string;
  files: TsFile[];
  /** Type errors are only reported for pens that opted into TypeScript. */
  checked: boolean;
}

export interface TsCompletion {
  name: string;
  kind: string;
  sortText: string;
  insert?: string;
  detail?: string;
}

export interface TsDiagnostic {
  start: number;
  length: number;
  message: string;
  category: 'error' | 'warning' | 'suggestion';
}

export interface TsQuickInfo {
  text: string;
  documentation: string;
  start: number;
  length: number;
}

/**
 * Every query carries the buffer it is about. The editor moves faster than any
 * debounce, and answering against a stale document produces global completions
 * where member completions belong.
 */
export type TsRequest =
  | { id: number; type: 'sync'; snapshot: TsSnapshot }
  | { id: number; type: 'completions'; file: string; pos: number; code: string }
  | { id: number; type: 'details'; file: string; pos: number; name: string; code: string }
  | { id: number; type: 'diagnostics'; file: string; code: string }
  | { id: number; type: 'quickinfo'; file: string; pos: number; code: string };

/** `Omit` collapses a union, so the id is stripped from each member instead. */
export type TsRequestBody = TsRequest extends infer T
  ? T extends { id: number }
    ? Omit<T, 'id'>
    : never
  : never;

export type TsResponse =
  | { id: number; ok: true; result: unknown }
  | { id: number; ok: false; message: string };
