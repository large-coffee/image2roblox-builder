import fs from "node:fs";
import path from "node:path";
import { AgentPipeline, StageGenerationError, createProvider, inspectImageFile } from "@image2roblox/agent-core";
import {
  GenerationResultSchema,
  GameplayPlanSchema,
  ImageAnalysisSchema,
  ProjectManifestSchema,
  WorldBibleSchema,
  type GameplayPlan,
  type ImageAnalysis,
  type ProjectManifest,
  type SourceImage,
  type WorldBible
} from "@image2roblox/schemas";
import {
  copyFile,
  createId,
  detectExecutable,
  ensureDir,
  exists,
  nowIso,
  safeReadDir,
  slugify,
  writeJsonFile,
  writeTextFile,
  type StageLogEntry
} from "@image2roblox/shared";
import { generateRobloxProject, validateGeneratedOutput } from "@image2roblox/roblox-generator";
import type {
  AppSettings,
  ExecutableReport,
  GenerationActionResult,
  ProjectArtifacts,
  ProjectDetails,
  ProjectSummary
} from "../shared/contracts";
import { AppDatabase } from "./db";

const PROJECT_MANIFEST_FILE = "project-manifest.json";

const PROJECT_DIRS = [
  "source-image",
  "analysis",
  "roblox/src/ReplicatedStorage",
  "roblox/src/ServerScriptService",
  "roblox/src/StarterPlayer/StarterPlayerScripts",
  "roblox/src/StarterGui",
  "roblox/src/Workspace",
  "roblox/src/Lighting",
  "roblox/src/SoundService",
  "exports",
  "logs"
];

const ARTIFACT_PATHS = {
  imageAnalysis: "analysis/image-analysis.json",
  worldBible: "analysis/world-bible.json",
  worldBibleMarkdown: "analysis/world-bible.md",
  gameplayPlan: "analysis/gameplay-plan.json",
  buildPlan: "analysis/build-plan.json",
  assetPlan: "analysis/asset-plan.json",
  scriptPlan: "analysis/script-plan.json",
  validationReport: "analysis/validation-report.json",
  generationResult: "analysis/generation-result.json"
};

function worldBibleToMarkdown(worldBible: WorldBible): string {
  return `# ${worldBible.theme}

## Summary
${worldBible.worldSummary}

## Setting
${worldBible.setting}

## Tone
${worldBible.tone}

## Lore Seed
${worldBible.loreSeed}

## Zones
${worldBible.zones.map((zone) => `- **${zone.name}** - ${zone.description} (${zone.traversalStyle})`).join("\n")}

## Points of Interest
${worldBible.pointsOfInterest
    .map((poi) => `- **${poi.name}** (${poi.riskLevel}) - ${poi.purpose}. ${poi.traversalNotes}`)
    .join("\n")}
`;
}

export class DesktopBackend {
  private readonly db: AppDatabase;

  private readonly defaultProjectsRoot: string;

  constructor(private readonly repoRoot: string) {
    this.defaultProjectsRoot = path.join(this.repoRoot, "projects");
    ensureDir(this.defaultProjectsRoot);
    const dbPath = path.join(this.defaultProjectsRoot, "local-db", "app.sqlite3");
    this.db = new AppDatabase(dbPath);
  }

  dispose(): void {
    this.db.close();
  }

  private defaultSettings(): AppSettings {
    return {
      providerMode: "mock",
      providerApiKey: "",
      providerModel: "gpt-5-mini",
      robloxStudioPath: "",
      rojoPath: "",
      projectsRoot: this.defaultProjectsRoot
    };
  }

  getSettings(): AppSettings {
    const persisted = this.db.getSettings();
    const merged = {
      ...this.defaultSettings(),
      ...(persisted ?? {})
    };

    ensureDir(merged.projectsRoot);
    return merged;
  }

  updateSettings(settings: AppSettings): AppSettings {
    ensureDir(settings.projectsRoot);
    this.db.setSettings(settings, nowIso());
    return this.getSettings();
  }

  validateExecutables(settingsPatch?: Partial<AppSettings>): ExecutableReport {
    const settings = {
      ...this.getSettings(),
      ...(settingsPatch ?? {})
    };

    return {
      robloxStudio: detectExecutable(settings.robloxStudioPath),
      rojo: detectExecutable(settings.rojoPath)
    };
  }

  listProjects(): ProjectSummary[] {
    return this.db.listProjects();
  }

  private projectManifestPath(projectRoot: string): string {
    return path.join(projectRoot, PROJECT_MANIFEST_FILE);
  }

