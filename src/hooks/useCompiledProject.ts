import { useEffect, useMemo, useState } from 'react';
import type { Project } from '@/types';
import { compileProject, type CompileResult } from '@/lib/compile';

/**
 * Runs the HTML and CSS through their preprocessors when a pen uses one.
 * Plain HTML and CSS take a synchronous path so typing never waits on a
 * promise, and so the result keeps a stable identity between renders.
 */
export function useCompiledProject(project: Project): CompileResult {
  const preprocessed = project.htmlLang !== 'html' || project.cssLang !== 'css';

  const verbatim = useMemo<CompileResult>(
    () => ({ html: project.html, css: project.css, error: null }),
    [project.html, project.css],
  );

  const [compiled, setCompiled] = useState<CompileResult>(verbatim);

  useEffect(() => {
    if (!preprocessed) return;
    let cancelled = false;
    void compileProject(project).then((result) => {
      if (!cancelled) setCompiled(result);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preprocessed, project.html, project.css, project.htmlLang, project.cssLang]);

  return preprocessed ? compiled : verbatim;
}
