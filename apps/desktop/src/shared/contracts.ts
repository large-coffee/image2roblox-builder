import type {
  AssetPlan,
  BuildPlan,
  GameplayPlan,
  ImageAnalysis,
  ProjectManifest,
  ScriptPlan,
  SourceImage,
  ValidationReport,
  WorldBible
} from "@image2roblox/schemas";
import type { StageLogEntry } from "@image2roblox/shared";

export type ProjectStatus = ProjectManifest["status"];

export interface ProjectSummary {
  projectId: string;
  slug: string;
  name: string;
  rootPath: string;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectArtifacts {
  sourceImage: SourceImage | null;
  imageAnalysis: ImageAnalysis | null;
  worldBible: WorldBible | null;
  gameplayPlan: GameplayPlan | null;
  buildPlan: BuildPlan | null;
  assetPlan: AssetPlan | null;
  scriptPlan: ScriptPlan | null;
  validationReport: ValidationReport | null;
  worldBibleMarkdown: string | null;
}

export interface ProjectDetails extends ProjectSummary {
  manifest: ProjectManifest;
  artifacts: ProjectArtifacts;
  logs: StageLogEntry[];
  files: string[];
}

export interface AppSettings {
  providerMode: "mock" | "real";
  providerApiKey: string;
  providerModel: string;
  robloxStudioPath: string;
  rojoPath: string;
  projectsRoot: string;
}

export interface ExecutableCheck {
  exists: boolean;
  normalizedPath: string | null;
  reason?: string;
}

export interface ExecutableReport {
  robloxStudio: ExecutableCheck;
  rojo: ExecutableCheck;
}

export interface GenerationActionResult {
  project: ProjectDetails;
  warnings: string[];
}

export interface DesktopApi {
  listProjects(): Promise<ProjectSummary[]>;
  createProject(name: string): Promise<ProjectDetails>;
  getProject(projectId: string): Promise<ProjectDetails | null>;
  deleteProject(projectId: string): Promise<void>;
  pickImageFile(): Promise<string | null>;
  pickExecutableFile(): Promise<string | null>;
  uploadImage(projectId: string, imagePath: string): Promise<ProjectDetails>;
  analyzeImage(projectId: string): Promise<GenerationActionResult>;
  generateWorld(projectId: string): Promise<GenerationActionResult>;
  generateGameplay(projectId: string): Promise<GenerationActionResult>;
  buildRobloxProject(projectId: string): Promise<GenerationActionResult>;
  validateOutput(projectId: string): Promise<GenerationActionResult>;
  regenerateWorldOnly(projectId: string): Promise<GenerationActionResult>;
  regenerateGameplayOnly(projectId: string): Promise<GenerationActionResult>;
  openOutputFolder(projectId: string): Promise<void>;
  revealArtifact(projectId: string, relativePath: string): Promise<void>;
  getSettings(): Promise<AppSettings>;
  updateSettings(settings: AppSettings): Promise<AppSettings>;
  validateExecutables(settings?: Partial<AppSettings>): Promise<ExecutableReport>;
}

declare global {
  interface Window {
    image2roblox: DesktopApi;
  }
}
