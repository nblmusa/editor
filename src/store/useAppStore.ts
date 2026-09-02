import { create } from 'zustand';
import type { Library, PaneId, Project, Settings, ViewMode } from '@/types';
import { storage } from '@/lib/storage';
import { createProject, defaultProject, projectFromTemplate, uid } from '@/lib/project';
import { consumeSharedProject } from '@/lib/share';
import type { Template } from '@/lib/templates';

export const defaultSettings: Settings = {
  theme: 'dark',
  fontSize: 14,
  tabSize: 2,
  wordWrap: true,
  lineNumbers: true,
  autoRun: true,
  autoRunDelay: 500,
  autoCloseTags: true,
  emmet: true,
  keymap: 'default',
  editorLayout: 'tabs',
  splitDirection: 'horizontal',
  previewWidth: null,
};

interface AppState {
  project: Project;
  projects: Project[];
  settings: Settings;

  activePane: PaneId;
  view: ViewMode;
  splitRatio: number;
  consoleOpen: boolean;
  consoleHeight: number;
  runToken: number;
  pendingChanges: boolean;
  savedProjectId: string | null;
  sharedNotice: boolean;

  setCode: (pane: PaneId, value: string) => void;
  setTitle: (title: string) => void;
  setActivePane: (pane: PaneId) => void;
  setView: (view: ViewMode) => void;
  setSplitRatio: (ratio: number) => void;
  toggleConsole: (open?: boolean) => void;
  setConsoleHeight: (height: number) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  run: () => void;

  addLibrary: (library: Library) => void;
  removeLibrary: (id: string) => void;
  setJsFlavor: (flavor: Project['jsFlavor']) => void;

  newProject: () => void;
  loadTemplate: (template: Template) => void;
  openProject: (id: string) => void;
  saveProject: () => void;
  deleteProject: (id: string) => void;
  duplicateProject: (id: string) => void;
  importProjects: (projects: Project[]) => void;
  replaceProject: (project: Project, options?: { shared?: boolean }) => void;
  dismissSharedNotice: () => void;
}

function initialProject(): { project: Project; shared: boolean } {
  const shared = consumeSharedProject();
  if (shared) return { project: shared, shared: true };

  const saved = storage.loadCurrent();
  if (saved) return { project: { ...createProject(), ...saved }, shared: false };

  const legacy = storage.loadLegacyCode();
  if (legacy) {
    return {
      project: createProject({ title: 'Imported from Editor v2', html: legacy }),
      shared: false,
    };
  }

  return { project: defaultProject(), shared: false };
}

const boot = initialProject();

export const useAppStore = create<AppState>()((set, get) => ({
  project: boot.project,
  projects: storage.loadProjects(),
  settings: { ...defaultSettings, ...storage.loadSettings() },

  activePane: 'html',
  view: 'both',
  splitRatio: 50,
  consoleOpen: false,
  consoleHeight: 200,
  runToken: 0,
  pendingChanges: false,
  savedProjectId: null,
  sharedNotice: boot.shared,

  setCode: (pane, value) =>
    set((state) => {
      if (state.project[pane] === value) return state;
      return {
        project: { ...state.project, [pane]: value, updatedAt: Date.now() },
        pendingChanges: !state.settings.autoRun,
      };
    }),

  setTitle: (title) => set((state) => ({ project: { ...state.project, title } })),
  setActivePane: (activePane) => set({ activePane }),
  setView: (view) => set({ view }),
  setSplitRatio: (splitRatio) => set({ splitRatio: Math.min(92, Math.max(8, splitRatio)) }),
  toggleConsole: (open) => set((state) => ({ consoleOpen: open ?? !state.consoleOpen })),
  setConsoleHeight: (consoleHeight) => set({ consoleHeight: Math.max(80, consoleHeight) }),

  updateSettings: (patch) => {
    const settings = { ...get().settings, ...patch };
    storage.saveSettings(settings);
    set({ settings });
  },

  run: () => set((state) => ({ runToken: state.runToken + 1, pendingChanges: false })),

  addLibrary: (library) =>
    set((state) =>
      state.project.libraries.some((l) => l.url === library.url)
        ? state
        : { project: { ...state.project, libraries: [...state.project.libraries, library] } },
    ),

  removeLibrary: (id) =>
    set((state) => ({
      project: {
        ...state.project,
        libraries: state.project.libraries.filter((l) => l.id !== id),
      },
    })),

  setJsFlavor: (jsFlavor) => set((state) => ({ project: { ...state.project, jsFlavor } })),

  newProject: () => get().replaceProject(defaultProject()),
  loadTemplate: (template) => get().replaceProject(projectFromTemplate(template)),

  replaceProject: (project, options) =>
    set({
      project,
      activePane: 'html',
      savedProjectId: null,
      sharedNotice: Boolean(options?.shared),
      runToken: get().runToken + 1,
    }),

  openProject: (id) => {
    const found = get().projects.find((p) => p.id === id);
    if (!found) return;
    set({
      project: { ...found },
      savedProjectId: found.id,
      activePane: 'html',
      sharedNotice: false,
      runToken: get().runToken + 1,
    });
  },

  saveProject: () => {
    const { project, projects, savedProjectId } = get();
    const stamped = { ...project, updatedAt: Date.now() };
    const existingId = savedProjectId ?? project.id;
    const index = projects.findIndex((p) => p.id === existingId);

    const next =
      index >= 0
        ? projects.map((p, i) => (i === index ? { ...stamped, id: existingId } : p))
        : [{ ...stamped }, ...projects];

    storage.saveProjects(next);
    set({
      projects: next,
      // Keep the working copy in sync so the header does not read as dirty.
      project: index >= 0 ? { ...stamped, id: existingId } : stamped,
      savedProjectId: index >= 0 ? existingId : stamped.id,
    });
  },

  deleteProject: (id) => {
    const next = get().projects.filter((p) => p.id !== id);
    storage.saveProjects(next);
    set({
      projects: next,
      savedProjectId: get().savedProjectId === id ? null : get().savedProjectId,
    });
  },

  duplicateProject: (id) => {
    const source = get().projects.find((p) => p.id === id);
    if (!source) return;
    const copy: Project = {
      ...source,
      id: uid(),
      title: `${source.title} copy`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const next = [copy, ...get().projects];
    storage.saveProjects(next);
    set({ projects: next });
  },

  importProjects: (incoming) => {
    const merged = [
      ...incoming.map((p) => ({ ...createProject(), ...p, id: uid() })),
      ...get().projects,
    ];
    storage.saveProjects(merged);
    set({ projects: merged });
  },

  dismissSharedNotice: () => set({ sharedNotice: false }),
}));

/** Debounced autosave of the working pen. */
let saveTimer: number | undefined;
useAppStore.subscribe((state, prev) => {
  if (state.project === prev.project) return;
  clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => storage.saveCurrent(useAppStore.getState().project), 400);
});
