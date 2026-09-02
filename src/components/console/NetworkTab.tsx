import clsx from 'clsx';
import type { NetworkEntry } from '@/types';

function formatSize(bytes: number | null): string {
  if (bytes == null) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} kB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function statusTone(entry: NetworkEntry): string {
  if (entry.status == null) return 'text-warn';
  if (entry.error || entry.status === 0) return 'text-danger';
  if (entry.status >= 400) return 'text-danger';
  if (entry.status >= 300) return 'text-warn';
  return 'text-ok';
}

function shortUrl(url: string): string {
  try {
    const parsed = new URL(url, 'https://preview.local');
    const name = parsed.pathname.split('/').filter(Boolean).at(-1) || parsed.hostname;
    return name + (parsed.search ? parsed.search.slice(0, 30) : '');
  } catch {
    return url;
  }
}

export function NetworkTab({ requests }: { requests: NetworkEntry[] }) {
  if (!requests.length) {
    return (
      <p className="px-3 py-3 font-sans text-[12.5px] text-faint">
        Requests made by your code with <code className="font-mono">fetch</code> or{' '}
        <code className="font-mono">XMLHttpRequest</code> show up here.
      </p>
    );
  }

  return (
    <table className="w-full text-[12px]">
      <thead className="sticky top-0 bg-surface">
        <tr className="text-left text-[11px] text-faint">
          <th className="px-3 py-1 font-medium">Name</th>
          <th className="w-16 px-2 py-1 font-medium">Method</th>
          <th className="w-16 px-2 py-1 font-medium">Status</th>
          <th className="w-16 px-2 py-1 text-right font-medium">Size</th>
          <th className="w-16 px-2 py-1 text-right font-medium">Time</th>
        </tr>
      </thead>
      <tbody>
        {requests.map((entry) => (
          <tr key={entry.id} className="border-t border-line/60 hover:bg-elevated" title={entry.url}>
            <td className="max-w-0 truncate px-3 py-1 font-mono">{shortUrl(entry.url)}</td>
            <td className="px-2 py-1 text-muted">{entry.method}</td>
            <td className={clsx('px-2 py-1 tabular-nums', statusTone(entry))}>
              {entry.status == null ? 'pending' : entry.error ? 'failed' : entry.status}
            </td>
            <td className="px-2 py-1 text-right tabular-nums text-muted">{formatSize(entry.size)}</td>
            <td className="px-2 py-1 text-right tabular-nums text-muted">
              {entry.ms == null ? '—' : `${entry.ms} ms`}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
