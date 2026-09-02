import { useRef, type ReactNode } from 'react';
import clsx from 'clsx';
import type { SplitDirection } from '@/types';

interface Props {
  direction: SplitDirection;
  ratio: number;
  onRatio: (ratio: number) => void;
  first: ReactNode;
  second: ReactNode;
  /** 'first' or 'second' hides the other pane entirely. */
  show?: 'both' | 'first' | 'second';
}

export function SplitPane({ direction, ratio, onRatio, first, second, show = 'both' }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const horizontal = direction === 'horizontal';

  const startDrag = (event: React.PointerEvent) => {
    event.preventDefault();
    const box = container.current?.getBoundingClientRect();
    if (!box) return;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = horizontal ? 'col-resize' : 'row-resize';

    const move = (e: PointerEvent) => {
      const value = horizontal
        ? ((e.clientX - box.left) / box.width) * 100
        : ((e.clientY - box.top) / box.height) * 100;
      onRatio(Math.round(value * 10) / 10);
    };
    const stop = () => {
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', stop);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', stop);
  };

  const nudge = (event: React.KeyboardEvent) => {
    const back = horizontal ? 'ArrowLeft' : 'ArrowUp';
    const forward = horizontal ? 'ArrowRight' : 'ArrowDown';
    if (event.key === back) onRatio(ratio - 2);
    else if (event.key === forward) onRatio(ratio + 2);
    else return;
    event.preventDefault();
  };

  const both = show === 'both';

  return (
    <div
      ref={container}
      className={clsx('flex h-full min-h-0 w-full', horizontal ? 'flex-row' : 'flex-col')}
    >
      <div
        className={clsx('min-h-0 min-w-0', show === 'second' && 'hidden')}
        style={both ? { flex: `0 0 ${ratio}%` } : { flex: '1 1 100%' }}
      >
        {first}
      </div>

      {both && (
        <div
          role="separator"
          aria-orientation={horizontal ? 'vertical' : 'horizontal'}
          aria-valuenow={Math.round(ratio)}
          tabIndex={0}
          onPointerDown={startDrag}
          onKeyDown={nudge}
          onDoubleClick={() => onRatio(50)}
          className={clsx(
            'group relative shrink-0 bg-line transition-colors hover:bg-accent/60',
            horizontal ? 'w-px cursor-col-resize' : 'h-px cursor-row-resize',
          )}
        >
          <span
            className={clsx(
              'absolute',
              horizontal ? '-inset-x-[4px] inset-y-0' : '-inset-y-[4px] inset-x-0',
            )}
          />
        </div>
      )}

      <div
        className={clsx('min-h-0 min-w-0', show === 'first' && 'hidden')}
        style={both ? { flex: '1 1 0%' } : { flex: '1 1 100%' }}
      >
        {second}
      </div>
    </div>
  );
}
