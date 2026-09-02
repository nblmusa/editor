import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { Monitor, RotateCw, Smartphone, SquareArrowOutUpRight, Tablet } from 'lucide-react';
import type { Project } from '@/types';
import { buildSrcDoc, buildStandaloneDoc, structuralKey } from '@/lib/srcdoc';
import { patchPreviewCss, setPreviewWindow } from '@/lib/frameBridge';
import { useOutputStore } from '@/store/useOutputStore';
import { IconButton, SegmentedControl } from './ui';

const SANDBOX =
  'allow-scripts allow-modals allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads';

type DeviceId = 'auto' | 'mobile' | 'tablet';

const DEVICES: Record<DeviceId, number | null> = {
  auto: null,
  mobile: 390,
  tablet: 820,
};

interface Props {
  project: Project;
  runToken: number;
  autoRun: boolean;
  autoRunDelay: number;
  dark: boolean;
  onHotkey: (key: string, modifiers: { shift: boolean; alt: boolean }) => void;
}

export function Preview({ project, runToken, autoRun, autoRunDelay, dark, onHotkey }: Props) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [device, setDevice] = useState<DeviceId>('auto');
  const [status, setStatus] = useState<'idle' | 'running'>('idle');

  const push = useOutputStore((s) => s.push);
  const recordRequest = useOutputStore((s) => s.recordRequest);
  const setAudit = useOutputStore((s) => s.setAudit);
  const clearOutput = useOutputStore((s) => s.clear);

  const doc = useMemo(
    () => buildSrcDoc(project, { darkPreview: dark }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [project.html, project.css, project.js, project.libraries, project.jsFlavor, dark],
  );

  const shape = useMemo(() => structuralKey(project) + String(dark), [project, dark]);
  const lastShape = useRef<string | null>(null);

  const reload = useCallback(
    (html: string) => {
      const el = frame.current;
      if (!el) return;
      setPreviewWindow(null);
      clearOutput();
      setStatus('running');
      lastShape.current = shape;
      el.srcdoc = html;
    },
    [clearOutput, shape],
  );

  // Manual runs and project switches always rebuild the document.
  useEffect(() => {
    reload(doc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runToken]);

  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (!autoRun) return;

    const timer = window.setTimeout(() => {
      // Styling on its own can be swapped in place, which preserves scroll
      // position, form state and any animation already in flight.
      if (lastShape.current === shape && patchPreviewCss(project.css)) return;
      reload(doc);
    }, autoRunDelay);

    return () => clearTimeout(timer);
  }, [doc, shape, project.css, autoRun, autoRunDelay, reload]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data !== 'object' || !data.__editorFrame) return;
      if (event.source !== frame.current?.contentWindow) return;

      switch (data.type) {
        case 'console':
          push({ level: data.level, parts: data.parts, stack: data.stack });
          break;
        case 'clear':
          clearOutput();
          break;
        case 'network':
          recordRequest(data.entry);
          break;
        case 'audit':
          setAudit(
            data.ok
              ? { status: 'done', violations: data.violations, at: Date.now() }
              : { status: 'failed', message: data.message },
          );
          break;
        case 'ready':
          setStatus('idle');
          setPreviewWindow(frame.current?.contentWindow ?? null);
          break;
        case 'eval-result':
          push({ level: data.ok ? 'result' : 'error', parts: data.parts });
          break;
        case 'hotkey':
          onHotkey(data.key, { shift: Boolean(data.shift), alt: Boolean(data.alt) });
          break;
      }
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [push, clearOutput, recordRequest, setAudit, onHotkey]);

  const openInNewTab = () => {
    const blob = new Blob([buildStandaloneDoc(project)], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener');
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  };

  const width = DEVICES[device];

  return (
    <section className="flex h-full min-h-0 flex-col bg-surface">
      <header className="flex h-9 shrink-0 items-center gap-1 border-b border-line px-2">
        <span className="mr-auto flex items-center gap-2 pl-1 text-[12px] font-medium tracking-wide text-muted uppercase">
          Preview
          <span
            className={clsx(
              'size-1.5 rounded-full transition-colors',
              status === 'running' ? 'bg-warn' : 'bg-ok/70',
            )}
          />
        </span>

        <div className="hidden sm:block">
          <SegmentedControl<DeviceId>
            value={device}
            onChange={setDevice}
            options={[
              { value: 'auto', label: <Monitor size={13} />, title: 'Fill available width' },
              { value: 'tablet', label: <Tablet size={13} />, title: 'Tablet — 820px' },
              { value: 'mobile', label: <Smartphone size={13} />, title: 'Mobile — 390px' },
            ]}
          />
        </div>

        <IconButton label="Reload preview" onClick={() => reload(doc)}>
          <RotateCw size={15} />
        </IconButton>
        <IconButton label="Open in new tab" onClick={openInNewTab}>
          <SquareArrowOutUpRight size={15} />
        </IconButton>
      </header>

      <div
        className={clsx(
          'relative min-h-0 flex-1',
          width && 'flex justify-center overflow-auto bg-canvas p-3',
        )}
      >
        <iframe
          ref={frame}
          title="Preview"
          sandbox={SANDBOX}
          className={clsx(
            'h-full w-full border-0 bg-white',
            width && 'rounded-md shadow-2xl shadow-black/30 ring-1 ring-line',
          )}
          style={width ? { maxWidth: width } : undefined}
        />
      </div>
    </section>
  );
}
