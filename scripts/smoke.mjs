/**
 * Loads the built app in Chrome, exercises the main flows and reports any
 * console errors. Run with: node scripts/smoke.mjs [url]
 */
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';

const URL = process.argv[2] ?? 'http://localhost:4173/';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT = '/tmp/editor-shots';

mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--window-size=1440,900'],
  defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 2 },
});

const page = await browser.newPage();
const problems = [];

page.on('pageerror', (err) => problems.push(`pageerror: ${err.message}`));
page.on('console', (msg) => {
  if (msg.type() === 'error') problems.push(`console.error: ${msg.text()}`);
});
page.on('requestfailed', (req) => {
  const url = req.url();
  if (url.startsWith('http://localhost')) problems.push(`requestfailed: ${url}`);
});

const step = async (name, fn) => {
  try {
    await fn();
    console.log(`  ok   ${name}`);
  } catch (error) {
    console.log(`  FAIL ${name}: ${error.message}`);
    problems.push(`step "${name}": ${error.message}`);
  }
};

const shot = (name) => page.screenshot({ path: `${OUT}/${name}.png` });

const chord = async (key, { shift = false, alt = false } = {}) => {
  await page.keyboard.down('Meta');
  if (shift) await page.keyboard.down('Shift');
  if (alt) await page.keyboard.down('Alt');
  await page.keyboard.press(key);
  if (alt) await page.keyboard.up('Alt');
  if (shift) await page.keyboard.up('Shift');
  await page.keyboard.up('Meta');
};

const palette = async (query) => {
  await chord('KeyK');
  await page.waitForSelector('[aria-label="Command palette"]', { timeout: 4000 });
  await new Promise((r) => setTimeout(r, 150));
  await page.keyboard.type(query);
  await new Promise((r) => setTimeout(r, 350));
  const value = await page.$eval('[aria-label="Command palette"] input', (n) => n.value);
  if (value !== query) throw new Error(`palette query is "${value}", expected "${query}"`);
};

console.log(`Loading ${URL}`);
await page.goto(URL, { waitUntil: 'networkidle2' });
await page.waitForSelector('.cm-editor', { timeout: 15000 });
await new Promise((r) => setTimeout(r, 1500));

await step('boot splash removed', async () => {
  if (await page.$('#boot')) throw new Error('#boot still present');
});

await step('preview renders template content', async () => {
  const frame = page.frames().find((f) => f !== page.mainFrame());
  if (!frame) throw new Error('no preview frame');
  await frame.waitForSelector('.card h1', { timeout: 8000 });
  const text = await frame.$eval('.card h1', (el) => el.textContent);
  if (!text?.includes('Hello')) throw new Error(`unexpected heading: ${text}`);
});

await shot('01-default');

await step('typing in HTML updates the preview', async () => {
  await page.click('.cm-content');
  await page.keyboard.type('<p id="probe">typed</p>');
  await new Promise((r) => setTimeout(r, 1400));
  const frame = page.frames().find((f) => f !== page.mainFrame());
  await frame.waitForSelector('#probe', { timeout: 5000 });
});

await step('switch to the CSS pane', async () => {
  const [cssTab] = await page.$$('button ::-p-text(CSS)');
  await cssTab.click();
  await new Promise((r) => setTimeout(r, 300));
});

await step('console panel captures logs', async () => {
  await chord('KeyC', { shift: true });
  await new Promise((r) => setTimeout(r, 500));
  const shown = await page.$$eval('section', (nodes) =>
    nodes.some((n) => n.textContent?.includes('Console')),
  );
  if (!shown) throw new Error('console panel did not open');
  const logged = await page.$$eval('section', (nodes) =>
    nodes.some((n) => n.textContent?.includes('clicked')),
  );
  if (logged) throw new Error('unexpected pre-existing log');
});

await step('clicking in the preview logs to the console', async () => {
  const frame = page.frames().find((f) => f !== page.mainFrame());
  await frame.click('#cta');
  await new Promise((r) => setTimeout(r, 500));
  const logged = await page.$$eval('section', (nodes) =>
    nodes.some((n) => n.textContent?.includes('clicked')),
  );
  if (!logged) throw new Error('console.log was not forwarded to the host');
});

await shot('02-console');

await step('console evaluates expressions in the preview', async () => {
  await page.click('input[placeholder="Run an expression in the preview…"]');
  await page.keyboard.type('document.querySelectorAll("p").length');
  await page.keyboard.press('Enter');
  await new Promise((r) => setTimeout(r, 600));
  const text = await page.$$eval('section', (nodes) =>
    nodes.map((n) => n.textContent).join(' '),
  );
  if (!/querySelectorAll/.test(text)) throw new Error('input was not echoed');
});

