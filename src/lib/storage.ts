import type { Project, Settings } from '@/types';

const KEYS = {
  current: 'editor:current',
  projects: 'editor:projects',
  settings: 'editor:settings',
  legacy: 'split-content',
} as const;

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota exceeded or storage disabled — the app still works in memory */
  }
}

export const storage = {
  loadCurrent: () => read<Project>(KEYS.current),
  saveCurrent: (project: Project) => write(KEYS.current, project),

  loadProjects: () => read<Project[]>(KEYS.projects) ?? [],
  saveProjects: (projects: Project[]) => write(KEYS.projects, projects),

  loadSettings: () => read<Partial<Settings>>(KEYS.settings),
  saveSettings: (settings: Settings) => write(KEYS.settings, settings),

  /** Picks up the single blob of HTML saved by the previous version of the app. */
  loadLegacyCode(): string | null {
    try {
      const raw = localStorage.getItem(KEYS.legacy);
      if (!raw) return null;
      const value = JSON.parse(raw);
      localStorage.removeItem(KEYS.legacy);
      return typeof value === 'string' && value.trim() ? value : null;
    } catch {
      return null;
    }
  },
};
