import type { Project } from '@/types';
import { PREVIEW_BRIDGE } from './previewBridge';
import { annotateHtml } from './annotateHtml';
import { MODULE_LOADER } from './moduleLoader';
import type { CompileResult } from './compile';

const BABEL_CDN = 'https://cdn.jsdelivr.net/npm/@babel/standalone@7/babel.min.js';

/** Id of the style element that live CSS patching replaces in place. */
export const USER_CSS_ID = '__editor_user_css';

const RESET = String.raw`
<style>
  *, *::before, *::after { box-sizing: border-box; }
  html { -webkit-text-size-adjust: 100%; }
  body { margin: 0; font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; }
</style>`;

function escapeClosingTags(code: string): string {
  return code.replace(/<\/script>/gi, '<\\/script>');
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function libraryTags(project: Project, indentBy = 0): { css: string; js: string } {
  const pad = ' '.repeat(indentBy);
  return {
    css: project.libraries
      .filter((l) => l.kind === 'css')
      .map((l) => `${pad}<link rel="stylesheet" href="${escapeAttr(l.url)}">`)
      .join('\n'),
    js: project.libraries
      .filter((l) => l.kind === 'js')
      .map((l) => `${pad}<script src="${escapeAttr(l.url)}"></script>`)
      .join('\n'),
  };
}

export interface SrcDocOptions {
  /** Applies a dark background when the document has no styling of its own. */
  darkPreview?: boolean;
}

export function buildSrcDoc(
  project: Project,
  compiled: CompileResult,
  options: SrcDocOptions = {},
): string {
  const libs = libraryTags(project);
  const useBabel = project.jsFlavor === 'babel';

  // Offsets only mean something when the pane holds the markup verbatim.
  const body = project.htmlLang === 'html' ? annotateHtml(compiled.html) : compiled.html;

  // A pen with extra modules needs the loader to mint blob URLs and an import
  // map inside the frame; a single-file pen can just run the script directly.
  const scriptTag = project.modules.length
    ? [
        `<script id="__editor_modules" type="application/json">${escapeClosingTags(
          JSON.stringify(project.modules.map(({ name, code }) => ({ name, code }))),
        )}</script>`,
        `<script id="__editor_entry" type="text/plain" data-babel="${useBabel}">\n${escapeClosingTags(project.js)}\n</script>`,
        MODULE_LOADER,
      ].join('\n')
    : useBabel
      ? `<script type="text/babel" data-presets="env,react,typescript" data-type="module">\n${escapeClosingTags(project.js)}\n</script>`
      : `<script type="module">\n${escapeClosingTags(project.js)}\n</script>`;

  const darkFallback = options.darkPreview
    ? `<style>:root { color-scheme: dark } body:not([style]):not([class]) { background: #16181d; color: #e6e9ef }</style>`
    : '';

  // `lang` and `<title>` belong to the generated wrapper rather than the user's
  // code; without them every accessibility audit reports the same two false
  // positives about scaffolding the author never wrote.
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeAttr(project.title || 'Preview')}</title>
<base target="_blank">
${PREVIEW_BRIDGE}
${RESET}
${darkFallback}
${libs.css}
<style id="${USER_CSS_ID}">
${compiled.css}
</style>
</head>
<body>
${body}
${libs.js}
${useBabel ? `<script src="${BABEL_CDN}"></script>` : ''}
${scriptTag}
</body>
</html>`;
}

/**
 * Identity of everything that forces the frame to be rebuilt. When only the CSS
 * differs between two renders the stylesheet can be swapped in place instead,
 * which keeps scroll position, form state and running animations intact.
 */
export function structuralKey(project: Project, compiled: CompileResult): string {
  return JSON.stringify([
    compiled.html,
    project.js,
    project.jsFlavor,
    project.modules.map((m) => `${m.name}:${m.code}`),
    project.libraries.map((l) => `${l.kind}:${l.url}`),
  ]);
}

/** Standalone document for "download" and "open in new tab" — no host bridge. */
export function buildStandaloneDoc(project: Project, compiled: CompileResult): string {
  const libs = libraryTags(project, 4);
  const useBabel = project.jsFlavor === 'babel';

  const scripts = project.modules.length
    ? [
        `    <script id="__editor_modules" type="application/json">${escapeClosingTags(
          JSON.stringify(project.modules.map(({ name, code }) => ({ name, code }))),
        )}</script>`,
        `    <script id="__editor_entry" type="text/plain" data-babel="${useBabel}">\n${indent(escapeClosingTags(project.js), 6)}\n    </script>`,
        MODULE_LOADER,
      ].join('\n')
    : `    <script${useBabel ? ' type="text/babel" data-presets="env,react,typescript"' : ' type="module"'}>
${indent(escapeClosingTags(project.js), 6)}
    </script>`;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeAttr(project.title)}</title>
${libs.css}
    <style>
${indent(compiled.css, 6)}
    </style>
  </head>
  <body>
${indent(compiled.html, 4)}
${libs.js}
${useBabel ? `    <script src="${BABEL_CDN}"></script>` : ''}
${scripts}
  </body>
</html>
`;
}

function indent(code: string, spaces: number): string {
  const pad = ' '.repeat(spaces);
  return code
    .split('\n')
    .map((line) => (line.trim() ? pad + line : line))
    .join('\n');
}
