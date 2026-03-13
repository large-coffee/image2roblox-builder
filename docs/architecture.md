# Architecture

Image2Roblox Builder is a pnpm workspace monorepo with a Windows-first Electron desktop app.

## System Overview

- `apps/desktop`: Electron main process + preload IPC + React renderer.
- `packages/agent-core`: Multi-agent generation pipeline with schema gates and provider abstraction.
- `packages/schemas`: Zod schemas for every AI boundary and persisted artifact.
- `packages/roblox-generator`: Filesystem writer for Rojo-compatible output + Luau starter systems.
- `packages/shared`: Common path, slug, fs, and logging helpers.
- `packages/ui`: Reusable UI primitives.

## Data Flow

1. User creates project.
2. Image copied into `projects/<slug>/source-image`.
3. Pipeline runs in stages:
   - ImageAnalysis
   - WorldBible
   - GameplayPlan
   - BuildPlan
   - AssetPlan/ScriptPlan
   - ValidationReport
4. All stage outputs are schema-validated before downstream use.
5. Roblox generator writes `projects/<slug>/roblox`.
6. UI reads saved artifacts and logs from SQLite + project files.

## Persistence

SQLite in desktop app stores:

- project metadata
- generation runs
- stage logs (prompt/raw/parsed/errors)
- settings
- artifact index

Generated content remains filesystem-first and human-editable.

## Provider Model

Provider interface allows `mock` and `real` implementations.

- Mock provider is deterministic and offline.
- Real provider integration uses the same typed contracts and retry/repair flow.

## Reliability Features

- Schema validation at every stage
- Retry/repair on malformed model output
- Structured warnings and confidence scoring
- Output validation before reporting success
