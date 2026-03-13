import { describe, expect, it } from "vitest";
import {
  AssetPlanSchema,
  BuildPlanSchema,
  GameplayPlanSchema,
  GenerationResultSchema,
  ImageAnalysisSchema,
  ProjectManifestSchema,
  ScriptPlanSchema,
  ValidationReportSchema,
  WorldBibleSchema
} from "../src";

const imageAnalysisFixture = {
  sceneType: "wide vista",
  biome: "verdant highlands",
  mood: "hopeful and adventurous",
  lighting: "bright diffuse daylight",
  inferredGenre: "exploration adventure",
  scaleCues: ["Large skyline"],
  colorPalette: ["#112233", "#445566", "#778899"],
  landmarks: ["Echo Spire"],
  architectureStyle: "frontier ruins",
  terrainClues: ["ridges"],
  traversalIdeas: ["jump route", "side tunnel"],
  enemyOrCreatureIdeas: ["sentinel"],
  likelyPlayerFantasy: "Restore the world",
  genreTags: ["adventure"],
  confidence: 0.8,
  warnings: []
};

describe("schema contracts", () => {
  it("accepts valid image analysis", () => {
    expect(ImageAnalysisSchema.parse(imageAnalysisFixture)).toBeTruthy();
  });

  it("rejects invalid image analysis palette", () => {
    expect(() =>
      ImageAnalysisSchema.parse({
        ...imageAnalysisFixture,
        colorPalette: ["not-hex"]
      })
    ).toThrow();
  });

  it("accepts full generation result", () => {
    const manifest = ProjectManifestSchema.parse({
      projectId: "00000000-0000-4000-8000-000000000001",
      slug: "demo",
      name: "Demo",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      providerMode: "mock",
      status: "generated",
      sourceImage: {
        originalName: "sample.png",
        storedPath: "sample.png",
        mimeType: "image/png",
        width: 2,
        height: 2,
        sizeBytes: 16,
        palette: ["#112233", "#445566", "#778899"]
      },
      lastRunId: null,
      outputRoot: "C:/tmp/demo"
    });

    expect(manifest.slug).toBe("demo");

    const worldBible = WorldBibleSchema.parse({
      worldSummary: "summary",
      setting: "setting",
      tone: "tone",
      loreSeed: "lore",
      theme: "theme",
      zones: [
        { name: "A", description: "A", traversalStyle: "A" },
        { name: "B", description: "B", traversalStyle: "B" },
        { name: "C", description: "C", traversalStyle: "C" }
      ],
      mainLandmark: "Spire",
      landmarks: ["Spire"],
      environmentalStorytelling: ["one", "two"],
      weatherDirection: "rain",
      dayNightDirection: "dusk",
      soundscape: "ambient",
      pointsOfInterest: [
        { name: "P1", purpose: "quest", riskLevel: "low", traversalNotes: "note" },
        { name: "P2", purpose: "quest", riskLevel: "medium", traversalNotes: "note" },
        { name: "P3", purpose: "quest", riskLevel: "high", traversalNotes: "note" }
      ],
      mainObjective: "objective",
      confidence: 0.7,
      warnings: []
    });

    const gameplayPlan = GameplayPlanSchema.parse({
      primaryGameplayType: "exploration_adventure",
      secondarySystems: [],
      mainObjective: "objective",
      gameplayLoop: ["a", "b", "c"],
      hazards: ["hazard"],
      collectibles: [
        { name: "c1", description: "c1", targetCount: 3 },
        { name: "c2", description: "c2", targetCount: 3 },
        { name: "c3", description: "c3", targetCount: 3 }
      ],
      interactables: ["i1", "i2", "i3"],
      checkpointPlan: ["cp"],
      npcDialogHooks: ["hi"],
      winCondition: "win",
      loseCondition: "lose",
      confidence: 0.8,
      warnings: []
    });

    const buildPlan = BuildPlanSchema.parse({
      terrainRecipe: ["a", "b", "c"],
      structureList: ["s1", "s2", "s3"],
      spawnArea: "spawn",
      checkpoints: ["cp"],
      interactables: ["i1", "i2", "i3"],
      collectibles: ["c1", "c2", "c3"],
      hazards: ["h1"],
      enemyPlaceholders: ["e1"],
      npcPlacement: ["n1"],
      lightingSettings: {
        brightness: 2,
        clockTime: 18,
        fogColor: "#112233",
        fogEnd: 400,
        atmosphereDensity: 0.2
      },
      atmosphereNotes: "notes",
      soundPlan: ["ambient"],
      uiPlan: ["hud", "prompt", "objective"],
      fileGenerationPlan: [
        { path: "a", purpose: "a" },
        { path: "b", purpose: "b" },
        { path: "c", purpose: "c" },
        { path: "d", purpose: "d" },
        { path: "e", purpose: "e" }
      ],
      confidence: 0.8,
      warnings: []
    });

    const assetPlan = AssetPlanSchema.parse({
      placeholders: [
        {
          name: "placeholder",
          assetType: "placeholder",
          source: "generated_placeholder",
          purpose: "purpose",
          robloxPath: "Workspace/Thing"
        }
      ],
      externalSuggestions: [],
      confidence: 0.7,
      warnings: []
    });

    const scriptPlan = ScriptPlanSchema.parse({
      scripts: [
        { name: "s1", robloxPath: "a", scriptType: "Script", purpose: "p", dependencies: [] },
        { name: "s2", robloxPath: "a", scriptType: "Script", purpose: "p", dependencies: [] },
        { name: "s3", robloxPath: "a", scriptType: "Script", purpose: "p", dependencies: [] },
        { name: "s4", robloxPath: "a", scriptType: "Script", purpose: "p", dependencies: [] },
        { name: "s5", robloxPath: "a", scriptType: "Script", purpose: "p", dependencies: [] }
      ],
      uiScripts: [{ name: "ui", robloxPath: "b", scriptType: "LocalScript", purpose: "p", dependencies: [] }],
      configModules: [{ name: "cfg", robloxPath: "c", scriptType: "ModuleScript", purpose: "p", dependencies: [] }],
      confidence: 0.8,
      warnings: []
    });

    const validation = ValidationReportSchema.parse({
      generatedAt: new Date().toISOString(),
      checks: [{ id: "1", name: "check", status: "pass", details: "ok" }],
      errors: [],
      warnings: [],
      missingFiles: [],
      confidenceSummary: {
        min: 0.7,
        max: 0.9,
        average: 0.8
      },
      nextActions: ["done"],
      isValid: true
    });

    const result = GenerationResultSchema.parse({
      projectId: manifest.projectId,
      runId: "00000000-0000-4000-8000-000000000010",
      createdAt: new Date().toISOString(),
      imageAnalysis: imageAnalysisFixture,
      worldBible,
      gameplayPlan,
      buildPlan,
      assetPlan,
      scriptPlan,
      validationReport: validation,
      outputPaths: {
        projectRoot: "C:/tmp/demo",
        robloxRoot: "C:/tmp/demo/roblox",
        logsRoot: "C:/tmp/demo/logs",
        analysisRoot: "C:/tmp/demo/analysis"
      },
      warnings: []
    });

    expect(result.validationReport.isValid).toBe(true);
  });
});
