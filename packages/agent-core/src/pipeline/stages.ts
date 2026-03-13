import {
  BuildPlanSchema,
  type BuildPlan,
  type GameplayPlan,
  GameplayPlanSchema,
  type ImageAnalysis,
  ImageAnalysisSchema,
  type AssetPlan,
  AssetPlanSchema,
  type ScriptPlan,
  ScriptPlanSchema,
  type SourceImage,
  type WorldBible,
  WorldBibleSchema,
  type ValidationReport,
  ValidationReportSchema
} from "@image2roblox/schemas";
import { average, nowIso } from "@image2roblox/shared";
import {
  inferBiome,
  inferGenreTags,
  inferLighting,
  inferMood,
  seededPick,
  seededRange,
  summarizeImageCues,
  type ImageCueSummary
} from "./heuristics.js";

function createLandmark(seed: number, biome: string): string {
  const options = [
    `The ${biome} Beacon`,
    `The Broken Sky Arch`,
    `The Echo Spire`,
    `The Warden Bastion`,
    `The Stormglass Monolith`
  ];
  return seededPick(seed, options, 2);
}

function chooseGameplayType(cues: ImageCueSummary, biome: string): GameplayPlan["primaryGameplayType"] {
  if (biome.includes("volcanic")) return "survival";
  if (biome.includes("frosted")) return "puzzle_exploration";
  if (cues.brightness < 35) return "wave_defense";
  if (cues.aspectRatio > 1.7) return "exploration_adventure";
  if (cues.saturation > 55) return "scavenger_hunt";
  return "exploration_adventure";
}

export function buildImageAnalysis(sourceImage: SourceImage): ImageAnalysis {
  const cues = summarizeImageCues(sourceImage);
  const biome = inferBiome(cues.hue);
  const mood = inferMood(cues.brightness, cues.saturation);
  const sceneType = cues.aspectRatio > 1.55 ? "wide vista" : "focused landmark scene";
  const mainLandmark = createLandmark(cues.seed, biome);

  const analysis: ImageAnalysis = {
    sceneType,
    biome,
    mood,
    lighting: inferLighting(cues.brightness),
    inferredGenre: chooseGameplayType(cues, biome).replaceAll("_", " "),
    scaleCues: [
      `Aspect ratio ${sourceImage.width}:${sourceImage.height}`,
      `Primary color depth suggests ${mood} pacing`
    ],
    colorPalette: sourceImage.palette,
    landmarks: [mainLandmark, "Ruined approach gate", "Observation ridge"],
    architectureStyle: biome.includes("coastal") ? "weathered maritime stonework" : "modular frontier ruins",
    terrainClues: [
      biome,
      "Layered traversal routes",
      "Mixed open and choke-point spaces"
    ],
    traversalIdeas: [
      "Checkpoint-linked ascent path",
      "Hidden side trail for bonus collectibles",
      "Risk/reward hazard crossing"
    ],
    enemyOrCreatureIdeas: [
      "Territory drone sentinel",
      "Ambient critter swarm"
    ],
    likelyPlayerFantasy: "Discover a dangerous place, master traversal, and restore a forgotten objective.",
    genreTags: inferGenreTags(biome, mood),
    confidence: 0.74,
    warnings: []
  };

  return ImageAnalysisSchema.parse(analysis);
}