  private writeManifest(projectRoot: string, manifest: ProjectManifest): void {
    writeJsonFile(this.projectManifestPath(projectRoot), ProjectManifestSchema.parse(manifest));
  }

  private readManifest(projectRoot: string): ProjectManifest {
    const file = this.projectManifestPath(projectRoot);
    if (!exists(file)) {
      throw new Error(`Project manifest missing at ${file}`);
    }
    const raw = JSON.parse(fs.readFileSync(file, "utf8"));
    return ProjectManifestSchema.parse(raw);
  }

  private uniqueSlug(baseName: string): string {
    const baseSlug = slugify(baseName) || `image2roblox-${Date.now()}`;
    let slug = baseSlug;
    let counter = 1;
    const root = this.getSettings().projectsRoot;

    while (exists(path.join(root, slug))) {
      counter += 1;
      slug = `${baseSlug}-${counter}`;
    }

    return slug;
  }

  createProject(name: string): ProjectDetails {
    const settings = this.getSettings();
    const slug = this.uniqueSlug(name);
    const projectRoot = path.join(settings.projectsRoot, slug);
    const projectId = createId();
    const now = nowIso();

    for (const dir of PROJECT_DIRS) {
      ensureDir(path.join(projectRoot, dir));
    }

    const manifest: ProjectManifest = {
      projectId,
      slug,
      name,
      createdAt: now,
      updatedAt: now,
      providerMode: settings.providerMode,
      status: "created",
      sourceImage: null,
      lastRunId: null,
      outputRoot: projectRoot
    };

    this.writeManifest(projectRoot, manifest);

    this.db.upsertProject({
      projectId,
      slug,
      name,
      rootPath: projectRoot,
      status: "created",
      createdAt: now,
      updatedAt: now
    });

    return this.getProject(projectId) as ProjectDetails;
  }

  deleteProject(projectId: string): void {
    const project = this.db.getProject(projectId);
    if (!project) return;

    if (exists(project.rootPath)) {
      fs.rmSync(project.rootPath, { recursive: true, force: true });
    }

    this.db.deleteProject(projectId);
  }

  private readJsonArtifact<T>(projectRoot: string, relativePath: string): T | null {
    const file = path.join(projectRoot, relativePath);
    if (!exists(file)) return null;
    return JSON.parse(fs.readFileSync(file, "utf8")) as T;
  }

  private listFilesRecursive(rootPath: string, prefix = ""): string[] {
    const entries = safeReadDir(rootPath);
    const files: string[] = [];

    for (const entry of entries) {
      const absolute = path.join(rootPath, entry);
      const relative = prefix ? path.join(prefix, entry) : entry;
      const stat = fs.statSync(absolute);
      if (stat.isDirectory()) {
        files.push(...this.listFilesRecursive(absolute, relative));
      } else {
        files.push(relative.replaceAll("\\", "/"));
      }
    }

    return files;
  }

  private readArtifacts(projectRoot: string): ProjectArtifacts {
    const worldBibleMarkdownFile = path.join(projectRoot, ARTIFACT_PATHS.worldBibleMarkdown);

    return {
      sourceImage: this.readJsonArtifact<SourceImage>(projectRoot, "source-image/metadata.json"),
      imageAnalysis: this.readJsonArtifact(projectRoot, ARTIFACT_PATHS.imageAnalysis),
      worldBible: this.readJsonArtifact(projectRoot, ARTIFACT_PATHS.worldBible),
      gameplayPlan: this.readJsonArtifact(projectRoot, ARTIFACT_PATHS.gameplayPlan),
      buildPlan: this.readJsonArtifact(projectRoot, ARTIFACT_PATHS.buildPlan),
      assetPlan: this.readJsonArtifact(projectRoot, ARTIFACT_PATHS.assetPlan),
      scriptPlan: this.readJsonArtifact(projectRoot, ARTIFACT_PATHS.scriptPlan),
      validationReport: this.readJsonArtifact(projectRoot, ARTIFACT_PATHS.validationReport),
      worldBibleMarkdown: exists(worldBibleMarkdownFile) ? fs.readFileSync(worldBibleMarkdownFile, "utf8") : null
    };
  }

  getProject(projectId: string): ProjectDetails | null {
    const summary = this.db.getProject(projectId);
    if (!summary) return null;

    const manifest = this.readManifest(summary.rootPath);
    const artifacts = this.readArtifacts(summary.rootPath);
    const files = exists(summary.rootPath) ? this.listFilesRecursive(summary.rootPath) : [];
    const logs = this.db.listLogs(projectId);

    return {
      ...summary,
      manifest,
      artifacts,
      logs,
      files
    };
  }

