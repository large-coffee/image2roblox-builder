import type { z } from "zod";
import path from "node:path";
import fs from "node:fs";
import {
  AssetPlanSchema,
  BuildPlanSchema,
  type GenerationResult,
  GenerationResultSchema,
  GameplayPlanSchema,
  ImageAnalysisSchema,
  type ProjectManifest,
  ScriptPlanSchema,
  ValidationReportSchema,
  WorldBibleSchema,
  type SourceImage,
  type ImageAnalysis,
  type WorldBible,
  type GameplayPlan,
  type BuildPlan,
  type AssetPlan,
  type ScriptPlan,
  type ValidationReport
} from "@image2roblox/schemas";
import { createLogEntry, nowIso, type StageLogEntry } from "@image2roblox/shared";
import type { Provider, ProviderAttemptLog } from "../types.js";

export interface PipelineArtifacts {
  imageAnalysis?: ImageAnalysis;
  worldBible?: WorldBible;
  gameplayPlan?: GameplayPlan;
  buildPlan?: BuildPlan;
  assetPlan?: AssetPlan;
  scriptPlan?: ScriptPlan;
  validationReport?: ValidationReport;
}

export interface PipelineContext {
  projectManifest: ProjectManifest;
  runId: string;
  sourceImage: SourceImage;
  projectRoot: string;
  existingArtifacts?: PipelineArtifacts;
  simulateInvalidFirstResponse?: boolean;
}

export interface PipelineStageResult<T> {
  data: T;
  logs: StageLogEntry[];
  confidence: number;
  warnings: string[];
}

export interface FullPipelineResult {
  generationResult: GenerationResult;
  logs: StageLogEntry[];
}

export class StageGenerationError extends Error {
  constructor(
    message: string,
    readonly stage: string,
    readonly logs: StageLogEntry[]
  ) {
    super(message);
    this.name = "StageGenerationError";
  }
}

const REQUIRED_OUTPUT_FILES = [
  "analysis/image-analysis.json",
  "analysis/world-bible.md",
  "analysis/gameplay-plan.json",
  "analysis/build-plan.json",
  "roblox/default.project.json",
  "roblox/src/ReplicatedStorage/Config/WorldConfig.luau",
  "roblox/src/ServerScriptService/Main.server.luau",
  "roblox/src/StarterPlayer/StarterPlayerScripts/HUD.client.luau"
];

export class AgentPipeline {
  constructor(private readonly provider: Provider) {}

  private mapAttemptLogs<TOutput>(params: {
    projectId: string;
    runId: string;
    stage: string;
    prompt: string;
    confidence?: number;
    warnings?: unknown;
    validated?: TOutput;
    attempts: ProviderAttemptLog[];
  }): StageLogEntry[] {
    return params.attempts.map((log) =>
      createLogEntry({
        projectId: params.projectId,
        runId: params.runId,
        stage: params.stage,
        level: log.parsed ? "info" : "warn",
        message: log.parsed
          ? `Stage output parsed on attempt ${log.attempt}`
          : `Stage output parse failed: ${log.parseError}`,
        payload: {
          prompt: params.prompt,
          raw: log.raw,
          parseError: log.parseError,
          repairedFromError: log.repairedFromError,
          confidence: params.confidence,
          warnings: params.warnings,
          validated: log.parsed ? params.validated : undefined
        }
      })
    );
  }

