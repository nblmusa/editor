import { Kbd, Modal } from '../ui';

const GROUPS: { title: string; items: [string, string][] }[] = [
  {
    title: 'General',
    items: [
      ['Mod-K', 'Command palette'],
      ['Mod-Enter', 'Run the preview'],
      ['Mod-S', 'Save the pen'],
      ['Mod-O', 'Open saved pens'],
      ['Mod-Alt-N', 'New pen'],
      ['Mod-/', 'This shortcut list'],
      ['Mod-,', 'Settings'],
    ],
  },
  {
    title: 'Panes',
    items: [
      ['Mod-1', 'Focus HTML'],
      ['Mod-2', 'Focus CSS'],
      ['Mod-3', 'Focus JS'],
      ['Mod-Shift-C', 'Toggle console'],
      ['Mod-Shift-P', 'Cycle split layout'],
    ],
  },
  {
    title: 'Editing',
    items: [
      ['Shift-Alt-F', 'Format the current pane'],
      ['Mod-/', 'Toggle comment'],
      ['Mod-F', 'Find'],
      ['Mod-Alt-F', 'Find and replace'],
      ['Mod-D', 'Select next occurrence'],
      ['Tab', 'Expand Emmet abbreviation'],
      ['Mod-Z', 'Undo'],
      ['Mod-Shift-Z', 'Redo'],
    ],
  },
];

export function ShortcutsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Keyboard shortcuts" width="max-w-xl">
      <div className="grid gap-5 sm:grid-cols-2">
        {GROUPS.map((group) => (
          <section key={group.title}>
            <h3 className="mb-1.5 text-[11.5px] font-medium tracking-wide text-faint uppercase">
              {group.title}
            </h3>
            <ul className="flex flex-col">
              {group.items.map(([keys, description]) => (
                <li
                  key={`${group.title}-${keys}-${description}`}
                  className="flex items-center justify-between gap-4 border-b border-line/60 py-1.5 last:border-0"
                >
                  <span className="text-[13px]">{description}</span>
                  <Kbd>{keys}</Kbd>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Modal>
  );
}
