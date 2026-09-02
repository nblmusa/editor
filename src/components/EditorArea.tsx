import { useCallback, useMemo, useState } from 'react';
import clsx from 'clsx';
import { Braces, FileCode2, Palette, Plus, Sparkles, WandSparkles, X } from 'lucide-react';
import type { PaneId, PaneKey, PenModule, Project } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { formatCode } from '@/lib/format';
import { tsFileName, useTypeScriptSync } from '@/editor/ts/useTypeScriptSync';
import { CodeEditor } from './CodeEditor';
import { IconButton, Tooltip, toast } from './ui';

export const PANES: { id: PaneId; label: string; icon: typeof FileCode2; color: string }[] = [
  { id: 'html', label: 'HTML', icon: FileCode2, color: '#f07178' },
  { id: 'css', label: 'CSS', icon: Palette, color: '#82aaff' },
  { id: 'js', label: 'JS', icon: Braces, color: '#ffcb6b' },
];

export function isMainPane(pane: PaneKey): pane is PaneId {
  return pane === 'html' || pane === 'css' || pane === 'js';
}

export function codeOf(project: Project, pane: PaneKey): string {
  if (isMainPane(pane)) return project[pane];
  return project.modules.find((m) => m.id === pane)?.code ?? '';
}

/** Tab labels follow the preprocessor a pane is set to. */
export function paneLabel(pane: PaneKey, project: Pick<Project, 'htmlLang' | 'cssLang' | 'modules'>): string {
  if (pane === 'html') return project.htmlLang === 'markdown' ? 'MD' : 'HTML';
  if (pane === 'css') return project.cssLang === 'scss' ? 'SCSS' : 'CSS';
  if (pane === 'js') return 'JS';
  return project.modules.find((m) => m.id === pane)?.name ?? 'JS';
}

export function useFormatPane() {
  const project = useAppStore((s) => s.project);
  const tabSize = useAppStore((s) => s.settings.tabSize);
  const setCode = useAppStore((s) => s.setCode);

  return useCallback(
    async (pane: PaneKey) => {
      const langs = { htmlLang: project.htmlLang, cssLang: project.cssLang };
      const source = codeOf(project, pane);
      const label = paneLabel(pane, project);
      try {
        const formatted = await formatCode(source, isMainPane(pane) ? pane : 'js', tabSize, langs);
        if (formatted !== source) {
          setCode(pane, formatted);
          toast(`Formatted ${label}`);
        }
      } catch {
        toast(`${label} could not be formatted — check for syntax errors.`, 'error');
      }
    },
    [project, tabSize, setCode],
  );
}

interface Props {
  dark: boolean;
  onRun: () => void;
  onSave: () => void;
}

