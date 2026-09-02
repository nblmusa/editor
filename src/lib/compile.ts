import type { CssLang, HtmlLang, Project } from '@/types';

export interface CompileResult {
  html: string;
  css: string;
  /** Set when a preprocessor rejected the source; the last good output is kept. */
  error: { pane: 'html' | 'css'; message: string } | null;
}

/** Both compilers are sizeable, so they only load once a pen actually uses one. */
let sassModule: Promise<typeof import('sass')> | null = null;
let markedModule: Promise<typeof import('marked')> | null = null;

function loadSass() {
  sassModule ??= import('sass');
  return sassModule;
}

function loadMarked() {
  markedModule ??= import('marked');
  return markedModule;
}

export async function compileCss(source: string, lang: CssLang): Promise<string> {
  if (lang !== 'scss') return source;
  const sass = await loadSass();
  return sass.compileString(source, { style: 'expanded' }).css;
}

export async function compileHtml(source: string, lang: HtmlLang): Promise<string> {
  if (lang !== 'markdown') return source;
  const { marked } = await loadMarked();
  return marked.parse(source, { async: false, gfm: true, breaks: false });
}

export async function compileProject(project: Project): Promise<CompileResult> {
  let html = project.html;
  let css = project.css;
  let error: CompileResult['error'] = null;

  try {
    html = await compileHtml(project.html, project.htmlLang);
  } catch (cause) {
    error = { pane: 'html', message: messageOf(cause) };
  }

  try {
    css = await compileCss(project.css, project.cssLang);
  } catch (cause) {
    // A stylesheet mid-edit is invalid most of the time, so the previous
    // output stays on screen instead of blanking the preview.
    css = '';
    error ??= { pane: 'css', message: messageOf(cause) };
  }

  return { html, css, error };
}

function messageOf(cause: unknown): string {
  if (cause && typeof cause === 'object' && 'message' in cause) {
    return String((cause as Error).message);
  }
  return String(cause);
}

export const HTML_LANGS: { id: HtmlLang; label: string }[] = [
  { id: 'html', label: 'HTML' },
  { id: 'markdown', label: 'Markdown' },
];

export const CSS_LANGS: { id: CssLang; label: string }[] = [
  { id: 'css', label: 'CSS' },
  { id: 'scss', label: 'SCSS' },
];