  uploadImage(projectId: string, imagePath: string): ProjectDetails {
    const project = this.db.getProject(projectId);
    if (!project) {
      throw new Error("Project not found.");
    }

    const manifest = this.readManifest(project.rootPath);
    const fileName = path.basename(imagePath);
    const destination = path.join(project.rootPath, "source-image", `${Date.now()}-${fileName}`);

    copyFile(imagePath, destination);

    const sourceImage = inspectImageFile(destination, fileName);
    writeJsonFile(path.join(project.rootPath, "source-image", "metadata.json"), sourceImage);

    const updatedManifest: ProjectManifest = {
      ...manifest,
      sourceImage,
      updatedAt: nowIso(),
      status: "created"
    };

    this.writeManifest(project.rootPath, updatedManifest);

    this.db.upsertProject({
      ...project,
      updatedAt: updatedManifest.updatedAt,
      status: updatedManifest.status
    });

    return this.getProject(projectId) as ProjectDetails;
  }

  private appendLogsToFile(projectRoot: string, runId: string, logs: StageLogEntry[]): void {
    const logFile = path.join(projectRoot, "logs", `${runId}.jsonl`);
    ensureDir(path.dirname(logFile));
    const lines = logs.map((entry) => JSON.stringify(entry)).join("\n") + "\n";
    fs.appendFileSync(logFile, lines, "utf8");
  }

  private persistFailureLogs(projectRoot: string, runId: string, error: unknown): string[] {
    if (!(error instanceof StageGenerationError) || error.logs.length === 0) {
      return [];
    }

    this.db.insertLogs(error.logs);
    this.appendLogsToFile(projectRoot, runId, error.logs);

    return Array.from(new Set(error.logs.map((log) => log.message)));
  }

  private clearArtifacts(projectRoot: string, paths: string[]): void {
    for (const relativePath of paths) {
      const absolute = path.join(projectRoot, relativePath);
      if (exists(absolute)) {
        fs.rmSync(absolute, { force: true, recursive: false });
      }
    }
  }

  private createPipeline(settings: AppSettings): AgentPipeline {
    const provider = createProvider({
      mode: settings.providerMode,
      apiKey: settings.providerApiKey,
      model: settings.providerModel
    });

    return new AgentPipeline(provider);
  }

  private beginRun(projectId: string, action: string): string {
    const runId = createId();
    const timestamp = nowIso();
    this.db.insertRun({
      runId,
      projectId,
      action,
      status: "running",
      createdAt: timestamp,
      updatedAt: timestamp,
      warnings: []
    });
    return runId;
  }

  private endRun(projectId: string, runId: string, action: string, status: "completed" | "failed", warnings: string[]): void {
    this.db.insertRun({
      runId,
      projectId,
      action,
      status,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      warnings
    });
  }

  private requireProjectContext(projectId: string): {
    project: ProjectSummary;
    manifest: ProjectManifest;
    sourceImage: SourceImage;
    settings: AppSettings;
  } {
    const project = this.db.getProject(projectId);
    if (!project) throw new Error("Project not found.");

    const manifest = this.readManifest(project.rootPath);
    const sourceImage = manifest.sourceImage;
    if (!sourceImage) {
      throw new Error("Upload a source image first.");
    }

    const settings = this.getSettings();
    return {
      project,
      manifest,
      sourceImage,
      settings
    };
  }

  async analyzeImage(projectId: string): Promise<GenerationActionResult> {
    const { project, manifest, sourceImage, settings } = this.requireProjectContext(projectId);
    const pipeline = this.createPipeline(settings);
    const runId = this.beginRun(projectId, "analyze-image");

    try {
      const context = {
        projectManifest: manifest,
        runId,
        sourceImage,
        projectRoot: project.rootPath
      };

      const result = await pipeline.analyzeImage(context);
      ImageAnalysisSchema.parse(result.data);
      writeJsonFile(path.join(project.rootPath, ARTIFACT_PATHS.imageAnalysis), result.data);
      this.db.insertLogs(result.logs);
      this.appendLogsToFile(project.rootPath, runId, result.logs);

      const nextManifest: ProjectManifest = {
        ...manifest,
        status: "analyzed",
        lastRunId: runId,
        updatedAt: nowIso()
      };

      this.writeManifest(project.rootPath, nextManifest);
      this.db.upsertProject({
        ...project,
        status: nextManifest.status,
        updatedAt: nextManifest.updatedAt
      });

      this.endRun(projectId, runId, "analyze-image", "completed", result.warnings);

      return {
        project: this.getProject(projectId) as ProjectDetails,
        warnings: result.warnings
      };
    } catch (error) {
      const failureWarnings = this.persistFailureLogs(project.rootPath, runId, error);
      this.endRun(
        projectId,
        runId,
        "analyze-image",
        "failed",
        failureWarnings.length > 0 ? failureWarnings : [String(error)]
      );
      throw error;
    }
  }

