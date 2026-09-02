import type { Project } from '@/types';

/**
 * Runs first inside the preview frame. It forwards console output and errors to
 * the host, and shims the storage APIs — the frame is sandboxed without
 * `allow-same-origin`, so `localStorage` would otherwise throw a SecurityError.
 */
const BRIDGE = String.raw`
<script>
(function () {
  var seq = 0;
  var send = function (type, data) {
    try { parent.postMessage(Object.assign({ __editorFrame: true, type: type }, data), '*'); } catch (e) {}
  };

  function stringify(value, seen, depth) {
    seen = seen || new Set();
    depth = depth || 0;
    var t = typeof value;
    if (value === null) return 'null';
    if (t === 'undefined') return 'undefined';
    if (t === 'string') return depth === 0 ? value : JSON.stringify(value);
    if (t === 'number' || t === 'boolean') return String(value);
    if (t === 'bigint') return String(value) + 'n';
    if (t === 'symbol') return value.toString();
    if (t === 'function') return (value.name ? 'ƒ ' + value.name + '()' : 'ƒ ()');
    if (value instanceof Error) return (value.stack || (value.name + ': ' + value.message));
    if (typeof Element !== 'undefined' && value instanceof Element) {
      return '<' + value.tagName.toLowerCase() + (value.id ? '#' + value.id : '') +
        (value.className && typeof value.className === 'string' ? '.' + value.className.trim().split(/\s+/).join('.') : '') + '>';
    }
    if (value instanceof Date) return value.toISOString();
    if (value instanceof RegExp) return value.toString();
    if (seen.has(value)) return '[Circular]';
    if (depth > 4) return Array.isArray(value) ? '[…]' : '{…}';
    seen.add(value);
    try {
      if (Array.isArray(value)) {
        var items = value.slice(0, 100).map(function (v) { return stringify(v, seen, depth + 1); });
        if (value.length > 100) items.push('… ' + (value.length - 100) + ' more');
        return '[' + items.join(', ') + ']';
      }
      if (value instanceof Map) {
        return 'Map(' + value.size + ') {' + Array.from(value.entries()).slice(0, 50).map(function (e) {
          return stringify(e[0], seen, depth + 1) + ' => ' + stringify(e[1], seen, depth + 1);
        }).join(', ') + '}';
      }
      if (value instanceof Set) {
        return 'Set(' + value.size + ') {' + Array.from(value).slice(0, 50).map(function (v) {
          return stringify(v, seen, depth + 1);
        }).join(', ') + '}';
      }
      var keys = Object.keys(value);
      var name = (value.constructor && value.constructor.name && value.constructor.name !== 'Object')
        ? value.constructor.name + ' ' : '';
      var body = keys.slice(0, 60).map(function (k) { return k + ': ' + stringify(value[k], seen, depth + 1); });
      if (keys.length > 60) body.push('… ' + (keys.length - 60) + ' more');
      return name + '{' + body.join(', ') + '}';
    } catch (e) {
      return '[Unserializable]';
    } finally {
      seen.delete(value);
    }
  }

  var native = {};
  ['log', 'info', 'warn', 'error', 'debug', 'table'].forEach(function (level) {
    native[level] = console[level] ? console[level].bind(console) : function () {};
    console[level] = function () {
      var args = Array.prototype.slice.call(arguments);
      send('console', {
        level: level,
        parts: args.map(function (a) { return stringify(a); }),
        seq: seq++
      });
      native[level].apply(console, args);
    };
  });

  console.clear = function () { send('clear', {}); };

  var counters = {};
  console.count = function (label) {
    label = label || 'default';
    counters[label] = (counters[label] || 0) + 1;
    console.log(label + ': ' + counters[label]);
  };

  var timers = {};
  console.time = function (label) { timers[label || 'default'] = performance.now(); };
  console.timeEnd = function (label) {
    label = label || 'default';
    if (timers[label] == null) return;
    console.log(label + ': ' + (performance.now() - timers[label]).toFixed(2) + 'ms');
    delete timers[label];
  };
  console.assert = function (cond) {
    if (!cond) console.error.apply(console, ['Assertion failed:'].concat(Array.prototype.slice.call(arguments, 1)));
  };

  window.addEventListener('error', function (e) {
    var msg = e.error ? (e.error.message || String(e.error)) : e.message;
    send('console', {
      level: 'error',
      parts: [msg],
      stack: e.error && e.error.stack ? e.error.stack : (e.filename ? e.filename + ':' + e.lineno + ':' + e.colno : ''),
      seq: seq++
    });
    send('runtime-error', { message: msg });
  });

  window.addEventListener('unhandledrejection', function (e) {
    var r = e.reason;
    send('console', {
      level: 'error',
      parts: ['Uncaught (in promise) ' + stringify(r && r.message ? r.message : r)],
      stack: r && r.stack ? r.stack : '',
      seq: seq++
    });
  });

  // The frame has an opaque origin, so the real storage APIs throw on access.
  function memoryStorage() {
    var data = {};
    return {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(data, String(k)) ? data[String(k)] : null; },
      setItem: function (k, v) { data[String(k)] = String(v); },
      removeItem: function (k) { delete data[String(k)]; },
      clear: function () { data = {}; },
      key: function (i) { return Object.keys(data)[i] ?? null; },
      get length() { return Object.keys(data).length; }
    };
  }
  try { void window.localStorage.length; } catch (e) {
    try {
      Object.defineProperty(window, 'localStorage', { value: memoryStorage(), configurable: true });
      Object.defineProperty(window, 'sessionStorage', { value: memoryStorage(), configurable: true });
    } catch (err) {}
  }

  window.addEventListener('DOMContentLoaded', function () { send('ready', {}); });

  // Expression evaluation driven by the host console input.
  window.addEventListener('message', function (e) {
    var data = e.data;
    if (!data || data.__editorHost !== true || data.type !== 'eval') return;
    var reply = function (parts, ok) { send('eval-result', { parts: parts, ok: ok, seq: seq++ }); };
    try {
      var result = (0, eval)(data.code);
      if (result && typeof result.then === 'function') {
        result.then(
          function (v) { reply(['Promise → ' + stringify(v, null, 1)], true); },
          function (err) { reply([stringify(err)], false); }
        );
      } else {
        reply([stringify(result, null, 1)], true);
      }
    } catch (err) {
      reply([stringify(err)], false);
    }
  });

  // Keyboard shortcuts still need to reach the host while the frame has focus.
  window.addEventListener('keydown', function (e) {
    var mod = e.metaKey || e.ctrlKey;
    if (!mod) return;
    var k = e.key.toLowerCase();
    if (k === 'k' || k === 'enter' || k === 's' || k === '/' || (e.shiftKey && k === 'p')) {
      e.preventDefault();
      send('hotkey', { key: k, shift: e.shiftKey, alt: e.altKey });
    }
  });
})();
</script>`;

