import { create } from 'zustand';
import type { Library, PaneId, PaneKey, Project, Revision, Settings, ViewMode } from '@/types';
import {
  migrateLegacyData,
  penStore,
  readAngularLegacyCode,
  revisionStore,
  settingsStore,
} from '@/lib/storage';
import {
  createProject,
  defaultProject,
  normalizeModuleName,
  projectFromTemplate,
  uid,
} from '@/lib/project';
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
};

const AUTO_REVISION_INTERVAL = 3 * 60 * 1000;

interface AppState {
  hydrated: boolean;
  project: Project;
  projects: Project[];
  revisions: Revision[];
  settings: Settings;

  activePane: PaneKey;
  view: ViewMode;
  splitRatio: number;
  consoleOpen: boolean;
  consoleHeight: number;
  runToken: number;
  pendingChanges: boolean;
  savedProjectId: string | null;
  sharedNotice: boolean;
  reveal: { pane: PaneId; pos: number; nonce: number } | null;

  hydrate: () => Promise<void>;
  revealAt: (pane: PaneId, pos: number) => void;

  setCode: (pane: PaneKey, value: string) => void;
  setTitle: (title: string) => void;
  setActivePane: (pane: PaneKey) => void;

  addModule: (name?: string) => void;
  renameModule: (id: string, name: string) => void;
  removeModule: (id: string) => void;
  setView: (view: ViewMode) => void;
  setSplitRatio: (ratio: number) => void;
  toggleConsole: (open?: boolean) => void;
  setConsoleHeight: (height: number) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  run: () => void;

  addLibrary: (library: Library) => void;
  removeLibrary: (id: string) => void;
  setJsFlavor: (flavor: Project['jsFlavor']) => void;
  setHtmlLang: (lang: Project['htmlLang']) => void;
  setCssLang: (lang: Project['cssLang']) => void;

  newProject: () => Promise<void>;
  loadTemplate: (template: Template) => Promise<void>;
  openProject: (id: string) => Promise<void>;
  saveProject: () => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  duplicateProject: (id: string) => Promise<void>;
  importProjects: (projects: Project[]) => Promise<void>;
  replaceProject: (project: Project, options?: { shared?: boolean }) => Promise<void>;
  dismissSharedNotice: () => void;

  loadRevisions: () => Promise<void>;
  restoreRevision: (id: string) => Promise<void>;
  deleteRevision: (id: string) => Promise<void>;
  snapshot: (reason: Revision['reason']) => Promise<void>;
}

/** Read before anything else so a shared link always wins over stored state. */
const sharedAtBoot = consumeSharedProject();