  private ensureImageAnalysis(projectId: string): ImageAnalysis {
    const project = this.db.getProject(projectId);
    if (!project) throw new Error("Project not found.");

    const existing = this.readJsonArtifact<ImageAnalysis>(project.rootPath, ARTIFACT_PATHS.imageAnalysis);
    if (!existing) throw new Error("Run Analyze Image first.");

    return ImageAnalysisSchema.parse(existing);
  }

  private ensureWorldBible(projectId: string): WorldBible {
    const project = this.db.getProject(projectId);
    if (!project) throw new Error("Project not found.");

    const existing = this.readJsonArtifact<WorldBible>(project.rootPath, ARTIFACT_PATHS.worldBible);
    if (!existing) throw new Error("Run Generate World first.");

    return WorldBibleSchema.parse(existing);
  }

  private ensureGameplayPlan(projectId: string): GameplayPlan {
    const project = this.db.getProject(projectId);
    if (!project) throw new Error("Project not found.");

    const existing = this.readJsonArtifact<GameplayPlan>(project.rootPath, ARTIFACT_PATHS.gameplayPlan);
    if (!existing) throw new Error("Run Generate Gameplay first.");

    return GameplayPlanSchema.parse(existing);
  }

  async generateWorld(projectId: string): Promise<GenerationActionResult> {
    const project = this.db.getProject(projectId);
    if (!project) throw new Error("Project not found.");

    const manifest = this.readManifest(project.rootPath);
    if (!manifest.sourceImage) throw new Error("Upload a source image first.");

    const imageAnalysis = this.ensureImageAnalysis(projectId);
    const settings = this.getSettings();
    const pipeline = this.createPipeline(settings);
    const runId = this.beginRun(projectId, "generate-world");

    try {
      const worldResult = await pipeline.generateWorldBible(
        {
          projectManifest: manifest,
          runId,
          sourceImage: manifest.sourceImage,
          projectRoot: project.rootPath
        },
        imageAnalysis
      );

      writeJsonFile(path.join(project.rootPath, ARTIFACT_PATHS.worldBible), worldResult.data);
      writeTextFile(path.join(project.rootPath, ARTIFACT_PATHS.worldBibleMarkdown), worldBibleToMarkdown(worldResult.data));

      this.clearArtifacts(project.rootPath, [
        ARTIFACT_PATHS.gameplayPlan,
        ARTIFACT_PATHS.buildPlan,
        ARTIFACT_PATHS.assetPlan,
        ARTIFACT_PATHS.scriptPlan,
        ARTIFACT_PATHS.validationReport,
        ARTIFACT_PATHS.generationResult
      ]);

      this.db.insertLogs(worldResult.logs);
      this.appendLogsToFile(project.rootPath, runId, worldResult.logs);

      const nextManifest: ProjectManifest = {
        ...manifest,
        status: "generated",
        lastRunId: runId,
        updatedAt: nowIso()
      };

      this.writeManifest(project.rootPath, nextManifest);
      this.db.upsertProject({
        ...project,
        status: nextManifest.status,
        updatedAt: nextManifest.updatedAt
      });

      this.endRun(projectId, runId, "generate-world", "completed", worldResult.warnings);
      return {
        project: this.getProject(projectId) as ProjectDetails,
        warnings: worldResult.warnings
      };
    } catch (error) {
      const failureWarnings = this.persistFailureLogs(project.rootPath, runId, error);
      this.endRun(
        projectId,
        runId,
        "generate-world",
        "failed",
        failureWarnings.length > 0 ? failureWarnings : [String(error)]
      );
      throw error;
    }
  }

