import clsx from 'clsx';
import { Package, Zap, ZapOff } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { PANES } from './EditorArea';
import { Tooltip } from './ui';

export function StatusBar({ onOpenLibraries }: { onOpenLibraries: () => void }) {
  const project = useAppStore((s) => s.project);
  const activePane = useAppStore((s) => s.activePane);
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);

  const pane = PANES.find((p) => p.id === activePane)!;
  const source = project[activePane];
  const lines = source ? source.split('\n').length : 0;

  return (
    <footer className="flex h-7 shrink-0 items-center gap-3 border-t border-line bg-surface px-3 text-[11.5px] text-faint">
      <span className="flex items-center gap-1.5">
        <span className="size-1.5 rounded-full" style={{ background: pane.color }} />
        {pane.label}
      </span>
      <span>
        {lines} {lines === 1 ? 'line' : 'lines'}
      </span>
      <span className="hidden sm:inline">{source.length.toLocaleString()} chars</span>

      {project.jsFlavor === 'babel' && (
        <span className="rounded bg-accent/12 px-1.5 py-px text-accent">JSX / TS</span>
      )}

      <button
        onClick={onOpenLibraries}
        className="ml-auto flex items-center gap-1.5 transition-colors hover:text-ink"
      >
        <Package size={12} />
        {project.libraries.length} {project.libraries.length === 1 ? 'library' : 'libraries'}
      </button>

      <Tooltip content={settings.autoRun ? 'Preview updates as you type' : 'Preview only updates on Run'}>
        <button
          onClick={() => updateSettings({ autoRun: !settings.autoRun })}
          className={clsx(
            'flex items-center gap-1.5 transition-colors',
            settings.autoRun ? 'text-accent' : 'hover:text-ink',
          )}
        >
          {settings.autoRun ? <Zap size={12} /> : <ZapOff size={12} />}
          Auto run
        </button>
      </Tooltip>
    </footer>
  );
}
