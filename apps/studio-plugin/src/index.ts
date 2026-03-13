export interface StudioPluginCommand {
  id: string;
  label: string;
  description: string;
  status: "implemented" | "stub";
}

export interface StudioPluginMetadata {
  name: string;
  version: string;
  dockWidgetId: string;
  notes: string;
  features: string[];
  commands: StudioPluginCommand[];
}

export const pluginCommands: StudioPluginCommand[] = [
  {
    id: "refresh-project-metadata",
    label: "Refresh Metadata",
    description: "Reload generated project metadata from disk and refresh widget fields.",
    status: "implemented"
  },
  {
    id: "reimport-generated-content",
    label: "Reimport Generated Content",
    description: "Stub command for reimporting generated folders from disk.",
    status: "stub"
  },
  {
    id: "rebuild-selected-systems",
    label: "Rebuild Selected Systems",
    description: "Stub command for targeted system rebuild requests.",
    status: "stub"
  }
];

export const pluginMetadata: StudioPluginMetadata = {
  name: "Image2Roblox Builder Plugin",
  version: "0.2.0",
  dockWidgetId: "Image2RobloxBuilderDock",
  notes: "Phase 5 scaffold with dock widget and command stubs.",
  features: [
    "Dock widget container",
    "Project metadata viewer",
    "Refresh metadata command",
    "Reimport generated content stub",
    "Rebuild selected systems stub"
  ],
  commands: pluginCommands
};
