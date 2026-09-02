import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { ChevronRight, CornerDownLeft, Trash2, X } from 'lucide-react';
import type { ConsoleEntry, ConsoleLevel } from '@/types';
import { useOutputStore } from '@/store/useOutputStore';
import { evalInPreview } from '@/lib/frameBridge';
import { IconButton } from '../ui';
import { TableView, ValueView } from './ValueView';
import { NetworkTab } from './NetworkTab';
import { AuditTab } from './AuditTab';

type Tab = 'console' | 'network' | 'audit';
type Filter = 'all' | 'error' | 'warn' | 'log';

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

function entryText(entry: ConsoleEntry): string {
  return JSON.stringify(entry.parts);
}

export function OutputPanel({
  onClose,
  onResize,
}: {
  onClose: () => void;
  onResize: (dy: number) => void;
}) {
  const entries = useOutputStore((s) => s.entries);
  const requests = useOutputStore((s) => s.requests);
  const clear = useOutputStore((s) => s.clear);
  const clearRequests = useOutputStore((s) => s.clearRequests);
  const push = useOutputStore((s) => s.push);
  const pushText = useOutputStore((s) => s.pushText);
  const clearUnread = useOutputStore((s) => s.clearUnread);

  const [tab, setTab] = useState<Tab>('console');
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState('');
  const [historyIndex, setHistoryIndex] = useState(-1);
  const history = useRef<string[]>([]);
  const scroller = useRef<HTMLDivElement>(null);
  const pinned = useRef(true);

  useEffect(() => {
    clearUnread();
  }, [clearUnread, entries.length]);

  useLayoutEffect(() => {
    if (tab === 'console' && pinned.current && scroller.current) {
      scroller.current.scrollTop = scroller.current.scrollHeight;
    }
  }, [entries, tab]);

  const visible = entries.filter(
    (entry) =>
      matches(entry, filter) &&
      (!query || entryText(entry).toLowerCase().includes(query.toLowerCase())),
  );

  const errorCount = entries.filter((e) => e.level === 'error').length;
  const pendingCount = requests.filter((r) => r.status == null).length;

  const submit = () => {
    const code = draft.trim();
    if (!code) return;
    push({ level: 'input', parts: [{ t: 'raw', k: 'string', v: code }] });
    if (!evalInPreview(code)) pushText('error', 'Preview is not ready yet.');
    history.current = [code, ...history.current.filter((c) => c !== code)].slice(0, 50);
    setHistoryIndex(-1);
    setDraft('');
  };

  const recall = (direction: 1 | -1) => {
    const next = Math.min(history.current.length - 1, Math.max(-1, historyIndex + direction));
    setHistoryIndex(next);
    setDraft(next === -1 ? '' : history.current[next]);
  };

  const tabs: { id: Tab; label: string; badge?: number }[] = [
    { id: 'console', label: 'Console', badge: errorCount || undefined },
    { id: 'network', label: 'Network', badge: pendingCount || undefined },
    { id: 'audit', label: 'Accessibility' },
  ];

  return (
    <section className="flex h-full min-h-0 flex-col border-t border-line bg-surface">
      <div
        role="separator"
        aria-label="Resize panel"
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
        <div className="flex items-center gap-0.5">
          {tabs.map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={clsx(
                'flex h-6 items-center gap-1.5 rounded px-2 text-[12px] transition-colors',
                tab === item.id ? 'bg-elevated text-ink' : 'text-faint hover:text-ink',
              )}
            >
              {item.label}
              {item.badge !== undefined && (
                <span
                  className={clsx(
                    'rounded-full px-1.5 text-[10px] font-bold',
                    item.id === 'console' ? 'bg-danger text-white' : 'bg-warn text-[#251a00]',
                  )}
                >
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {tab === 'console' && (
          <div className="ml-3 hidden items-center gap-0.5 sm:flex">
            {FILTERS.map((item) => (
              <button
                key={item.id}
                onClick={() => setFilter(item.id)}
                className={clsx(
                  'h-6 rounded px-2 text-[12px] transition-colors',
                  filter === item.id ? 'text-accent' : 'text-faint hover:text-ink',
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}

        {tab !== 'audit' && (
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter…"
            className="ml-auto h-6 w-28 rounded border border-line bg-canvas px-2 text-[12px] outline-none focus:border-line-strong sm:w-40"
          />
        )}

        <div className={clsx('flex items-center', tab === 'audit' && 'ml-auto')}>
          {tab !== 'audit' && (
            <IconButton
              label={tab === 'console' ? 'Clear console' : 'Clear requests'}
              onClick={tab === 'console' ? clear : clearRequests}
            >
              <Trash2 size={14} />
            </IconButton>
          )}
          <IconButton label="Hide panel" onClick={onClose}>
            <X size={15} />
          </IconButton>
        </div>
      </header>

      <div
        ref={scroller}
        onScroll={(e) => {
          const el = e.currentTarget;
          pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
        }}
        className="min-h-0 flex-1 overflow-auto font-mono text-[12.5px]"
      >
        {tab === 'console' &&
          (visible.length === 0 ? (
            <p className="px-3 py-3 font-sans text-[12.5px] text-faint">
              {entries.length
                ? 'Nothing matches this filter.'
                : 'Console output from your code appears here.'}
            </p>
          ) : (
            visible.map((entry) => <Row key={entry.id} entry={entry} />)
          ))}

        {tab === 'network' && (
          <NetworkTab
            requests={
              query
                ? requests.filter((r) => r.url.toLowerCase().includes(query.toLowerCase()))
                : requests
            }
          />
        )}

        {tab === 'audit' && <AuditTab />}
      </div>

      {tab === 'console' && (
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
      )}
    </section>
  );
}

function Row({ entry }: { entry: ConsoleEntry }) {
  const [expanded, setExpanded] = useState(false);
  const hasStack = Boolean(entry.stack && entry.stack.trim());
  const isTable = entry.level === 'table' && entry.parts.length > 0;

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
        {isTable ? (
          <TableView value={entry.parts[0]} />
        ) : (
          <div
            className={clsx(
              'flex flex-wrap items-start gap-x-2 break-words whitespace-pre-wrap',
              entry.level === 'error' && 'text-danger',
              entry.level === 'warn' && 'text-warn',
              entry.level === 'input' && 'text-muted',
              entry.level === 'debug' && 'text-muted',
            )}
          >
            {entry.parts.map((part, i) => (
              <ValueView key={i} value={part} top />
            ))}
            {entry.count > 1 && (
              <span className="rounded-full bg-line-strong px-1.5 text-[10.5px] leading-[17px] text-ink">
                {entry.count}
              </span>
            )}
          </div>
        )}

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
