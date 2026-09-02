import { useCallback } from 'react';
import clsx from 'clsx';
import { Braces, FileCode2, Palette, Sparkles, WandSparkles } from 'lucide-react';
import type { PaneId } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { formatCode } from '@/lib/format';
import { CodeEditor } from './CodeEditor';
import { IconButton, Tooltip, toast } from './ui';

export const PANES: { id: PaneId; label: string; icon: typeof FileCode2; color: string }[] = [
  { id: 'html', label: 'HTML', icon: FileCode2, color: '#f07178' },
  { id: 'css', label: 'CSS', icon: Palette, color: '#82aaff' },
  { id: 'js', label: 'JS', icon: Braces, color: '#ffcb6b' },
];

export function useFormatPane() {
  const project = useAppStore((s) => s.project);
  const tabSize = useAppStore((s) => s.settings.tabSize);
  const setCode = useAppStore((s) => s.setCode);

  return useCallback(
    async (pane: PaneId) => {
      try {
        const formatted = await formatCode(project[pane], pane, tabSize);
        if (formatted !== project[pane]) {
          setCode(pane, formatted);
          toast(`Formatted ${pane.toUpperCase()}`);
        }
      } catch {
        toast(`${pane.toUpperCase()} could not be formatted — check for syntax errors.`, 'error');
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
  const format = useFormatPane();

  const jsx = project.jsFlavor === 'babel';
  const columns = settings.editorLayout === 'columns';

  const editor = (pane: PaneId, visible = true) => (
    <CodeEditor
      pane={pane}
      value={project[pane]}
      onChange={(value) => setCode(pane, value)}
      settings={settings}
      dark={dark}
      jsx={jsx && pane === 'js'}
      onRun={onRun}
      onSave={onSave}
      onFormat={() => format(pane)}
      visible={visible}
    />
  );

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
                {pane.label}
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
              {pane.label}
              {active && (
                <span
                  className="absolute inset-x-1.5 -bottom-px h-0.5 rounded-full"
                  style={{ background: pane.color }}
                />
              )}
            </button>
          );
        })}

        <div className="ml-auto flex items-center gap-0.5">
          {activePane === 'js' && (
            <Tooltip content="Compile JSX and TypeScript with Babel">
              <button
                onClick={() => setJsFlavor(jsx ? 'javascript' : 'babel')}
                className={clsx(
                  'inline-flex h-6 items-center gap-1.5 rounded-md px-2 text-[11.5px] font-medium transition-colors',
                  jsx ? 'bg-accent/15 text-accent' : 'text-faint hover:text-ink',
                )}
              >
                <Sparkles size={12} />
                JSX / TS
              </button>
            </Tooltip>
          )}
          <IconButton label="Format this pane (Shift+Alt+F)" onClick={() => format(activePane)}>
            <WandSparkles size={14} />
          </IconButton>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        {/* Keeping every pane mounted preserves undo history and scroll position. */}
        {PANES.map((pane) => (
          <div key={pane.id} className={clsx('h-full', pane.id !== activePane && 'hidden')}>
            {editor(pane.id, pane.id === activePane)}
          </div>
        ))}
      </div>
    </div>
  );
}
