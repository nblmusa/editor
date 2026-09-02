export type PaneId = 'html' | 'css' | 'js';

export type LibraryKind = 'js' | 'css';

export interface Library {
  id: string;
  name: string;
  url: string;
  kind: LibraryKind;
}

export type JsFlavor = 'javascript' | 'babel';
export type HtmlLang = 'html' | 'markdown';
export type CssLang = 'css' | 'scss';

export interface Project {
  id: string;
  title: string;
  html: string;
  css: string;
  js: string;
  libraries: Library[];
  jsFlavor: JsFlavor;
  htmlLang: HtmlLang;
  cssLang: CssLang;
  createdAt: number;
  updatedAt: number;
}

export type RevisionReason = 'save' | 'auto' | 'replace' | 'restore';

export interface Revision {
  id: string;
  penId: string;
  title: string;
  html: string;
  css: string;
  js: string;
  libraries: Library[];
  jsFlavor: JsFlavor;
  htmlLang: HtmlLang;
  cssLang: CssLang;
  reason: RevisionReason;
  at: number;
}

export type ThemeName = 'dark' | 'light' | 'system';
export type SplitDirection = 'horizontal' | 'vertical';
export type ViewMode = 'both' | 'editor' | 'preview';
export type EditorLayout = 'tabs' | 'columns';
export type Keymap = 'default' | 'vim';

export interface Settings {
  theme: ThemeName;
  fontSize: number;
  tabSize: number;
  wordWrap: boolean;
  lineNumbers: boolean;
  autoRun: boolean;
  autoRunDelay: number;
  autoCloseTags: boolean;
  emmet: boolean;
  keymap: Keymap;
  editorLayout: EditorLayout;
  splitDirection: SplitDirection;
}

export type ConsoleLevel =
  | 'log'
  | 'info'
  | 'warn'
  | 'error'
  | 'debug'
  | 'table'
  | 'input'
  | 'result';

/** Console arguments arrive from the preview frame as a plain-data tree. */
export type SerializedValue =
  | {
      t: 'raw';
      k: 'string' | 'number' | 'boolean' | 'null' | 'undefined' | 'bigint' | 'symbol' | 'fn' | 'node' | 'date' | 'regexp' | 'ref';
      v: string;
    }
  | { t: 'error'; v: string; stack?: string }
  | { t: 'list'; kind: 'array' | 'set'; label: string; items: SerializedValue[]; more?: number }
  | { t: 'dict'; kind: 'object' | 'map'; label: string; entries: [string, SerializedValue][]; more?: number };

export interface ConsoleEntry {
  id: number;
  level: ConsoleLevel;
  parts: SerializedValue[];
  count: number;
  stack?: string;
  at: number;
}

export interface NetworkEntry {
  id: string;
  kind: 'fetch' | 'xhr';
  method: string;
  url: string;
  /** `null` while the request is still in flight. */
  status: number | null;
  ok?: boolean;
  ms: number | null;
  size: number | null;
  error?: string;
  at: number;
}

export interface AuditViolation {
  id: string;
  impact: 'minor' | 'moderate' | 'serious' | 'critical';
  help: string;
  helpUrl: string;
  nodes: { target: string; html: string }[];
  total: number;
}
