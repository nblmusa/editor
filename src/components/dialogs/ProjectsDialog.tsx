import { useState } from 'react';
import { Copy, FolderOpen, Trash2 } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { Button, IconButton, Modal, toast } from '../ui';

function relativeTime(timestamp: number): string {
  const seconds = Math.round((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

export function ProjectsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const projects = useAppStore((s) => s.projects);
  const savedProjectId = useAppStore((s) => s.savedProjectId);
  const openProject = useAppStore((s) => s.openProject);
  const deleteProject = useAppStore((s) => s.deleteProject);
  const duplicateProject = useAppStore((s) => s.duplicateProject);
  const saveProject = useAppStore((s) => s.saveProject);
  const [query, setQuery] = useState('');

  const filtered = projects.filter((p) => p.title.toLowerCase().includes(query.toLowerCase()));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Saved pens"
      description="Stored in this browser only. Use Export from the menu to back them up."
      width="max-w-xl"
      footer={
        <Button
          variant="primary"
          onClick={async () => {
            await saveProject();
            toast('Current pen saved');
          }}
        >
          Save current pen
        </Button>
      }
    >
      {projects.length > 3 && (
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search pens…"
          className="mb-3 h-8 w-full rounded-md border border-line bg-elevated px-2.5 text-[13px] outline-none focus:border-line-strong"
        />
      )}

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-[13px] text-muted">
          {projects.length ? 'No pens match that search.' : 'You have not saved any pens yet.'}
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {filtered.map((project) => (
            <li
              key={project.id}
              className="group flex items-center gap-3 rounded-lg border border-line bg-elevated px-3 py-2.5"
            >
              <button
                onClick={async () => {
                  await openProject(project.id);
                  onClose();
                }}
                className="min-w-0 flex-1 text-left"
              >
                <span className="flex items-center gap-2">
                  <span className="truncate text-[13.5px] font-medium">{project.title}</span>
                  {project.id === savedProjectId && (
                    <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10.5px] font-medium text-accent">
                      open
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block text-[11.5px] text-faint">
                  Edited {relativeTime(project.updatedAt)}
                  {project.libraries.length > 0 &&
                    ` · ${project.libraries.length} librar${project.libraries.length === 1 ? 'y' : 'ies'}`}
                </span>
              </button>

              <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                <IconButton
                  label="Open"
                  onClick={async () => {
                    await openProject(project.id);
                    onClose();
                  }}
                >
                  <FolderOpen size={14} />
                </IconButton>
                <IconButton label="Duplicate" onClick={() => void duplicateProject(project.id)}>
                  <Copy size={14} />
                </IconButton>
                <IconButton
                  label="Delete"
                  onClick={() => {
                    if (confirm(`Delete “${project.title}”? This cannot be undone.`)) {
                      void deleteProject(project.id);
                    }
                  }}
                  className="hover:text-danger"
                >
                  <Trash2 size={14} />
                </IconButton>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