  async generateGameplay(projectId: string): Promise<GenerationActionResult> {
    const project = this.db.getProject(projectId);
    if (!project) throw new Error("Project not found.");

    const manifest = this.readManifest(project.rootPath);
    if (!manifest.sourceImage) throw new Error("Upload a source image first.");

    const imageAnalysis = this.ensureImageAnalysis(projectId);
    const worldBible = this.ensureWorldBible(projectId);
    const settings = this.getSettings();
    const pipeline = this.createPipeline(settings);
    const runId = this.beginRun(projectId, "generate-gameplay");

    try {
      const gameplayResult = await pipeline.generateGameplayPlan(
        {
          projectManifest: manifest,
          runId,
          sourceImage: manifest.sourceImage,
          projectRoot: project.rootPath
        },
        imageAnalysis,
        worldBible
      );

      writeJsonFile(path.join(project.rootPath, ARTIFACT_PATHS.gameplayPlan), gameplayResult.data);

      this.clearArtifacts(project.rootPath, [
        ARTIFACT_PATHS.buildPlan,
        ARTIFACT_PATHS.assetPlan,
        ARTIFACT_PATHS.scriptPlan,
        ARTIFACT_PATHS.validationReport,
        ARTIFACT_PATHS.generationResult
      ]);

      this.db.insertLogs(gameplayResult.logs);
      this.appendLogsToFile(project.rootPath, runId, gameplayResult.logs);

      const nextManifest: ProjectManifest = {
        ...manifest,
        status: "generated",
        lastRunId: runId,
        updatedAt: nowIso()
      };

      this.writeManifest(project.rootPath, nextManifest);
      this.db.upsertProject({
        ...project,
        status: nextManifest.status,
        updatedAt: nextManifest.updatedAt
      });

      this.endRun(projectId, runId, "generate-gameplay", "completed", gameplayResult.warnings);
      return {
        project: this.getProject(projectId) as ProjectDetails,
        warnings: gameplayResult.warnings
      };
    } catch (error) {
      const failureWarnings = this.persistFailureLogs(project.rootPath, runId, error);
      this.endRun(
        projectId,
        runId,
        "generate-gameplay",
        "failed",
        failureWarnings.length > 0 ? failureWarnings : [String(error)]
      );
      throw error;
    }
  }

