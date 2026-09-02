import type { Library, LibraryKind } from '@/types';

export interface CatalogEntry {
  name: string;
  url: string;
  kind: LibraryKind;
  blurb: string;
}

export const catalog: CatalogEntry[] = [
  {
    name: 'Tailwind CSS',
    url: 'https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4',
    kind: 'js',
    blurb: 'Utility-first CSS, compiled in the browser',
  },
  {
    name: 'Bootstrap',
    url: 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css',
    kind: 'css',
    blurb: 'Component and grid framework',
  },
  {
    name: 'Bootstrap JS',
    url: 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js',
    kind: 'js',
    blurb: 'Dropdowns, modals, tooltips',
  },
  {
    name: 'Font Awesome',
    url: 'https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.6.0/css/all.min.css',
    kind: 'css',
    blurb: 'Icon set',
  },
  {
    name: 'Normalize.css',
    url: 'https://cdn.jsdelivr.net/npm/normalize.css@8.0.1/normalize.css',
    kind: 'css',
    blurb: 'Cross-browser style baseline',
  },
  {
    name: 'Animate.css',
    url: 'https://cdn.jsdelivr.net/npm/animate.css@4.1.1/animate.min.css',
    kind: 'css',
    blurb: 'Drop-in CSS animations',
  },
  {
    name: 'jQuery',
    url: 'https://cdn.jsdelivr.net/npm/jquery@3.7.1/dist/jquery.min.js',
    kind: 'js',
    blurb: 'DOM helpers and AJAX',
  },
  {
    name: 'Alpine.js',
    url: 'https://cdn.jsdelivr.net/npm/alpinejs@3.14.1/dist/cdn.min.js',
    kind: 'js',
    blurb: 'Lightweight reactive attributes',
  },
  {
    name: 'htmx',
    url: 'https://cdn.jsdelivr.net/npm/htmx.org@2.0.4/dist/htmx.min.js',
    kind: 'js',
    blurb: 'HTML-driven interactivity',
  },
  {
    name: 'GSAP',
    url: 'https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js',
    kind: 'js',
    blurb: 'High-performance animation',
  },
  {
    name: 'Chart.js',
    url: 'https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js',
    kind: 'js',
    blurb: 'Canvas charts',
  },
  {
    name: 'D3',
    url: 'https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js',
    kind: 'js',
    blurb: 'Data-driven documents',
  },
  {
    name: 'Lodash',
    url: 'https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js',
    kind: 'js',
    blurb: 'Utility belt',
  },
  {
    name: 'Day.js',
    url: 'https://cdn.jsdelivr.net/npm/dayjs@1.11.13/dayjs.min.js',
    kind: 'js',
    blurb: 'Date parsing and formatting',
  },
  {
    name: 'Vue 3',
    url: 'https://cdn.jsdelivr.net/npm/vue@3.5.10/dist/vue.global.prod.js',
    kind: 'js',
    blurb: 'Progressive UI framework',
  },
  {
    name: 'Three.js',
    url: 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.min.js',
    kind: 'js',
    blurb: 'WebGL 3D engine',
  },
  {
    name: 'Matter.js',
    url: 'https://cdn.jsdelivr.net/npm/matter-js@0.20.0/build/matter.min.js',
    kind: 'js',
    blurb: '2D physics',
  },
  {
    name: 'p5.js',
    url: 'https://cdn.jsdelivr.net/npm/p5@1.11.0/lib/p5.min.js',
    kind: 'js',
    blurb: 'Creative coding toolkit',
  },
  {
    name: 'Zod',
    url: 'https://cdn.jsdelivr.net/npm/zod@3.23.8/lib/index.umd.js',
    kind: 'js',
    blurb: 'Schema validation',
  },
  {
    name: 'Highlight.js',
    url: 'https://cdn.jsdelivr.net/npm/@highlightjs/cdn-assets@11.10.0/highlight.min.js',
    kind: 'js',
    blurb: 'Syntax highlighting',
  },
];

export function guessKind(url: string): LibraryKind {
  return /\.css(\?|#|$)/i.test(url) ? 'css' : 'js';
}

export function guessName(url: string): string {
  const npm = url.match(/\/npm\/((?:@[^/@]+\/)?[^@/]+)/);
  if (npm) return npm[1];
  try {
    const path = new URL(url).pathname.split('/').filter(Boolean);
    return path.at(-1) ?? url;
  } catch {
    return url;
  }
}

export function toLibrary(entry: Pick<CatalogEntry, 'name' | 'url' | 'kind'>): Library {
  return {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    name: entry.name,
    url: entry.url,
    kind: entry.kind,
  };
}
