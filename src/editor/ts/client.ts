import type {
  TsCompletion,
  TsDiagnostic,
  TsQuickInfo,
  TsRequest,
  TsRequestBody,
  TsResponse,
  TsSnapshot,
} from './protocol';

type Pending = { resolve: (value: never) => void; reject: (reason: Error) => void };

export type TsStatus = 'off' | 'loading' | 'ready';

let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<number, Pending>();
let latest: TsSnapshot | null = null;

let status: TsStatus = 'off';
const watchers = new Set<(status: TsStatus) => void>();

function setStatus(next: TsStatus): void {
  if (status === next) return;
  status = next;
  watchers.forEach((watcher) => watcher(next));
}

export function getStatus(): TsStatus {
  return status;
}

export function watchStatus(watcher: (status: TsStatus) => void): () => void {
  watchers.add(watcher);
  return () => watchers.delete(watcher);
}

/**
 * The worker carries the TypeScript compiler and its type definitions, several
 * megabytes in all, so it is only spun up once something asks for a language
 * feature — and the first answer it gives is what marks it ready.
 */
function ensureWorker(): Worker {
  if (worker) return worker;

  setStatus('loading');
  worker = new Worker(new URL('./tsWorker.ts', import.meta.url), { type: 'module' });
  worker.onmessage = (event: MessageEvent<TsResponse>) => {
    setStatus('ready');
    const entry = pending.get(event.data.id);
    if (!entry) return;
    pending.delete(event.data.id);
    if (event.data.ok) entry.resolve(event.data.result as never);
    else entry.reject(new Error(event.data.message));
  };

  if (latest) void send({ type: 'sync', snapshot: latest });
  return worker;
}

function send<T>(request: TsRequestBody): Promise<T> {
  const id = nextId++;
  const instance = ensureWorker();
  return new Promise<T>((resolve, reject) => {
    pending.set(id, { resolve: resolve as never, reject });
    instance.postMessage({ ...request, id } as TsRequest);
    // A stuck worker should not wedge autocomplete forever.
    setTimeout(() => {
      if (pending.delete(id)) reject(new Error('Language service timed out.'));
    }, 8000);
  });
}

/** Remembered so a worker started later still sees the current sources. */
export function syncProject(snapshot: TsSnapshot): void {
  latest = snapshot;
  if (worker) void send({ type: 'sync', snapshot });
}

export function hasSnapshot(): boolean {
  return latest !== null;
}

export function requestCompletions(
  file: string,
  pos: number,
  code: string,
): Promise<TsCompletion[]> {
  return send({ type: 'completions', file, pos, code });
}

export function requestDetails(
  file: string,
  pos: number,
  name: string,
  code: string,
): Promise<string> {
  return send({ type: 'details', file, pos, name, code });
}

export function requestDiagnostics(file: string, code: string): Promise<TsDiagnostic[]> {
  return send({ type: 'diagnostics', file, code });
}

export function requestQuickInfo(
  file: string,
  pos: number,
  code: string,
): Promise<TsQuickInfo | null> {
  return send({ type: 'quickinfo', file, pos, code });
}
