import clsx from 'clsx';
import {
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/* ---------------------------------- Button --------------------------------- */

type ButtonVariant = 'primary' | 'ghost' | 'subtle' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md';
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-[#04231f] hover:brightness-110 font-semibold disabled:opacity-50 dark:text-[#04231f]',
  ghost: 'text-muted hover:text-ink hover:bg-elevated',
  subtle: 'bg-elevated text-ink border border-line hover:border-line-strong',
  danger: 'bg-danger/12 text-danger border border-danger/30 hover:bg-danger/20',
};

export function Button({ variant = 'subtle', size = 'md', className, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={clsx(
        'inline-flex items-center justify-center gap-1.5 rounded-md whitespace-nowrap transition-colors select-none disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' ? 'h-7 px-2.5 text-[12px]' : 'h-8 px-3 text-[13px]',
        VARIANTS[variant],
        className,
      )}
    />
  );
}

/* -------------------------------- IconButton ------------------------------- */

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  active?: boolean;
  tone?: 'default' | 'accent';
}

export function IconButton({ label, active, tone = 'default', className, ...props }: IconButtonProps) {
  return (
    <Tooltip content={label}>
      <button
        {...props}
        aria-label={label}
        aria-pressed={active}
        className={clsx(
          'inline-grid size-8 place-items-center rounded-md transition-colors',
          active
            ? tone === 'accent'
              ? 'bg-accent/15 text-accent'
              : 'bg-elevated text-ink'
            : 'text-muted hover:bg-elevated hover:text-ink',
          'disabled:pointer-events-none disabled:opacity-40',
          className,
        )}
      />
    </Tooltip>
  );
}

/* --------------------------------- Tooltip --------------------------------- */

export function Tooltip({ content, children }: { content: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const wrap = useRef<HTMLSpanElement>(null);
  const timer = useRef<number>(0);

  const show = () => {
    timer.current = window.setTimeout(() => {
      const rect = wrap.current?.firstElementChild?.getBoundingClientRect();
      if (!rect) return;
      setPos({ x: rect.left + rect.width / 2, y: rect.bottom + 8 });
      setOpen(true);
    }, 400);
  };

  const hide = () => {
    clearTimeout(timer.current);
    setOpen(false);
  };

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <>
      <span
        ref={wrap}
        className="contents"
        onPointerEnter={show}
        onPointerLeave={hide}
        onPointerDown={hide}
      >
        {children}
      </span>
      {open &&
        createPortal(
          <div
            role="tooltip"
            style={{ left: pos.x, top: pos.y }}
            className="animate-fade-in pointer-events-none fixed z-[100] -translate-x-1/2 rounded-md border border-line bg-elevated px-2 py-1 text-[11.5px] whitespace-nowrap text-ink shadow-lg shadow-black/30"
          >
            {content}
          </div>,
          document.body,
        )}
    </>
  );
}

/* ----------------------------------- Kbd ----------------------------------- */

const IS_MAC =
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

export function formatShortcut(keys: string): string {
  return keys
    .replace(/Mod/g, IS_MAC ? '⌘' : 'Ctrl')
    .replace(/Alt/g, IS_MAC ? '⌥' : 'Alt')
    .replace(/Shift/g, IS_MAC ? '⇧' : 'Shift')
    .replace(/Enter/g, IS_MAC ? '↵' : 'Enter');
}

export function Kbd({ children }: { children: string }) {
  return (
    <kbd className="rounded border border-line bg-canvas px-1.5 py-0.5 font-sans text-[10.5px] font-medium text-muted">
      {formatShortcut(children)}
    </kbd>
  );
}

/* ---------------------------------- Modal ---------------------------------- */

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}

export function Modal({ open, onClose, title, description, children, footer, width = 'max-w-lg' }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 pt-[8vh] sm:p-6 sm:pt-[10vh]">
      <div className="animate-fade-in fixed inset-0 bg-black/55 backdrop-blur-[2px]" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={clsx(
          'animate-pop-in relative w-full rounded-lg border border-line bg-surface shadow-2xl shadow-black/40',
          width,
        )}
      >
        <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-3.5">
          <div>
            <h2 className="text-[15px] font-semibold">{title}</h2>
            {description && <p className="mt-0.5 text-[12.5px] text-muted">{description}</p>}
          </div>
          <IconButton label="Close" onClick={onClose} className="-mr-1.5 -mt-0.5">
            <X size={16} />
          </IconButton>
        </header>
        <div className="max-h-[62vh] overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <footer className="flex items-center justify-end gap-2 border-t border-line px-5 py-3">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body,
  );
}