export function buildWorldBible(imageAnalysis: ImageAnalysis): WorldBible {
  const cues = summarizeImageCues({
    originalName: imageAnalysis.sceneType,
    storedPath: imageAnalysis.sceneType,
    mimeType: "image/mock",
    width: 1600,
    height: 900,
    sizeBytes: 1,
    palette: imageAnalysis.colorPalette
  });

  const zoneCount = seededRange(cues.seed, 3, 6, 4);
  const zones = Array.from({ length: zoneCount }, (_, idx) => ({
    name: `Zone ${idx + 1}: ${seededPick(cues.seed, ["Approach", "Ridge", "Floodplain", "Vault", "Sanctum", "Crash Site"], idx)}`,
    description: `A ${imageAnalysis.mood} area designed for ${idx % 2 === 0 ? "navigation" : "resource hunting"}.`,
    traversalStyle: idx % 2 === 0 ? "layered vertical routes" : "looping patrol lanes"
  }));

  const poiCount = seededRange(cues.seed, 3, 8, 5);
  const riskLevels = ["low", "medium", "high"] as const;
  const pointsOfInterest = Array.from({ length: poiCount }, (_, idx) => ({
    name: `${seededPick(cues.seed, ["Signal Tower", "Collapsed Bridge", "Sunken Gate", "Crystal Grotto", "Engine Yard", "Broken Shrine"], idx + 10)}`,
    purpose: idx % 2 === 0 ? "Progress objective and checkpoint" : "Collectible cluster and lore reveal",
    riskLevel: seededPick(cues.seed, riskLevels, idx + 20),
    traversalNotes: idx % 2 === 0 ? "Uses jump and timing" : "Uses exploration and interact prompts"
  }));

  const mainLandmark = imageAnalysis.landmarks[0];

  const worldBible: WorldBible = {
    worldSummary: `A ${imageAnalysis.biome} world centered around ${mainLandmark}.`,
    setting: "A recently rediscovered frontier zone where automation collapsed and nature reclaimed paths.",
    tone: imageAnalysis.mood,
    loreSeed: "An old expedition left a restoration protocol buried in the landmark, now sought by scavengers.",
    theme: `${imageAnalysis.biome} restoration adventure`,
    zones,
    mainLandmark,
    landmarks: imageAnalysis.landmarks,
    environmentalStorytelling: [
      "Half-repaired structures imply earlier failed attempts.",
      "Color-coded relic markers guide players toward story beats."
    ],
    weatherDirection: imageAnalysis.biome.includes("coastal") ? "Wind gusts with occasional rain bursts" : "Dynamic haze with intermittent storms",
    dayNightDirection: "Long dusk cycle to emphasize atmosphere and silhouette readability.",
    soundscape: "Layered ambient wind, distant machinery hum, and localized point-of-interest sound cues.",
    pointsOfInterest,
    mainObjective: "Restore the landmark control core to stabilize the region.",
    confidence: 0.78,
    warnings: []
  };

  return WorldBibleSchema.parse(worldBible);
}

export function buildGameplayPlan(imageAnalysis: ImageAnalysis, worldBible: WorldBible): GameplayPlan {
  const cues = summarizeImageCues({
    originalName: worldBible.theme,
    storedPath: worldBible.theme,
    mimeType: "image/mock",
    width: 1200,
    height: 900,
    sizeBytes: 1,
    palette: imageAnalysis.colorPalette
  });

  const primaryGameplayType = chooseGameplayType(cues, imageAnalysis.biome);
  const secondarySystems = [
    {
      name: "Checkpoint Recovery",
      description: "Players reactivate checkpoints to secure progress after hazards.",
      enabled: true
    },
    {
      name: "Environmental Interacts",
      description: "Context prompts unlock routes and story fragments.",
      enabled: true
    }
  ].slice(0, seededRange(cues.seed, 1, 2, 3));

  const collectiblesCount = seededRange(cues.seed, 3, 10, 7);
  const collectibles = Array.from({ length: collectiblesCount }, (_, idx) => ({
    name: `Core Fragment ${idx + 1}`,
    description: "A shard of the landmark stabilization protocol.",
    targetCount: collectiblesCount
  }));

  const gameplayPlan: GameplayPlan = {
    primaryGameplayType,
    secondarySystems,
    mainObjective: worldBible.mainObjective,
    gameplayLoop: [
      "Spawn at safe hub and receive objective",
      "Traverse to POIs while collecting fragments",
      "Resolve hazards/enemy pressure",
      "Return fragments to landmark to progress",
      "Complete final activation challenge"
    ],
    hazards: ["Damage fog pockets", "Timed collapse bridge", "Patrol sentinel"],
    collectibles,
    interactables: ["Power relay console", "Gate lever", "Lore beacon", "Checkpoint crystal"],
    checkpointPlan: ["Spawn Hub", "Mid-route Ridge", "Landmark Antechamber"],
    npcDialogHooks: ["Guide NPC briefing", "Rival scavenger taunt", "Landmark AI activation"],
    winCondition: "Activate landmark core after collecting enough fragments.",
    loseCondition: "Player health reaches zero in hazard zones without checkpoint recovery.",
    confidence: 0.76,
    warnings: []
  };

  return GameplayPlanSchema.parse(gameplayPlan);
}