const typeAtEnd = async (pane, text) => {
  await page.click(`[data-pane="${pane}"] .cm-content`);
  await page.keyboard.down('Meta');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.up('Meta');
  await page.keyboard.type(text);
};

const evalInConsole = async (code) => {
  await page.click('input[placeholder="Run an expression in the preview…"]');
  await page.keyboard.type(code);
  await page.keyboard.press('Enter');
  await new Promise((r) => setTimeout(r, 700));
};

await step('console.table renders a real table', async () => {
  await evalInConsole('console.table([{ name: "a", n: 1 }, { name: "b", n: 2 }])');
  const headers = await page.$$eval('section table th', (nodes) => nodes.map((n) => n.textContent));
  if (!headers.includes('name') || !headers.includes('n')) {
    throw new Error(`table headers were ${JSON.stringify(headers)}`);
  }
});

await step('objects arrive structured and expand', async () => {
  await evalInConsole('({ outer: { inner: { deep: 42 } } })');
  const text = await page.$$eval('section', (nodes) => nodes.map((n) => n.textContent).join(' '));
  if (!text.includes('deep: 42')) throw new Error('object was not serialised structurally');

  const buttons = await page.$$('section button');
  let expanded = false;
  for (const button of buttons.reverse()) {
    const label = await button.evaluate((n) => n.textContent ?? '');
    if (label.includes('outer')) {
      await button.click();
      expanded = true;
      break;
    }
  }
  if (!expanded) throw new Error('no disclosure control rendered for the object');
  await new Promise((r) => setTimeout(r, 300));
});

await step('network tab records requests', async () => {
  await evalInConsole('fetch("https://cdn.jsdelivr.net/npm/lz-string@1.5.0/package.json")');
  await new Promise((r) => setTimeout(r, 1500));
  const [networkTab] = await page.$$('button ::-p-text(Network)');
  await networkTab.click();
  await new Promise((r) => setTimeout(r, 400));
  const rows = await page.$$eval('section table tbody tr', (nodes) =>
    nodes.map((n) => n.textContent),
  );
  if (!rows.some((row) => row?.includes('package.json'))) {
    throw new Error(`no matching request row: ${JSON.stringify(rows)}`);
  }
  await shot('12-network');
  const [consoleTab] = await page.$$('button ::-p-text(Console)');
  await consoleTab.click();
});

await step('accessibility audit reports violations', async () => {
  const [auditTab] = await page.$$('button ::-p-text(Accessibility)');
  await auditTab.click();
  await new Promise((r) => setTimeout(r, 300));
  const [runButton] = await page.$$('button ::-p-text(Run audit)');
  await runButton.click();
  await page.waitForFunction(
    () => !document.body.textContent?.includes('Running…'),
    { timeout: 20000 },
  );
  await new Promise((r) => setTimeout(r, 500));
  const text = await page.evaluate(() => document.body.textContent ?? '');
  if (!/violated|No violations found/.test(text)) throw new Error('audit produced no result');
  await shot('13-audit');
  const [consoleTab] = await page.$$('button ::-p-text(Console)');
  await consoleTab.click();
});

await step('editing CSS keeps the preview alive', async () => {
  const frame = page.frames().find((f) => f !== page.mainFrame());
  await frame.click('#cta');
  await new Promise((r) => setTimeout(r, 300));
  const before = await frame.$eval('.count b', (n) => n.textContent);
  if (!Number(before)) throw new Error(`counter did not increment, it reads ${before}`);

  const [cssTab] = await page.$$('button ::-p-text(CSS)');
  await cssTab.click();
  await typeAtEnd('css', '\n.card { outline: 2px solid magenta; }');
  await new Promise((r) => setTimeout(r, 1800));

  const sameFrame = page.frames().find((f) => f !== page.mainFrame());
  const after = await sameFrame.$eval('.count b', (n) => n.textContent).catch(() => null);
  if (after !== before) throw new Error(`preview was rebuilt — counter went ${before} to ${after}`);

  const outline = await sameFrame.$eval('.card', (n) => getComputedStyle(n).outlineColor);
  if (!outline.includes('255, 0, 255')) throw new Error(`CSS was not applied, outline is ${outline}`);
});

