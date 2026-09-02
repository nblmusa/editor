import type { CssLang, HtmlLang, PaneId } from '@/types';

type Prettier = typeof import('prettier/standalone');

let cached: { prettier: Prettier; plugins: unknown[] } | null = null;

/** Prettier and its parsers are ~1 MB, so they are only fetched on first use. */
async function load() {
  if (cached) return cached;
  const [prettier, html, postcss, babel, estree, markdown] = await Promise.all([
    import('prettier/standalone'),
    import('prettier/plugins/html'),
    import('prettier/plugins/postcss'),
    import('prettier/plugins/babel'),
    import('prettier/plugins/estree'),
    import('prettier/plugins/markdown'),
  ]);
  cached = {
    prettier,
    plugins: [
      html.default ?? html,
      postcss.default ?? postcss,
      babel.default ?? babel,
      estree.default ?? estree,
      markdown.default ?? markdown,
    ],
  };
  return cached;
}

export interface FormatLangs {
  htmlLang: HtmlLang;
  cssLang: CssLang;
}

function parserFor(pane: PaneId, langs: FormatLangs): string {
  if (pane === 'html') return langs.htmlLang === 'markdown' ? 'markdown' : 'html';
  if (pane === 'css') return langs.cssLang === 'scss' ? 'scss' : 'css';
  return 'babel';
}

export async function formatCode(
  code: string,
  pane: PaneId,
  tabWidth: number,
  langs: FormatLangs,
): Promise<string> {
  if (!code.trim()) return code;
  const { prettier, plugins } = await load();
  const result = await prettier.format(code, {
    parser: parserFor(pane, langs),
    plugins: plugins as never,
    tabWidth,
    printWidth: 100,
    semi: true,
    singleQuote: pane !== 'html',
  });
  return result.replace(/\n$/, '');
}
