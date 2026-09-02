import type { CssLang, HtmlLang, JsFlavor, Library } from '@/types';

export interface Template {
  id: string;
  name: string;
  description: string;
  tag: string;
  html: string;
  css: string;
  js: string;
  libraries?: Library[];
  jsFlavor?: JsFlavor;
  htmlLang?: HtmlLang;
  cssLang?: CssLang;
}

const lib = (name: string, url: string, kind: 'js' | 'css' = 'js'): Library => ({
  id: `${name}-${url}`,
  name,
  url,
  kind,
});

export const templates: Template[] = [
  {
    id: 'starter',
    name: 'Starter',
    description: 'A small styled page to build on top of.',
    tag: 'Basics',
    html: `<main class="card">
  <h1>Hello, world</h1>
  <p>Edit the HTML, CSS and JS panes — the preview updates as you type.</p>
  <button id="cta">Click me</button>
  <p class="count" hidden>Clicked <b>0</b> times</p>
</main>`,
    css: `:root {
  --accent: #2dd4bf;
}

body {
  min-height: 100vh;
  margin: 0;
  display: grid;
  place-items: center;
  background: radial-gradient(120% 120% at 50% 0%, #1b2130, #0d1017);
  color: #e8ecf3;
  font-family: system-ui, sans-serif;
}

.card {
  width: min(420px, 90vw);
  padding: 32px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.45);
  text-align: center;
}

h1 {
  margin: 0 0 8px;
  font-size: 28px;
  background: linear-gradient(90deg, var(--accent), #60a5fa);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

p { color: #9aa4b6; line-height: 1.6; }

button {
  margin-top: 12px;
  padding: 10px 20px;
  border: 0;
  border-radius: 999px;
  background: var(--accent);
  color: #06231f;
  font: 600 14px system-ui;
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
}

button:hover { transform: translateY(-1px); box-shadow: 0 8px 20px rgba(45, 212, 191, 0.3); }`,
    js: `const button = document.querySelector('#cta');
const readout = document.querySelector('.count');
let clicks = 0;

button.addEventListener('click', () => {
  clicks++;
  readout.hidden = false;
  readout.querySelector('b').textContent = clicks;
  console.log('clicked', clicks, 'time(s)');
});`,
  },
  {
    id: 'blank',
    name: 'Blank',
    description: 'Nothing but an empty document.',
    tag: 'Basics',
    html: '',
    css: '',
    js: '',
  },
  {
    id: 'react',
    name: 'React',
    description: 'React 19 with JSX, compiled in the browser.',
    tag: 'Framework',
    jsFlavor: 'babel',
    html: `<div id="root"></div>`,
    css: `body {
  margin: 0;
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: #0f1219;
  color: #e6e9ef;
  font-family: system-ui, sans-serif;
}

.counter {
  display: flex;
  align-items: center;
  gap: 16px;
}

.counter button {
  width: 44px;
  height: 44px;
  font-size: 20px;
  border-radius: 12px;
  border: 1px solid #2a3040;
  background: #171b25;
  color: inherit;
  cursor: pointer;
}

.counter button:hover { border-color: #2dd4bf; color: #2dd4bf; }
.value { font-size: 40px; font-variant-numeric: tabular-nums; min-width: 3ch; text-align: center; }`,
    js: `import React, { useState } from 'https://cdn.jsdelivr.net/npm/react@19/+esm';
import { createRoot } from 'https://cdn.jsdelivr.net/npm/react-dom@19/client/+esm';

function Counter() {
  const [count, setCount] = useState(0);
  return (
    <div className="counter">
      <button onClick={() => setCount((c) => c - 1)}>−</button>
      <div className="value">{count}</div>
      <button onClick={() => setCount((c) => c + 1)}>+</button>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<Counter />);`,
  },
  {
    id: 'tailwind',
    name: 'Tailwind CSS',
    description: 'Utility-first styling via the Tailwind browser build.',
    tag: 'Framework',
    libraries: [lib('tailwindcss', 'https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4')],
    html: `<div class="min-h-screen bg-slate-950 text-slate-100 grid place-items-center p-6">
  <div class="w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
    <div class="size-11 rounded-xl bg-gradient-to-br from-teal-400 to-sky-500"></div>
    <h1 class="mt-4 text-xl font-semibold">Tailwind is ready</h1>
    <p class="mt-1 text-sm text-slate-400">Every utility class works right away — no build step.</p>
    <button class="mt-5 w-full rounded-lg bg-teal-400 py-2.5 text-sm font-semibold text-teal-950 hover:bg-teal-300">
      Get started
    </button>
  </div>
</div>`,
    css: '',
    js: '',
  },
  {
    id: 'canvas',
    name: 'Canvas animation',
    description: 'A requestAnimationFrame particle field.',
    tag: 'Graphics',
    html: `<canvas id="scene"></canvas>`,
    css: `body { margin: 0; background: #05070c; overflow: hidden; }
canvas { display: block; width: 100vw; height: 100vh; }`,
    js: `const canvas = document.getElementById('scene');
const ctx = canvas.getContext('2d');
let particles = [];

function resize() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = innerWidth * dpr;
  canvas.height = innerHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function seed() {
  particles = Array.from({ length: 90 }, () => ({
    x: Math.random() * innerWidth,
    y: Math.random() * innerHeight,
    vx: (Math.random() - 0.5) * 0.6,
    vy: (Math.random() - 0.5) * 0.6,
  }));
}

function frame() {
  ctx.fillStyle = 'rgba(5, 7, 12, 0.25)';
  ctx.fillRect(0, 0, innerWidth, innerHeight);

  for (const p of particles) {
    p.x = (p.x + p.vx + innerWidth) % innerWidth;
    p.y = (p.y + p.vy + innerHeight) % innerHeight;
  }

  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const a = particles[i];
      const b = particles[j];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d > 120) continue;
      ctx.strokeStyle = \`rgba(45, 212, 191, \${(1 - d / 120) * 0.4})\`;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  }

  requestAnimationFrame(frame);
}

addEventListener('resize', () => { resize(); seed(); });
resize();
seed();
frame();`,
  },
  {
    id: 'fetch',
    name: 'Fetch & render',
    description: 'Call a public API and render the result.',
    tag: 'Data',
    html: `<section>
  <h1>Random users</h1>
  <button id="reload">Reload</button>
  <ul id="list"><li class="empty">Loading…</li></ul>
</section>`,
    css: `body { margin: 0; padding: 32px; background: #0f1219; color: #e6e9ef; font-family: system-ui, sans-serif; }
section { max-width: 480px; margin: 0 auto; }
h1 { font-size: 20px; }
button { padding: 6px 14px; border-radius: 8px; border: 1px solid #2a3040; background: #171b25; color: inherit; cursor: pointer; }
ul { list-style: none; padding: 0; margin-top: 16px; display: grid; gap: 8px; }
li { padding: 12px 14px; border-radius: 10px; background: #171b25; border: 1px solid #232a38; }
.empty { color: #7d8698; }`,
    js: `const list = document.getElementById('list');

async function load() {
  list.innerHTML = '<li class="empty">Loading…</li>';
  try {
    const res = await fetch('https://randomuser.me/api/?results=5&inc=name,email');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const { results } = await res.json();
    list.innerHTML = results
      .map((u) => \`<li><b>\${u.name.first} \${u.name.last}</b><br><small>\${u.email}</small></li>\`)
      .join('');
  } catch (err) {
    console.error(err);
    list.innerHTML = \`<li class="empty">Could not load: \${err.message}</li>\`;
  }
}

document.getElementById('reload').addEventListener('click', load);
load();`,
  },
  {
    id: 'three',
    name: 'Three.js',
    description: 'A rotating 3D object with lighting.',
    tag: 'Graphics',
    html: '',
    css: `body { margin: 0; overflow: hidden; background: #05070c; }`,
    js: `import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 100);
camera.position.z = 4;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(devicePixelRatio);
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);

const mesh = new THREE.Mesh(
  new THREE.TorusKnotGeometry(1, 0.32, 160, 24),
  new THREE.MeshStandardMaterial({ color: 0x2dd4bf, roughness: 0.25, metalness: 0.6 })
);
scene.add(mesh);
scene.add(new THREE.AmbientLight(0xffffff, 0.4));

const key = new THREE.DirectionalLight(0xffffff, 2.5);
key.position.set(3, 4, 5);
scene.add(key);

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

renderer.setAnimationLoop((t) => {
  mesh.rotation.set(t / 3000, t / 2000, 0);
  renderer.render(scene, camera);
});`,
  },
  {
    id: 'form',
    name: 'Form & validation',
    description: 'An accessible form with live validation.',
    tag: 'Basics',
    html: `<form id="signup" novalidate>
  <h1>Create account</h1>

  <label for="email">Email</label>
  <input id="email" name="email" type="email" required placeholder="you@example.com" />
  <p class="error" data-for="email"></p>

  <label for="password">Password</label>
  <input id="password" name="password" type="password" required minlength="8" placeholder="At least 8 characters" />
  <p class="error" data-for="password"></p>

  <button type="submit">Sign up</button>
  <p class="ok" hidden>Account created.</p>
</form>`,
    css: `body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #0f1219; color: #e6e9ef; font-family: system-ui, sans-serif; }
form { width: min(360px, 88vw); display: grid; gap: 6px; }
h1 { font-size: 20px; margin: 0 0 10px; }
label { font-size: 13px; color: #9aa4b6; }
input { padding: 10px 12px; border-radius: 8px; border: 1px solid #2a3040; background: #151923; color: inherit; font: inherit; }
input:focus { outline: 2px solid #2dd4bf; outline-offset: 1px; }
input[aria-invalid='true'] { border-color: #f87171; }
.error { min-height: 16px; margin: 0 0 6px; font-size: 12px; color: #f87171; }
button { margin-top: 6px; padding: 11px; border: 0; border-radius: 8px; background: #2dd4bf; color: #06231f; font: 600 14px system-ui; cursor: pointer; }
.ok { color: #4ade80; font-size: 13px; }`,
    js: `const form = document.getElementById('signup');

const rules = {
  email: (v) => (/^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(v) ? '' : 'Enter a valid email address.'),
  password: (v) => (v.length >= 8 ? '' : 'Use at least 8 characters.'),
};

function validate(field) {
  const message = rules[field.name](field.value.trim());
  field.setAttribute('aria-invalid', String(Boolean(message)));
  form.querySelector(\`[data-for="\${field.name}"]\`).textContent = message;
  return !message;
}

form.addEventListener('input', (e) => {
  if (e.target.name in rules) validate(e.target);
});

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const fields = [...form.elements].filter((el) => el.name in rules);
  const valid = fields.map(validate).every(Boolean);
  form.querySelector('.ok').hidden = !valid;
  if (valid) console.log('submitted', Object.fromEntries(new FormData(form)));
});`,
  },
  {
    id: 'markdown-scss',
    name: 'Markdown + SCSS',
    description: 'Write prose as Markdown and style it with nested Sass rules.',
    tag: 'Preprocessors',
    htmlLang: 'markdown',
    cssLang: 'scss',
    html: `# Release notes

A pen that runs its markup through **Markdown** and its styles through **Sass**.

## What changed

- Preview keeps its state while you tweak styling
- Console shows real objects, not flattened text
- Everything works offline

> Switch the language back with the chip above each pane.

\`\`\`js
const editor = { fast: true, private: true };
\`\`\`

[Read more](https://developer.mozilla.org)`,
    css: `$accent: #2dd4bf;
$ink: #e6e9ef;
$muted: #9aa4b6;

@mixin card {
  padding: 32px clamp(20px, 5vw, 48px);
  border-radius: 14px;
  background: #151923;
  border: 1px solid rgba(255, 255, 255, 0.06);
}

html {
  background: #0f1219;
}

body {
  max-width: 680px;
  margin: 40px auto;
  color: $ink;
  font: 16px/1.7 system-ui, sans-serif;
  @include card;
}

h1 {
  margin-top: 0;
  font-size: 28px;

  + p {
    color: $muted;
  }
}

h2 {
  margin-top: 28px;
  font-size: 18px;
  color: $accent;
}

blockquote {
  margin: 24px 0;
  padding-left: 16px;
  border-left: 3px solid $accent;
  color: $muted;
}

code {
  padding: 2px 5px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.07);
  font-size: 0.9em;
}

pre code {
  display: block;
  padding: 14px 16px;
  overflow-x: auto;
}

a {
  color: $accent;

  &:hover {
    text-decoration-thickness: 2px;
  }
}`,
    js: `console.log('Markdown and SCSS are compiled in the browser.');`,
  },
];

export const defaultTemplate = templates[0];
