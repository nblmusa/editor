/**
 * Wires extra modules into the preview.
 *
 * The frame has an opaque origin, so a blob URL minted by the host is
 * unreachable from inside it — the modules have to be turned into blobs by the
 * frame itself. Relative specifiers are rewritten to bare ones first, because
 * `./utils.js` resolved against a blob URL goes nowhere, while a bare specifier
 * passes through the import map.
 */
export const MODULE_LOADER = String.raw`
<script>
(function () {
  var holder = document.getElementById('__editor_modules');
  var entryHolder = document.getElementById('__editor_entry');
  if (!holder || !entryHolder) return;

  var modules;
  try { modules = JSON.parse(holder.textContent || '[]'); } catch (e) { modules = []; }
  var entry = entryHolder.textContent || '';
  var names = modules.map(function (m) { return m.name; });

  function fail(message) {
    console.error(message);
  }

  // Rewrites the specifier in every static and dynamic import that points at a
  // sibling module, leaving package imports and URLs untouched.
  function rewrite(code) {
    return code.replace(
      /(\bfrom\s*|\bimport\s*|\bimport\s*\(\s*)(['"])([^'"]+)\2/g,
      function (whole, lead, quote, specifier) {
        var bare = specifier.replace(/^\.\//, '');
        return names.indexOf(bare) === -1 ? whole : lead + quote + bare + quote;
      }
    );
  }

  var useBabel = entryHolder.getAttribute('data-babel') === 'true';

  function compile(code, filename) {
    if (!useBabel) return code;
    if (typeof Babel === 'undefined') {
      fail('JSX/TS compilation is unavailable — Babel could not be loaded.');
      return code;
    }
    try {
      return Babel.transform(code, {
        filename: filename,
        // Modules are named after the tab, so the entry is index.js and a
        // module is utils.js. The TypeScript preset decides whether to parse
        // annotations from the extension, and would refuse every one of them
        // on a .js name, so it has to be told to treat them all as TSX.
        presets: [
          ['env', { modules: false }],
          'react',
          ['typescript', { allExtensions: true, isTSX: true }],
        ],
      }).code;
    } catch (error) {
      fail(filename + ': ' + (error && error.message ? error.message : error));
      return '';
    }
  }

  var imports = {};
  modules.forEach(function (module) {
    var source = rewrite(compile(module.code, module.name));
    var url = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
    imports[module.name] = url;
    imports['./' + module.name] = url;
  });

  // The map has to land before anything resolves a module specifier.
  var map = document.createElement('script');
  map.type = 'importmap';
  map.textContent = JSON.stringify({ imports: imports });
  document.head.appendChild(map);

  var script = document.createElement('script');
  script.type = 'module';
  script.textContent = rewrite(compile(entry, 'index.js'));
  document.body.appendChild(script);
})();
</script>`;
