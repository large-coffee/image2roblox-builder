# Image2Roblox Builder

Image2Roblox Builder is a Windows-first desktop app that turns one uploaded image into a generated Roblox starter world and game scaffold.

The app analyzes the image, creates a world concept and gameplay loop, validates outputs, and writes a Rojo-compatible project tree that can be opened and synced into Roblox Studio.

## Windows Setup

### Prerequisites

1. Node.js 22+
2. npm 11+
3. Git
4. Roblox Studio (optional for generation, needed for import workflow)
5. Rojo (optional for import workflow)

### Install

```powershell
npm.cmd exec --yes pnpm@10.6.5 -- install
```

## Dev Commands

```powershell
# Run desktop app + workspace dev tasks
npm.cmd exec --yes pnpm@10.6.5 -- dev

# Build all packages/apps
npm.cmd exec --yes pnpm@10.6.5 -- build

# Run tests
npm.cmd exec --yes pnpm@10.6.5 -- test

# Type checking
npm.cmd exec --yes pnpm@10.6.5 -- typecheck

# Repository safety check
npm.cmd exec --yes pnpm@10.6.5 -- check:repo
```

## Folder Structure

```text
/apps
  /desktop          Electron + React desktop app
  /studio-plugin    Optional Roblox Studio plugin scaffold (dock widget + command stubs)
/packages
  /agent-core       Agent pipeline + provider abstraction
  /schemas          Zod schemas and typed contracts
  /roblox-generator Roblox output writer + Luau templates
  /shared           Shared utilities
  /ui               Shared UI components
/projects           Runtime generated user projects (git ignored)
/docs               Architecture, development, publishing docs
/scripts            Safety and tooling scripts
/examples           Fixtures/examples for tests and demos
```

## Mock Mode

Mock mode is the default and requires no API keys.

- Upload one image (file picker or drag/drop in workspace).
- Run the generation pipeline.
- The app uses deterministic image heuristics (palette, dimensions, inferred mood/biome tags) and outputs believable structured plans.
- The app writes a full Roblox-ready output tree under `projects/<slug>/roblox`.

To keep mock mode enabled:

```text
IMAGE2ROBLOX_PROVIDER_MODE=mock
```

## Roblox Output Generation

Each project writes outputs to:

- `projects/<slug>/analysis/*`
- `projects/<slug>/roblox/default.project.json`
- `projects/<slug>/roblox/src/...`
- `projects/<slug>/logs/*`
- `projects/<slug>/README.md`

Generated scripts prioritize modular, editable starter systems and placeholder primitives when asset certainty is low.

## Run Tests

```powershell
npm.cmd exec --yes pnpm@10.6.5 -- test
```

Tests cover schema contracts, mock pipeline logic, generator output shape, validation behavior, and repository safety checks.

## Environment Variables

Copy `.env.example` to `.env` and fill only if enabling a real provider.

Required for real provider mode:

- `IMAGE2ROBLOX_PROVIDER_MODE` (`mock` or `real`)
- `OPENAI_API_KEY` or other provider key

Optional:

- `ROBLOX_STUDIO_PATH`
- `ROJO_PATH`
- `IMAGE2ROBLOX_PROJECTS_ROOT`

## Publish to GitHub

1. Initialize git if needed.
2. Review `.gitignore`.
3. Verify secrets are not tracked.
4. Create a new empty GitHub repository.
5. Add the remote.
6. Push the `main` branch.

### Command line publish flow

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/image2roblox-builder.git
git push -u origin main
```

### GitHub Desktop publish flow

1. Open GitHub Desktop and choose **Add Existing Repository**.
2. Select `D:\Codex\image2roblox-builder`.
3. Review changed files and confirm no secrets are included.
4. Commit to `main` with message `Initial commit`.
5. Click **Publish repository**.
6. Choose public/private visibility and publish.

See [docs/publishing-to-github.md](docs/publishing-to-github.md) for secret-rotation and clean push guidance.
