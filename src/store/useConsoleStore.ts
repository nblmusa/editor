import { create } from 'zustand';
import type { ConsoleEntry, ConsoleLevel } from '@/types';

const MAX_ENTRIES = 400;
let nextId = 1;

interface ConsoleState {
  entries: ConsoleEntry[];
  unreadErrors: number;
  push: (entry: { level: ConsoleLevel; parts: string[]; stack?: string }) => void;
  clear: () => void;
  clearUnread: () => void;
}

export const useConsoleStore = create<ConsoleState>()((set) => ({
  entries: [],
  unreadErrors: 0,

  push: ({ level, parts, stack }) =>
    set((state) => {
      const last = state.entries.at(-1);
      // Collapse identical consecutive messages, like devtools does.
      if (last && last.level === level && last.parts.join('\u0000') === parts.join('\u0000')) {
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

  clear: () => set({ entries: [], unreadErrors: 0 }),
  clearUnread: () => set({ unreadErrors: 0 }),
}));
