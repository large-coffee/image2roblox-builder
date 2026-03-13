import path from "node:path";
import Database from "better-sqlite3";
import { ensureDir } from "@image2roblox/shared";
import type { AppSettings, ProjectSummary } from "../shared/contracts";
import type { StageLogEntry } from "@image2roblox/shared";

interface ProjectRow {
  project_id: string;
  slug: string;
  name: string;
  root_path: string;
  status: string;
  created_at: string;
  updated_at: string;
}

const SETTINGS_KEY = "app_settings";

export class AppDatabase {
  private readonly db: Database.Database;

  constructor(dbPath: string) {
    ensureDir(path.dirname(dbPath));
    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");
    this.migrate();
  }

  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        project_id TEXT PRIMARY KEY,
        slug TEXT NOT NULL,
        name TEXT NOT NULL,
        root_path TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS runs (
        run_id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        action TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        warnings_json TEXT NOT NULL,
        FOREIGN KEY(project_id) REFERENCES projects(project_id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS logs (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        run_id TEXT NOT NULL,
        stage TEXT NOT NULL,
        level TEXT NOT NULL,
        message TEXT NOT NULL,
        payload_json TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY(project_id) REFERENCES projects(project_id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS artifacts (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        run_id TEXT NOT NULL,
        artifact_type TEXT NOT NULL,
        file_path TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY(project_id) REFERENCES projects(project_id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON projects(updated_at DESC);
      CREATE INDEX IF NOT EXISTS idx_logs_project_created ON logs(project_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_runs_project_created ON runs(project_id, created_at DESC);
    `);
  }

  close(): void {
    this.db.close();
  }

  listProjects(): ProjectSummary[] {
    const rows = this.db
      .prepare(
        `SELECT project_id, slug, name, root_path, status, created_at, updated_at
         FROM projects
         ORDER BY updated_at DESC`
      )
      .all() as ProjectRow[];

    return rows.map((row) => ({
      projectId: row.project_id,
      slug: row.slug,
      name: row.name,
      rootPath: row.root_path,
      status: row.status as ProjectSummary["status"],
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  upsertProject(project: ProjectSummary): void {
    this.db
      .prepare(
        `INSERT INTO projects (project_id, slug, name, root_path, status, created_at, updated_at)
         VALUES (@projectId, @slug, @name, @rootPath, @status, @createdAt, @updatedAt)
         ON CONFLICT(project_id) DO UPDATE SET
           slug = excluded.slug,
           name = excluded.name,
           root_path = excluded.root_path,
           status = excluded.status,
           updated_at = excluded.updated_at`
      )
      .run(project);
  }

  getProject(projectId: string): ProjectSummary | null {
    const row = this.db
      .prepare(
        `SELECT project_id, slug, name, root_path, status, created_at, updated_at
         FROM projects
         WHERE project_id = ?`
      )
      .get(projectId) as ProjectRow | undefined;

    if (!row) return null;

    return {
      projectId: row.project_id,
      slug: row.slug,
      name: row.name,
      rootPath: row.root_path,
      status: row.status as ProjectSummary["status"],
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  deleteProject(projectId: string): void {
    this.db.prepare("DELETE FROM projects WHERE project_id = ?").run(projectId);
  }

  insertRun(params: {
    runId: string;
    projectId: string;
    action: string;
    status: "running" | "completed" | "failed";
    createdAt: string;
    updatedAt: string;
    warnings: string[];
  }): void {
    this.db
      .prepare(
        `INSERT INTO runs (run_id, project_id, action, status, created_at, updated_at, warnings_json)
         VALUES (@runId, @projectId, @action, @status, @createdAt, @updatedAt, @warningsJson)
         ON CONFLICT(run_id) DO UPDATE SET
           status = excluded.status,
           updated_at = excluded.updated_at,
           warnings_json = excluded.warnings_json`
      )
      .run({
        ...params,
        warningsJson: JSON.stringify(params.warnings)
      });
  }

  insertLogs(entries: StageLogEntry[]): void {
    const insert = this.db.prepare(
      `INSERT INTO logs (id, project_id, run_id, stage, level, message, payload_json, created_at)
       VALUES (@id, @projectId, @runId, @stage, @level, @message, @payloadJson, @createdAt)`
    );

    const transaction = this.db.transaction((rows: StageLogEntry[]) => {
      for (const row of rows) {
        insert.run({
          id: row.id,
          projectId: row.projectId,
          runId: row.runId,
          stage: row.stage,
          level: row.level,
          message: row.message,
          payloadJson: row.payload ? JSON.stringify(row.payload) : null,
          createdAt: row.createdAt
        });
      }
    });

    transaction(entries);
  }

  listLogs(projectId: string, limit = 400): StageLogEntry[] {
    const rows = this.db
      .prepare(
        `SELECT id, project_id, run_id, stage, level, message, payload_json, created_at
         FROM logs
         WHERE project_id = ?
         ORDER BY created_at DESC
         LIMIT ?`
      )
      .all(projectId, limit) as Array<{
      id: string;
      project_id: string;
      run_id: string;
      stage: string;
      level: "info" | "warn" | "error";
      message: string;
      payload_json: string | null;
      created_at: string;
    }>;

    return rows.map((row) => ({
      id: row.id,
      projectId: row.project_id,
      runId: row.run_id,
      stage: row.stage,
      level: row.level,
      message: row.message,
      createdAt: row.created_at,
      payload: row.payload_json ? JSON.parse(row.payload_json) : undefined
    }));
  }

  setSettings(settings: AppSettings, updatedAt: string): void {
    this.db
      .prepare(
        `INSERT INTO settings (key, value_json, updated_at)
         VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at`
      )
      .run(SETTINGS_KEY, JSON.stringify(settings), updatedAt);
  }

  getSettings(): AppSettings | null {
    const row = this.db.prepare("SELECT value_json FROM settings WHERE key = ?").get(SETTINGS_KEY) as
      | { value_json: string }
      | undefined;

    if (!row) return null;
    return JSON.parse(row.value_json) as AppSettings;
  }
}
