import { templates } from '@/lib/templates';
import { useAppStore } from '@/store/useAppStore';
import { Modal, toast } from '../ui';

export function TemplatesDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const loadTemplate = useAppStore((s) => s.loadTemplate);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Templates"
      description="Start from a working example. Your current pen is replaced — save it first if you want to keep it."
      width="max-w-2xl"
    >
      <div className="grid gap-2 sm:grid-cols-2">
        {templates.map((template) => (
          <button
            key={template.id}
            onClick={() => {
              loadTemplate(template);
              onClose();
              toast(`Loaded the ${template.name} template`);
            }}
            className="group rounded-lg border border-line bg-elevated p-3 text-left transition-colors hover:border-accent/50"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[13.5px] font-semibold group-hover:text-accent">
                {template.name}
              </span>
              <span className="rounded-full border border-line bg-canvas px-2 py-0.5 text-[10.5px] text-faint">
                {template.tag}
              </span>
            </div>
            <p className="mt-1 text-[12.5px] leading-snug text-muted">{template.description}</p>
          </button>
        ))}
      </div>
    </Modal>
  );
}
