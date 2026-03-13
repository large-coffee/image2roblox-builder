import { z } from "zod";

export const GameplayTypeSchema = z.enum([
  "exploration_adventure",
  "survival",
  "obby",
  "scavenger_hunt",
  "wave_defense",
  "puzzle_exploration",
  "tycoon_lite"
]);

export const StageStatusSchema = z.enum(["pending", "running", "completed", "failed"]);

export const WarningSchema = z.object({
  code: z.string(),
  message: z.string(),
  severity: z.enum(["low", "medium", "high"]).default("low")
});

export const PointOfInterestSchema = z.object({
  name: z.string().min(1),
  purpose: z.string().min(1),
  riskLevel: z.enum(["low", "medium", "high"]),
  traversalNotes: z.string().min(1)
});

export const CollectibleSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  targetCount: z.number().int().min(1).max(100)
});

export const ImageAnalysisSchema = z.object({
  sceneType: z.string().min(1),
  biome: z.string().min(1),
  mood: z.string().min(1),
  lighting: z.string().min(1),
  inferredGenre: z.string().min(1),
  scaleCues: z.array(z.string().min(1)).min(1),
  colorPalette: z.array(z.string().regex(/^#[0-9A-Fa-f]{6}$/)).min(3).max(8),
  landmarks: z.array(z.string().min(1)).min(1),
  architectureStyle: z.string().min(1),
  terrainClues: z.array(z.string().min(1)).min(1),
  traversalIdeas: z.array(z.string().min(1)).min(2),
  enemyOrCreatureIdeas: z.array(z.string().min(1)).min(1),
  likelyPlayerFantasy: z.string().min(1),
  genreTags: z.array(z.string().min(1)).min(1),
  confidence: z.number().min(0).max(1),
  warnings: z.array(WarningSchema).default([])
});

export const ZoneSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  traversalStyle: z.string().min(1)
});

export const WorldBibleSchema = z.object({
  worldSummary: z.string().min(1),
  setting: z.string().min(1),
  tone: z.string().min(1),
  loreSeed: z.string().min(1),
  theme: z.string().min(1),
  zones: z.array(ZoneSchema).min(3).max(8),
  mainLandmark: z.string().min(1),
  landmarks: z.array(z.string().min(1)).min(1),
  environmentalStorytelling: z.array(z.string().min(1)).min(2),
  weatherDirection: z.string().min(1),
  dayNightDirection: z.string().min(1),
  soundscape: z.string().min(1),
  pointsOfInterest: z.array(PointOfInterestSchema).min(3).max(8),
  mainObjective: z.string().min(1),
  confidence: z.number().min(0).max(1),
  warnings: z.array(WarningSchema).default([])
});

export const GameplaySystemSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  enabled: z.boolean().default(true)
});

export const GameplayPlanSchema = z.object({
  primaryGameplayType: GameplayTypeSchema,
  secondarySystems: z.array(GameplaySystemSchema).max(2),
  mainObjective: z.string().min(1),
  gameplayLoop: z.array(z.string().min(1)).min(3).max(8),
  hazards: z.array(z.string().min(1)).min(1),
  collectibles: z.array(CollectibleSchema).min(3).max(10),
  interactables: z.array(z.string().min(1)).min(3),
  checkpointPlan: z.array(z.string().min(1)).min(1),
  npcDialogHooks: z.array(z.string().min(1)).min(1),
  winCondition: z.string().min(1),
  loseCondition: z.string().min(1),
  confidence: z.number().min(0).max(1),
  warnings: z.array(WarningSchema).default([])
});

export const LightingSettingsSchema = z.object({
  brightness: z.number().min(0).max(10),
  clockTime: z.number().min(0).max(24),
  fogColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  fogEnd: z.number().min(50).max(10000),
  atmosphereDensity: z.number().min(0).max(1)
});

export const FileGenerationItemSchema = z.object({
  path: z.string().min(1),
  purpose: z.string().min(1)
});

export const BuildPlanSchema = z.object({
  terrainRecipe: z.array(z.string().min(1)).min(3),
  structureList: z.array(z.string().min(1)).min(3),
  spawnArea: z.string().min(1),
  checkpoints: z.array(z.string().min(1)).min(1),
  interactables: z.array(z.string().min(1)).min(3),
  collectibles: z.array(z.string().min(1)).min(3),
  hazards: z.array(z.string().min(1)).min(1),
  enemyPlaceholders: z.array(z.string().min(1)).min(1),
  npcPlacement: z.array(z.string().min(1)).min(1),
  lightingSettings: LightingSettingsSchema,
  atmosphereNotes: z.string().min(1),
  soundPlan: z.array(z.string().min(1)).min(1),
  uiPlan: z.array(z.string().min(1)).min(3),
  fileGenerationPlan: z.array(FileGenerationItemSchema).min(5),
  confidence: z.number().min(0).max(1),
  warnings: z.array(WarningSchema).default([])
});

