# Editor

A fast, private playground for HTML, CSS and JavaScript. Write code in three panes, see the result
render as you type, and read the output in a built-in console. Nothing leaves your browser.

**Live at [editor.nabilmusa.com](https://editor.nabilmusa.com)**

## Features

**Editing**

- Separate HTML, CSS and JS panes, shown as tabs or side by side
- CodeMirror 6 with autocomplete, bracket matching, code folding, multiple cursors and search
- Emmet abbreviations in HTML and CSS (`ul>li*3` then <kbd>Tab</kbd>)
- Prettier formatting for any pane with <kbd>Shift</kbd>+<kbd>Alt</kbd>+<kbd>F</kbd>
- Inline syntax error markers
- Optional Vim key bindings

**Preview**

- Live rendering as you type, with an adjustable debounce, or manual runs only
- Console panel that captures `log`, `warn`, `error`, `table`, `count`, `time`, uncaught errors and
  rejected promises — plus an input for evaluating expressions inside the running page
- Responsive preview widths for mobile and tablet, and open-in-new-tab
- JSX and TypeScript in the JS pane, compiled in the browser with Babel

**Pens**

- Autosaves as you work; save named pens and reopen them later
- Share a pen as a URL — the whole thing is compressed into the link, no server involved
- Templates for React, Tailwind, Three.js, Canvas, fetch and form validation
- Add libraries from a CDN, either from the built-in list or any URL
- Download a pen as a single `.html` file or a `.zip`, and export or import your whole library as JSON

**Interface**

- Command palette (<kbd>Cmd</kbd>+<kbd>K</kbd>) for every action
- Dark and light themes, resizable panes, horizontal or vertical splits
- Works on phones with a dedicated tab bar

## Safety

The preview runs in a sandboxed iframe **without** `allow-same-origin`, so it has an opaque origin
and cannot read the storage or DOM of the page hosting it. Opening someone else's shared link cannot
expose your saved pens. Because that also disables the real `localStorage`, the preview is given an
in-memory replacement so code that uses it still runs.

## Development

```bash
npm install
npm run dev        # http://localhost:5173
```

Other scripts:

| Script              | What it does                                              |
| ------------------- | --------------------------------------------------------- |
| `npm run build`     | Typechecks and builds into `docs/`                        |
| `npm run preview`   | Serves the built output on port 4173                      |
| `npm run typecheck` | TypeScript only                                           |
| `npm run smoke`     | Drives the built app in Chrome and checks the main flows  |

The smoke test needs `npm run preview` running in another terminal and uses the local Google Chrome
install through `puppeteer-core`.

## Stack

Vite, React, TypeScript, Tailwind CSS and CodeMirror 6. Prettier, JSZip and the Vim key bindings are
loaded on demand so they stay out of the initial download.

## Deployment

GitHub Pages serves the `docs/` folder from the default branch, with `public/CNAME` pointing at the
custom domain. Pushing to `master` runs `.github/workflows/deploy.yml`, which builds and commits
`docs/` if the output changed.
