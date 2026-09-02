import { useCallback, useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import {
  Braces,
  Columns2,
  Download,
  FileArchive,
  FileCode,
  FilePlus2,
  FolderOpen,
  Info,
  Keyboard,
  LayoutGrid,
  Package,
  Palette,
  Play,
  Save,
  Settings2,
  Share2,
  Sparkles,
  Terminal,
  WandSparkles,
  X,
} from 'lucide-react';
import type { PaneId } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { useConsoleStore } from '@/store/useConsoleStore';
import { useResolvedTheme } from '@/hooks/useTheme';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { buildShareUrl, consumeSharedProject } from '@/lib/share';
import { downloadHtml, downloadZip } from '@/lib/exporter';
import { Header } from '@/components/Header';
import { EditorArea, PANES, useFormatPane } from '@/components/EditorArea';
import { Preview } from '@/components/Preview';
import { ConsolePanel } from '@/components/ConsolePanel';
import { SplitPane } from '@/components/SplitPane';
import { StatusBar } from '@/components/StatusBar';
import { CommandPalette, type Command } from '@/components/CommandPalette';
import { TemplatesDialog } from '@/components/dialogs/TemplatesDialog';
import { ProjectsDialog } from '@/components/dialogs/ProjectsDialog';
import { LibrariesDialog } from '@/components/dialogs/LibrariesDialog';
import { SettingsDialog } from '@/components/dialogs/SettingsDialog';
import { ShortcutsDialog } from '@/components/dialogs/ShortcutsDialog';
import { Toaster, toast } from '@/components/ui';

type DialogId = 'projects' | 'templates' | 'libraries' | 'settings' | 'shortcuts' | null;

export default function App() {
  const project = useAppStore((s) => s.project);
  const settings = useAppStore((s) => s.settings);
  const view = useAppStore((s) => s.view);
  const splitRatio = useAppStore((s) => s.splitRatio);
  const consoleOpen = useAppStore((s) => s.consoleOpen);
  const consoleHeight = useAppStore((s) => s.consoleHeight);
  const runToken = useAppStore((s) => s.runToken);
  const sharedNotice = useAppStore((s) => s.sharedNotice);

  const setView = useAppStore((s) => s.setView);
  const setSplitRatio = useAppStore((s) => s.setSplitRatio);
  const setActivePane = useAppStore((s) => s.setActivePane);
  const setConsoleHeight = useAppStore((s) => s.setConsoleHeight);
  const toggleConsole = useAppStore((s) => s.toggleConsole);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const run = useAppStore((s) => s.run);
  const saveProject = useAppStore((s) => s.saveProject);
  const newProject = useAppStore((s) => s.newProject);
  const dismissSharedNotice = useAppStore((s) => s.dismissSharedNotice);

  const theme = useResolvedTheme(settings.theme);
  const isNarrow = useMediaQuery('(max-width: 860px)');
  const format = useFormatPane();

  const [dialog, setDialog] = useState<DialogId>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const closePalette = useCallback(() => setPaletteOpen(false), []);
  const closeDialog = useCallback(() => setDialog(null), []);

  useEffect(() => {
    document.getElementById('boot')?.remove();
  }, []);

  useEffect(() => {
    document.title = `${project.title || 'Untitled'} — Editor`;
  }, [project.title]);

  // Pasting a share link into the address bar only changes the hash, so the
  // page never reloads and the initial import would be missed.
  useEffect(() => {
    const onHashChange = () => {
      const shared = consumeSharedProject();
      if (shared) useAppStore.getState().replaceProject(shared, { shared: true });
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const save = useCallback(() => {
    saveProject();
    toast('Pen saved');
  }, [saveProject]);

  const share = useCallback(async () => {
    const url = buildShareUrl(useAppStore.getState().project);
    try {
      await navigator.clipboard.writeText(url);
      toast('Share link copied to clipboard');
    } catch {
      prompt('Copy this link:', url);
    }
  }, []);

  const cycleSplit = useCallback(() => {
    updateSettings({
      splitDirection: useAppStore.getState().settings.splitDirection === 'horizontal' ? 'vertical' : 'horizontal',
    });
  }, [updateSettings]);

  const commands = useMemo<Command[]>(() => {
    const paneCommands: Command[] = PANES.map((pane, index) => ({
      id: `pane-${pane.id}`,
      group: 'Panes',
      label: `Focus ${pane.label}`,
      shortcut: `Mod-${index + 1}`,
      icon: <pane.icon size={15} />,
      run: () => {
        setActivePane(pane.id);
        if (view === 'preview') setView('both');
      },
    }));

    const formatCommands: Command[] = PANES.map((pane) => ({
      id: `format-${pane.id}`,
      group: 'Editing',
      label: `Format ${pane.label}`,
      icon: <WandSparkles size={15} />,
      run: () => format(pane.id),
    }));

    return [
      { id: 'run', group: 'Run', label: 'Run the preview', shortcut: 'Mod-Enter', icon: <Play size={15} />, run },
      {
        id: 'autorun',
        group: 'Run',
        label: settings.autoRun ? 'Turn off run as you type' : 'Turn on run as you type',
        icon: <Sparkles size={15} />,
        run: () => updateSettings({ autoRun: !settings.autoRun }),
      },
      {
        id: 'console',
        group: 'Run',
        label: consoleOpen ? 'Hide console' : 'Show console',
        shortcut: 'Mod-Shift-C',
        icon: <Terminal size={15} />,
        run: () => toggleConsole(),
      },
      ...paneCommands,
      ...formatCommands,
      {
        id: 'jsx',
        group: 'Editing',
        label: project.jsFlavor === 'babel' ? 'Disable JSX / TypeScript' : 'Enable JSX / TypeScript',
        icon: <Braces size={15} />,
        keywords: 'babel react typescript',
        run: () =>
          useAppStore.getState().setJsFlavor(project.jsFlavor === 'babel' ? 'javascript' : 'babel'),
      },
      { id: 'new', group: 'Pen', label: 'New pen', shortcut: 'Mod-Alt-N', icon: <FilePlus2 size={15} />, run: newProject },
      { id: 'save', group: 'Pen', label: 'Save pen', shortcut: 'Mod-S', icon: <Save size={15} />, run: save },
      { id: 'open', group: 'Pen', label: 'Open saved pens', shortcut: 'Mod-O', icon: <FolderOpen size={15} />, run: () => setDialog('projects') },
      { id: 'templates', group: 'Pen', label: 'Browse templates', icon: <LayoutGrid size={15} />, run: () => setDialog('templates') },
      { id: 'libraries', group: 'Pen', label: 'Manage libraries', icon: <Package size={15} />, keywords: 'cdn script stylesheet', run: () => setDialog('libraries') },
      { id: 'share', group: 'Pen', label: 'Copy share link', icon: <Share2 size={15} />, run: share },
      { id: 'download-html', group: 'Pen', label: 'Download as .html', icon: <Download size={15} />, run: () => downloadHtml(project) },
      { id: 'download-zip', group: 'Pen', label: 'Download as .zip', icon: <FileArchive size={15} />, run: () => downloadZip(project) },
      {
        id: 'layout-direction',
        group: 'Layout',
        label: settings.splitDirection === 'horizontal' ? 'Stack panes vertically' : 'Place panes side by side',
        shortcut: 'Mod-Shift-P',
        icon: <Columns2 size={15} />,
        run: cycleSplit,
      },
      {
        id: 'layout-editors',
        group: 'Layout',
        label: settings.editorLayout === 'tabs' ? 'Show all three editors' : 'Use editor tabs',
        icon: <LayoutGrid size={15} />,
        run: () => updateSettings({ editorLayout: settings.editorLayout === 'tabs' ? 'columns' : 'tabs' }),
      },
      { id: 'view-editor', group: 'Layout', label: 'Show code only', icon: <FileCode size={15} />, run: () => setView('editor') },
      { id: 'view-both', group: 'Layout', label: 'Show code and preview', icon: <Columns2 size={15} />, run: () => setView('both') },
      { id: 'view-preview', group: 'Layout', label: 'Show preview only', icon: <Play size={15} />, run: () => setView('preview') },
      {
        id: 'theme',
        group: 'Layout',
        label: theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme',
        icon: <Palette size={15} />,
        run: () => updateSettings({ theme: theme === 'dark' ? 'light' : 'dark' }),
      },
      { id: 'settings', group: 'App', label: 'Settings', shortcut: 'Mod-,', icon: <Settings2 size={15} />, run: () => setDialog('settings') },
      { id: 'shortcuts', group: 'App', label: 'Keyboard shortcuts', icon: <Keyboard size={15} />, run: () => setDialog('shortcuts') },
    ];
  }, [
    consoleOpen,
    cycleSplit,
    format,
    newProject,
    project,
    run,
    save,
    settings.autoRun,
    settings.editorLayout,
    settings.splitDirection,
    setActivePane,
    setView,
    share,
    theme,
    toggleConsole,
    updateSettings,
    view,
  ]);

  const handleShortcut = useCallback(
    (event: KeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey;
      if (!mod || event.defaultPrevented) return;
      const key = event.key.toLowerCase();

      const act = (fn: () => void) => {
        event.preventDefault();
        fn();
      };

      if (key === 'k') return act(() => setPaletteOpen((v) => !v));
      if (key === 'enter') return act(run);
      if (key === 's') return act(save);
      if (key === 'o') return act(() => setDialog('projects'));
      if (key === ',') return act(() => setDialog('settings'));
      if (key === 'n' && event.altKey) return act(newProject);
      if (key === '/' && event.shiftKey) return act(() => setDialog('shortcuts'));
      if (key === 'c' && event.shiftKey) return act(() => toggleConsole());
      if (key === 'p' && event.shiftKey) return act(cycleSplit);
      if (['1', '2', '3'].includes(key)) {
        const pane = PANES[Number(key) - 1].id as PaneId;
        return act(() => {
          setActivePane(pane);
          if (useAppStore.getState().view === 'preview') setView('both');
        });
      }
    },
    [cycleSplit, newProject, run, save, setActivePane, setView, toggleConsole],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [handleShortcut]);

  // The preview frame forwards its own key events so shortcuts work while it has focus.
  const onFrameHotkey = useCallback(
    (key: string, modifiers: { shift: boolean; alt: boolean }) => {
      if (key === 'k') setPaletteOpen((v) => !v);
      else if (key === 'enter') run();
      else if (key === 's') save();
      else if (key === '/' && modifiers.shift) setDialog('shortcuts');
      else if (key === 'p' && modifiers.shift) cycleSplit();
    },
    [cycleSplit, run, save],
  );

  const effectiveView = isNarrow && view === 'both' ? 'editor' : view;
  const unreadErrors = useConsoleStore((s) => s.unreadErrors);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <Header onOpenDialog={setDialog} onOpenPalette={() => setPaletteOpen(true)} />

      {sharedNotice && (
        <div className="flex items-center gap-2.5 border-b border-accent/25 bg-accent/8 px-3.5 py-2 text-[12.5px] text-ink">
          <Info size={14} className="shrink-0 text-accent" />
          <span className="flex-1">
            You opened a shared pen. It runs in an isolated sandbox — save it to keep a copy in this
            browser.
          </span>
          <button onClick={save} className="font-medium text-accent hover:underline">
            Save a copy
          </button>
          <button onClick={dismissSharedNotice} aria-label="Dismiss" className="text-muted hover:text-ink">
            <X size={14} />
          </button>
        </div>
      )}

      <main className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1">
          <SplitPane
            direction={isNarrow ? 'vertical' : settings.splitDirection}
            ratio={splitRatio}
            onRatio={setSplitRatio}
            show={effectiveView === 'both' ? 'both' : effectiveView === 'editor' ? 'first' : 'second'}
            first={<EditorArea dark={theme === 'dark'} onRun={run} onSave={save} />}
            second={
              <Preview
                project={project}
                runToken={runToken}
                autoRun={settings.autoRun}
                autoRunDelay={settings.autoRunDelay}
                dark={theme === 'dark'}
                onHotkey={onFrameHotkey}
              />
            }
          />
        </div>

        {consoleOpen && (
          <div style={{ height: consoleHeight }} className="shrink-0">
            <ConsolePanel
              onClose={() => toggleConsole(false)}
              onResize={(delta) => setConsoleHeight(consoleHeight + delta)}
            />
          </div>
        )}
      </main>

      {isNarrow ? (
        <nav className="flex shrink-0 items-stretch border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]">
          <MobileTab active={view === 'editor'} onClick={() => setView('editor')} icon={<FileCode size={16} />} label="Code" />
          <MobileTab active={view === 'preview'} onClick={() => setView('preview')} icon={<Play size={16} />} label="Preview" />
          <MobileTab
            active={consoleOpen}
            onClick={() => toggleConsole()}
            icon={<Terminal size={16} />}
            label="Console"
            badge={!consoleOpen && unreadErrors > 0 ? unreadErrors : undefined}
          />
        </nav>
      ) : (
        <StatusBar onOpenLibraries={() => setDialog('libraries')} />
      )}

      {paletteOpen && <CommandPalette onClose={closePalette} commands={commands} />}
      {/* Rendered conditionally so each dialog starts fresh every time it opens. */}
      {dialog === 'templates' && <TemplatesDialog open onClose={closeDialog} />}
      {dialog === 'projects' && <ProjectsDialog open onClose={closeDialog} />}
      {dialog === 'libraries' && <LibrariesDialog open onClose={closeDialog} />}
      {dialog === 'settings' && <SettingsDialog open onClose={closeDialog} />}
      {dialog === 'shortcuts' && <ShortcutsDialog open onClose={closeDialog} />}
      <Toaster />
    </div>
  );
}

function MobileTab({
  active,
  onClick,
  icon,
  label,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] transition-colors',
        active ? 'text-accent' : 'text-faint',
      )}
    >
      {icon}
      {label}
      {badge !== undefined && (
        <span className="absolute top-1.5 right-1/2 mr-2 grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </button>
  );
}
