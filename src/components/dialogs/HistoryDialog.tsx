import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { RotateCcw, Trash2 } from 'lucide-react';
import type { Revision, RevisionReason } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { MAX_REVISIONS } from '@/lib/storage';
import { Button, IconButton, Modal, toast } from '../ui';

const REASON_LABEL: Record<RevisionReason, string> = {
  save: 'Saved',
  auto: 'Autosaved',
  replace: 'Before switching away',
  restore: 'Before restoring',
};

function when(timestamp: number): string {
  const seconds = Math.round((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'moments ago';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  return new Date(timestamp).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function delta(revision: Revision, current: { html: string; css: string; js: string }): string {
  const lines = (text: string) => (text ? text.split('\n').length : 0);
  const parts: string[] = [];
  for (const pane of ['html', 'css', 'js'] as const) {
    const difference = lines(revision[pane]) - lines(current[pane]);
    if (difference !== 0) {
      parts.push(`${pane.toUpperCase()} ${difference > 0 ? '+' : ''}${difference}`);
    }
  }
  return parts.length ? parts.join(' · ') : 'identical to now';
}

export function HistoryDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const project = useAppStore((s) => s.project);
  const revisions = useAppStore((s) => s.revisions);
  const loadRevisions = useAppStore((s) => s.loadRevisions);
  const restoreRevision = useAppStore((s) => s.restoreRevision);
  const deleteRevision = useAppStore((s) => s.deleteRevision);
  const snapshot = useAppStore((s) => s.snapshot);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    void loadRevisions();
  }, [loadRevisions]);

  const preview = revisions.find((r) => r.id === selected);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="History"
      description={`Snapshots of this pen, kept on this device. The newest ${MAX_REVISIONS} are retained.`}
      width="max-w-3xl"
      footer={
        <Button
          onClick={async () => {
            await snapshot('save');
            toast('Snapshot taken');
          }}
        >
          Snapshot now
        </Button>
      }
    >
      {revisions.length === 0 ? (
        <p className="py-8 text-center text-[13px] text-muted">
          No snapshots yet. One is taken whenever you save, every few minutes while you edit, and
          before anything replaces your work.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-[minmax(0,260px)_1fr]">
          <ul className="flex max-h-[46vh] flex-col gap-1 overflow-y-auto pr-1">
            {revisions.map((revision) => (
              <li
                key={revision.id}
                className={clsx(
                  'group flex items-start gap-2 rounded-md border px-2.5 py-2 transition-colors',
                  revision.id === selected
                    ? 'border-accent/50 bg-accent/8'
                    : 'border-line bg-elevated hover:border-line-strong',
                )}
              >
                <button
                  onClick={() => setSelected(revision.id)}
                  className="min-w-0 flex-1 text-left"
                >
                  <span className="block truncate text-[12.5px] font-medium">
                    {when(revision.at)}
                  </span>
                  <span className="block truncate text-[11.5px] text-faint">
                    {REASON_LABEL[revision.reason]}
                  </span>
                  <span className="block truncate text-[11px] text-faint">
                    {delta(revision, project)}
                  </span>
                </button>
                <IconButton
                  label="Delete snapshot"
                  onClick={() => {
                    void deleteRevision(revision.id);
                    if (selected === revision.id) setSelected(null);
                  }}
                  className="size-6 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                >
                  <Trash2 size={13} />
                </IconButton>
              </li>
            ))}
          </ul>

          <div className="min-w-0">
            {preview ? (
              <>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium">{preview.title}</p>
                    <p className="text-[11.5px] text-faint">
                      {new Date(preview.at).toLocaleString()}
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={async () => {
                      await restoreRevision(preview.id);
                      toast('Snapshot restored');
                      onClose();
                    }}
                  >
                    <RotateCcw size={13} />
                    Restore
                  </Button>
                </div>

                <div className="max-h-[38vh] overflow-y-auto rounded-md border border-line bg-canvas">
                  {(['html', 'css', 'js'] as const).map((pane) =>
                    preview[pane].trim() ? (
                      <div key={pane} className="border-b border-line last:border-0">
                        <div className="sticky top-0 bg-elevated px-2.5 py-1 text-[10.5px] font-medium tracking-wide text-faint uppercase">
                          {pane}
                        </div>
                        <pre className="overflow-x-auto px-2.5 py-1.5 font-mono text-[11.5px] leading-relaxed text-muted">
                          {preview[pane]}
                        </pre>
                      </div>
                    ) : null,
                  )}
                </div>
              </>
            ) : (
              <p className="grid h-full place-items-center text-[12.5px] text-faint">
                Select a snapshot to see what it contains.
              </p>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
