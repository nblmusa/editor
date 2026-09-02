import { useEffect, useRef } from 'react';
import { EditorState, Compartment } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import type { PaneId, Settings } from '@/types';
import {
  appearanceExtensions,
  baseExtensions,
  behaviourExtensions,
  languageFor,
  serviceExtensions,
  type EditorConfig,
  type PaneLanguage,
} from '@/editor/extensions';

interface Props {
  pane: PaneId;
  /** Identifies this editor in the DOM; modules share the `js` language. */
  paneKey?: string;
  value: string;
  onChange: (value: string) => void;
  settings: Settings;
  dark: boolean;
  langs: PaneLanguage;
  onRun: () => void;
  onSave: () => void;
  onFormat: () => void;
  /** Hidden editors skip measuring, so they need a nudge when revealed. */
  visible?: boolean;
  /** Scrolls to a character offset; `nonce` lets the same spot be revisited. */
  reveal?: { pos: number; nonce: number } | null;
  /** Virtual filename for the TypeScript service; omitted to leave it off. */
  tsFile?: string | null;
}

export function CodeEditor({
  pane,
  paneKey,
  value,
  onChange,
  settings,
  dark,
  langs,
  onRun,
  onSave,
  onFormat,
  visible = true,
  reveal = null,
  tsFile = null,
}: Props) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const compartments = useRef({
    language: new Compartment(),
    appearance: new Compartment(),
    behaviour: new Compartment(),
    keymap: new Compartment(),
    services: new Compartment(),
  });

  // Read through a ref so renaming a module does not rebuild the extension.
  const currentFile = useRef(tsFile);
  currentFile.current = tsFile;

  // Callbacks change every render; read them through a ref so the editor is
  // never torn down just because the parent re-rendered.
  const handlers = useRef({ onChange, onRun, onSave, onFormat });
  handlers.current = { onChange, onRun, onSave, onFormat };

  const config = (): EditorConfig => ({
    ...settings,
    pane,
    langs,
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
        cm.services.of(serviceExtensions(tsFile ? () => currentFile.current! : null)),
        cm.language.of(languageFor(pane, langs)),
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
      effects: compartments.current.language.reconfigure(languageFor(pane, langs)),
    });
  }, [pane, langs]);

  const tsEnabled = Boolean(tsFile);
  useEffect(() => {
    view.current?.dispatch({
      effects: compartments.current.services.reconfigure(
        serviceExtensions(tsEnabled ? () => currentFile.current! : null),
      ),
    });
  }, [tsEnabled]);

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
    langs,
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
    const instance = view.current;
    if (!instance || !reveal) return;

    const pos = Math.min(reveal.pos, instance.state.doc.length);
    const line = instance.state.doc.lineAt(pos);
    instance.dispatch({
      selection: { anchor: line.from, head: line.to },
      effects: EditorView.scrollIntoView(pos, { y: 'center' }),
    });
    instance.focus();
  }, [reveal]);

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

  return <div ref={host} className="h-full w-full overflow-hidden" data-pane={paneKey ?? pane} />;
}
