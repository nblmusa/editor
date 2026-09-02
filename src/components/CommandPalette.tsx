import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import clsx from 'clsx';
import { createPortal } from 'react-dom';
import { Search } from 'lucide-react';
import { formatShortcut } from './ui';

export interface Command {
  id: string;
  label: string;
  group: string;
  icon?: ReactNode;
  shortcut?: string;
  keywords?: string;
  run: () => void;
}

/** Subsequence match, so "sav pen" finds "Save pen". */
function score(command: Command, query: string): number {
  if (!query) return 1;
  const haystack = `${command.label} ${command.group} ${command.keywords ?? ''}`.toLowerCase();
  const needle = query.toLowerCase().replace(/\s+/g, '');
  let index = 0;
  let hits = 0;
  let consecutive = 0;
  for (const char of haystack) {
    if (char === needle[index]) {
      index++;
      consecutive++;
      hits += consecutive;
      if (index === needle.length) return hits + (haystack.startsWith(needle) ? 50 : 0);
    } else {
      consecutive = 0;
    }
  }
  return 0;
}

/** Mounted only while open, so every invocation starts from a clean query. */
export function CommandPalette({ onClose, commands }: { onClose: () => void; commands: Command[] }) {
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  const results = useMemo(() => {
    return commands
      .map((command) => ({ command, rank: score(command, query) }))
      .filter((item) => item.rank > 0)
      .sort((a, b) => b.rank - a.rank)
      .map((item) => item.command);
  }, [commands, query]);

  useEffect(() => setCursor(0), [query]);

  useEffect(() => {
    listRef.current?.children[cursor]?.scrollIntoView({ block: 'nearest' });
  }, [cursor]);

  // Closing must work even if focus never reached the input.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  const choose = (command: Command | undefined) => {
    if (!command) return;
    onClose();
    command.run();
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setCursor((c) => (c + 1) % Math.max(1, results.length));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setCursor((c) => (c - 1 + results.length) % Math.max(1, results.length));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      choose(results[cursor]);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }
  };

  let lastGroup = '';

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-start justify-center p-4 pt-[12vh]">
      <div className="animate-fade-in fixed inset-0 bg-black/55 backdrop-blur-[2px]" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="animate-pop-in relative w-full max-w-lg overflow-hidden rounded-xl border border-line bg-surface shadow-2xl shadow-black/50"
      >
        <div className="flex items-center gap-2.5 border-b border-line px-3.5">
          <Search size={15} className="shrink-0 text-faint" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Type a command…"
            className="h-11 min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-faint"
          />
          <kbd className="rounded border border-line px-1.5 py-0.5 text-[10.5px] text-faint">esc</kbd>
        </div>

        <ul ref={listRef} className="max-h-[46vh] overflow-y-auto p-1.5">
          {results.length === 0 && (
            <li className="px-3 py-6 text-center text-[13px] text-faint">No matching commands.</li>
          )}
          {results.map((command, index) => {
            const header = command.group !== lastGroup && !query ? command.group : null;
            lastGroup = command.group;
            return (
              <li key={command.id}>
                {header && (
                  <div className="px-2.5 pt-2.5 pb-1 text-[10.5px] font-medium tracking-wide text-faint uppercase">
                    {header}
                  </div>
                )}
                <button
                  onMouseMove={() => setCursor(index)}
                  onClick={() => choose(command)}
                  className={clsx(
                    'flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13.5px] transition-colors',
                    index === cursor ? 'bg-accent/15 text-accent' : 'text-ink',
                  )}
                >
                  <span className={clsx('shrink-0', index === cursor ? 'text-accent' : 'text-muted')}>
                    {command.icon}
                  </span>
                  <span className="flex-1 truncate">{command.label}</span>
                  {query && <span className="text-[11px] text-faint">{command.group}</span>}
                  {command.shortcut && (
                    <span className="text-[11px] text-faint">{formatShortcut(command.shortcut)}</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>,
    document.body,
  );
}
