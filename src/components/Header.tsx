import { useState } from 'react';
import clsx from 'clsx';
import {
  Columns2,
  Command,
  Download,
  FileArchive,
  FileCode,
  FilePlus2,
  FolderOpen,
  History,
  Keyboard,
  LayoutPanelLeft,
  Link2,
  Moon,
  Package,
  Play,
  Rows2,
  Save,
  Settings2,
  Share2,
  Sun,
  Terminal,
  Upload,
  LayoutGrid,
  MoreHorizontal,
} from 'lucide-react';
import type { ViewMode } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { useOutputStore } from '@/store/useOutputStore';
import { buildShareUrl } from '@/lib/share';
import { downloadHtml, downloadZip, exportJson, importJson } from '@/lib/exporter';
import { Button, IconButton, Menu, SegmentedControl, toast, Tooltip } from './ui';

interface Props {
  onOpenDialog: (
    id: 'projects' | 'templates' | 'libraries' | 'settings' | 'shortcuts' | 'history',
  ) => void;
  onOpenPalette: () => void;
}

export function Header({ onOpenDialog, onOpenPalette }: Props) {
  const project = useAppStore((s) => s.project);
  const settings = useAppStore((s) => s.settings);
  const view = useAppStore((s) => s.view);
  const consoleOpen = useAppStore((s) => s.consoleOpen);
  const pendingChanges = useAppStore((s) => s.pendingChanges);
  const savedProjectId = useAppStore((s) => s.savedProjectId);
  const projects = useAppStore((s) => s.projects);

  const setTitle = useAppStore((s) => s.setTitle);
  const setView = useAppStore((s) => s.setView);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const toggleConsole = useAppStore((s) => s.toggleConsole);
  const run = useAppStore((s) => s.run);
  const save = useAppStore((s) => s.saveProject);
  const newProject = useAppStore((s) => s.newProject);
  const importProjects = useAppStore((s) => s.importProjects);

  const errors = useOutputStore((s) => s.unreadErrors);
  const [copied, setCopied] = useState(false);

  const isSaved = savedProjectId !== null;
  const savedRecord = projects.find((p) => p.id === savedProjectId);
  const hasUnsavedEdits = Boolean(savedRecord && savedRecord.updatedAt !== project.updatedAt);

  const share = async () => {
    const url = buildShareUrl(project);
    if (url.length > 30_000) {
      toast('This pen is too large to fit in a link. Download it instead.', 'error');
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
      toast('Share link copied to clipboard');
    } catch {
      prompt('Copy this link:', url);
    }
  };

  const pickImportFile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const imported = await importJson(file);
        importProjects(imported);
        toast(`Imported ${imported.length} pen${imported.length === 1 ? '' : 's'}`);
      } catch (error) {
        toast(error instanceof Error ? error.message : 'Import failed', 'error');
      }
    };
    input.click();
  };

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-line bg-surface px-2.5">
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="grid size-7 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-accent to-sky-500 text-[13px] font-bold text-[#04231f]">
          E
        </div>

        <div className="flex min-w-0 items-center gap-1.5">
          <input
            value={project.title}
            onChange={(e) => setTitle(e.target.value)}
            onFocus={(e) => e.target.select()}
            spellCheck={false}
            aria-label="Pen title"
            className="min-w-0 max-w-[42vw] truncate rounded-md bg-transparent px-1.5 py-1 text-[13.5px] font-medium outline-none hover:bg-elevated focus:bg-elevated sm:w-52"
          />
          {isSaved && (
            <Tooltip content={hasUnsavedEdits ? 'Unsaved changes' : 'Saved'}>
              <span
                className={clsx(
                  'size-1.5 shrink-0 rounded-full',
                  hasUnsavedEdits ? 'bg-warn' : 'bg-ok/60',
                )}
              />
            </Tooltip>
          )}
        </div>
      </div>

      <div className="ml-auto flex items-center gap-1">
        <div className="hidden items-center gap-1 lg:flex">
          <SegmentedControl<ViewMode>
            value={view}
            onChange={setView}
            options={[
              { value: 'editor', label: <FileCode size={13} />, title: 'Code only' },
              { value: 'both', label: <Columns2 size={13} />, title: 'Split view' },
              { value: 'preview', label: <LayoutPanelLeft size={13} />, title: 'Preview only' },
            ]}
          />

          <IconButton
            label={
              settings.splitDirection === 'horizontal'
                ? 'Stack panes vertically'
                : 'Place panes side by side'
            }
            onClick={() =>
              updateSettings({
                splitDirection: settings.splitDirection === 'horizontal' ? 'vertical' : 'horizontal',
              })
            }
          >
            {settings.splitDirection === 'horizontal' ? <Rows2 size={15} /> : <Columns2 size={15} />}
          </IconButton>

          <IconButton
            label={settings.editorLayout === 'tabs' ? 'Show all three editors' : 'Use editor tabs'}
            active={settings.editorLayout === 'columns'}
            onClick={() =>
              updateSettings({ editorLayout: settings.editorLayout === 'tabs' ? 'columns' : 'tabs' })
            }
          >
            <LayoutGrid size={15} />
          </IconButton>

          <span className="mx-1 h-5 w-px bg-line" />
        </div>

        <div className="relative">
          <IconButton
            label="Toggle console"
            active={consoleOpen}
            onClick={() => toggleConsole()}
          >
            <Terminal size={15} />
          </IconButton>
          {errors > 0 && !consoleOpen && (
            <span className="pointer-events-none absolute -top-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
              {errors > 9 ? '9+' : errors}
            </span>
          )}
        </div>

        <span className="hidden sm:contents">
          <IconButton label="Add a library" onClick={() => onOpenDialog('libraries')}>
            <Package size={15} />
          </IconButton>

          <IconButton label="Command palette (Mod-K)" onClick={onOpenPalette}>
            <Command size={15} />
          </IconButton>
        </span>

        <span className="mx-1 hidden h-5 w-px bg-line sm:block" />

        <Tooltip content={copied ? 'Copied!' : 'Copy a shareable link'}>
          <Button variant="subtle" onClick={share} className="hidden sm:inline-flex">
            {copied ? <Link2 size={14} /> : <Share2 size={14} />}
            <span className="hidden md:inline">{copied ? 'Copied' : 'Share'}</span>
          </Button>
        </Tooltip>

        <Tooltip content="Save to this browser (Mod-S)">
          <Button
            variant="subtle"
            onClick={async () => {
              await save();
              toast('Pen saved');
            }}
            className="hidden sm:inline-flex"
          >
            <Save size={14} />
            <span className="hidden md:inline">Save</span>
          </Button>
        </Tooltip>

        <Tooltip content={settings.autoRun ? 'Re-run now (Mod-Enter)' : 'Run (Mod-Enter)'}>
          <Button variant="primary" onClick={run} className="relative">
            <Play size={13} fill="currentColor" />
            Run
            {pendingChanges && (
              <span className="absolute -top-1 -right-1 size-2 rounded-full bg-warn ring-2 ring-surface" />
            )}
          </Button>
        </Tooltip>

        <Menu
          items={[
            {
              id: 'new',
              label: 'New pen',
              icon: <FilePlus2 size={15} />,
              shortcut: 'Mod-Alt-N',
              onSelect: newProject,
            },
            {
              id: 'templates',
              label: 'Templates',
              icon: <LayoutGrid size={15} />,
              onSelect: () => onOpenDialog('templates'),
            },
            {
              id: 'projects',
              label: 'Saved pens',
              icon: <FolderOpen size={15} />,
              shortcut: 'Mod-O',
              onSelect: () => onOpenDialog('projects'),
            },
            {
              id: 'history',
              label: 'History…',
              icon: <History size={15} />,
              onSelect: () => onOpenDialog('history'),
            },
            'separator',
            {
              id: 'share',
              label: 'Copy share link',
              icon: <Share2 size={15} />,
              onSelect: share,
            },
            {
              id: 'html',
              label: 'Download .html',
              icon: <Download size={15} />,
              onSelect: () => downloadHtml(project),
            },
            {
              id: 'zip',
              label: 'Download .zip',
              icon: <FileArchive size={15} />,
              onSelect: () => downloadZip(project),
            },
            {
              id: 'export',
              label: 'Export all pens',
              icon: <Upload size={15} />,
              onSelect: () => exportJson(useAppStore.getState().projects),
            },
            {
              id: 'import',
              label: 'Import pens…',
              icon: <Download size={15} />,
              onSelect: pickImportFile,
            },
            'separator',
            {
              id: 'shortcuts',
              label: 'Keyboard shortcuts',
              icon: <Keyboard size={15} />,
              shortcut: 'Mod-/',
              onSelect: () => onOpenDialog('shortcuts'),
            },
            {
              id: 'settings',
              label: 'Settings',
              icon: <Settings2 size={15} />,
              shortcut: 'Mod-,',
              onSelect: () => onOpenDialog('settings'),
            },
          ]}
          trigger={({ open, toggle }) => (
            <IconButton label="More actions" active={open} onClick={toggle}>
              <MoreHorizontal size={16} />
            </IconButton>
          )}
        />

        <IconButton
          label={settings.theme === 'light' ? 'Switch to dark' : 'Switch to light'}
          onClick={() => updateSettings({ theme: settings.theme === 'light' ? 'dark' : 'light' })}
        >
          {settings.theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
        </IconButton>
      </div>
    </header>
  );
}
