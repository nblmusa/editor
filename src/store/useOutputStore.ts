import { create } from 'zustand';
import type { AuditViolation, ConsoleEntry, ConsoleLevel, NetworkEntry, SerializedValue } from '@/types';

const MAX_ENTRIES = 500;
const MAX_REQUESTS = 200;
let nextId = 1;

type AuditState =
  | { status: 'idle' }
  | { status: 'running' }
  | { status: 'done'; violations: AuditViolation[]; at: number }
  | { status: 'failed'; message: string };

interface OutputState {
  entries: ConsoleEntry[];
  requests: NetworkEntry[];
  audit: AuditState;
  unreadErrors: number;

  push: (entry: { level: ConsoleLevel; parts: SerializedValue[]; stack?: string }) => void;
  pushText: (level: ConsoleLevel, text: string) => void;
  recordRequest: (entry: Omit<NetworkEntry, 'at'>) => void;
  setAudit: (audit: AuditState) => void;
  clear: () => void;
  clearRequests: () => void;
  clearUnread: () => void;
}

const fingerprint = (parts: SerializedValue[]) => JSON.stringify(parts);

export const useOutputStore = create<OutputState>()((set) => ({
  entries: [],
  requests: [],
  audit: { status: 'idle' },
  unreadErrors: 0,

  push: ({ level, parts, stack }) =>
    set((state) => {
      const last = state.entries.at(-1);
      // Collapse identical consecutive messages, the way devtools does.
      if (last && last.level === level && fingerprint(last.parts) === fingerprint(parts)) {
        const entries = state.entries.slice(0, -1);
        entries.push({ ...last, count: last.count + 1, at: Date.now() });
        return { entries };
      }

      const entries = [
        ...state.entries,
        { id: nextId++, level, parts, stack, count: 1, at: Date.now() },
      ];
      return {
        entries: entries.length > MAX_ENTRIES ? entries.slice(-MAX_ENTRIES) : entries,
        unreadErrors: level === 'error' ? state.unreadErrors + 1 : state.unreadErrors,
      };
    }),

  pushText: (level, text) =>
    set((state) => ({
      entries: [
        ...state.entries,
        {
          id: nextId++,
          level,
          parts: [{ t: 'raw', k: 'string', v: text } as SerializedValue],
          count: 1,
          at: Date.now(),
        },
      ].slice(-MAX_ENTRIES),
      unreadErrors: level === 'error' ? state.unreadErrors + 1 : state.unreadErrors,
    })),

  recordRequest: (entry) =>
    set((state) => {
      const index = state.requests.findIndex((r) => r.id === entry.id);
      if (index >= 0) {
        const requests = state.requests.slice();
        requests[index] = { ...requests[index], ...entry };
        return { requests };
      }
      const requests = [...state.requests, { ...entry, at: Date.now() }];
      return { requests: requests.length > MAX_REQUESTS ? requests.slice(-MAX_REQUESTS) : requests };
    }),

  setAudit: (audit) => set({ audit }),

  clear: () => set({ entries: [], requests: [], unreadErrors: 0, audit: { status: 'idle' } }),
  clearRequests: () => set({ requests: [] }),
  clearUnread: () => set({ unreadErrors: 0 }),
}));
