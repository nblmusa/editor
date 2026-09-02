import type { Project, Revision } from '@/types';

const DB_NAME = 'editor';
const DB_VERSION = 1;

const PENS = 'pens';
const REVISIONS = 'revisions';
const META = 'meta';

const CURRENT_KEY = 'current';

let connection: Promise<IDBDatabase | null> | null = null;

function open(): Promise<IDBDatabase | null> {
  if (connection) return connection;

  connection = new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') {
      resolve(null);
      return;
    }

    let request: IDBOpenDBRequest;
    try {
      request = indexedDB.open(DB_NAME, DB_VERSION);
    } catch {
      resolve(null);
      return;
    }

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(PENS)) {
        database.createObjectStore(PENS, { keyPath: 'id' });
      }
      if (!database.objectStoreNames.contains(REVISIONS)) {
        const store = database.createObjectStore(REVISIONS, { keyPath: 'id' });
        store.createIndex('penId', 'penId');
      }
      if (!database.objectStoreNames.contains(META)) {
        database.createObjectStore(META);
      }
    };

    request.onsuccess = () => resolve(request.result);
    // Private browsing and blocked storage both land here; the app keeps
    // working in memory and simply cannot persist.
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  });

  return connection;
}

function run<T>(
  storeName: string,
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest,
): Promise<T | null> {
  return open().then(
    (database) =>
      new Promise<T | null>((resolve) => {
        if (!database) {
          resolve(null);
          return;
        }
        try {
          const transaction = database.transaction(storeName, mode);
          const request = action(transaction.objectStore(storeName));
          request.onsuccess = () => resolve(request.result as T);
          request.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      }),
  );
}

export const db = {
  async available(): Promise<boolean> {
    return (await open()) !== null;
  },

  async getPens(): Promise<Project[]> {
    const pens = await run<Project[]>(PENS, 'readonly', (store) => store.getAll());
    return (pens ?? []).sort((a, b) => b.updatedAt - a.updatedAt);
  },

  async putPen(pen: Project): Promise<void> {
    await run(PENS, 'readwrite', (store) => store.put(pen));
  },

  async putPens(pens: Project[]): Promise<void> {
    await Promise.all(pens.map((pen) => db.putPen(pen)));
  },

  async deletePen(id: string): Promise<void> {
    await run(PENS, 'readwrite', (store) => store.delete(id));
    await db.deleteRevisionsFor(id);
  },

  async getCurrent(): Promise<Project | null> {
    return (await run<Project>(META, 'readonly', (store) => store.get(CURRENT_KEY))) ?? null;
  },

  async setCurrent(pen: Project): Promise<void> {
    await run(META, 'readwrite', (store) => store.put(pen, CURRENT_KEY));
  },

  async addRevision(revision: Revision): Promise<void> {
    await run(REVISIONS, 'readwrite', (store) => store.put(revision));
  },

  async listRevisions(penId: string): Promise<Revision[]> {
    const all = await run<Revision[]>(REVISIONS, 'readonly', (store) =>
      store.index('penId').getAll(penId),
    );
    return (all ?? []).sort((a, b) => b.at - a.at);
  },

  async deleteRevision(id: string): Promise<void> {
    await run(REVISIONS, 'readwrite', (store) => store.delete(id));
  },

  async deleteRevisionsFor(penId: string): Promise<void> {
    const existing = await db.listRevisions(penId);
    await Promise.all(existing.map((revision) => db.deleteRevision(revision.id)));
  },

  /** Keeps storage bounded — only the newest `keep` revisions survive. */
  async pruneRevisions(penId: string, keep: number): Promise<void> {
    const existing = await db.listRevisions(penId);
    await Promise.all(existing.slice(keep).map((revision) => db.deleteRevision(revision.id)));
  },

  async estimate(): Promise<{ usage: number; quota: number } | null> {
    if (!navigator.storage?.estimate) return null;
    const { usage = 0, quota = 0 } = await navigator.storage.estimate();
    return { usage, quota };
  },
};
