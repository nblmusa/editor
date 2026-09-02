export type PaneId = 'html' | 'css' | 'js';

export type LibraryKind = 'js' | 'css';

export interface Library {
  id: string;
  name: string;
  url: string;
  kind: LibraryKind;
}

export type JsFlavor = 'javascript' | 'babel';

export interface Project {
  id: string;
  title: string;
  html: string;
  css: string;
  js: string;
  libraries: Library[];
  jsFlavor: JsFlavor;
  createdAt: number;
  updatedAt: number;
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
  previewWidth: number | null;
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

export interface ConsoleEntry {
  id: number;
  level: ConsoleLevel;
  parts: string[];
  count: number;
  stack?: string;
  at: number;
}
