import { create } from "zustand";
import type {
  AppSettings,
  ExecutableReport,
  GenerationActionResult,
  ProjectDetails,
  ProjectSummary
} from "@shared/contracts";

type Screen = "dashboard" | "workspace" | "settings";
type WorkspaceTab = "source" | "analysis" | "world" | "gameplay" | "build" | "files" | "logs";

type GenerationAction =
  | "analyzeImage"
  | "generateWorld"
  | "generateGameplay"
  | "buildRobloxProject"
  | "validateOutput"
  | "regenerateWorldOnly"
  | "regenerateGameplayOnly";

interface AppState {
  projects: ProjectSummary[];
  selectedProject: ProjectDetails | null;
  settings: AppSettings | null;
  executableReport: ExecutableReport | null;
  screen: Screen;
  workspaceTab: WorkspaceTab;
  busy: boolean;
  busyLabel: string;
  warnings: string[];
  error: string | null;
  initialize: () => Promise<void>;
  refreshProjects: () => Promise<void>;
  selectProject: (projectId: string) => Promise<void>;
  createProject: (name: string) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  setScreen: (screen: Screen) => void;
  setWorkspaceTab: (tab: WorkspaceTab) => void;
  pickAndUploadImage: () => Promise<void>;
  uploadImageFromPath: (imagePath: string) => Promise<void>;
  runGeneration: (action: GenerationAction) => Promise<void>;
  openOutputFolder: () => Promise<void>;
  revealArtifact: (relativePath: string) => Promise<void>;
  saveSettings: (settings: AppSettings) => Promise<void>;
  pickExecutablePath: () => Promise<string | null>;
  validateExecutables: (patch?: Partial<AppSettings>) => Promise<void>;
  clearError: () => void;
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

const actionLabels: Record<GenerationAction, string> = {
  analyzeImage: "Analyze Image",
  generateWorld: "Generate World",
  generateGameplay: "Generate Gameplay",
  buildRobloxProject: "Build Roblox Project",
  validateOutput: "Validate Output",
  regenerateWorldOnly: "Regenerate World",
  regenerateGameplayOnly: "Regenerate Gameplay"
};

export const useAppStore = create<AppState>((set, get) => ({
  projects: [],
  selectedProject: null,
  settings: null,
  executableReport: null,
  screen: "dashboard",
  workspaceTab: "source",
  busy: false,
  busyLabel: "",
  warnings: [],
  error: null,

  clearError: () => set({ error: null }),

  setScreen: (screen) => set({ screen }),

  setWorkspaceTab: (workspaceTab) => set({ workspaceTab }),

  initialize: async () => {
    try {
      set({ busy: true, busyLabel: "Loading workspace...", error: null });
      const [projects, settings] = await Promise.all([window.image2roblox.listProjects(), window.image2roblox.getSettings()]);
      set({ projects, settings, busy: false, busyLabel: "" });
      await get().validateExecutables();
      if (projects.length > 0) {
        await get().selectProject(projects[0].projectId);
      }
    } catch (error) {
      set({ busy: false, busyLabel: "", error: toErrorMessage(error) });
    }
  },

  refreshProjects: async () => {
    const projects = await window.image2roblox.listProjects();
    set({ projects });
  },

  selectProject: async (projectId) => {
    try {
      set({ busy: true, busyLabel: "Loading project...", error: null, screen: "workspace" });
      const project = await window.image2roblox.getProject(projectId);
      set({ selectedProject: project, busy: false, busyLabel: "" });
    } catch (error) {
      set({ busy: false, busyLabel: "", error: toErrorMessage(error) });
    }
  },

  createProject: async (name) => {
    try {
      set({ busy: true, busyLabel: "Creating project...", error: null });
      const project = await window.image2roblox.createProject(name);
      await get().refreshProjects();
      set({ selectedProject: project, screen: "workspace", busy: false, busyLabel: "" });
    } catch (error) {
      set({ busy: false, busyLabel: "", error: toErrorMessage(error) });
    }
  },

  deleteProject: async (projectId) => {
    try {
      set({ busy: true, busyLabel: "Deleting project...", error: null });
      await window.image2roblox.deleteProject(projectId);
      await get().refreshProjects();
      const selected = get().selectedProject;
      if (selected?.projectId === projectId) {
        set({ selectedProject: null, screen: "dashboard" });
      }
      set({ busy: false, busyLabel: "" });
    } catch (error) {
      set({ busy: false, busyLabel: "", error: toErrorMessage(error) });
    }
  },

  pickAndUploadImage: async () => {
    const filePath = await window.image2roblox.pickImageFile();
    if (!filePath) return;
    await get().uploadImageFromPath(filePath);
  },

  uploadImageFromPath: async (imagePath) => {
    const selected = get().selectedProject;
    if (!selected) return;

    try {
      set({ busy: true, busyLabel: "Uploading image...", error: null, warnings: [] });
      const updated = await window.image2roblox.uploadImage(selected.projectId, imagePath);
      await get().refreshProjects();
      set({ selectedProject: updated, busy: false, busyLabel: "" });
    } catch (error) {
      set({ busy: false, busyLabel: "", error: toErrorMessage(error) });
    }
  },

  runGeneration: async (action) => {
    const selected = get().selectedProject;
    if (!selected) return;

    try {
      set({ busy: true, busyLabel: `${actionLabels[action]}...`, error: null, warnings: [] });
      const result = (await window.image2roblox[action](selected.projectId)) as GenerationActionResult;
      await get().refreshProjects();
      set({ selectedProject: result.project, busy: false, busyLabel: "", warnings: result.warnings });
    } catch (error) {
      set({ busy: false, busyLabel: "", error: toErrorMessage(error) });
    }
  },

  openOutputFolder: async () => {
    const selected = get().selectedProject;
    if (!selected) return;
    await window.image2roblox.openOutputFolder(selected.projectId);
  },

  revealArtifact: async (relativePath) => {
    const selected = get().selectedProject;
    if (!selected) return;
    await window.image2roblox.revealArtifact(selected.projectId, relativePath);
  },

  saveSettings: async (settings) => {
    try {
      set({ busy: true, busyLabel: "Saving settings...", error: null });
      const saved = await window.image2roblox.updateSettings(settings);
      set({ settings: saved, busy: false, busyLabel: "" });
      await get().validateExecutables(saved);
    } catch (error) {
      set({ busy: false, busyLabel: "", error: toErrorMessage(error) });
    }
  },

  pickExecutablePath: async () => {
    return window.image2roblox.pickExecutableFile();
  },

  validateExecutables: async (patch) => {
    try {
      const report = await window.image2roblox.validateExecutables(patch);
      set({ executableReport: report });
    } catch (error) {
      set({ error: toErrorMessage(error) });
    }
  }
}));
