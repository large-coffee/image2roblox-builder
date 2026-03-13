import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";

export function nowIso(): string {
  return new Date().toISOString();
}

export function createId(): string {
  return crypto.randomUUID();
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function ensureDir(dirPath: string): void {
  fs.mkdirSync(dirPath, { recursive: true });
}

export function readJsonFile<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

export function writeJsonFile(filePath: string, value: unknown): void {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), "utf8");
}

export function writeTextFile(filePath: string, value: string): void {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, value, "utf8");
}

export function copyFile(sourcePath: string, destinationPath: string): void {
  ensureDir(path.dirname(destinationPath));
  fs.copyFileSync(sourcePath, destinationPath);
}

export function exists(filePath: string): boolean {
  return fs.existsSync(filePath);
}

export function safeReadDir(dirPath: string): string[] {
  if (!exists(dirPath)) return [];
  return fs.readdirSync(dirPath);
}

export function getRepoProjectsRoot(explicitRoot?: string): string {
  if (explicitRoot && explicitRoot.trim()) {
    return explicitRoot;
  }
  const envRoot = process.env.IMAGE2ROBLOX_PROJECTS_ROOT;
  if (envRoot && envRoot.trim()) {
    return envRoot;
  }
  return path.join(process.cwd(), "projects");
}

export function defaultAppDataRoot(): string {
  return path.join(os.homedir(), "AppData", "Local", "Image2RobloxBuilder");
}

export function detectExecutable(executablePath: string | null | undefined): {
  exists: boolean;
  normalizedPath: string | null;
  reason?: string;
} {
  if (!executablePath || !executablePath.trim()) {
    return {
      exists: false,
      normalizedPath: null,
      reason: "Path is empty"
    };
  }

  const normalizedPath = path.normalize(executablePath.trim());
  if (!fs.existsSync(normalizedPath)) {
    return {
      exists: false,
      normalizedPath,
      reason: "Executable not found"
    };
  }

  return {
    exists: true,
    normalizedPath
  };
}

export type StageLogLevel = "info" | "warn" | "error";

export interface StageLogEntry {
  id: string;
  runId: string;
  projectId: string;
  stage: string;
  level: StageLogLevel;
  message: string;
  createdAt: string;
  payload?: unknown;
}

export function createLogEntry(input: Omit<StageLogEntry, "id" | "createdAt">): StageLogEntry {
  return {
    id: createId(),
    createdAt: nowIso(),
    ...input
  };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((acc, value) => acc + value, 0) / values.length;
}
