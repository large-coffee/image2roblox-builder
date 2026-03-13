import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";
import { DesktopBackend } from "../src/main/backend";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fixtureImage = path.resolve(__dirname, "../../../examples/fixtures/sample.png");
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "image2roblox smoke test "));

const backend = new DesktopBackend(tempRoot);

afterAll(() => {
  backend.dispose();
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