export function EditorArea({ dark, onRun, onSave }: Props) {
  const project = useAppStore((s) => s.project);
  const settings = useAppStore((s) => s.settings);
  const activePane = useAppStore((s) => s.activePane);
  const setActivePane = useAppStore((s) => s.setActivePane);
  const setCode = useAppStore((s) => s.setCode);
  const setJsFlavor = useAppStore((s) => s.setJsFlavor);
  const setHtmlLang = useAppStore((s) => s.setHtmlLang);
  const setCssLang = useAppStore((s) => s.setCssLang);
  const addModule = useAppStore((s) => s.addModule);
  const renameModule = useAppStore((s) => s.renameModule);
  const removeModule = useAppStore((s) => s.removeModule);
  const reveal = useAppStore((s) => s.reveal);
  const format = useFormatPane();

  useTypeScriptSync(project, settings.intellisense);

  const jsx = project.jsFlavor === 'babel';
  const columns = settings.editorLayout === 'columns';

  const langs = useMemo(
    () => ({
      htmlLang: project.htmlLang,
      cssLang: project.cssLang,
      jsFlavor: project.jsFlavor,
    }),
    [project.htmlLang, project.cssLang, project.jsFlavor],
  );

  const labelFor = (pane: PaneId) => paneLabel(pane, project);

  const editor = (pane: PaneKey, visible = true) => (
    <CodeEditor
      pane={isMainPane(pane) ? pane : 'js'}
      paneKey={pane}
      key={pane}
      value={codeOf(project, pane)}
      onChange={(value) => setCode(pane, value)}
      settings={settings}
      dark={dark}
      langs={langs}
      onRun={onRun}
      onSave={onSave}
      onFormat={() => format(pane)}
      visible={visible}
      reveal={reveal?.pane === pane ? reveal : null}
      tsFile={settings.intellisense ? tsFileName(project, pane) : null}
    />
  );

  const languageChip = () => {
    if (activePane === 'html') {
      return (
        <Chip
          active={project.htmlLang === 'markdown'}
          tip="Write the markup as Markdown"
          onClick={() => setHtmlLang(project.htmlLang === 'markdown' ? 'html' : 'markdown')}
        >
          Markdown
        </Chip>
      );
    }
    if (activePane === 'css') {
      return (
        <Chip
          active={project.cssLang === 'scss'}
          tip="Compile the stylesheet with Sass"
          onClick={() => setCssLang(project.cssLang === 'scss' ? 'css' : 'scss')}
        >
          SCSS
        </Chip>
      );
    }
    return (
      <Chip
        active={jsx}
        tip="Compile JSX and TypeScript with Babel"
        onClick={() => setJsFlavor(jsx ? 'javascript' : 'babel')}
      >
        <Sparkles size={12} />
        JSX / TS
      </Chip>
    );
  };

  if (columns) {
    return (
      <div className="flex h-full min-h-0 flex-col bg-surface sm:flex-row">
        {PANES.map((pane) => (
          <div
            key={pane.id}
            className="flex min-h-0 min-w-0 flex-1 flex-col border-line not-last:border-b sm:not-last:border-r sm:not-last:border-b-0"
          >
            <header className="flex h-8 shrink-0 items-center gap-2 border-b border-line px-2.5">
              <span className="size-1.5 rounded-full" style={{ background: pane.color }} />
              <span className="text-[11.5px] font-medium tracking-wide text-muted uppercase">
                {labelFor(pane.id)}
              </span>
              <IconButton
                label={`Format ${pane.label}`}
                onClick={() => format(pane.id)}
                className="ml-auto size-6"
              >
                <WandSparkles size={13} />
              </IconButton>
            </header>
            <div className="min-h-0 flex-1">{editor(pane.id)}</div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface">
      <div className="flex h-9 shrink-0 items-stretch gap-px border-b border-line px-1.5">
        {PANES.map((pane) => {
          const active = pane.id === activePane;
          const filled = project[pane.id].trim().length > 0;
          return (
            <button
              key={pane.id}
              onClick={() => setActivePane(pane.id)}
              className={clsx(
                'relative inline-flex items-center gap-1.5 px-3 text-[12.5px] font-medium transition-colors',
                active ? 'text-ink' : 'text-faint hover:text-muted',
              )}
            >
              <span
                className={clsx('size-1.5 rounded-full transition-opacity', !filled && 'opacity-25')}
                style={{ background: pane.color }}
              />
              {labelFor(pane.id)}
              {active && (
                <span
                  className="absolute inset-x-1.5 -bottom-px h-0.5 rounded-full"
                  style={{ background: pane.color }}
                />
              )}
            </button>
            );
          })}

        {project.modules.map((module) => (
          <ModuleTab
            key={module.id}
            module={module}
            active={module.id === activePane}
            onSelect={() => setActivePane(module.id)}
            onRename={(name) => renameModule(module.id, name)}
            onRemove={() => removeModule(module.id)}
          />
        ))}

        <Tooltip content="Add a module the JS pane can import">
          <button
            onClick={() => addModule()}
            aria-label="Add a module"
            className="inline-flex items-center px-2 text-faint transition-colors hover:text-ink"
          >
            <Plus size={14} />
          </button>
        </Tooltip>

        <div className="ml-auto flex items-center gap-0.5">
          {languageChip()}
          <IconButton label="Format this pane (Shift+Alt+F)" onClick={() => format(activePane)}>
            <WandSparkles size={14} />
          </IconButton>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        {/* Keeping every pane mounted preserves undo history and scroll position. */}
        {[...PANES.map((p) => p.id), ...project.modules.map((m) => m.id)].map((key) => (
          <div key={key} className={clsx('h-full', key !== activePane && 'hidden')}>
            {editor(key, key === activePane)}
          </div>
        ))}
      </div>
    </div>
  );
}

const MODULE_COLOR = '#c792ea';

function ModuleTab({
  module,
  active,
  onSelect,
  onRename,
  onRemove,
}: {
  module: PenModule;
  active: boolean;
  onSelect: () => void;
  onRename: (name: string) => void;
  onRemove: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(module.name);

  const commit = () => {
    setEditing(false);
    if (draft.trim() && draft !== module.name) onRename(draft);
    else setDraft(module.name);
  };

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') {
            setDraft(module.name);
            setEditing(false);
          }
        }}
        aria-label="Module name"
        className="my-1.5 w-28 rounded border border-accent/60 bg-canvas px-1.5 text-[12.5px] outline-none"
      />
    );
  }

  return (
    <div className="group relative inline-flex items-center">
      <button
        onClick={onSelect}
        onDoubleClick={() => setEditing(true)}
        title={`${module.name} — double-click to rename`}
        className={clsx(
          'inline-flex items-center gap-1.5 py-0 pr-1 pl-3 text-[12.5px] font-medium transition-colors',
          active ? 'text-ink' : 'text-faint hover:text-muted',
        )}
      >
        <span
          className={clsx(
            'size-1.5 rounded-full transition-opacity',
            !module.code.trim() && 'opacity-25',
          )}
          style={{ background: MODULE_COLOR }}
        />
        {module.name}
      </button>

      <button
        onClick={onRemove}
        aria-label={`Remove ${module.name}`}
        className="mr-1.5 rounded p-0.5 text-faint opacity-0 transition-opacity group-hover:opacity-100 hover:text-danger focus-visible:opacity-100"
      >
        <X size={12} />
      </button>

      {active && (
        <span
          className="absolute inset-x-1.5 bottom-0 h-0.5 rounded-full"
          style={{ background: MODULE_COLOR }}
        />
      )}
    </div>
  );
}

function Chip({
  active,
  tip,
  onClick,
  children,
}: {
  active: boolean;
  tip: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Tooltip content={tip}>
      <button
        onClick={onClick}
        className={clsx(
          'inline-flex h-6 items-center gap-1.5 rounded-md px-2 text-[11.5px] font-medium transition-colors',
          active ? 'bg-accent/15 text-accent' : 'text-faint hover:text-ink',
        )}
      >
        {children}
      </button>
    </Tooltip>
  );
}