const BABEL_CDN = 'https://cdn.jsdelivr.net/npm/@babel/standalone@7/babel.min.js';

const RESET = String.raw`
<style>
  *, *::before, *::after { box-sizing: border-box; }
  html { -webkit-text-size-adjust: 100%; }
  body { margin: 0; font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; }
</style>`;

function escapeClosingTags(code: string): string {
  return code.replace(/<\/script>/gi, '<\\/script>');
}

export interface SrcDocOptions {
  /** Applies a dark background when the document has no styling of its own. */
  darkPreview?: boolean;
}

export function buildSrcDoc(project: Project, options: SrcDocOptions = {}): string {
  const cssLibs = project.libraries
    .filter((l) => l.kind === 'css')
    .map((l) => `<link rel="stylesheet" href="${escapeAttr(l.url)}">`)
    .join('\n');

  const jsLibs = project.libraries
    .filter((l) => l.kind === 'js')
    .map((l) => `<script src="${escapeAttr(l.url)}" crossorigin="anonymous"></script>`)
    .join('\n');

  const useBabel = project.jsFlavor === 'babel';
  const scriptTag = useBabel
    ? `<script type="text/babel" data-presets="env,react,typescript" data-type="module">\n${escapeClosingTags(project.js)}\n</script>`
    : `<script type="module">\n${escapeClosingTags(project.js)}\n</script>`;

  const babelTag = useBabel ? `<script src="${BABEL_CDN}"></script>` : '';

  const darkFallback = options.darkPreview
    ? `<style>:root { color-scheme: dark } body:not([style]):not([class]) { background: #16181d; color: #e6e9ef }</style>`
    : '';

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<base target="_blank">
${BRIDGE}
${RESET}
${darkFallback}
${cssLibs}
<style>
${project.css}
</style>
</head>
<body>
${project.html}
${jsLibs}
${babelTag}
${scriptTag}
</body>
</html>`;
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

/** Standalone document for "download" and "open in new tab" — no host bridge. */
export function buildStandaloneDoc(project: Project): string {
  const cssLibs = project.libraries
    .filter((l) => l.kind === 'css')
    .map((l) => `    <link rel="stylesheet" href="${escapeAttr(l.url)}">`)
    .join('\n');
  const jsLibs = project.libraries
    .filter((l) => l.kind === 'js')
    .map((l) => `    <script src="${escapeAttr(l.url)}"></script>`)
    .join('\n');
  const useBabel = project.jsFlavor === 'babel';

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeAttr(project.title)}</title>
${cssLibs}
    <style>
${indent(project.css, 6)}
    </style>
  </head>
  <body>
${indent(project.html, 4)}
${jsLibs}
${useBabel ? `    <script src="${BABEL_CDN}"></script>` : ''}
    <script${useBabel ? ' type="text/babel" data-presets="env,react,typescript"' : ' type="module"'}>
${indent(escapeClosingTags(project.js), 6)}
    </script>
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