  async buildRobloxProject(projectId: string): Promise<GenerationActionResult> {
    const project = this.db.getProject(projectId);
    if (!project) throw new Error("Project not found.");

    const manifest = this.readManifest(project.rootPath);
    if (!manifest.sourceImage) throw new Error("Upload a source image first.");

    const imageAnalysis = this.ensureImageAnalysis(projectId);
    const worldBible = this.ensureWorldBible(projectId);
    const gameplayPlan = this.ensureGameplayPlan(projectId);

    const settings = this.getSettings();
    const pipeline = this.createPipeline(settings);
    const runId = this.beginRun(projectId, "build-roblox-project");

    const context = {
      projectManifest: manifest,
      runId,
      sourceImage: manifest.sourceImage,
      projectRoot: project.rootPath
    };

    try {
      const buildResult = await pipeline.generateBuildPlan(context, imageAnalysis, worldBible, gameplayPlan);
      const assetResult = await pipeline.generateAssetPlan(context, buildResult.data);
      const scriptResult = await pipeline.generateScriptPlan(context, gameplayPlan, buildResult.data);

      const generationResult = GenerationResultSchema.parse({
        projectId,
        runId,
        createdAt: nowIso(),
        imageAnalysis,
        worldBible,
        gameplayPlan,
        buildPlan: buildResult.data,
        assetPlan: assetResult.data,
        scriptPlan: scriptResult.data,
        validationReport: {
          generatedAt: nowIso(),
          checks: [
            {
              id: "pre-validation",
              name: "Pre-validation placeholder",
              status: "warn",
              details: "Full validation report is generated after file output completes."
            }
          ],
          errors: [],
          warnings: ["Pre-validation placeholder report"],
          missingFiles: [],
          confidenceSummary: { min: 0, max: 0, average: 0 },
          nextActions: ["Run validation stage to compute final checks."],
          isValid: false
        },
        outputPaths: {
          projectRoot: project.rootPath,
          robloxRoot: path.join(project.rootPath, "roblox"),
          logsRoot: path.join(project.rootPath, "logs"),
          analysisRoot: path.join(project.rootPath, "analysis")
        },
        warnings: [...buildResult.data.warnings, ...assetResult.data.warnings, ...scriptResult.data.warnings]
      });

      writeJsonFile(path.join(project.rootPath, ARTIFACT_PATHS.buildPlan), buildResult.data);
      writeJsonFile(path.join(project.rootPath, ARTIFACT_PATHS.assetPlan), assetResult.data);
      writeJsonFile(path.join(project.rootPath, ARTIFACT_PATHS.scriptPlan), scriptResult.data);

      generateRobloxProject({
        projectRoot: project.rootPath,
        manifest,
        result: generationResult
      });

      const validationFromFs = validateGeneratedOutput(project.rootPath);

      const validationStage = await pipeline.generateValidationReport(context, {
        imageAnalysis,
        worldBible,
        gameplayPlan,
        buildPlan: buildResult.data,
        assetPlan: assetResult.data,
        scriptPlan: scriptResult.data
      });

      const mergedValidation = {
        ...validationStage.data,
        checks: [...validationStage.data.checks, ...validationFromFs.checks],
        missingFiles: Array.from(new Set([...validationStage.data.missingFiles, ...validationFromFs.missingFiles])),
        isValid: validationStage.data.isValid && validationFromFs.isValid
      };

      writeJsonFile(path.join(project.rootPath, ARTIFACT_PATHS.validationReport), mergedValidation);

      const finalGenerationResult = GenerationResultSchema.parse({
        ...generationResult,
        validationReport: mergedValidation
      });

      writeJsonFile(path.join(project.rootPath, ARTIFACT_PATHS.generationResult), finalGenerationResult);

      const allLogs = [...buildResult.logs, ...assetResult.logs, ...scriptResult.logs, ...validationStage.logs];
      this.db.insertLogs(allLogs);
      this.appendLogsToFile(project.rootPath, runId, allLogs);

      const nextManifest: ProjectManifest = {
        ...manifest,
        status: mergedValidation.isValid ? "validated" : "generated",
        lastRunId: runId,
        updatedAt: nowIso()
      };

      this.writeManifest(project.rootPath, nextManifest);
      this.db.upsertProject({
        ...project,
        status: nextManifest.status,
        updatedAt: nextManifest.updatedAt
      });

      const warnings = [...buildResult.warnings, ...assetResult.warnings, ...scriptResult.warnings];
      this.endRun(projectId, runId, "build-roblox-project", "completed", warnings);

      return {
        project: this.getProject(projectId) as ProjectDetails,
        warnings
      };
    } catch (error) {
      const failureWarnings = this.persistFailureLogs(project.rootPath, runId, error);
      this.endRun(
        projectId,
        runId,
        "build-roblox-project",
        "failed",
        failureWarnings.length > 0 ? failureWarnings : [String(error)]
      );
      throw error;
    }
  }

  async validateOutput(projectId: string): Promise<GenerationActionResult> {
    const project = this.db.getProject(projectId);
    if (!project) throw new Error("Project not found.");

    const runId = this.beginRun(projectId, "validate-output");
    const manifest = this.readManifest(project.rootPath);

    try {
      const report = validateGeneratedOutput(project.rootPath);
      writeJsonFile(path.join(project.rootPath, ARTIFACT_PATHS.validationReport), report);

      const log: StageLogEntry = {
        id: createId(),
        projectId,
        runId,
        stage: "validation-report",
        level: report.isValid ? "info" : "warn",
        message: report.isValid ? "Validation passed" : `Validation found ${report.missingFiles.length} missing files`,
        createdAt: nowIso(),
        payload: report
      };

      this.db.insertLogs([log]);
      this.appendLogsToFile(project.rootPath, runId, [log]);

      const nextManifest: ProjectManifest = {
        ...manifest,
        status: report.isValid ? "validated" : manifest.status,
        lastRunId: runId,
        updatedAt: nowIso()
      };

      this.writeManifest(project.rootPath, nextManifest);
      this.db.upsertProject({
        ...project,
        status: nextManifest.status,
        updatedAt: nextManifest.updatedAt
      });

      this.endRun(projectId, runId, "validate-output", "completed", report.warnings);

      return {
        project: this.getProject(projectId) as ProjectDetails,
        warnings: report.warnings
      };
    } catch (error) {
      this.endRun(projectId, runId, "validate-output", "failed", [String(error)]);
      throw error;
    }
  }

  async regenerateWorldOnly(projectId: string): Promise<GenerationActionResult> {
    return this.generateWorld(projectId);
  }

  async regenerateGameplayOnly(projectId: string): Promise<GenerationActionResult> {
    return this.generateGameplay(projectId);
  }

  getProjectRoot(projectId: string): string {
    const project = this.db.getProject(projectId);
    if (!project) throw new Error("Project not found.");
    return project.rootPath;
  }
}







