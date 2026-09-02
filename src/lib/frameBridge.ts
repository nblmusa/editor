let target: Window | null = null;

export function setPreviewWindow(win: Window | null): void {
  target = win;
}

function post(message: Record<string, unknown>): boolean {
  if (!target) return false;
  target.postMessage({ __editorHost: true, ...message }, '*');
  return true;
}

export function evalInPreview(code: string): boolean {
  return post({ type: 'eval', code });
}

/** Swaps the stylesheet without rebuilding the document. */
export function patchPreviewCss(css: string): boolean {
  return post({ type: 'patch-css', css });
}

export function auditPreview(): boolean {
  return post({ type: 'audit' });
}

export function setPreviewInspector(on: boolean): boolean {
  return post({ type: 'inspect', on });
}
