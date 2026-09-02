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
    libraries: [],
    jsFlavor: 'javascript',
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
    libraries: template.libraries ?? [],
    jsFlavor: template.jsFlavor ?? 'javascript',
  });
}

export function defaultProject(): Project {
  return projectFromTemplate(defaultTemplate);
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
