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

export type TsRequest =
  | { id: number; type: 'sync'; snapshot: TsSnapshot }
  | { id: number; type: 'completions'; file: string; pos: number }
  | { id: number; type: 'details'; file: string; pos: number; name: string }
  | { id: number; type: 'diagnostics'; file: string }
  | { id: number; type: 'quickinfo'; file: string; pos: number };

/** `Omit` collapses a union, so the id is stripped from each member instead. */
export type TsRequestBody = TsRequest extends infer T
  ? T extends { id: number }
    ? Omit<T, 'id'>
    : never
  : never;

export type TsResponse =
  | { id: number; ok: true; result: unknown }
  | { id: number; ok: false; message: string };
