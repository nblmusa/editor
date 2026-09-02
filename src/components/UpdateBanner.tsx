import { useEffect, useRef, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { registerSW } from 'virtual:pwa-register';
import { Button, IconButton, toast } from './ui';

/**
 * The app is precached, so an open tab keeps running the version it started
 * with. This offers the new one rather than swapping code out mid-session.
 */
export function UpdateBanner() {
  const [waiting, setWaiting] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const update = useRef<((reload?: boolean) => Promise<void>) | null>(null);

  useEffect(() => {
    update.current = registerSW({
      onNeedRefresh: () => setWaiting(true),
      onOfflineReady: () => toast('Ready to work offline'),
    });
  }, []);

  if (!waiting || dismissed) return null;

  return (
    <div className="animate-pop-in fixed bottom-5 left-1/2 z-[85] flex -translate-x-1/2 items-center gap-3 rounded-lg border border-line bg-elevated py-2 pr-2 pl-4 shadow-xl shadow-black/40">
      <span className="text-[13px]">A new version is available.</span>
      <Button size="sm" variant="primary" onClick={() => void update.current?.(true)}>
        <RefreshCw size={13} />
        Reload
      </Button>
      <IconButton label="Dismiss" onClick={() => setDismissed(true)}>
        <X size={15} />
      </IconButton>
    </div>
  );
}
