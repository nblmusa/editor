import { EditorView } from '@codemirror/view';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';
import type { Extension } from '@codemirror/state';

const base = (dark: boolean) =>
  EditorView.theme(
    {
      '&': {
        color: 'var(--c-ink)',
        backgroundColor: 'transparent',
        height: '100%',
      },
      '.cm-content': {
        caretColor: 'var(--c-accent)',
        padding: '10px 0 40vh',
      },
      '.cm-cursor, .cm-dropCursor': {
        borderLeftColor: 'var(--c-accent)',
        borderLeftWidth: '2px',
      },
      '&.cm-focused .cm-selectionBackgroundm, .cm-selectionBackground, .cm-content ::selection': {
        backgroundColor: dark ? 'rgba(45, 212, 191, 0.22)' : 'rgba(13, 148, 136, 0.18)',
      },
      '.cm-activeLine': {
        backgroundColor: dark ? 'rgba(255, 255, 255, 0.035)' : 'rgba(15, 23, 42, 0.04)',
      },
      '.cm-activeLineGutter': {
        backgroundColor: 'transparent',
        color: 'var(--c-ink)',
      },
      '.cm-gutters': {
        backgroundColor: 'transparent',
        color: dark ? '#4b5464' : '#a3abb9',
        border: 'none',
      },
      '.cm-foldPlaceholder': {
        backgroundColor: 'var(--c-elevated)',
        border: '1px solid var(--c-line-strong)',
        color: 'var(--c-muted)',
        borderRadius: '4px',
        padding: '0 6px',
        margin: '0 2px',
      },
      '.cm-selectionMatch': {
        backgroundColor: dark ? 'rgba(130, 170, 255, 0.16)' : 'rgba(37, 99, 235, 0.12)',
      },
      '&.cm-focused .cm-matchingBracket': {
        backgroundColor: dark ? 'rgba(45, 212, 191, 0.2)' : 'rgba(13, 148, 136, 0.16)',
        outline: 'none',
      },
      '&.cm-focused .cm-nonmatchingBracket': {
        backgroundColor: 'rgba(248, 113, 113, 0.25)',
      },
      '.cm-searchMatch': {
        backgroundColor: 'rgba(251, 191, 36, 0.25)',
        outline: '1px solid rgba(251, 191, 36, 0.5)',
      },
      '.cm-searchMatch.cm-searchMatch-selected': {
        backgroundColor: 'rgba(251, 191, 36, 0.45)',
      },
      '.cm-lintRange-error': {
        backgroundImage: 'none',
        borderBottom: '1px dotted var(--c-danger)',
      },
    },
    { dark },
  );

const darkHighlight = HighlightStyle.define([
  { tag: [t.comment, t.lineComment, t.blockComment], color: '#5c6673', fontStyle: 'italic' },
  { tag: [t.keyword, t.modifier, t.controlKeyword, t.moduleKeyword], color: '#c792ea' },
  { tag: [t.operator, t.operatorKeyword, t.punctuation, t.separator], color: '#89ddff' },
  { tag: [t.string, t.special(t.string), t.regexp], color: '#c3e88d' },
  { tag: [t.number, t.bool, t.null, t.atom], color: '#f78c6c' },
  { tag: [t.function(t.variableName), t.function(t.propertyName), t.labelName], color: '#82aaff' },
  { tag: [t.definition(t.variableName), t.definition(t.propertyName)], color: '#eeffff' },
  { tag: [t.variableName, t.self], color: '#e6e9ef' },
  { tag: [t.propertyName, t.attributeValue], color: '#7fdbca' },
  { tag: [t.className, t.typeName, t.namespace, t.macroName], color: '#ffcb6b' },
  { tag: [t.tagName, t.angleBracket], color: '#f07178' },
  { tag: [t.attributeName], color: '#ffcb6b' },
  { tag: [t.meta, t.processingInstruction, t.documentMeta], color: '#89ddff' },
  { tag: [t.link, t.url], color: '#82aaff', textDecoration: 'underline' },
  { tag: t.heading, color: '#f07178', fontWeight: '700' },
  { tag: t.emphasis, fontStyle: 'italic' },
  { tag: t.strong, fontWeight: '700' },
  { tag: t.strikethrough, textDecoration: 'line-through' },
  { tag: t.invalid, color: '#f87171' },
]);

const lightHighlight = HighlightStyle.define([
  { tag: [t.comment, t.lineComment, t.blockComment], color: '#8b95a5', fontStyle: 'italic' },
  { tag: [t.keyword, t.modifier, t.controlKeyword, t.moduleKeyword], color: '#7c3aed' },
  { tag: [t.operator, t.operatorKeyword, t.punctuation, t.separator], color: '#0369a1' },
  { tag: [t.string, t.special(t.string), t.regexp], color: '#0f766e' },
  { tag: [t.number, t.bool, t.null, t.atom], color: '#b45309' },
  { tag: [t.function(t.variableName), t.function(t.propertyName), t.labelName], color: '#2563eb' },
  { tag: [t.definition(t.variableName), t.definition(t.propertyName)], color: '#111827' },
  { tag: [t.variableName, t.self], color: '#1f2937' },
  { tag: [t.propertyName, t.attributeValue], color: '#0e7490' },
  { tag: [t.className, t.typeName, t.namespace, t.macroName], color: '#a16207' },
  { tag: [t.tagName, t.angleBracket], color: '#be123c' },
  { tag: [t.attributeName], color: '#a16207' },
  { tag: [t.meta, t.processingInstruction, t.documentMeta], color: '#0369a1' },
  { tag: [t.link, t.url], color: '#2563eb', textDecoration: 'underline' },
  { tag: t.heading, color: '#be123c', fontWeight: '700' },
  { tag: t.emphasis, fontStyle: 'italic' },
  { tag: t.strong, fontWeight: '700' },
  { tag: t.strikethrough, textDecoration: 'line-through' },
  { tag: t.invalid, color: '#dc2626' },
]);

export function editorTheme(dark: boolean): Extension {
  return [base(dark), syntaxHighlighting(dark ? darkHighlight : lightHighlight)];
}
