import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { AgentPipeline, createProvider, inspectImageFile } from "../../agent-core/src";
import { GenerationResultSchema, ProjectManifestSchema } from "@image2roblox/schemas";
import { generateRobloxProject, validateGeneratedOutput } from "../src";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixture = path.resolve(__dirname, "../../../examples/fixtures/sample.png");

describe("roblox generator", () => {
  it("writes required Rojo output tree and validates", async () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "image2roblox-generator-"));
    const projectRoot = path.join(tempRoot, "demo-project");
    fs.mkdirSync(projectRoot, { recursive: true });

    const provider = createProvider({ mode: "mock" });
    const pipeline = new AgentPipeline(provider);
    const sourceImage = inspectImageFile(fixture, "sample.png");

    const manifest = ProjectManifestSchema.parse({
      projectId: "00000000-0000-4000-8000-000000000221",
      slug: "demo-project",
      name: "Demo Project",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      providerMode: "mock",
      status: "created",
      sourceImage,
      lastRunId: null,
      outputRoot: projectRoot
    });

    const context = {
      projectManifest: manifest,
      runId: "00000000-0000-4000-8000-000000000222",
      sourceImage,
      projectRoot
    };

    const analysis = await pipeline.analyzeImage(context);
    const world = await pipeline.generateWorldBible(context, analysis.data);
    const gameplay = await pipeline.generateGameplayPlan(context, analysis.data, world.data);
    const build = await pipeline.generateBuildPlan(context, analysis.data, world.data, gameplay.data);
    const asset = await pipeline.generateAssetPlan(context, build.data);
    const script = await pipeline.generateScriptPlan(context, gameplay.data, build.data);

    const result = GenerationResultSchema.parse({
      projectId: manifest.projectId,
      runId: context.runId,
      createdAt: new Date().toISOString(),
      imageAnalysis: analysis.data,
      worldBible: world.data,
      gameplayPlan: gameplay.data,
      buildPlan: build.data,
      assetPlan: asset.data,
      scriptPlan: script.data,
      validationReport: {
        generatedAt: new Date().toISOString(),
        checks: [{ id: "tmp", name: "tmp", status: "pass", details: "tmp" }],
        errors: [],
        warnings: [],
        missingFiles: [],
        confidenceSummary: { min: 0.7, max: 0.9, average: 0.8 },
        nextActions: ["none"],
        isValid: true
      },
      outputPaths: {
        projectRoot,
        robloxRoot: path.join(projectRoot, "roblox"),
        logsRoot: path.join(projectRoot, "logs"),
        analysisRoot: path.join(projectRoot, "analysis")
      },
      warnings: []
    });

    generateRobloxProject({
      projectRoot,
      manifest,
      result
    });

    const report = validateGeneratedOutput(projectRoot);
    expect(report.isValid).toBe(true);
    expect(fs.existsSync(path.join(projectRoot, "roblox/default.project.json"))).toBe(true);
  });
});

