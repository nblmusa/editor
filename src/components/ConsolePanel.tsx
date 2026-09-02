import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { ChevronRight, CornerDownLeft, Trash2, X } from 'lucide-react';
import type { ConsoleEntry, ConsoleLevel } from '@/types';
import { useConsoleStore } from '@/store/useConsoleStore';
import { evalInPreview } from '@/lib/frameBridge';
import { IconButton } from './ui';

type Filter = 'all' | 'error' | 'warn' | 'log';

const LEVEL_STYLES: Record<ConsoleLevel, string> = {
  log: 'text-ink',
  info: 'text-ink',
  debug: 'text-muted',
  table: 'text-ink',
  warn: 'text-warn',
  error: 'text-danger',
  input: 'text-muted',
  result: 'text-accent',
};

const ROW_TINT: Partial<Record<ConsoleLevel, string>> = {
  warn: 'bg-warn/8 border-l-warn',
  error: 'bg-danger/8 border-l-danger',
};

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'error', label: 'Errors' },
  { id: 'warn', label: 'Warnings' },
  { id: 'log', label: 'Logs' },
];

function matches(entry: ConsoleEntry, filter: Filter): boolean {
  if (filter === 'all') return true;
  if (filter === 'error') return entry.level === 'error';
  if (filter === 'warn') return entry.level === 'warn';
  return !['error', 'warn'].includes(entry.level);
}

export function ConsolePanel({ onClose, onResize }: { onClose: () => void; onResize: (dy: number) => void }) {
  const entries = useConsoleStore((s) => s.entries);
  const clear = useConsoleStore((s) => s.clear);
  const push = useConsoleStore((s) => s.push);
  const clearUnread = useConsoleStore((s) => s.clearUnread);

  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState('');
  const [historyIndex, setHistoryIndex] = useState(-1);
  const history = useRef<string[]>([]);
  const scroller = useRef<HTMLDivElement>(null);
  const pinned = useRef(true);

  useEffect(clearUnread, [clearUnread, entries.length]);

  useLayoutEffect(() => {
    if (pinned.current && scroller.current) {
      scroller.current.scrollTop = scroller.current.scrollHeight;
    }
  }, [entries]);

  const visible = entries.filter(
    (entry) =>
      matches(entry, filter) &&
      (!query || entry.parts.join(' ').toLowerCase().includes(query.toLowerCase())),
  );

  const submit = () => {
    const code = draft.trim();
    if (!code) return;
    push({ level: 'input', parts: [code] });
    if (!evalInPreview(code)) {
      push({ level: 'error', parts: ['Preview is not ready yet.'] });
    }
    history.current = [code, ...history.current.filter((c) => c !== code)].slice(0, 50);
    setHistoryIndex(-1);
    setDraft('');
  };

  const recall = (direction: 1 | -1) => {
    const next = Math.min(history.current.length - 1, Math.max(-1, historyIndex + direction));
    setHistoryIndex(next);
    setDraft(next === -1 ? '' : history.current[next]);
  };

  return (
    <section className="flex h-full min-h-0 flex-col border-t border-line bg-surface">
      <div
        role="separator"
        aria-label="Resize console"
        onPointerDown={(e) => {
          e.preventDefault();
          const startY = e.clientY;
          const move = (ev: PointerEvent) => onResize(startY - ev.clientY);
          const up = () => {
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', up);
          };
          window.addEventListener('pointermove', move);
          window.addEventListener('pointerup', up);
        }}
        className="-mt-[5px] h-[7px] shrink-0 cursor-row-resize"
      />

      <header className="-mt-[2px] flex h-9 shrink-0 items-center gap-1 px-2">
        <span className="pl-1 text-[12px] font-medium tracking-wide text-muted uppercase">Console</span>

        <div className="ml-3 flex items-center gap-0.5">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              onClick={() => setFilter(item.id)}
              className={clsx(
                'h-6 rounded px-2 text-[12px] transition-colors',
                filter === item.id ? 'bg-elevated text-ink' : 'text-faint hover:text-ink',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter…"
          className="ml-auto h-6 w-28 rounded border border-line bg-canvas px-2 text-[12px] outline-none focus:border-line-strong sm:w-40"
        />
        <IconButton label="Clear console" onClick={clear}>
          <Trash2 size={14} />
        </IconButton>
        <IconButton label="Hide console" onClick={onClose}>
          <X size={15} />
        </IconButton>
      </header>

      <div
        ref={scroller}
        onScroll={(e) => {
          const el = e.currentTarget;
          pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
        }}
        className="min-h-0 flex-1 overflow-y-auto font-mono text-[12.5px]"
      >
        {visible.length === 0 ? (
          <p className="px-3 py-3 font-sans text-[12.5px] text-faint">
            {entries.length ? 'Nothing matches this filter.' : 'Console output from your code appears here.'}
          </p>
        ) : (
          visible.map((entry) => <Row key={entry.id} entry={entry} />)
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex shrink-0 items-center gap-2 border-t border-line px-3 py-1.5"
      >
        <ChevronRight size={14} className="shrink-0 text-accent" />
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowUp') {
              e.preventDefault();
              recall(1);
            } else if (e.key === 'ArrowDown') {
              e.preventDefault();
              recall(-1);
            }
          }}
          spellCheck={false}
          placeholder="Run an expression in the preview…"
          className="min-w-0 flex-1 bg-transparent font-mono text-[12.5px] outline-none placeholder:font-sans placeholder:text-faint"
        />
        {draft && <CornerDownLeft size={13} className="shrink-0 text-faint" />}
      </form>
    </section>
  );
}

function Row({ entry }: { entry: ConsoleEntry }) {
  const [expanded, setExpanded] = useState(false);
  const hasStack = Boolean(entry.stack && entry.stack.trim());

  return (
    <div
      className={clsx(
        'group flex gap-2 border-b border-l-2 border-b-line/60 border-l-transparent px-3 py-1',
        ROW_TINT[entry.level],
      )}
    >
      <span className="w-3 shrink-0 pt-[1px] text-center text-[11px] leading-5 text-faint select-none">
        {entry.level === 'input' ? '›' : entry.level === 'result' ? '‹' : ''}
      </span>

      <div className="min-w-0 flex-1">
        <div className={clsx('flex flex-wrap items-start gap-x-2 break-words whitespace-pre-wrap', LEVEL_STYLES[entry.level])}>
          {entry.parts.map((part, i) => (
            <span key={i}>{part}</span>
          ))}
          {entry.count > 1 && (
            <span className="rounded-full bg-line-strong px-1.5 text-[10.5px] leading-[17px] text-ink">
              {entry.count}
            </span>
          )}
        </div>

        {hasStack && (
          <>
            <button
              onClick={() => setExpanded((v) => !v)}
              className="mt-0.5 font-sans text-[11.5px] text-faint hover:text-muted"
            >
              {expanded ? 'Hide stack' : 'Show stack'}
            </button>
            {expanded && (
              <pre className="mt-1 overflow-x-auto rounded bg-canvas p-2 text-[11.5px] leading-relaxed text-muted">
                {entry.stack}
              </pre>
            )}
          </>
        )}
      </div>

      <time className="shrink-0 pt-[2px] font-sans text-[10.5px] text-faint opacity-0 transition-opacity group-hover:opacity-100">
        {new Date(entry.at).toLocaleTimeString(undefined, { hour12: false })}
      </time>
    </div>
  );
}