  private async runStage<TInput, TOutput>(params: {
    projectId: string;
    runId: string;
    stage: string;
    prompt: string;
    input: TInput;
    schema: z.ZodType<TOutput>;
    simulateInvalidFirstResponse?: boolean;
  }): Promise<PipelineStageResult<TOutput>> {
    try {
      const result = await this.provider.generate<TInput, TOutput>({
        stage: params.stage,
        prompt: params.prompt,
        input: {
          ...(params.input as Record<string, unknown>),
          __simulateInvalidResponse: params.simulateInvalidFirstResponse ?? false
        } as TInput,
        schema: params.schema
      });

      const logs = this.mapAttemptLogs<TOutput>({
        projectId: params.projectId,
        runId: params.runId,
        stage: params.stage,
        prompt: params.prompt,
        confidence: result.confidence,
        warnings: result.warnings,
        validated: result.data,
        attempts: result.logs
      });

      return {
        data: result.data,
        logs,
        confidence: result.confidence,
        warnings: result.warnings.map((warning) => warning.message)
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const attempts = Array.isArray((error as { logs?: unknown }).logs)
        ? ((error as { logs: ProviderAttemptLog[] }).logs as ProviderAttemptLog[])
        : [];

      const logs = this.mapAttemptLogs<TOutput>({
        projectId: params.projectId,
        runId: params.runId,
        stage: params.stage,
        prompt: params.prompt,
        attempts
      });

      throw new StageGenerationError(message, params.stage, logs);
    }
  }

  async analyzeImage(context: PipelineContext): Promise<PipelineStageResult<ImageAnalysis>> {
    return this.runStage({
      projectId: context.projectManifest.projectId,
      runId: context.runId,
      stage: "image-analysis",
      prompt:
        "Analyze uploaded image and infer scene type, biome, mood, lighting, scale cues, palette, landmarks, traversal ideas, and likely player fantasy.",
      input: {
        sourceImage: context.sourceImage
      },
      schema: ImageAnalysisSchema,
      simulateInvalidFirstResponse: context.simulateInvalidFirstResponse
    });
  }

  async generateWorldBible(context: PipelineContext, imageAnalysis: ImageAnalysis): Promise<PipelineStageResult<WorldBible>> {
    return this.runStage({
      projectId: context.projectManifest.projectId,
      runId: context.runId,
      stage: "world-bible",
      prompt:
        "Convert image analysis into a coherent world bible with lore seed, zones, landmarks, POIs, weather/day-night direction, and environmental storytelling.",
      input: {
        imageAnalysis
      },
      schema: WorldBibleSchema,
      simulateInvalidFirstResponse: context.simulateInvalidFirstResponse
    });
  }

  async generateGameplayPlan(
    context: PipelineContext,
    imageAnalysis: ImageAnalysis,
    worldBible: WorldBible
  ): Promise<PipelineStageResult<GameplayPlan>> {
    return this.runStage({
      projectId: context.projectManifest.projectId,
      runId: context.runId,
      stage: "gameplay-plan",
      prompt:
        "Select primary gameplay type, optional secondary systems, loop, collectibles, hazards, checkpoints, and win/lose conditions.",
      input: {
        imageAnalysis,
        worldBible
      },
      schema: GameplayPlanSchema,
      simulateInvalidFirstResponse: context.simulateInvalidFirstResponse
    });
  }

  async generateBuildPlan(
    context: PipelineContext,
    imageAnalysis: ImageAnalysis,
    worldBible: WorldBible,
    gameplayPlan: GameplayPlan
  ): Promise<PipelineStageResult<BuildPlan>> {
    return this.runStage({
      projectId: context.projectManifest.projectId,
      runId: context.runId,
      stage: "build-plan",
      prompt:
        "Convert world and gameplay into terrain recipe, structure list, spawn/checkpoints/interactables, hazards, NPC/enemy placeholders, lighting, atmosphere, sound, UI, and file generation plan.",
      input: {
        imageAnalysis,
        worldBible,
        gameplayPlan
      },
      schema: BuildPlanSchema,
      simulateInvalidFirstResponse: context.simulateInvalidFirstResponse
    });
  }

  async generateAssetPlan(context: PipelineContext, buildPlan: BuildPlan): Promise<PipelineStageResult<AssetPlan>> {
    return this.runStage({
      projectId: context.projectManifest.projectId,
      runId: context.runId,
      stage: "asset-plan",
      prompt: "Generate placeholder-first asset plan with confidence and warnings.",
      input: {
        buildPlan
      },
      schema: AssetPlanSchema,
      simulateInvalidFirstResponse: context.simulateInvalidFirstResponse
    });
  }

  async generateScriptPlan(
    context: PipelineContext,
    gameplayPlan: GameplayPlan,
    buildPlan: BuildPlan
  ): Promise<PipelineStageResult<ScriptPlan>> {
    return this.runStage({
      projectId: context.projectManifest.projectId,
      runId: context.runId,
      stage: "script-plan",
      prompt: "Generate Luau script/module plan for gameplay systems, UI, and bootstrap logic.",
      input: {
        gameplayPlan,
        buildPlan
      },
      schema: ScriptPlanSchema,
      simulateInvalidFirstResponse: context.simulateInvalidFirstResponse
    });
  }

  async generateValidationReport(
    context: PipelineContext,
    artifacts: {
      imageAnalysis: ImageAnalysis;
      worldBible: WorldBible;
      gameplayPlan: GameplayPlan;
      buildPlan: BuildPlan;
      assetPlan: AssetPlan;
      scriptPlan: ScriptPlan;
    }
  ): Promise<PipelineStageResult<ValidationReport>> {
    const checks: Array<{ id: string; name: string; status: "pass" | "warn" | "fail"; details: string }> = [];
    const missingFiles: string[] = [];

    for (const relativeFile of REQUIRED_OUTPUT_FILES) {
      const absolute = path.join(context.projectRoot, relativeFile);
      const exists = fs.existsSync(absolute);
      checks.push({
        id: `file:${relativeFile}`,
        name: `Required file ${relativeFile}`,
        status: exists ? "pass" : "fail",
        details: exists ? "Found" : "Missing"
      });
      if (!exists) missingFiles.push(relativeFile);
    }

    const validationWarnings = [
      ...artifacts.assetPlan.warnings.map((warning) => warning.message),
      ...artifacts.scriptPlan.warnings.map((warning) => warning.message)
    ];

    return this.runStage({
      projectId: context.projectManifest.projectId,
      runId: context.runId,
      stage: "validation-report",
      prompt: "Validate schema consistency, output structure completeness, and confidence thresholds.",
      input: {
        fileChecks: checks,
        errors: [],
        warnings: validationWarnings,
        missingFiles,
        confidences: [
          artifacts.imageAnalysis.confidence,
          artifacts.worldBible.confidence,
          artifacts.gameplayPlan.confidence,
          artifacts.buildPlan.confidence,
          artifacts.assetPlan.confidence,
          artifacts.scriptPlan.confidence
        ]
      },
      schema: ValidationReportSchema,
      simulateInvalidFirstResponse: context.simulateInvalidFirstResponse
    });
  }

  async runFull(context: PipelineContext): Promise<FullPipelineResult> {
    const logs: StageLogEntry[] = [];

    const imageAnalysis = await this.analyzeImage(context);
    logs.push(...imageAnalysis.logs);

    const worldBible = await this.generateWorldBible(context, imageAnalysis.data);
    logs.push(...worldBible.logs);

    const gameplayPlan = await this.generateGameplayPlan(context, imageAnalysis.data, worldBible.data);
    logs.push(...gameplayPlan.logs);

    const buildPlan = await this.generateBuildPlan(context, imageAnalysis.data, worldBible.data, gameplayPlan.data);
    logs.push(...buildPlan.logs);

    const assetPlan = await this.generateAssetPlan(context, buildPlan.data);
    logs.push(...assetPlan.logs);

    const scriptPlan = await this.generateScriptPlan(context, gameplayPlan.data, buildPlan.data);
    logs.push(...scriptPlan.logs);

    const validationReport = await this.generateValidationReport(context, {
      imageAnalysis: imageAnalysis.data,
      worldBible: worldBible.data,
      gameplayPlan: gameplayPlan.data,
      buildPlan: buildPlan.data,
      assetPlan: assetPlan.data,
      scriptPlan: scriptPlan.data
    });
    logs.push(...validationReport.logs);

    const generationResult: GenerationResult = GenerationResultSchema.parse({
      projectId: context.projectManifest.projectId,
      runId: context.runId,
      createdAt: nowIso(),
      imageAnalysis: imageAnalysis.data,
      worldBible: worldBible.data,
      gameplayPlan: gameplayPlan.data,
      buildPlan: buildPlan.data,
      assetPlan: assetPlan.data,
      scriptPlan: scriptPlan.data,
      validationReport: validationReport.data,
      outputPaths: {
        projectRoot: context.projectRoot,
        robloxRoot: path.join(context.projectRoot, "roblox"),
        logsRoot: path.join(context.projectRoot, "logs"),
        analysisRoot: path.join(context.projectRoot, "analysis")
      },
      warnings: [
        ...imageAnalysis.data.warnings,
        ...worldBible.data.warnings,
        ...gameplayPlan.data.warnings,
        ...buildPlan.data.warnings,
        ...assetPlan.data.warnings,
        ...scriptPlan.data.warnings
      ]
    });

    return {
      generationResult,
      logs
    };
  }
}