export const AssetItemSchema = z.object({
  name: z.string().min(1),
  assetType: z.enum(["mesh", "texture", "sound", "material", "ui", "placeholder"]),
  source: z.enum(["generated_placeholder", "recommended_external"]),
  purpose: z.string().min(1),
  robloxPath: z.string().min(1)
});

export const AssetPlanSchema = z.object({
  placeholders: z.array(AssetItemSchema).min(1),
  externalSuggestions: z.array(AssetItemSchema),
  confidence: z.number().min(0).max(1),
  warnings: z.array(WarningSchema).default([])
});

export const ScriptItemSchema = z.object({
  name: z.string().min(1),
  robloxPath: z.string().min(1),
  scriptType: z.enum(["ModuleScript", "Script", "LocalScript"]),
  purpose: z.string().min(1),
  dependencies: z.array(z.string().min(1)).default([])
});

export const ScriptPlanSchema = z.object({
  scripts: z.array(ScriptItemSchema).min(5),
  uiScripts: z.array(ScriptItemSchema).min(1),
  configModules: z.array(ScriptItemSchema).min(1),
  confidence: z.number().min(0).max(1),
  warnings: z.array(WarningSchema).default([])
});

export const ValidationCheckSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  status: z.enum(["pass", "warn", "fail"]),
  details: z.string().min(1)
});

export const ValidationReportSchema = z.object({
  generatedAt: z.string().min(1),
  checks: z.array(ValidationCheckSchema).min(1),
  errors: z.array(z.string()),
  warnings: z.array(z.string()),
  missingFiles: z.array(z.string()),
  confidenceSummary: z.object({
    min: z.number().min(0).max(1),
    max: z.number().min(0).max(1),
    average: z.number().min(0).max(1)
  }),
  nextActions: z.array(z.string().min(1)),
  isValid: z.boolean()
});

export const SourceImageSchema = z.object({
  originalName: z.string().min(1),
  storedPath: z.string().min(1),
  mimeType: z.string().min(1),
  width: z.number().int().min(1),
  height: z.number().int().min(1),
  sizeBytes: z.number().int().min(1),
  palette: z.array(z.string().regex(/^#[0-9A-Fa-f]{6}$/)).min(3).max(8)
});

export const ProjectManifestSchema = z.object({
  projectId: z.string().uuid(),
  slug: z.string().min(1),
  name: z.string().min(1),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
  providerMode: z.enum(["mock", "real"]).default("mock"),
  status: z.enum(["created", "analyzed", "generated", "validated", "failed"]),
  sourceImage: SourceImageSchema.nullable(),
  lastRunId: z.string().uuid().nullable(),
  outputRoot: z.string().min(1)
});

export const GenerationResultSchema = z.object({
  projectId: z.string().uuid(),
  runId: z.string().uuid(),
  createdAt: z.string().min(1),
  imageAnalysis: ImageAnalysisSchema,
  worldBible: WorldBibleSchema,
  gameplayPlan: GameplayPlanSchema,
  buildPlan: BuildPlanSchema,
  assetPlan: AssetPlanSchema,
  scriptPlan: ScriptPlanSchema,
  validationReport: ValidationReportSchema,
  outputPaths: z.object({
    projectRoot: z.string().min(1),
    robloxRoot: z.string().min(1),
    logsRoot: z.string().min(1),
    analysisRoot: z.string().min(1)
  }),
  warnings: z.array(WarningSchema).default([])
});

export type Warning = z.infer<typeof WarningSchema>;
export type PointOfInterest = z.infer<typeof PointOfInterestSchema>;
export type ImageAnalysis = z.infer<typeof ImageAnalysisSchema>;
export type WorldBible = z.infer<typeof WorldBibleSchema>;
export type GameplayPlan = z.infer<typeof GameplayPlanSchema>;
export type BuildPlan = z.infer<typeof BuildPlanSchema>;
export type AssetPlan = z.infer<typeof AssetPlanSchema>;
export type ScriptPlan = z.infer<typeof ScriptPlanSchema>;
export type ValidationReport = z.infer<typeof ValidationReportSchema>;
export type ProjectManifest = z.infer<typeof ProjectManifestSchema>;
export type GenerationResult = z.infer<typeof GenerationResultSchema>;
export type SourceImage = z.infer<typeof SourceImageSchema>;
