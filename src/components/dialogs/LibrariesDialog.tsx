import { useState } from 'react';
import clsx from 'clsx';
import { Plus, Trash2 } from 'lucide-react';
import { catalog, guessKind, guessName, toLibrary } from '@/lib/libraries';
import { useAppStore } from '@/store/useAppStore';
import { Button, IconButton, Modal, toast } from '../ui';

export function LibrariesDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const libraries = useAppStore((s) => s.project.libraries);
  const addLibrary = useAppStore((s) => s.addLibrary);
  const removeLibrary = useAppStore((s) => s.removeLibrary);
  const [url, setUrl] = useState('');
  const [query, setQuery] = useState('');

  const added = new Set(libraries.map((l) => l.url));
  const results = catalog.filter((entry) =>
    `${entry.name} ${entry.blurb}`.toLowerCase().includes(query.toLowerCase()),
  );

  const addCustom = () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    if (!/^https:\/\//i.test(trimmed)) {
      toast('Use an https:// URL.', 'error');
      return;
    }
    addLibrary(toLibrary({ name: guessName(trimmed), url: trimmed, kind: guessKind(trimmed) }));
    setUrl('');
    toast('Library added');
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Libraries"
      description="External scripts and stylesheets are injected into the preview from a CDN."
      width="max-w-xl"
    >
      {libraries.length > 0 && (
        <section className="mb-4">
          <h3 className="mb-1.5 text-[11.5px] font-medium tracking-wide text-faint uppercase">
            In this pen
          </h3>
          <ul className="flex flex-col gap-1">
            {libraries.map((library) => (
              <li
                key={library.id}
                className="flex items-center gap-2.5 rounded-md border border-line bg-elevated py-1.5 pr-1 pl-2.5"
              >
                <span
                  className={clsx(
                    'rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wide uppercase',
                    library.kind === 'css' ? 'bg-sky-500/15 text-sky-400' : 'bg-warn/15 text-warn',
                  )}
                >
                  {library.kind}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-medium">{library.name}</div>
                  <div className="truncate font-mono text-[11px] text-faint">{library.url}</div>
                </div>
                <IconButton
                  label={`Remove ${library.name}`}
                  onClick={() => removeLibrary(library.id)}
                  className="hover:text-danger"
                >
                  <Trash2 size={14} />
                </IconButton>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mb-4">
        <h3 className="mb-1.5 text-[11.5px] font-medium tracking-wide text-faint uppercase">
          Add by URL
        </h3>
        <div className="flex gap-2">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCustom()}
            placeholder="https://cdn.jsdelivr.net/npm/package@version/dist/file.js"
            spellCheck={false}
            className="h-8 min-w-0 flex-1 rounded-md border border-line bg-elevated px-2.5 font-mono text-[12px] outline-none focus:border-line-strong"
          />
          <Button variant="primary" onClick={addCustom}>
            Add
          </Button>
        </div>
      </section>

      <section>
        <div className="mb-1.5 flex items-center justify-between gap-3">
          <h3 className="text-[11.5px] font-medium tracking-wide text-faint uppercase">Popular</h3>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            className="h-7 w-36 rounded-md border border-line bg-elevated px-2 text-[12px] outline-none focus:border-line-strong"
          />
        </div>
        <ul className="grid gap-1 sm:grid-cols-2">
          {results.map((entry) => {
            const isAdded = added.has(entry.url);
            return (
              <li key={entry.url}>
                <button
                  disabled={isAdded}
                  onClick={() => {
                    addLibrary(toLibrary(entry));
                    toast(`${entry.name} added`);
                  }}
                  className={clsx(
                    'flex w-full items-center gap-2 rounded-md border px-2.5 py-2 text-left transition-colors',
                    isAdded
                      ? 'cursor-default border-line bg-canvas opacity-55'
                      : 'border-line bg-elevated hover:border-accent/50',
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-medium">{entry.name}</div>
                    <div className="truncate text-[11.5px] text-faint">{entry.blurb}</div>
                  </div>
                  {!isAdded && <Plus size={14} className="shrink-0 text-muted" />}
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </Modal>
  );
}
