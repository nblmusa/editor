import type { Project } from '@/types';
import { buildStandaloneDoc } from './srcdoc';
import { slugify } from './project';

function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadHtml(project: Project): void {
  const doc = buildStandaloneDoc(project);
  download(new Blob([doc], { type: 'text/html' }), `${slugify(project.title)}.html`);
}

export async function downloadZip(project: Project): Promise<void> {
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  const name = slugify(project.title);

  const cssLinks = project.libraries
    .filter((l) => l.kind === 'css')
    .map((l) => `    <link rel="stylesheet" href="${l.url}">`)
    .join('\n');
  const jsLinks = project.libraries
    .filter((l) => l.kind === 'js')
    .map((l) => `    <script src="${l.url}"></script>`)
    .join('\n');

  zip.file(
    'index.html',
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${project.title}</title>
${cssLinks}
    <link rel="stylesheet" href="style.css">
  </head>
  <body>
${project.html}
${jsLinks}
    <script type="module" src="script.js"></script>
  </body>
</html>
`,
  );
  zip.file('style.css', project.css);
  zip.file('script.js', project.js);
  zip.file(
    'README.md',
    `# ${project.title}\n\nExported from Editor.\n\nOpen \`index.html\` in a browser, or serve the folder with any static file server.\n`,
  );

  download(await zip.generateAsync({ type: 'blob' }), `${name}.zip`);
}

export function exportJson(projects: Project[]): void {
  const blob = new Blob([JSON.stringify(projects, null, 2)], { type: 'application/json' });
  download(blob, `editor-pens-${new Date().toISOString().slice(0, 10)}.json`);
}

export function importJson(file: File): Promise<Project[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read that file.'));
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const list = Array.isArray(parsed) ? parsed : [parsed];
        const valid = list.filter(
          (p): p is Project => p && typeof p === 'object' && typeof p.html === 'string',
        );
        if (!valid.length) throw new Error('No pens found in that file.');
        resolve(valid);
      } catch (error) {
        reject(error instanceof Error ? error : new Error('Invalid file.'));
      }
    };
    reader.readAsText(file);
  });
}
