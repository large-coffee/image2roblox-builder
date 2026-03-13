# Studio Plugin Scaffold

Optional Roblox Studio plugin scaffold for Image2Roblox Builder.

## Included Now

- `plugin/init.server.luau`
  - Creates a dock widget named `Image2Roblox Builder`
  - Displays generated project metadata summary
  - Includes command stubs for reimport/rebuild flows
- `plugin/plugin-metadata.json`
  - Plugin metadata and command list
- `src/index.ts`
  - Typed metadata/constants for future desktop-plugin integration

## Planned Next

- Wire reimport command to selected generated project folder
- Wire rebuild selected systems command to desktop agent pipeline
- Show generation notes and confidence flags inside widget
