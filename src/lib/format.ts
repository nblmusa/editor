import type { PaneId } from '@/types';

type Prettier = typeof import('prettier/standalone');

let cached: { prettier: Prettier; plugins: unknown[] } | null = null;

/** Prettier and its parsers are ~1 MB, so they are only fetched on first use. */
async function load() {
  if (cached) return cached;
  const [prettier, html, postcss, babel, estree] = await Promise.all([
    import('prettier/standalone'),
    import('prettier/plugins/html'),
    import('prettier/plugins/postcss'),
    import('prettier/plugins/babel'),
    import('prettier/plugins/estree'),
  ]);
  cached = {
    prettier,
    plugins: [html.default ?? html, postcss.default ?? postcss, babel.default ?? babel, estree.default ?? estree],
  };
  return cached;
}

const PARSERS: Record<PaneId, string> = {
  html: 'html',
  css: 'css',
  js: 'babel',
};

export async function formatCode(code: string, pane: PaneId, tabWidth: number): Promise<string> {
  if (!code.trim()) return code;
  const { prettier, plugins } = await load();
  const result = await prettier.format(code, {
    parser: PARSERS[pane],
    plugins: plugins as never,
    tabWidth,
    printWidth: 100,
    semi: true,
    singleQuote: pane !== 'html',
  });
  return result.replace(/\n$/, '');
}
