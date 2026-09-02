import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  drawSelection,
  dropCursor,
  rectangularSelection,
  crosshairCursor,
  tooltips,
} from '@codemirror/view';
import { EditorState, Prec, type Extension } from '@codemirror/state';
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
  toggleComment,
} from '@codemirror/commands';
import {
  bracketMatching,
  foldGutter,
  foldKeymap,
  indentOnInput,
  indentUnit,
  syntaxTree,
} from '@codemirror/language';
import { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap } from '@codemirror/autocomplete';
import { highlightSelectionMatches, search, searchKeymap } from '@codemirror/search';
import { lintGutter, linter, type Diagnostic } from '@codemirror/lint';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { sass } from '@codemirror/lang-sass';
import { markdown } from '@codemirror/lang-markdown';
import { javascript } from '@codemirror/lang-javascript';
import { abbreviationTracker, expandAbbreviation } from '@emmetio/codemirror6-plugin';
import type { CssLang, HtmlLang, JsFlavor, PaneId, Settings } from '@/types';
import { editorTheme } from './theme';

export interface PaneLanguage {
  htmlLang: HtmlLang;
  cssLang: CssLang;
  jsFlavor: JsFlavor;
}

export function languageFor(pane: PaneId, langs: PaneLanguage): Extension {
  switch (pane) {
    case 'html':
      return langs.htmlLang === 'markdown'
        ? markdown()
        : html({ autoCloseTags: true, matchClosingTags: true, selfClosingTags: false });
    case 'css':
      return langs.cssLang === 'scss' ? sass({ indented: false }) : css();
    case 'js': {
      const jsx = langs.jsFlavor === 'babel';
      return javascript({ jsx, typescript: jsx });
    }
  }
}

/**
 * Surfaces parse errors from the Lezer tree. It is not a full linter, but it
 * catches unbalanced brackets, stray tags and broken statements as you type.
 */
export function syntaxErrorLinter() {
  return linter(
    (view) => {
      const diagnostics: Diagnostic[] = [];
      const doc = view.state.doc;
      if (!doc.length) return diagnostics;

      syntaxTree(view.state)
        .cursor()
        .iterate((node) => {
          if (!node.type.isError) return;
          const from = node.from;
          const to = Math.min(doc.length, Math.max(node.to, node.from + 1));
          const previous = diagnostics.at(-1);
          if (previous && from - previous.to < 2) return;
          diagnostics.push({
            from,
            to,
            severity: 'error',
            message: 'Unexpected syntax here.',
          });
          if (diagnostics.length > 40) return false;
          return;
        });

      return diagnostics;
    },
    { delay: 700 },
  );
}

export interface EditorConfig extends Settings {
  pane: PaneId;
  langs: PaneLanguage;
  dark: boolean;
  onSave: () => void;
  onRun: () => void;
  onFormat: () => void;
}

export function appearanceExtensions(config: EditorConfig): Extension {
  return [
    editorTheme(config.dark),
    EditorView.theme({
      '.cm-scroller': { fontSize: `${config.fontSize}px` },
    }),
    config.lineNumbers ? [lineNumbers(), highlightActiveLineGutter()] : [],
    config.wordWrap ? EditorView.lineWrapping : [],
    indentUnit.of(' '.repeat(config.tabSize)),
    EditorState.tabSize.of(config.tabSize),
  ];
}

export function behaviourExtensions(config: EditorConfig): Extension {
  // Abbreviations are meaningless in a Markdown pane and in JavaScript.
  const emmet =
    config.emmet &&
    (config.pane === 'css' || (config.pane === 'html' && config.langs.htmlLang === 'html'));

  return [
    emmet ? abbreviationTracker() : [],
    Prec.highest(
      keymap.of([
        { key: 'Mod-Enter', run: () => (config.onRun(), true) },
        { key: 'Mod-s', run: () => (config.onSave(), true), preventDefault: true },
        { key: 'Shift-Alt-f', run: () => (config.onFormat(), true) },
        { key: 'Mod-/', run: toggleComment },
        ...(emmet ? [{ key: 'Tab', run: expandAbbreviation }] : []),
      ]),
    ),
  ];
}

export function baseExtensions(): Extension {
  return [
    history(),
    drawSelection(),
    dropCursor(),
    EditorState.allowMultipleSelections.of(true),
    indentOnInput(),
    bracketMatching(),
    closeBrackets(),
    autocompletion({ activateOnTyping: true, icons: true, maxRenderedOptions: 40 }),
    rectangularSelection(),
    crosshairCursor(),
    highlightActiveLine(),
    highlightSelectionMatches(),
    highlightSpecialChars(),
    foldGutter({ openText: '⌄', closedText: '›' }),
    search({ top: true }),
    lintGutter(),
    tooltips({ parent: document.body }),
    keymap.of([
      ...closeBracketsKeymap,
      ...defaultKeymap,
      ...searchKeymap,
      ...historyKeymap,
      ...foldKeymap,
      ...completionKeymap,
      indentWithTab,
    ]),
  ];
}
