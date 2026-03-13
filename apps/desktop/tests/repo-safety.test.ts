import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../../..");

describe("repo safety", () => {
  it("includes required root files", () => {
    expect(fs.existsSync(path.join(repoRoot, "README.md"))).toBe(true);
    expect(fs.existsSync(path.join(repoRoot, ".env.example"))).toBe(true);
    expect(fs.existsSync(path.join(repoRoot, ".gitignore"))).toBe(true);
  });

  it("ignores node_modules and generated projects", () => {
    const gitignore = fs.readFileSync(path.join(repoRoot, ".gitignore"), "utf8");
    expect(gitignore).toContain("node_modules/");
    expect(gitignore).toContain("projects/**/logs/");
    expect(gitignore).toContain("projects/**/exports/");
    expect(gitignore).toContain(".env");
  });
});