export function buildBuildPlan(
  imageAnalysis: ImageAnalysis,
  worldBible: WorldBible,
  gameplayPlan: GameplayPlan
): BuildPlan {
  const buildPlan: BuildPlan = {
    terrainRecipe: [
      "Block out primary basin with smooth terrain",
      "Raise landmark plateau with stepped ramps",
      "Paint biome-consistent materials and hazard strips"
    ],
    structureList: [
      "Spawn Hub",
      "Checkpoint Towers",
      "Landmark Core Chamber",
      "Collectible Vault Rooms"
    ],
    spawnArea: "Protected circular spawn platform with mission board and tutorial prompts.",
    checkpoints: gameplayPlan.checkpointPlan,
    interactables: gameplayPlan.interactables,
    collectibles: gameplayPlan.collectibles.map((collectible) => collectible.name),
    hazards: gameplayPlan.hazards,
    enemyPlaceholders: ["Sentinel bot", "Roaming threat drone"],
    npcPlacement: ["Spawn Hub guide", "Mid-route rival NPC", "Landmark AI terminal"],
    lightingSettings: {
      brightness: imageAnalysis.mood.includes("ominous") ? 2.1 : 2.8,
      clockTime: imageAnalysis.mood.includes("calm") ? 16.5 : 18.2,
      fogColor: imageAnalysis.colorPalette[0],
      fogEnd: imageAnalysis.mood.includes("ominous") ? 320 : 520,
      atmosphereDensity: imageAnalysis.mood.includes("ominous") ? 0.46 : 0.28
    },
    atmosphereNotes: `${worldBible.weatherDirection}. ${worldBible.dayNightDirection}`,
    soundPlan: [
      "Ambient biome loop",
      "POI proximity stingers",
      "Objective completion cue"
    ],
    uiPlan: [
      "Top-left objective tracker",
      "Bottom-center interaction prompt",
      "Top-center collectible progress",
      "Health and checkpoint status"
    ],
    fileGenerationPlan: [
      { path: "roblox/src/ReplicatedStorage/Config/WorldConfig.luau", purpose: "World tuning and metadata" },
      { path: "roblox/src/ReplicatedStorage/Systems/QuestTracker.luau", purpose: "Objective and collectible progress" },
      { path: "roblox/src/ServerScriptService/Main.server.luau", purpose: "Server bootstrap" },
      { path: "roblox/src/StarterPlayer/StarterPlayerScripts/HUD.client.luau", purpose: "HUD rendering" },
      { path: "roblox/src/Workspace/Blockout.server.luau", purpose: "Primitive world blockout" },
      { path: "roblox/default.project.json", purpose: "Rojo mapping" }
    ],
    confidence: 0.8,
    warnings: []
  };

  return BuildPlanSchema.parse(buildPlan);
}

export function buildAssetPlan(buildPlan: BuildPlan): AssetPlan {
  const placeholders = buildPlan.structureList.map((structure) => ({
    name: `${structure} Placeholder Mesh`,
    assetType: "placeholder" as const,
    source: "generated_placeholder" as const,
    purpose: `Primitive blockout for ${structure}`,
    robloxPath: `Workspace/${structure.replace(/\s+/g, "")}`
  }));

  const assetPlan: AssetPlan = {
    placeholders,
    externalSuggestions: [
      {
        name: "Ambient Wind Loop",
        assetType: "sound",
        source: "recommended_external",
        purpose: "Improve biome immersion",
        robloxPath: "SoundService/AmbientWind"
      }
    ],
    confidence: 0.72,
    warnings: [
      {
        code: "ASSET_PLACEHOLDER_ONLY",
        message: "Using primitives/placeholders for uncertain assets in V1.",
        severity: "medium"
      }
    ]
  };

  return AssetPlanSchema.parse(assetPlan);
}

