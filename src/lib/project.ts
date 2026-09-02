import type { Project } from '@/types';
import { defaultTemplate, type Template } from './templates';

export function uid(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function createProject(partial: Partial<Project> = {}): Project {
  const now = Date.now();
  return {
    id: uid(),
    title: 'Untitled pen',
    html: '',
    css: '',
    js: '',
    modules: [],
    libraries: [],
    jsFlavor: 'javascript',
    htmlLang: 'html',
    cssLang: 'css',
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

export function projectFromTemplate(template: Template): Project {
  return createProject({
    title: template.id === 'blank' ? 'Untitled pen' : template.name,
    html: template.html,
    css: template.css,
    js: template.js,
    modules: (template.modules ?? []).map((module) => ({ ...module, id: uid() })),
    libraries: template.libraries ?? [],
    jsFlavor: template.jsFlavor ?? 'javascript',
    htmlLang: template.htmlLang ?? 'html',
    cssLang: template.cssLang ?? 'css',
  });
}

export function defaultProject(): Project {
  return projectFromTemplate(defaultTemplate);
}

/** Keeps module names unique and safe to use as an import specifier. */
export function normalizeModuleName(raw: string, taken: string[]): string {
  let name = raw
    .trim()
    .replace(/^\.?\//, '')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/^-+|-+$/g, '');

  if (!name) name = 'module';
  if (!/\.[a-z]+$/i.test(name)) name += '.js';

  if (!taken.includes(name)) return name;

  const [, base, extension] = /^(.*?)(\.[a-z]+)$/i.exec(name) ?? [, name, ''];
  let n = 2;
  while (taken.includes(`${base}-${n}${extension}`)) n++;
  return `${base}-${n}${extension}`;
}

export function isEmpty(project: Project): boolean {
  return !project.html.trim() && !project.css.trim() && !project.js.trim();
}

export function slugify(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'pen'
  );
}
