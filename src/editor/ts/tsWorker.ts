/// <reference lib="webworker" />
import ts from 'ts-service';
import type {
  TsCompletion,
  TsDiagnostic,
  TsQuickInfo,
  TsRequest,
  TsSnapshot,
} from './protocol';

/**
 * Only the libraries an ES2022 browser target actually references are bundled.
 * Pulling in every `lib.*.d.ts` would roughly triple the size of this worker.
 */
const LIB_SOURCES = import.meta.glob<string>(
  '/node_modules/ts-service/lib/lib.{es5,es20*,dom*,decorators*}.d.ts',
  { query: '?raw', import: 'default', eager: true },
);

const libs = new Map<string, string>();
for (const [path, source] of Object.entries(LIB_SOURCES)) {
  libs.set(path.slice(path.lastIndexOf('/') + 1), source);
}

const COMPILER_OPTIONS: ts.CompilerOptions = {
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  lib: ['lib.es2022.d.ts', 'lib.dom.d.ts', 'lib.dom.iterable.d.ts'],
  jsx: ts.JsxEmit.React,
  allowJs: true,
  allowNonTsExtensions: true,
  allowImportingTsExtensions: true,
  strict: false,
  noEmit: true,
  skipLibCheck: true,
  isolatedModules: true,
};

let snapshot: TsSnapshot = { entry: '/index.tsx', files: [], checked: false };
const versions = new Map<string, number>();

function contentsOf(fileName: string): string | undefined {
  if (fileName.startsWith('/lib.')) return libs.get(fileName.slice(1));
  if (libs.has(fileName)) return libs.get(fileName);
  return snapshot.files.find((file) => file.name === fileName)?.code;
}

const host: ts.LanguageServiceHost = {
  getCompilationSettings: () => COMPILER_OPTIONS,
  getScriptFileNames: () => snapshot.files.map((file) => file.name),
  getScriptVersion: (fileName) => String(versions.get(fileName) ?? 0),
  getScriptSnapshot: (fileName) => {
    const contents = contentsOf(fileName);
    return contents === undefined ? undefined : ts.ScriptSnapshot.fromString(contents);
  },
  getCurrentDirectory: () => '/',
  getDefaultLibFileName: () => '/lib.es2022.d.ts',
  fileExists: (fileName) => contentsOf(fileName) !== undefined,
  readFile: (fileName) => contentsOf(fileName),
  useCaseSensitiveFileNames: () => true,
};

const service = ts.createLanguageService(host, ts.createDocumentRegistry());

function sync(next: TsSnapshot): void {
  for (const file of next.files) {
    const previous = snapshot.files.find((f) => f.name === file.name);
    if (!previous || previous.code !== file.code) {
      versions.set(file.name, (versions.get(file.name) ?? 0) + 1);
    }
  }
  snapshot = next;
}

/** Applies the buffer a query was made against before answering it. */
function touch(name: string, code: string): void {
  const existing = snapshot.files.find((file) => file.name === name);
  if (existing?.code === code) return;

  versions.set(name, (versions.get(name) ?? 0) + 1);
  snapshot = {
    ...snapshot,
    files: existing
      ? snapshot.files.map((file) => (file.name === name ? { ...file, code } : file))
      : [...snapshot.files, { name, code }],
  };
}

const KIND_MAP: Record<string, string> = {
  [ts.ScriptElementKind.memberVariableElement]: 'property',
  [ts.ScriptElementKind.memberFunctionElement]: 'method',
  [ts.ScriptElementKind.functionElement]: 'function',
  [ts.ScriptElementKind.localFunctionElement]: 'function',
  [ts.ScriptElementKind.variableElement]: 'variable',
  [ts.ScriptElementKind.localVariableElement]: 'variable',
  [ts.ScriptElementKind.constElement]: 'constant',
  [ts.ScriptElementKind.classElement]: 'class',
  [ts.ScriptElementKind.interfaceElement]: 'interface',
  [ts.ScriptElementKind.enumElement]: 'enum',
  [ts.ScriptElementKind.moduleElement]: 'namespace',
  [ts.ScriptElementKind.keyword]: 'keyword',
  [ts.ScriptElementKind.typeParameterElement]: 'type',
  [ts.ScriptElementKind.alias]: 'type',
};

function completions(file: string, pos: number): TsCompletion[] {
  const result = service.getCompletionsAtPosition(file, pos, {
    includeCompletionsForModuleExports: true,
    includeCompletionsWithInsertText: true,
  });
  if (!result) return [];

  return result.entries.slice(0, 400).map((entry) => ({
    name: entry.name,
    kind: KIND_MAP[entry.kind] ?? 'variable',
    sortText: entry.sortText,
    insert: entry.insertText,
  }));
}

function details(file: string, pos: number, name: string): string {
  const detail = service.getCompletionEntryDetails(file, pos, name, undefined, undefined, undefined, undefined);
  if (!detail) return '';
  const signature = ts.displayPartsToString(detail.displayParts);
  const docs = ts.displayPartsToString(detail.documentation);
  return docs ? `${signature}\n\n${docs}` : signature;
}

function diagnostics(file: string): TsDiagnostic[] {
  const syntactic = service.getSyntacticDiagnostics(file);
  // Type errors only make sense once the author has opted into TypeScript;
  // plain JavaScript still gets completions without red underlines.
  const semantic = snapshot.checked ? service.getSemanticDiagnostics(file) : [];

  return [...syntactic, ...semantic]
    .filter((diagnostic) => diagnostic.start !== undefined)
    .slice(0, 60)
    .map((diagnostic) => ({
      start: diagnostic.start ?? 0,
      length: Math.max(1, diagnostic.length ?? 1),
      message: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
      category:
        diagnostic.category === ts.DiagnosticCategory.Error
          ? 'error'
          : diagnostic.category === ts.DiagnosticCategory.Warning
            ? 'warning'
            : 'suggestion',
    }));
}

function quickInfo(file: string, pos: number): TsQuickInfo | null {
  const info = service.getQuickInfoAtPosition(file, pos);
  if (!info) return null;
  return {
    text: ts.displayPartsToString(info.displayParts),
    documentation: ts.displayPartsToString(info.documentation),
    start: info.textSpan.start,
    length: info.textSpan.length,
  };
}

self.onmessage = (event: MessageEvent<TsRequest>) => {
  const request = event.data;
  try {
    let result: unknown = null;
    switch (request.type) {
      case 'sync':
        sync(request.snapshot);
        break;
      case 'completions':
        touch(request.file, request.code);
        result = completions(request.file, request.pos);
        break;
      case 'details':
        touch(request.file, request.code);
        result = details(request.file, request.pos, request.name);
        break;
      case 'diagnostics':
        touch(request.file, request.code);
        result = diagnostics(request.file);
        break;
      case 'quickinfo':
        touch(request.file, request.code);
        result = quickInfo(request.file, request.pos);
        break;
    }
    self.postMessage({ id: request.id, ok: true, result });
  } catch (error) {
    self.postMessage({
      id: request.id,
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    });
  }
};
