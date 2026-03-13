import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { detectExecutable, slugify } from "../src";

describe("shared utilities", () => {
  it("slugifies names safely", () => {
    expect(slugify(" My World: Episode #1 ")).toBe("my-world-episode-1");
  });

  it("detects executable paths with spaces", () => {
    const folder = path.join(os.tmpdir(), "image2roblox path test");
    fs.mkdirSync(folder, { recursive: true });
    const exe = path.join(folder, "rojo mock.exe");
    fs.writeFileSync(exe, "stub", "utf8");

    const result = detectExecutable(exe);
    expect(result.exists).toBe(true);
    expect(result.normalizedPath).toContain("rojo mock.exe");
  });

  it("reports missing executable", () => {
    const result = detectExecutable("C:/definitely/not/found.exe");
    expect(result.exists).toBe(false);
  });
});
