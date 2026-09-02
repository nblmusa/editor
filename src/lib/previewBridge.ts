/**
 * Source for the script that runs first inside the preview frame.
 *
 * The frame is sandboxed without `allow-same-origin`, so it has an opaque
 * origin and cannot touch the host. Everything it reports travels over
 * `postMessage`, and a few browser APIs need shimming because of that origin.
 *
 * This is emitted as plain ES5-ish source into the generated document, so it
 * cannot use project imports or modern syntax that the bundler would transform.
 */
export const PREVIEW_BRIDGE = String.raw`
<script>
(function () {
  var seq = 0;
  var send = function (type, data) {
    try { parent.postMessage(Object.assign({ __editorFrame: true, type: type }, data), '*'); } catch (e) {}
  };

  /* ------------------------------ serialising ------------------------------ */

  var MAX_ITEMS = 100;
  var MAX_KEYS = 100;
  var MAX_DEPTH = 5;

  function describeNode(el) {
    var out = el.tagName.toLowerCase();
    if (el.id) out += '#' + el.id;
    if (el.className && typeof el.className === 'string') {
      out += '.' + el.className.trim().split(/\s+/).filter(Boolean).join('.');
    }
    return '<' + out + '>';
  }

  function fnLabel(value) {
    var prefix = /^class\s/.test(Function.prototype.toString.call(value)) ? 'class ' : 'ƒ ';
    return prefix + (value.name || '(anonymous)');
  }

  function serialize(value, depth, seen) {
    depth = depth || 0;
    seen = seen || [];
    var t = typeof value;

    if (value === null) return { t: 'raw', k: 'null', v: 'null' };
    if (t === 'undefined') return { t: 'raw', k: 'undefined', v: 'undefined' };
    if (t === 'string') return { t: 'raw', k: 'string', v: value };
    if (t === 'number') return { t: 'raw', k: 'number', v: Object.is(value, -0) ? '-0' : String(value) };
    if (t === 'boolean') return { t: 'raw', k: 'boolean', v: String(value) };
    if (t === 'bigint') return { t: 'raw', k: 'bigint', v: String(value) + 'n' };
    if (t === 'symbol') return { t: 'raw', k: 'symbol', v: value.toString() };
    if (t === 'function') return { t: 'raw', k: 'fn', v: fnLabel(value) };

    if (value instanceof Error) {
      return { t: 'error', v: (value.name || 'Error') + ': ' + value.message, stack: value.stack || '' };
    }
    if (typeof Element !== 'undefined' && value instanceof Element) {
      return { t: 'raw', k: 'node', v: describeNode(value) };
    }
    if (value instanceof Date) return { t: 'raw', k: 'date', v: value.toISOString() };
    if (value instanceof RegExp) return { t: 'raw', k: 'regexp', v: value.toString() };

    if (seen.indexOf(value) !== -1) return { t: 'raw', k: 'ref', v: '[Circular]' };
    if (depth >= MAX_DEPTH) {
      return { t: 'raw', k: 'ref', v: Array.isArray(value) ? '[…]' : '{…}' };
    }

    seen = seen.concat([value]);

    try {
      if (Array.isArray(value) || (typeof NodeList !== 'undefined' && value instanceof NodeList)) {
        var list = Array.prototype.slice.call(value);
        var shown = list.slice(0, MAX_ITEMS);
        return {
          t: 'list',
          kind: 'array',
          label: (Array.isArray(value) ? 'Array' : 'NodeList') + '(' + list.length + ')',
          items: shown.map(function (v) { return serialize(v, depth + 1, seen); }),
          more: Math.max(0, list.length - shown.length)
        };
      }

      if (typeof Set !== 'undefined' && value instanceof Set) {
        var setItems = Array.from(value).slice(0, MAX_ITEMS);
        return {
          t: 'list',
          kind: 'set',
          label: 'Set(' + value.size + ')',
          items: setItems.map(function (v) { return serialize(v, depth + 1, seen); }),
          more: Math.max(0, value.size - setItems.length)
        };
      }

      if (typeof Map !== 'undefined' && value instanceof Map) {
        var mapEntries = Array.from(value.entries()).slice(0, MAX_KEYS);
        return {
          t: 'dict',
          kind: 'map',
          label: 'Map(' + value.size + ')',
          entries: mapEntries.map(function (e) {
            var key = typeof e[0] === 'string' ? e[0] : serialize(e[0], MAX_DEPTH, seen).v;
            return [String(key), serialize(e[1], depth + 1, seen)];
          }),
          more: Math.max(0, value.size - mapEntries.length)
        };
      }

      var keys = Object.keys(value);
      var ctor = value.constructor && value.constructor.name;
      var shownKeys = keys.slice(0, MAX_KEYS);
      return {
        t: 'dict',
        kind: 'object',
        label: ctor && ctor !== 'Object' ? ctor : '',
        entries: shownKeys.map(function (k) {
          var entry;
          try { entry = serialize(value[k], depth + 1, seen); }
          catch (e) { entry = { t: 'raw', k: 'ref', v: '[Throws]' }; }
          return [k, entry];
        }),
        more: Math.max(0, keys.length - shownKeys.length)
      };
    } catch (e) {
      return { t: 'raw', k: 'ref', v: '[Unserializable]' };
    }
  }

  function plain(value) {
    var node = serialize(value, 0, []);
    return node.t === 'raw' ? node.v : JSON.stringify(value);
  }

  /* -------------------------------- console -------------------------------- */

  var native = {};
  ['log', 'info', 'warn', 'error', 'debug', 'table'].forEach(function (level) {
    native[level] = console[level] ? console[level].bind(console) : function () {};
    console[level] = function () {
      var args = Array.prototype.slice.call(arguments);
      send('console', {
        level: level,
        parts: args.map(function (a) { return serialize(a, 0, []); }),
        seq: seq++
      });
      native[level].apply(console, args);
    };
  });

  console.clear = function () { send('clear', {}); };

  var groupDepth = 0;
  console.group = console.groupCollapsed = function () {
    console.log.apply(console, arguments);
    groupDepth++;
  };
  console.groupEnd = function () { groupDepth = Math.max(0, groupDepth - 1); };

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
      parts: [{ t: 'raw', k: 'string', v: msg }],
      stack: e.error && e.error.stack ? e.error.stack : (e.filename ? e.filename + ':' + e.lineno + ':' + e.colno : ''),
      seq: seq++
    });
  });

  window.addEventListener('unhandledrejection', function (e) {
    var r = e.reason;
    send('console', {
      level: 'error',
      parts: [{ t: 'raw', k: 'string', v: 'Uncaught (in promise) ' + (r && r.message ? r.message : plain(r)) }],
      stack: r && r.stack ? r.stack : '',
      seq: seq++
    });
  });

  /* -------------------------------- network -------------------------------- */

  var netId = 0;

  function reportRequest(entry) { send('network', { entry: entry }); }

  function sizeOf(response) {
    var length = response.headers && response.headers.get('content-length');
    return length ? Number(length) : null;
  }

  if (typeof window.fetch === 'function') {
    var nativeFetch = window.fetch.bind(window);
    window.fetch = function (input, init) {
      var id = 'f' + netId++;
      var method = (init && init.method) || (input && input.method) || 'GET';
      var url = typeof input === 'string' ? input : (input && input.url) || String(input);
      var started = performance.now();
      reportRequest({ id: id, kind: 'fetch', method: method.toUpperCase(), url: url, status: null, ms: null, size: null });

      return nativeFetch(input, init).then(
        function (response) {
          reportRequest({
            id: id, kind: 'fetch', method: method.toUpperCase(), url: url,
            status: response.status, ok: response.ok,
            ms: Math.round(performance.now() - started), size: sizeOf(response)
          });
          return response;
        },
        function (error) {
          reportRequest({
            id: id, kind: 'fetch', method: method.toUpperCase(), url: url,
            status: 0, ok: false, error: String(error && error.message ? error.message : error),
            ms: Math.round(performance.now() - started), size: null
          });
          throw error;
        }
      );
    };
  }

  if (typeof window.XMLHttpRequest === 'function') {
    var NativeXhr = window.XMLHttpRequest;
    var open = NativeXhr.prototype.open;
    var xhrSend = NativeXhr.prototype.send;

    NativeXhr.prototype.open = function (method, url) {
      this.__editorNet = { id: 'x' + netId++, method: String(method).toUpperCase(), url: String(url) };
      return open.apply(this, arguments);
    };

    NativeXhr.prototype.send = function () {
      var meta = this.__editorNet;
      if (meta) {
        var started = performance.now();
        reportRequest({ id: meta.id, kind: 'xhr', method: meta.method, url: meta.url, status: null, ms: null, size: null });
        this.addEventListener('loadend', function () {
          reportRequest({
            id: meta.id, kind: 'xhr', method: meta.method, url: meta.url,
            status: this.status, ok: this.status >= 200 && this.status < 400,
            ms: Math.round(performance.now() - started),
            size: this.responseText ? this.responseText.length : null
          });
        });
      }
      return xhrSend.apply(this, arguments);
    };
  }

  /* -------------------------------- storage -------------------------------- */

  function memoryStorage() {
    var data = {};
    return {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(data, String(k)) ? data[String(k)] : null; },
      setItem: function (k, v) { data[String(k)] = String(v); },
      removeItem: function (k) { delete data[String(k)]; },
      clear: function () { data = {}; },
      key: function (i) { var k = Object.keys(data)[i]; return k === undefined ? null : k; },
      get length() { return Object.keys(data).length; }
    };
  }

  try { void window.localStorage.length; } catch (e) {
    try {
      Object.defineProperty(window, 'localStorage', { value: memoryStorage(), configurable: true });
      Object.defineProperty(window, 'sessionStorage', { value: memoryStorage(), configurable: true });
    } catch (err) {}
  }

  /* ----------------------------- host commands ----------------------------- */

  function patchCss(css) {
    var tag = document.getElementById('__editor_user_css');
    if (!tag) {
      tag = document.createElement('style');
      tag.id = '__editor_user_css';
      document.head.appendChild(tag);
    }
    tag.textContent = css;
  }

  function runEval(code) {
    var reply = function (parts, ok) { send('eval-result', { parts: parts, ok: ok, seq: seq++ }); };
    try {
      var result = (0, eval)(code);
      if (result && typeof result.then === 'function') {
        result.then(
          function (v) { reply([{ t: 'raw', k: 'string', v: 'Promise → ' }, serialize(v, 0, [])], true); },
          function (err) { reply([serialize(err, 0, [])], false); }
        );
      } else {
        reply([serialize(result, 0, [])], true);
      }
    } catch (err) {
      reply([serialize(err, 0, [])], false);
    }
  }

  var axeLoading = null;
  function loadAxe() {
    if (window.axe) return Promise.resolve(window.axe);
    if (axeLoading) return axeLoading;
    axeLoading = new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/axe-core@4.10.2/axe.min.js';
      script.onload = function () { resolve(window.axe); };
      script.onerror = function () { reject(new Error('Could not load axe-core. Check your connection.')); };
      document.head.appendChild(script);
    });
    return axeLoading;
  }

  function runAudit() {
    loadAxe()
      .then(function (axe) {
        return axe.run(document, {
          resultTypes: ['violations'],
          runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'best-practice'] }
        });
      })
      .then(function (results) {
        send('audit', {
          ok: true,
          violations: results.violations.map(function (v) {
            return {
              id: v.id,
              impact: v.impact || 'minor',
              help: v.help,
              helpUrl: v.helpUrl,
              nodes: v.nodes.slice(0, 10).map(function (n) {
                return { target: n.target.join(' '), html: n.html.slice(0, 200) };
              }),
              total: v.nodes.length
            };
          })
        });
      })
      .catch(function (error) {
        send('audit', { ok: false, message: String(error && error.message ? error.message : error) });
      });
  }

  window.addEventListener('message', function (e) {
    var data = e.data;
    if (!data || data.__editorHost !== true) return;
    if (data.type === 'eval') runEval(data.code);
    else if (data.type === 'patch-css') patchCss(data.css);
    else if (data.type === 'audit') runAudit();
  });

  /* ------------------------------- lifecycle ------------------------------- */

  window.addEventListener('DOMContentLoaded', function () { send('ready', {}); });

  // Shortcuts still need to reach the host while the frame holds focus.
  window.addEventListener('keydown', function (e) {
    if (!(e.metaKey || e.ctrlKey)) return;
    var k = e.key.toLowerCase();
    if (k === 'k' || k === 'enter' || k === 's' || k === '/' || (e.shiftKey && k === 'p')) {
      e.preventDefault();
      send('hotkey', { key: k, shift: e.shiftKey, alt: e.altKey });
    }
  });
})();
</script>`;
