import { type Extension } from '@codemirror/state';
import { hoverTooltip, type EditorView } from '@codemirror/view';
import {
  autocompletion,
  type CompletionContext,
  type CompletionResult,
} from '@codemirror/autocomplete';
import { linter, type Diagnostic } from '@codemirror/lint';
import { requestCompletions, requestDetails, requestDiagnostics, requestQuickInfo } from './client';

/** Completions are requested after a word character, a dot or a trigger key. */
const TRIGGER = /[\w$]+$|\.$|['"`/]$/;

function completionSource(file: () => string) {
  return async (context: CompletionContext): Promise<CompletionResult | null> => {
    const word = context.matchBefore(TRIGGER);
    if (!word && !context.explicit) return null;

    const from = word && /[\w$]/.test(word.text) ? word.from : context.pos;
    const code = context.state.doc.toString();
    const name = file();

    try {
      const entries = await requestCompletions(name, context.pos, code);
      if (!entries.length) return null;

      return {
        from,
        options: entries.map((entry) => ({
          label: entry.name,
          apply: entry.insert ?? entry.name,
          type: entry.kind,
          boost: entry.sortText.startsWith('0') ? 1 : 0,
          info: () =>
            requestDetails(name, context.pos, entry.name, code)
              .then((text) => (text ? renderInfo(text) : null))
              .catch(() => null),
        })),
        validFor: /^[\w$]*$/,
      };
    } catch {
      return null;
    }
  };
}

function renderInfo(text: string): HTMLElement {
  const node = document.createElement('div');
  node.className = 'cm-ts-info';
  node.textContent = text;
  return node;
}

function diagnosticsSource(file: () => string) {
  return async (view: EditorView): Promise<Diagnostic[]> => {
    const code = view.state.doc.toString();
    try {
      const results = await requestDiagnostics(file(), code);
      const limit = view.state.doc.length;
      return results.map((item) => ({
        from: Math.min(item.start, limit),
        to: Math.min(item.start + item.length, limit),
        severity: item.category === 'suggestion' ? 'info' : item.category,
        message: item.message,
      }));
    } catch {
      return [];
    }
  };
}

function hover(file: () => string) {
  return hoverTooltip(async (view, pos) => {
    try {
      const info = await requestQuickInfo(file(), pos, view.state.doc.toString());
      if (!info) return null;
      return {
        pos: info.start,
        end: info.start + info.length,
        create: () => ({
          dom: renderInfo(
            info.documentation ? `${info.text}\n\n${info.documentation}` : info.text,
          ),
        }),
      };
    } catch {
      return null;
    }
  });
}

/**
 * Language features for a script pane, served by the TypeScript worker.
 * `file` is read lazily because a module can be renamed while the editor lives.
 */
export function typescriptSupport(
  file: () => string,
  completionConfig: Parameters<typeof autocompletion>[0],
): Extension {
  return [
    autocompletion({ ...completionConfig, override: [completionSource(file)] }),
    linter(diagnosticsSource(file), { delay: 500 }),
    hover(file),
  ];
}
