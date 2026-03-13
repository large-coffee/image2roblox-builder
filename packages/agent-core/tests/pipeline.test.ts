import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { createProvider, inspectImageFile } from "../src";
import { AgentPipeline } from "../src";
import type { Provider } from "../src";
import { ImageAnalysisSchema, ProjectManifestSchema } from "@image2roblox/schemas";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixture = path.resolve(__dirname, "../../../examples/fixtures/sample.png");

describe("mock provider + pipeline", () => {
  it("retries and repairs invalid first response", async () => {
    const provider = createProvider({ mode: "mock" });
    const sourceImage = inspectImageFile(fixture, "sample.png");

    const result = await provider.generate({
      stage: "image-analysis",
      prompt: "analyze",
      input: {
        sourceImage,
        __simulateInvalidResponse: true
      },
      schema: ImageAnalysisSchema
    });

    expect(result.attempts).toBeGreaterThan(1);
    expect(result.data.biome.length).toBeGreaterThan(0);
    expect(result.logs.some((log) => Boolean(log.repairedFromError))).toBe(true);
  });

  it("runs full pipeline with deterministic outputs", async () => {
    const provider = createProvider({ mode: "mock" });
    const pipeline = new AgentPipeline(provider);
    const sourceImage = inspectImageFile(fixture, "sample.png");

    const context = {
      projectManifest: ProjectManifestSchema.parse({
        projectId: "00000000-0000-4000-8000-000000000111",
        slug: "test-project",
        name: "Test Project",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        providerMode: "mock",
        status: "created",
        sourceImage,
        lastRunId: null,
        outputRoot: path.resolve(__dirname, "../../../projects/test-project")
      }),
      runId: "00000000-0000-4000-8000-000000000112",
      sourceImage,
      projectRoot: path.resolve(__dirname, "../../../projects/test-project")
    };

    const result = await pipeline.runFull(context);

    expect(result.generationResult.imageAnalysis.biome.length).toBeGreaterThan(0);
    expect(result.generationResult.worldBible.pointsOfInterest.length).toBeGreaterThanOrEqual(3);
    expect(result.generationResult.gameplayPlan.collectibles.length).toBeGreaterThanOrEqual(3);
    expect(result.logs.length).toBeGreaterThan(0);
  });

  it("propagates stage logs on terminal provider failure", async () => {
    const sourceImage = inspectImageFile(fixture, "sample.png");

    const context = {
      projectManifest: ProjectManifestSchema.parse({
        projectId: "00000000-0000-4000-8000-000000000311",
        slug: "failing-project",
        name: "Failing Project",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        providerMode: "mock",
        status: "created",
        sourceImage,
        lastRunId: null,
        outputRoot: path.resolve(__dirname, "../../../projects/failing-project")
      }),
      runId: "00000000-0000-4000-8000-000000000312",
      sourceImage,
      projectRoot: path.resolve(__dirname, "../../../projects/failing-project")
    };

    const failingProvider: Provider = {
      name: "FailingProvider",
      mode: "mock",
      async generate<TInput, TOutput>(_request: unknown) {
        const error = new Error("forced failure") as Error & {
          logs?: Array<{
            stage: string;
            attempt: number;
            raw: string;
            parsed: boolean;
            parseError?: string;
          }>;
        };

        error.logs = [
          {
            stage: "image-analysis",
            attempt: 1,
            raw: "{invalid-json",
            parsed: false,
            parseError: "Unexpected token"
          }
        ];

        throw error;
      }
    };

    const pipeline = new AgentPipeline(failingProvider);

    await expect(pipeline.analyzeImage(context)).rejects.toMatchObject({
      name: "StageGenerationError"
    });

    try {
      await pipeline.analyzeImage(context);
    } catch (error) {
      const stageError = error as { logs?: unknown[] };
      expect(Array.isArray(stageError.logs)).toBe(true);
      expect(stageError.logs?.length).toBeGreaterThan(0);
    }
  });
});

