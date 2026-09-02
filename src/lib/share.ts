import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import type { Library, Project } from '@/types';
import { createProject } from './project';

/** Short keys keep shared URLs compact. */
interface Payload {
  v: 1;
  t: string;
  h: string;
  c: string;
  j: string;
  f?: 'babel';
  l?: [string, string, 'js' | 'css'][];
}

const PREFIX = '#pen=';

export function encodeProject(project: Project): string {
  const payload: Payload = {
    v: 1,
    t: project.title,
    h: project.html,
    c: project.css,
    j: project.js,
  };
  if (project.jsFlavor === 'babel') payload.f = 'babel';
  if (project.libraries.length) {
    payload.l = project.libraries.map((l) => [l.name, l.url, l.kind]);
  }
  return compressToEncodedURIComponent(JSON.stringify(payload));
}

export function decodeProject(encoded: string): Project | null {
  try {
    const json = decompressFromEncodedURIComponent(encoded);
    if (!json) return null;
    const payload = JSON.parse(json) as Payload;
    if (payload.v !== 1) return null;

    const libraries: Library[] = (payload.l ?? []).map(([name, url, kind], i) => ({
      id: `shared-${i}`,
      name,
      url,
      kind,
    }));

    return createProject({
      title: payload.t || 'Shared pen',
      html: payload.h ?? '',
      css: payload.c ?? '',
      js: payload.j ?? '',
      jsFlavor: payload.f === 'babel' ? 'babel' : 'javascript',
      libraries,
    });
  } catch {
    return null;
  }
}

export function buildShareUrl(project: Project): string {
  const { origin, pathname } = window.location;
  return `${origin}${pathname}${PREFIX}${encodeProject(project)}`;
}

/** Reads a shared pen from the URL and strips it so a refresh keeps local edits. */
export function consumeSharedProject(): Project | null {
  const hash = window.location.hash;
  if (!hash.startsWith(PREFIX)) return null;
  const project = decodeProject(hash.slice(PREFIX.length));
  history.replaceState(null, '', window.location.pathname + window.location.search);
  return project;
}
