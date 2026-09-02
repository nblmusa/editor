import type { Keymap, ThemeName } from '@/types';
import { useAppStore, defaultSettings } from '@/store/useAppStore';
import { Button, Field, Modal, Select, Switch, toast } from '../ui';

export function SettingsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const settings = useAppStore((s) => s.settings);
  const update = useAppStore((s) => s.updateSettings);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Settings"
      description="Preferences are stored in this browser."
      footer={
        <>
          <Button
            variant="ghost"
            onClick={() => {
              update(defaultSettings);
              toast('Settings reset to defaults');
            }}
          >
            Reset to defaults
          </Button>
          <Button variant="primary" onClick={onClose}>
            Done
          </Button>
        </>
      }
    >
      <Section title="Appearance">
        <Field label="Theme">
          <Select
            value={settings.theme}
            onChange={(e) => update({ theme: e.target.value as ThemeName })}
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
            <option value="system">Match system</option>
          </Select>
        </Field>

        <Field label="Font size" hint="Applies to all three editors.">
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={11}
              max={22}
              step={1}
              value={settings.fontSize}
              onChange={(e) => update({ fontSize: Number(e.target.value) })}
              className="w-32 accent-[var(--c-accent)]"
            />
            <span className="w-8 text-right text-[12.5px] tabular-nums text-muted">
              {settings.fontSize}px
            </span>
          </div>
        </Field>

        <Field label="Line numbers">
          <Switch
            label="Line numbers"
            checked={settings.lineNumbers}
            onChange={(lineNumbers) => update({ lineNumbers })}
          />
        </Field>

        <Field label="Word wrap">
          <Switch
            label="Word wrap"
            checked={settings.wordWrap}
            onChange={(wordWrap) => update({ wordWrap })}
          />
        </Field>
      </Section>

      <Section title="Editing">
        <Field label="Indent size">
          <Select
            value={settings.tabSize}
            onChange={(e) => update({ tabSize: Number(e.target.value) })}
          >
            <option value={2}>2 spaces</option>
            <option value={4}>4 spaces</option>
            <option value={8}>8 spaces</option>
          </Select>
        </Field>

        <Field label="Emmet abbreviations" hint="Expand shorthand like ul>li*3 with Tab in HTML and CSS.">
          <Switch label="Emmet" checked={settings.emmet} onChange={(emmet) => update({ emmet })} />
        </Field>

        <Field label="Key bindings">
          <Select
            value={settings.keymap}
            onChange={(e) => update({ keymap: e.target.value as Keymap })}
          >
            <option value="default">Default</option>
            <option value="vim">Vim</option>
          </Select>
        </Field>
      </Section>

      <Section title="Preview">
        <Field label="Run as you type" hint="Turn this off to only update the preview on Run.">
          <Switch
            label="Auto run"
            checked={settings.autoRun}
            onChange={(autoRun) => update({ autoRun })}
          />
        </Field>

        <Field label="Update delay" hint="How long to wait after the last keystroke.">
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={150}
              max={2000}
              step={50}
              disabled={!settings.autoRun}
              value={settings.autoRunDelay}
              onChange={(e) => update({ autoRunDelay: Number(e.target.value) })}
              className="w-32 accent-[var(--c-accent)] disabled:opacity-40"
            />
            <span className="w-12 text-right text-[12.5px] tabular-nums text-muted">
              {settings.autoRunDelay}ms
            </span>
          </div>
        </Field>
      </Section>

      <p className="mt-4 border-t border-line pt-3 text-[12px] leading-relaxed text-faint">
        Everything you write stays on this device. The preview runs in a sandboxed frame with its own
        opaque origin, so pens you open from a shared link cannot read your saved work.
      </p>
    </Modal>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-4 last:mb-0">
      <h3 className="mb-0.5 text-[11.5px] font-medium tracking-wide text-faint uppercase">{title}</h3>
      <div className="divide-y divide-line/70">{children}</div>
    </section>
  );
}
