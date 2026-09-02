import type { Project, Revision, RevisionReason, Settings } from '@/types';
import { db } from './db';
import { uid } from './project';

const KEYS = {
  settings: 'editor:settings',
  migrated: 'editor:migrated',
  // Written by earlier versions of the app.
  legacyCurrent: 'editor:current',
  legacyProjects: 'editor:projects',
  legacyAngular: 'split-content',
} as const;

export const MAX_REVISIONS = 60;

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
    /* storage disabled or full — the app still works for this session */
  }
}

/**
 * Settings stay in localStorage: they are tiny and reading them synchronously
 * at boot avoids a flash of the wrong theme.
 */
export const settingsStore = {
  load: () => read<Partial<Settings>>(KEYS.settings),
  save: (settings: Settings) => write(KEYS.settings, settings),
};

/**
 * Pens moved to IndexedDB — localStorage caps out around 5 MB and throws
 * synchronously once a pen embeds an image or a sizeable dataset.
 */
export const penStore = {
  loadAll: () => db.getPens(),
  save: (pen: Project) => db.putPen(pen),
  saveMany: (pens: Project[]) => db.putPens(pens),
  remove: (id: string) => db.deletePen(id),

  loadCurrent: () => db.getCurrent(),
  saveCurrent: (pen: Project) => db.setCurrent(pen),
};

export const revisionStore = {
  list: (penId: string) => db.listRevisions(penId),
  remove: (id: string) => db.deleteRevision(id),

  async add(pen: Project, reason: RevisionReason): Promise<Revision | null> {
    const existing = await db.listRevisions(pen.id);
    const latest = existing[0];

    // Nothing changed since the last snapshot, so there is nothing to record.
    if (
      latest &&
      latest.html === pen.html &&
      latest.css === pen.css &&
      latest.js === pen.js &&
      latest.title === pen.title
    ) {
      return null;
    }

    const revision: Revision = {
      id: uid(),
      penId: pen.id,
      title: pen.title,
      html: pen.html,
      css: pen.css,
      js: pen.js,
      libraries: pen.libraries,
      jsFlavor: pen.jsFlavor,
      reason,
      at: Date.now(),
    };

    await db.addRevision(revision);
    await db.pruneRevisions(pen.id, MAX_REVISIONS);
    return revision;
  },
};

/** One-time move of anything written by an earlier version into IndexedDB. */
export async function migrateLegacyData(): Promise<void> {
  if (localStorage.getItem(KEYS.migrated)) return;

  const legacyProjects = read<Project[]>(KEYS.legacyProjects);
  if (legacyProjects?.length) {
    await db.putPens(legacyProjects);
    localStorage.removeItem(KEYS.legacyProjects);
  }

  const legacyCurrent = read<Project>(KEYS.legacyCurrent);
  if (legacyCurrent && !(await db.getCurrent())) {
    await db.setCurrent(legacyCurrent);
    localStorage.removeItem(KEYS.legacyCurrent);
  }

  write(KEYS.migrated, Date.now());
}

/** The Angular version of this app stored a single blob of HTML. */
export function readAngularLegacyCode(): string | null {
  try {
    const raw = localStorage.getItem(KEYS.legacyAngular);
    if (!raw) return null;
    const value = JSON.parse(raw);
    localStorage.removeItem(KEYS.legacyAngular);
    return typeof value === 'string' && value.trim() ? value : null;
  } catch {
    return null;
  }
}