export function buildScriptPlan(gameplayPlan: GameplayPlan, buildPlan: BuildPlan): ScriptPlan {
  const scripts: ScriptPlan["scripts"] = [
    {
      name: "MainServer",
      robloxPath: "ServerScriptService/Main.server.luau",
      scriptType: "Script",
      purpose: "Bootstraps server systems and objective state",
      dependencies: ["ReplicatedStorage/Systems/QuestTracker"]
    },
    {
      name: "CollectibleService",
      robloxPath: "ServerScriptService/CollectibleService.server.luau",
      scriptType: "Script",
      purpose: "Handles collectible pickup and progress",
      dependencies: ["ReplicatedStorage/Config/WorldConfig"]
    },
    {
      name: "CheckpointService",
      robloxPath: "ServerScriptService/CheckpointService.server.luau",
      scriptType: "Script",
      purpose: "Tracks checkpoint activation and respawn",
      dependencies: []
    },
    {
      name: "DamageZoneService",
      robloxPath: "ServerScriptService/DamageZoneService.server.luau",
      scriptType: "Script",
      purpose: "Applies hazard damage in tagged zones",
      dependencies: []
    },
    {
      name: "NPCDialogService",
      robloxPath: "ServerScriptService/NPCDialogService.server.luau",
      scriptType: "Script",
      purpose: "Provides starter NPC dialog interactions",
      dependencies: []
    },
    {
      name: "EnemyPlaceholderAI",
      robloxPath: "ServerScriptService/EnemyPlaceholderAI.server.luau",
      scriptType: "Script",
      purpose: "Simple chase/patrol behavior for placeholder enemies",
      dependencies: []
    }
  ];

  const uiScripts: ScriptPlan["uiScripts"] = [
    {
      name: "HUDClient",
      robloxPath: "StarterPlayer/StarterPlayerScripts/HUD.client.luau",
      scriptType: "LocalScript",
      purpose: "Displays objective, health, and collectible progress",
      dependencies: ["ReplicatedStorage/Config/WorldConfig"]
    }
  ];

  const configModules: ScriptPlan["configModules"] = [
    {
      name: "WorldConfig",
      robloxPath: "ReplicatedStorage/Config/WorldConfig.luau",
      scriptType: "ModuleScript",
      purpose: `Stores generated gameplay type (${gameplayPlan.primaryGameplayType}) and map settings`,
      dependencies: []
    },
    {
      name: "BuildPlanConfig",
      robloxPath: "ReplicatedStorage/Config/BuildPlanConfig.luau",
      scriptType: "ModuleScript",
      purpose: `Stores build instructions for ${buildPlan.structureList.length} structures`,
      dependencies: []
    }
  ];

  const scriptPlan: ScriptPlan = {
    scripts,
    uiScripts,
    configModules,
    confidence: 0.79,
    warnings: []
  };

  return ScriptPlanSchema.parse(scriptPlan);
}

export function buildValidationReport(input: {
  fileChecks: Array<{ id: string; name: string; status: "pass" | "warn" | "fail"; details: string }>;
  errors: string[];
  warnings: string[];
  missingFiles: string[];
  confidences: number[];
}): ValidationReport {
  const min = input.confidences.length ? Math.min(...input.confidences) : 0;
  const max = input.confidences.length ? Math.max(...input.confidences) : 0;
  const avg = average(input.confidences);

  const validationReport: ValidationReport = {
    generatedAt: nowIso(),
    checks: input.fileChecks,
    errors: input.errors,
    warnings: input.warnings,
    missingFiles: input.missingFiles,
    confidenceSummary: {
      min,
      max,
      average: avg
    },
    nextActions:
      input.missingFiles.length > 0
        ? ["Re-run Build Roblox Project to fill missing files."]
        : ["Open project in Roblox Studio and begin scene polish."],
    isValid: input.errors.length === 0 && input.missingFiles.length === 0
  };

  return ValidationReportSchema.parse(validationReport);
}


