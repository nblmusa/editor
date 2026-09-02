import { useEffect, useRef } from 'react';
import { EditorState, Compartment } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import type { PaneId, Settings } from '@/types';
import {
  appearanceExtensions,
  baseExtensions,
  behaviourExtensions,
  languageFor,
  syntaxErrorLinter,
  type EditorConfig,
} from '@/editor/extensions';

interface Props {
  pane: PaneId;
  value: string;
  onChange: (value: string) => void;
  settings: Settings;
  dark: boolean;
  jsx: boolean;
  onRun: () => void;
  onSave: () => void;
  onFormat: () => void;
  /** Hidden editors skip measuring, so they need a nudge when revealed. */
  visible?: boolean;
}

export function CodeEditor({
  pane,
  value,
  onChange,
  settings,
  dark,
  jsx,
  onRun,
  onSave,
  onFormat,
  visible = true,
}: Props) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const compartments = useRef({
    language: new Compartment(),
    appearance: new Compartment(),
    behaviour: new Compartment(),
    keymap: new Compartment(),
  });

  // Callbacks change every render; read them through a ref so the editor is
  // never torn down just because the parent re-rendered.
  const handlers = useRef({ onChange, onRun, onSave, onFormat });
  handlers.current = { onChange, onRun, onSave, onFormat };

  const config = (): EditorConfig => ({
    ...settings,
    pane,
    jsx,
    dark,
    onRun: () => handlers.current.onRun(),
    onSave: () => handlers.current.onSave(),
    onFormat: () => handlers.current.onFormat(),
  });

  useEffect(() => {
    if (!host.current) return;
    const cm = compartments.current;

    const state = EditorState.create({
      doc: value,
      extensions: [
        baseExtensions(),
        syntaxErrorLinter(),
        cm.language.of(languageFor(pane, jsx)),
        cm.appearance.of(appearanceExtensions(config())),
        cm.behaviour.of(behaviourExtensions(config())),
        cm.keymap.of([]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) handlers.current.onChange(update.state.doc.toString());
        }),
      ],
    });

    const instance = new EditorView({ state, parent: host.current });
    view.current = instance;

    return () => {
      instance.destroy();
      view.current = null;
    };
    // Recreated only when the pane identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pane]);

  // Sync in values that arrive from outside the editor (templates, imports, formatting).
  useEffect(() => {
    const instance = view.current;
    if (!instance) return;
    const current = instance.state.doc.toString();
    if (current === value) return;
    instance.dispatch({
      changes: { from: 0, to: current.length, insert: value },
      selection: { anchor: Math.min(instance.state.selection.main.anchor, value.length) },
    });
  }, [value]);

  useEffect(() => {
    view.current?.dispatch({
      effects: compartments.current.language.reconfigure(languageFor(pane, jsx)),
    });
  }, [pane, jsx]);

  useEffect(() => {
    view.current?.dispatch({
      effects: [
        compartments.current.appearance.reconfigure(appearanceExtensions(config())),
        compartments.current.behaviour.reconfigure(behaviourExtensions(config())),
      ],
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    dark,
    jsx,
    settings.fontSize,
    settings.tabSize,
    settings.wordWrap,
    settings.lineNumbers,
    settings.emmet,
  ]);

  useEffect(() => {
    if (visible) view.current?.requestMeasure();
  }, [visible]);

  useEffect(() => {
    let cancelled = false;
    if (settings.keymap === 'vim') {
      import('@replit/codemirror-vim').then(({ vim }) => {
        if (cancelled) return;
        view.current?.dispatch({ effects: compartments.current.keymap.reconfigure(vim()) });
      });
    } else {
      view.current?.dispatch({ effects: compartments.current.keymap.reconfigure([]) });
    }
    return () => {
      cancelled = true;
    };
  }, [settings.keymap]);

  return <div ref={host} className="h-full w-full overflow-hidden" data-pane={pane} />;
}