/* --------------------------------- Controls -------------------------------- */

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex items-center justify-between gap-6 py-2.5">
      <span className="min-w-0">
        <span className="block text-[13px] font-medium">{label}</span>
        {hint && <span className="mt-0.5 block text-[12px] leading-snug text-faint">{hint}</span>}
      </span>
      <span className="shrink-0">{children}</span>
    </label>
  );
}

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={clsx(
        'relative h-[22px] w-[38px] rounded-full transition-colors',
        checked ? 'bg-accent' : 'bg-line-strong',
      )}
    >
      <span
        className={clsx(
          'absolute top-[3px] size-4 rounded-full bg-white shadow transition-[left]',
          checked ? 'left-[19px]' : 'left-[3px]',
        )}
      />
    </button>
  );
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={clsx(
        'h-8 rounded-md border border-line bg-elevated px-2 text-[13px] text-ink outline-none hover:border-line-strong',
        className,
      )}
    />
  );
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: ReactNode; title?: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="inline-flex rounded-md border border-line bg-elevated p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          title={option.title}
          onClick={() => onChange(option.value)}
          className={clsx(
            'inline-flex h-[26px] items-center gap-1.5 rounded-[5px] px-2.5 text-[12.5px] transition-colors',
            value === option.value
              ? 'bg-accent/15 text-accent'
              : 'text-muted hover:text-ink',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/* ----------------------------------- Menu ---------------------------------- */

export interface MenuItem {
  id: string;
  label: string;
  icon?: ReactNode;
  shortcut?: string;
  danger?: boolean;
  onSelect: () => void;
}

export function Menu({
  trigger,
  items,
  align = 'end',
}: {
  trigger: (props: { open: boolean; toggle: () => void }) => ReactNode;
  items: (MenuItem | 'separator')[];
  align?: 'start' | 'end';
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      {trigger({ open, toggle: () => setOpen((v) => !v) })}
      {open && (
        <div
          role="menu"
          className={clsx(
            'animate-pop-in absolute top-full z-50 mt-1.5 min-w-52 rounded-lg border border-line bg-elevated p-1 shadow-2xl shadow-black/40',
            align === 'end' ? 'right-0' : 'left-0',
          )}
        >
          {items.map((item, index) =>
            item === 'separator' ? (
              <div key={`sep-${index}`} className="my-1 h-px bg-line" />
            ) : (
              <button
                key={item.id}
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  item.onSelect();
                }}
                className={clsx(
                  'flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-[13px] transition-colors',
                  item.danger ? 'text-danger hover:bg-danger/12' : 'text-ink hover:bg-surface',
                )}
              >
                <span className={clsx('shrink-0', item.danger ? 'text-danger' : 'text-muted')}>
                  {item.icon}
                </span>
                <span className="flex-1">{item.label}</span>
                {item.shortcut && (
                  <span className="text-[11px] text-faint">{formatShortcut(item.shortcut)}</span>
                )}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------- Toast ---------------------------------- */

let toastId = 0;
type Toast = { id: number; message: string; tone: 'default' | 'error' };
const listeners = new Set<(toasts: Toast[]) => void>();
let toasts: Toast[] = [];

export function toast(message: string, tone: 'default' | 'error' = 'default') {
  const item = { id: ++toastId, message, tone };
  toasts = [...toasts, item];
  listeners.forEach((l) => l(toasts));
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== item.id);
    listeners.forEach((l) => l(toasts));
  }, 2600);
}

export function Toaster() {
  const [items, setItems] = useState<Toast[]>([]);
  useEffect(() => {
    listeners.add(setItems);
    return () => {
      listeners.delete(setItems);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed bottom-5 left-1/2 z-[80] flex -translate-x-1/2 flex-col items-center gap-2">
      {items.map((item) => (
        <div
          key={item.id}
          className={clsx(
            'animate-pop-in rounded-md border px-3.5 py-2 text-[13px] shadow-xl shadow-black/30',
            item.tone === 'error'
              ? 'border-danger/40 bg-danger/12 text-danger'
              : 'border-line bg-elevated text-ink',
          )}
        >
          {item.message}
        </div>
      ))}
    </div>
  );
}
