let target: Window | null = null;

export function setPreviewWindow(win: Window | null): void {
  target = win;
}

export function evalInPreview(code: string): boolean {
  if (!target) return false;
  target.postMessage({ __editorHost: true, type: 'eval', code }, '*');
  return true;
}