export const useAppStore = create<AppState>()((set, get) => ({
  hydrated: false,
  project: sharedAtBoot ?? defaultProject(),
  projects: [],
  revisions: [],
  settings: { ...defaultSettings, ...settingsStore.load() },

  activePane: 'html',
  view: 'both',
  splitRatio: 50,
  consoleOpen: false,
  consoleHeight: 220,
  runToken: 0,
  pendingChanges: false,
  savedProjectId: null,
  sharedNotice: Boolean(sharedAtBoot),
  reveal: null,

  hydrate: async () => {
    await migrateLegacyData();
    const projects = await penStore.loadAll();

    if (sharedAtBoot) {
      set({ projects, hydrated: true, runToken: get().runToken + 1 });
      return;
    }

    const stored = await penStore.loadCurrent();
    if (stored) {
      set({
        project: { ...createProject(), ...stored },
        projects,
        savedProjectId: projects.some((p) => p.id === stored.id) ? stored.id : null,
        hydrated: true,
        runToken: get().runToken + 1,
      });
      return;
    }

    const angular = readAngularLegacyCode();
    set({
      project: angular
        ? createProject({ title: 'Imported from Editor v2', html: angular })
        : defaultProject(),
      projects,
      hydrated: true,
      runToken: get().runToken + 1,
    });
  },

  setCode: (pane, value) =>
    set((state) => {
      const { project } = state;
      const touched = { updatedAt: Date.now() };
      const pending = { pendingChanges: !state.settings.autoRun };

      if (pane === 'html' || pane === 'css' || pane === 'js') {
        if (project[pane] === value) return state;
        return { project: { ...project, [pane]: value, ...touched }, ...pending };
      }

      const module = project.modules.find((m) => m.id === pane);
      if (!module || module.code === value) return state;
      return {
        project: {
          ...project,
          modules: project.modules.map((m) => (m.id === pane ? { ...m, code: value } : m)),
          ...touched,
        },
        ...pending,
      };
    }),

  addModule: (name) =>
    set((state) => {
      const taken = state.project.modules.map((m) => m.name);
      const module = {
        id: uid(),
        name: normalizeModuleName(name ?? 'utils.js', taken),
        code: '',
      };
      return {
        project: {
          ...state.project,
          modules: [...state.project.modules, module],
          updatedAt: Date.now(),
        },
        activePane: module.id,
      };
    }),

  renameModule: (id, name) =>
    set((state) => {
      const taken = state.project.modules.filter((m) => m.id !== id).map((m) => m.name);
      return {
        project: {
          ...state.project,
          modules: state.project.modules.map((m) =>
            m.id === id ? { ...m, name: normalizeModuleName(name, taken) } : m,
          ),
          updatedAt: Date.now(),
        },
      };
    }),

  removeModule: (id) =>
    set((state) => ({
      project: {
        ...state.project,
        modules: state.project.modules.filter((m) => m.id !== id),
        updatedAt: Date.now(),
      },
      activePane: state.activePane === id ? 'js' : state.activePane,
    })),

  setTitle: (title) => set((state) => ({ project: { ...state.project, title } })),
  setActivePane: (activePane) => set({ activePane }),
  setView: (view) => set({ view }),
  setSplitRatio: (splitRatio) => set({ splitRatio: Math.min(92, Math.max(8, splitRatio)) }),
  toggleConsole: (open) => set((state) => ({ consoleOpen: open ?? !state.consoleOpen })),
  setConsoleHeight: (consoleHeight) => set({ consoleHeight: Math.max(80, consoleHeight) }),

  updateSettings: (patch) => {
    const settings = { ...get().settings, ...patch };
    settingsStore.save(settings);
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
  setHtmlLang: (htmlLang) => set((state) => ({ project: { ...state.project, htmlLang } })),
  setCssLang: (cssLang) => set((state) => ({ project: { ...state.project, cssLang } })),

  revealAt: (pane, pos) =>
    set((state) => ({
      activePane: pane,
      view: state.view === 'preview' ? 'both' : state.view,
      reveal: { pane, pos, nonce: (state.reveal?.nonce ?? 0) + 1 },
    })),

  newProject: () => get().replaceProject(defaultProject()),
  loadTemplate: (template) => get().replaceProject(projectFromTemplate(template)),

  replaceProject: async (project, options) => {
    // Snapshot what is on screen first, so switching away is never destructive.
    await revisionStore.add(get().project, 'replace');
    set({
      project,
      activePane: 'html',
      savedProjectId: null,
      revisions: [],
      sharedNotice: Boolean(options?.shared),
      runToken: get().runToken + 1,
    });
  },

  openProject: async (id) => {
    const found = get().projects.find((p) => p.id === id);
    if (!found) return;
    await revisionStore.add(get().project, 'replace');
    set({
      project: { ...found },
      savedProjectId: found.id,
      activePane: 'html',
      revisions: [],
      sharedNotice: false,
      runToken: get().runToken + 1,
    });
    await get().loadRevisions();
  },

  saveProject: async () => {
    const { project, projects, savedProjectId } = get();
    const id = savedProjectId ?? project.id;
    const stamped: Project = { ...project, id, updatedAt: Date.now() };

    await penStore.save(stamped);
    await revisionStore.add(stamped, 'save');

    const index = projects.findIndex((p) => p.id === id);
    const next =
      index >= 0 ? projects.map((p, i) => (i === index ? stamped : p)) : [stamped, ...projects];

    set({ projects: next, project: stamped, savedProjectId: id });
    await get().loadRevisions();
  },

  deleteProject: async (id) => {
    await penStore.remove(id);
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
      savedProjectId: state.savedProjectId === id ? null : state.savedProjectId,
    }));
  },

  duplicateProject: async (id) => {
    const source = get().projects.find((p) => p.id === id);
    if (!source) return;
    const copy: Project = {
      ...source,
      id: uid(),
      title: `${source.title} copy`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await penStore.save(copy);
    set((state) => ({ projects: [copy, ...state.projects] }));
  },

  importProjects: async (incoming) => {
    const prepared = incoming.map((p) => ({ ...createProject(), ...p, id: uid() }));
    await penStore.saveMany(prepared);
    set((state) => ({ projects: [...prepared, ...state.projects] }));
  },

  dismissSharedNotice: () => set({ sharedNotice: false }),

  loadRevisions: async () => {
    set({ revisions: await revisionStore.list(get().project.id) });
  },

  snapshot: async (reason) => {
    const created = await revisionStore.add(get().project, reason);
    if (created) set((state) => ({ revisions: [created, ...state.revisions] }));
  },

  restoreRevision: async (id) => {
    const revision = get().revisions.find((r) => r.id === id);
    if (!revision) return;
    // Record where we were so restoring is itself undoable.
    await revisionStore.add(get().project, 'restore');
    set((state) => ({
      project: {
        ...state.project,
        title: revision.title,
        html: revision.html,
        css: revision.css,
        js: revision.js,
        libraries: revision.libraries,
        jsFlavor: revision.jsFlavor,
        updatedAt: Date.now(),
      },
      runToken: state.runToken + 1,
    }));
    await get().loadRevisions();
  },

  deleteRevision: async (id) => {
    await revisionStore.remove(id);
    set((state) => ({ revisions: state.revisions.filter((r) => r.id !== id) }));
  },
}));

/* -------------------------------- persistence ------------------------------- */

let saveTimer: number | undefined;
useAppStore.subscribe((state, prev) => {
  if (!state.hydrated || state.project === prev.project) return;
  clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    void penStore.saveCurrent(useAppStore.getState().project);
  }, 500);
});

// Periodic snapshots so a bad edit an hour ago is still recoverable.
let lastAutoSnapshot = Date.now();
window.setInterval(() => {
  const state = useAppStore.getState();
  if (!state.hydrated) return;
  if (state.project.updatedAt <= lastAutoSnapshot) return;
  lastAutoSnapshot = Date.now();
  void state.snapshot('auto');
}, AUTO_REVISION_INTERVAL);
