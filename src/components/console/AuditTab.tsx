import clsx from 'clsx';
import { CheckCircle2, ExternalLink, ShieldCheck } from 'lucide-react';
import { useOutputStore } from '@/store/useOutputStore';
import { auditPreview } from '@/lib/frameBridge';
import { Button } from '../ui';

const IMPACT_TONE: Record<string, string> = {
  critical: 'bg-danger/15 text-danger',
  serious: 'bg-danger/12 text-danger',
  moderate: 'bg-warn/15 text-warn',
  minor: 'bg-line-strong text-muted',
};

export function AuditTab() {
  const audit = useOutputStore((s) => s.audit);
  const setAudit = useOutputStore((s) => s.setAudit);

  const run = () => {
    setAudit({ status: 'running' });
    if (!auditPreview()) setAudit({ status: 'failed', message: 'The preview is not ready yet.' });
  };

  if (audit.status === 'idle' || audit.status === 'running') {
    return (
      <div className="flex flex-col items-start gap-3 px-3 py-4 font-sans">
        <p className="max-w-md text-[12.5px] leading-relaxed text-muted">
          Check the rendered page against the WCAG 2 A and AA rules with{' '}
          <span className="font-medium text-ink">axe-core</span> — missing labels, poor contrast,
          bad heading order and similar issues. The rule set is fetched from a CDN the first time.
        </p>
        <Button variant="primary" onClick={run} disabled={audit.status === 'running'}>
          <ShieldCheck size={14} />
          {audit.status === 'running' ? 'Running…' : 'Run audit'}
        </Button>
      </div>
    );
  }

  if (audit.status === 'failed') {
    return (
      <div className="flex flex-col items-start gap-3 px-3 py-4 font-sans">
        <p className="text-[12.5px] text-danger">{audit.message}</p>
        <Button onClick={run}>Try again</Button>
      </div>
    );
  }

  if (!audit.violations.length) {
    return (
      <div className="flex flex-col items-start gap-3 px-3 py-4 font-sans">
        <p className="flex items-center gap-2 text-[13px] text-ok">
          <CheckCircle2 size={15} />
          No violations found.
        </p>
        <Button onClick={run}>Run again</Button>
      </div>
    );
  }

  return (
    <div className="font-sans">
      <div className="flex items-center justify-between gap-3 px-3 py-2">
        <p className="text-[12.5px] text-muted">
          {audit.violations.length} rule{audit.violations.length === 1 ? '' : 's'} violated
        </p>
        <Button size="sm" onClick={run}>
          Run again
        </Button>
      </div>

      <ul className="flex flex-col">
        {audit.violations.map((violation) => (
          <li key={violation.id} className="border-t border-line/60 px-3 py-2">
            <div className="flex items-start gap-2">
              <span
                className={clsx(
                  'mt-px rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wide uppercase',
                  IMPACT_TONE[violation.impact] ?? IMPACT_TONE.minor,
                )}
              >
                {violation.impact}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px]">{violation.help}</p>
                <p className="mt-0.5 text-[11.5px] text-faint">
                  {violation.total} element{violation.total === 1 ? '' : 's'} ·{' '}
                  <a
                    href={violation.helpUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-accent hover:underline"
                  >
                    How to fix <ExternalLink size={10} />
                  </a>
                </p>
                <ul className="mt-1 flex flex-col gap-0.5">
                  {violation.nodes.map((node) => (
                    <li
                      key={node.target}
                      className="truncate font-mono text-[11px] text-muted"
                      title={node.html}
                    >
                      {node.target}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
