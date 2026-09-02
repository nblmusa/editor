import { useState } from 'react';
import clsx from 'clsx';
import { ChevronRight } from 'lucide-react';
import type { SerializedValue } from '@/types';

const RAW_STYLES: Record<string, string> = {
  string: 'text-[#c3e88d]',
  number: 'text-[#f78c6c]',
  bigint: 'text-[#f78c6c]',
  boolean: 'text-[#c792ea]',
  null: 'text-faint',
  undefined: 'text-faint',
  symbol: 'text-[#82aaff]',
  fn: 'text-[#82aaff] italic',
  node: 'text-[#f07178]',
  date: 'text-[#7fdbca]',
  regexp: 'text-[#c3e88d]',
  ref: 'text-faint italic',
};

/** A one-line summary used when a container is collapsed. */
function summarize(value: SerializedValue): string {
  switch (value.t) {
    case 'raw':
      return value.k === 'string' ? `"${value.v}"` : value.v;
    case 'error':
      return value.v;
    case 'list': {
      const inner = value.items.slice(0, 3).map(summarize).join(', ');
      const rest = value.items.length > 3 || value.more ? ', …' : '';
      return `${value.label} [${inner}${rest}]`;
    }
    case 'dict': {
      const inner = value.entries
        .slice(0, 3)
        .map(([key, child]) => `${key}: ${summarize(child)}`)
        .join(', ');
      const rest = value.entries.length > 3 || value.more ? ', …' : '';
      const prefix = value.label ? `${value.label} ` : '';
      return `${prefix}{${inner}${rest}}`;
    }
  }
}

interface Props {
  value: SerializedValue;
  /** Top-level strings print bare, the way a browser console does. */
  top?: boolean;
  depth?: number;
}

export function ValueView({ value, top = false, depth = 0 }: Props) {
  const [open, setOpen] = useState(false);

  if (value.t === 'raw') {
    const bare = top && value.k === 'string';
    return (
      <span className={clsx(!bare && RAW_STYLES[value.k], bare && 'text-ink')}>
        {bare || value.k !== 'string' ? value.v : `"${value.v}"`}
      </span>
    );
  }

  if (value.t === 'error') {
    return <span className="text-danger">{value.v}</span>;
  }

  const children: [string, SerializedValue][] =
    value.t === 'list' ? value.items.map((item, i) => [String(i), item]) : value.entries;
  const isEmpty = children.length === 0 && !value.more;

  if (isEmpty) {
    return <span className="text-muted">{value.t === 'list' ? `${value.label} []` : `${value.label || ''}{}`}</span>;
  }

  return (
    <span className="inline-block align-top">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-start gap-0.5 text-left hover:text-ink"
      >
        <ChevronRight
          size={11}
          className={clsx('mt-[4px] shrink-0 text-faint transition-transform', open && 'rotate-90')}
        />
        <span className={clsx(open ? 'text-muted' : 'text-ink')}>
          {open ? value.label || (value.t === 'list' ? 'Array' : 'Object') : summarize(value)}
        </span>
      </button>

      {open && (
        <span className="mt-0.5 mb-1 flex flex-col gap-0.5 border-l border-line pl-3 ml-[5px]">
          {children.map(([key, child]) => (
            <span key={key} className="flex gap-1.5">
              <span className="shrink-0 text-[#7fdbca]">{key}:</span>
              <ValueView value={child} depth={depth + 1} />
            </span>
          ))}
          {Boolean(value.more) && (
            <span className="text-faint">… {value.more} more</span>
          )}
        </span>
      )}
    </span>
  );
}

/**
 * `console.table` renders as a real table when the argument is a collection of
 * objects; anything else falls back to the normal tree.
 */
export function TableView({ value }: { value: SerializedValue }) {
  const rows: [string, SerializedValue][] =
    value.t === 'list'
      ? value.items.map((item, i) => [String(i), item])
      : value.t === 'dict'
        ? value.entries
        : [];

  const columns: string[] = [];
  for (const [, row] of rows) {
    if (row.t !== 'dict') continue;
    for (const [key] of row.entries) if (!columns.includes(key)) columns.push(key);
  }

  if (!rows.length || !columns.length) return <ValueView value={value} top />;

  return (
    <div className="my-1 max-w-full overflow-x-auto">
      <table className="border-collapse text-[11.5px]">
        <thead>
          <tr>
            <th className="border border-line bg-elevated px-2 py-1 text-left font-medium text-muted">
              (index)
            </th>
            {columns.map((column) => (
              <th
                key={column}
                className="border border-line bg-elevated px-2 py-1 text-left font-medium text-muted"
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(([key, row]) => (
            <tr key={key}>
              <td className="border border-line px-2 py-1 text-faint">{key}</td>
              {columns.map((column) => {
                const cell = row.t === 'dict' ? row.entries.find(([k]) => k === column)?.[1] : undefined;
                return (
                  <td key={column} className="border border-line px-2 py-1">
                    {cell ? <ValueView value={cell} /> : ''}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
