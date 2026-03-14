import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { AppSettings, ProjectSummary } from "../src/shared/contracts";
import type { StageLogEntry } from "@image2roblox/shared";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fixtureImage = path.resolve(__dirname, "../../../examples/fixtures/sample.png");
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "image2roblox smoke test "));

class InMemoryAppDatabase {
  private readonly projects = new Map<string, ProjectSummary>();

  private readonly logsByProject = new Map<string, StageLogEntry[]>();

  private settings: AppSettings | null = null;

  close(): void {}

  listProjects(): ProjectSummary[] {
    return Array.from(this.projects.values()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  upsertProject(project: ProjectSummary): void {
    this.projects.set(project.projectId, project);
  }

  getProject(projectId: string): ProjectSummary | null {
    return this.projects.get(projectId) ?? null;
  }

  deleteProject(projectId: string): void {
    this.projects.delete(projectId);
    this.logsByProject.delete(projectId);
  }

  insertRun(): void {}

  insertLogs(entries: StageLogEntry[]): void {
    for (const entry of entries) {
      const existing = this.logsByProject.get(entry.projectId) ?? [];
      existing.unshift(entry);
      this.logsByProject.set(entry.projectId, existing);
    }
  }

  listLogs(projectId: string, limit = 400): StageLogEntry[] {
    return (this.logsByProject.get(projectId) ?? []).slice(0, limit);
  }

  setSettings(settings: AppSettings): void {
    this.settings = settings;
  }

  getSettings(): AppSettings | null {
    return this.settings;
  }
}

vi.mock("../src/main/db", () => ({
  AppDatabase: InMemoryAppDatabase
}));

let backend: {
  dispose: () => void;
  createProject: (name: string) => { projectId: string };
  uploadImage: (projectId: string, imagePath: string) => { artifacts: { sourceImage: { originalName: string } | null } };
  analyzeImage: (projectId: string) => Promise<{ project: { artifacts: { imageAnalysis: { biome: string } | null } } }>;
  generateWorld: (
    projectId: string
  ) => Promise<{ project: { artifacts: { worldBible: { mainLandmark: string } | null } } }>;
  generateGameplay: (
    projectId: string
  ) => Promise<{ project: { artifacts: { gameplayPlan: { primaryGameplayType: string } | null } } }>;
  buildRobloxProject: (
    projectId: string
  ) => Promise<{ project: { artifacts: { buildPlan: { structureList: string[] } | null } } }>;
  validateOutput: (projectId: string) => Promise<{ project: { rootPath: string; artifacts: { validationReport: { isValid: boolean } | null } } }>;
};

beforeAll(async () => {
  const module = await import("../src/main/backend");
  backend = new module.DesktopBackend(tempRoot);
});

afterAll(() => {
  backend?.dispose();
  fs.rmSync(tempRoot, { recursive: true, force: true });
});

describe("desktop vertical slice smoke flow", () => {
  it("runs end-to-end generation and output validation", async () => {
    const created = backend.createProject("Smoke Test Project");
    expect(created.projectId).toBeTruthy();

    const uploaded = backend.uploadImage(created.projectId, fixtureImage);
    expect(uploaded.artifacts.sourceImage?.originalName).toBe("sample.png");

    const analyzed = await backend.analyzeImage(created.projectId);
    expect(analyzed.project.artifacts.imageAnalysis?.biome).toBeTruthy();

    const world = await backend.generateWorld(created.projectId);
    expect(world.project.artifacts.worldBible?.mainLandmark).toBeTruthy();

    const gameplay = await backend.generateGameplay(created.projectId);
    expect(gameplay.project.artifacts.gameplayPlan?.primaryGameplayType).toBeTruthy();

    const built = await backend.buildRobloxProject(created.projectId);
    expect(built.project.artifacts.buildPlan?.structureList.length).toBeGreaterThanOrEqual(3);

    const validated = await backend.validateOutput(created.projectId);
    expect(validated.project.artifacts.validationReport?.isValid).toBe(true);

    const projectRoot = validated.project.rootPath;

    const requiredFiles = [
      "analysis/image-analysis.json",
      "analysis/world-bible.md",
      "analysis/gameplay-plan.json",
      "analysis/build-plan.json",
      "analysis/validation-report.json",
      "roblox/default.project.json",
      "roblox/src/ServerScriptService/Main.server.luau",
      "roblox/src/StarterPlayer/StarterPlayerScripts/HUD.client.luau",
      "README.md"
    ];

    for (const relativeFile of requiredFiles) {
      const absolute = path.join(projectRoot, relativeFile);
      expect(fs.existsSync(absolute), `Expected output file: ${relativeFile}`).toBe(true);
    }
  });
});
