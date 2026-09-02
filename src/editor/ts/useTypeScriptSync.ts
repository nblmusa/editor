import { useEffect } from 'react';
import type { PaneKey, Project } from '@/types';
import { syncProject } from './client';

const ENTRY_JS = '/index.js';
const ENTRY_TSX = '/index.tsx';

/** Virtual path the language service knows a pane by. */
export function tsFileName(project: Project, pane: PaneKey): string | null {
  if (pane === 'js') return project.jsFlavor === 'babel' ? ENTRY_TSX : ENTRY_JS;
  const module = project.modules.find((m) => m.id === pane);
  return module ? `/${module.name}` : null;
}

/** Mirrors the pen's scripts into the worker so completions stay current. */
export function useTypeScriptSync(project: Project, enabled: boolean): void {
  const entry = project.jsFlavor === 'babel' ? ENTRY_TSX : ENTRY_JS;
  const moduleKey = project.modules.map((m) => `${m.name}\u0000${m.code}`).join('\u0001');

  useEffect(() => {
    if (!enabled) return;
    const timer = window.setTimeout(() => {
      syncProject({
        entry,
        checked: project.jsFlavor === 'babel',
        files: [
          { name: entry, code: project.js },
          ...project.modules.map((module) => ({ name: `/${module.name}`, code: module.code })),
        ],
      });
    }, 250);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, entry, project.js, moduleKey, project.jsFlavor]);
}