await step('editing HTML still rebuilds the preview', async () => {
  const [htmlTab] = await page.$$('button ::-p-text(HTML)');
  await htmlTab.click();
  await typeAtEnd('html', '\n<span id="rebuilt"></span>');
  await new Promise((r) => setTimeout(r, 1800));
  const frame = page.frames().find((f) => f !== page.mainFrame());
  await frame.waitForSelector('#rebuilt', { timeout: 5000 });
  const counter = await frame.$eval('.count b', (n) => n.textContent);
  if (counter !== '0') throw new Error('preview should have been rebuilt from scratch');
});

await step('command palette opens and filters', async () => {
  await palette('templ');
  await shot('03-palette');
  await page.keyboard.press('Escape');
});

await step('templates dialog loads a template', async () => {
  await palette('browse templates');
  await page.keyboard.press('Enter');
  await page.waitForSelector('[aria-label="Templates"]', { timeout: 4000 });
  await shot('04-templates');
  const [tailwind] = await page.$$('button ::-p-text(Tailwind CSS)');
  await tailwind.click();
  await new Promise((r) => setTimeout(r, 2500));
  const frame = page.frames().find((f) => f !== page.mainFrame());
  await frame.waitForSelector('h1', { timeout: 8000 });
});

await shot('05-tailwind-template');

await step('settings dialog opens', async () => {
  await chord('Comma');
  await page.waitForSelector('[aria-label="Settings"]', { timeout: 4000 });
  await shot('06-settings');
  await page.keyboard.press('Escape');
});

await step('light theme applies', async () => {
  await palette('light theme');
  await page.keyboard.press('Enter');
  await new Promise((r) => setTimeout(r, 600));
  const theme = await page.evaluate(() => document.documentElement.dataset.theme);
  if (theme !== 'light') throw new Error(`theme is ${theme}`);
  await shot('07-light');
  await palette('dark theme');
  await page.keyboard.press('Enter');
  await new Promise((r) => setTimeout(r, 400));
});

await step('saving and reopening a pen persists it', async () => {
  await chord('KeyS');
  await new Promise((r) => setTimeout(r, 400));
  await chord('KeyO');
  await page.waitForSelector('[aria-label="Saved pens"]', { timeout: 4000 });
  const count = await page.$$eval('[aria-label="Saved pens"] li', (nodes) => nodes.length);
  if (count < 1) throw new Error('no saved pens listed');
  await shot('09-projects');
  await page.keyboard.press('Escape');
});

await step('libraries dialog adds a CDN entry', async () => {
  await palette('manage libraries');
  await page.keyboard.press('Enter');
  await page.waitForSelector('[aria-label="Libraries"]', { timeout: 4000 });
  await shot('10-libraries');
  await page.keyboard.press('Escape');
});

await step('a shared link restores a pen', async () => {
  const lz = await import('lz-string');
  const compressToEncodedURIComponent =
    lz.compressToEncodedURIComponent ?? lz.default.compressToEncodedURIComponent;
  const payload = {
    v: 1,
    t: 'Shared smoke pen',
    h: '<h1 id="shared">from a link</h1>',
    c: 'h1 { color: rebeccapurple }',
    j: 'console.log("shared pen ran")',
  };
  const link = `${URL}#pen=${compressToEncodedURIComponent(JSON.stringify(payload))}`;
  await page.goto(link, { waitUntil: 'networkidle2' });
  await page.waitForSelector('.cm-editor', { timeout: 10000 });
  await new Promise((r) => setTimeout(r, 1800));

  const title = await page.$eval('input[aria-label="Pen title"]', (n) => n.value);
  if (title !== 'Shared smoke pen') throw new Error(`title is "${title}"`);

  const frame = page.frames().find((f) => f !== page.mainFrame());
  await frame.waitForSelector('#shared', { timeout: 6000 });

  if (page.url().includes('#pen=')) throw new Error('hash was not cleared after import');
  await shot('11-shared');
});

await step('shared pens cannot reach host storage', async () => {
  const frame = page.frames().find((f) => f !== page.mainFrame());
  const leaked = await frame.evaluate(() => {
    try {
      return Boolean(window.parent.localStorage.getItem('editor:current'));
    } catch {
      return false;
    }
  });
  if (leaked) throw new Error('preview frame can read host localStorage');
});

await step('mobile layout renders', async () => {
  await page.setViewport({ width: 420, height: 860, deviceScaleFactor: 2, isMobile: true });
  await new Promise((r) => setTimeout(r, 800));
  await shot('08-mobile');
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await new Promise((r) => setTimeout(r, 500));
});

await browser.close();

if (problems.length) {
  console.log(`\n${problems.length} problem(s):`);
  for (const problem of [...new Set(problems)]) console.log(`  - ${problem}`);
  process.exit(1);
}

console.log('\nNo console errors. Screenshots in ' + OUT);
