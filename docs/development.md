# Development Guide

## Workspace Commands

```powershell
npm.cmd exec --yes pnpm@10.6.5 -- install
npm.cmd exec --yes pnpm@10.6.5 -- dev
npm.cmd exec --yes pnpm@10.6.5 -- test
npm.cmd exec --yes pnpm@10.6.5 -- build
```

## Desktop App

`apps/desktop` uses Electron + React + Tailwind.

Main process responsibilities:

- filesystem operations
- sqlite persistence
- generation pipeline orchestration
- tool path validation (Roblox Studio, Rojo)

Renderer responsibilities:

- dashboard/project UX
- generation controls
- tabs for analysis/world/gameplay/build/files/logs
- settings and validation views

## Runtime Data

Default runtime root:

`<repo>/projects`

This location is git-ignored and can be changed in settings.

## Testing Strategy

- Unit: schemas, heuristics, retry/repair, generator helpers
- Integration: pipeline from image fixture to generated Roblox tree
- Safety: repo check script for publish readiness

## Coding Rules

- TypeScript-first
- Strong boundaries between packages
- Zod schemas as hard contracts
- Avoid direct file writes from raw provider output
- Keep generated Lua modules modular and editable
