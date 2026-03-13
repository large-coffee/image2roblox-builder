import React, { useState } from "react";
import { AppButton, KeyValue, Panel } from "@image2roblox/ui";
import { useAppStore } from "../store/useAppStore";

const tabs = [
  { id: "source", label: "Source Image" },
  { id: "analysis", label: "Analysis" },
  { id: "world", label: "World Bible" },
  { id: "gameplay", label: "Gameplay" },
  { id: "build", label: "Build Plan" },
  { id: "files", label: "Files" },
  { id: "logs", label: "Logs" }
] as const;

function JsonBlock(props: { value: unknown }) {
  return (
    <pre className="max-h-[520px] overflow-auto rounded-md bg-slate-900 p-3 text-xs text-slate-100">
      {props.value ? JSON.stringify(props.value, null, 2) : "No data yet."}
    </pre>
  );
}

function isImagePath(filePath: string): boolean {
  return /\.(png|jpg|jpeg|webp|bmp)$/i.test(filePath);
}

function resolveDroppedPath(event: React.DragEvent<HTMLDivElement>): string | null {
  const droppedFile = event.dataTransfer.files?.[0] as File & { path?: string };
  if (droppedFile?.path && isImagePath(droppedFile.path)) {
    return droppedFile.path;
  }

  const uriList = event.dataTransfer.getData("text/uri-list");
  if (uriList?.startsWith("file:///")) {
    const normalized = decodeURIComponent(uriList.replace(/^file:\/\//, "")).replace(/\//g, "\\");
    return isImagePath(normalized) ? normalized : null;
  }

  return null;
}

export function WorkspacePage() {
  const {
    selectedProject,
    pickAndUploadImage,
    uploadImageFromPath,
    runGeneration,
    workspaceTab,
    setWorkspaceTab,
    openOutputFolder,
    revealArtifact
  } = useAppStore();
  const [dropActive, setDropActive] = useState(false);

  if (!selectedProject) {
    return (
      <Panel title="Workspace">
        <p className="text-sm text-slate-500">Select or create a project from Dashboard.</p>
      </Panel>
    );
  }

  const { artifacts } = selectedProject;
  const preview = {
    genre: artifacts.imageAnalysis?.inferredGenre ?? "-",
    biome: artifacts.imageAnalysis?.biome ?? "-",
    mood: artifacts.imageAnalysis?.mood ?? "-",
    palette: artifacts.imageAnalysis?.colorPalette.join(", ") ?? "-",
    landmark: artifacts.worldBible?.mainLandmark ?? "-",
    pois: artifacts.worldBible?.pointsOfInterest.map((poi) => poi.name) ?? [],
    loop: artifacts.gameplayPlan?.gameplayLoop.join(" -> ") ?? "-",
    hazards: artifacts.gameplayPlan?.hazards.join(", ") ?? "-",
    collectibles: artifacts.gameplayPlan?.collectibles.length ?? 0,
    scripts:
      (artifacts.scriptPlan?.scripts.length ?? 0) +
      (artifacts.scriptPlan?.uiScripts.length ?? 0) +
      (artifacts.scriptPlan?.configModules.length ?? 0),
    confidence:
      artifacts.validationReport?.confidenceSummary.average?.toFixed(2) ??
      artifacts.buildPlan?.confidence?.toFixed(2) ??
      "-",
    warningCount:
      artifacts.validationReport?.warnings.length ??
      ((artifacts.imageAnalysis?.warnings.length ?? 0) + (artifacts.buildPlan?.warnings.length ?? 0))
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[1.75fr_1fr]">
      <div className="space-y-4">
        <Panel title={`Project Workspace: ${selectedProject.name}`}>
          <div className="flex flex-wrap gap-2">
            <AppButton onClick={pickAndUploadImage}>Upload Source Image</AppButton>
            <AppButton onClick={() => runGeneration("analyzeImage")}>Analyze Image</AppButton>
            <AppButton onClick={() => runGeneration("generateWorld")}>Generate World</AppButton>
            <AppButton onClick={() => runGeneration("generateGameplay")}>Generate Gameplay</AppButton>
            <AppButton onClick={() => runGeneration("buildRobloxProject")}>Build Roblox Project</AppButton>
            <AppButton onClick={() => runGeneration("validateOutput")}>Validate Output</AppButton>
            <AppButton onClick={() => runGeneration("regenerateWorldOnly")}>Regenerate World Only</AppButton>
            <AppButton onClick={() => runGeneration("regenerateGameplayOnly")}>Regenerate Gameplay Only</AppButton>
            <AppButton className="bg-emerald-700 hover:bg-emerald-600" onClick={openOutputFolder}>
              Open Output Folder
            </AppButton>
          </div>
        </Panel>

        <Panel title="Workspace Tabs">
          <div className="mb-3 flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                  workspaceTab === tab.id ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"
                }`}
                onClick={() => setWorkspaceTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {workspaceTab === "source" ? (
            <div className="space-y-3 text-sm">
              <div
                className={`rounded-md border-2 border-dashed p-4 transition ${
                  dropActive ? "border-blue-500 bg-blue-50" : "border-slate-300 bg-slate-50"
                }`}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDropActive(true);
                }}
                onDragLeave={() => setDropActive(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDropActive(false);
                  const droppedPath = resolveDroppedPath(event);
                  if (droppedPath) {
                    void uploadImageFromPath(droppedPath);
                  }
                }}
              >
                <p className="font-semibold text-slate-700">Drag and drop one image here</p>
                <p className="text-xs text-slate-500">
                  Supported: PNG, JPG, JPEG, WEBP, BMP. Or use the Upload Source Image button.
                </p>
              </div>

              {artifacts.sourceImage ? (
                <>
                  <KeyValue label="Original Name" value={artifacts.sourceImage.originalName} />
                  <KeyValue label="Stored Path" value={artifacts.sourceImage.storedPath} />
                  <KeyValue label="Dimensions" value={`${artifacts.sourceImage.width} x ${artifacts.sourceImage.height}`} />
                  <KeyValue label="MIME" value={artifacts.sourceImage.mimeType} />
                  <KeyValue label="Palette" value={artifacts.sourceImage.palette.join(", ")} />
                </>
              ) : (
                <p className="text-slate-500">Upload an image to begin.</p>
              )}
            </div>
          ) : null}

          {workspaceTab === "analysis" ? <JsonBlock value={artifacts.imageAnalysis} /> : null}
          {workspaceTab === "world" ? (
            <pre className="max-h-[520px] overflow-auto rounded-md bg-slate-900 p-3 text-xs text-slate-100">
              {artifacts.worldBibleMarkdown ?? "No world bible yet."}
            </pre>
          ) : null}
          {workspaceTab === "gameplay" ? <JsonBlock value={artifacts.gameplayPlan} /> : null}
          {workspaceTab === "build" ? <JsonBlock value={artifacts.buildPlan} /> : null}

          {workspaceTab === "files" ? (
            <div className="max-h-[520px] overflow-auto rounded-md border border-slate-200 bg-white">
              {selectedProject.files.length === 0 ? (
                <p className="p-3 text-sm text-slate-500">No files available yet.</p>
              ) : (
                <ul className="divide-y divide-slate-100 text-sm">
                  {selectedProject.files.map((file) => (
                    <li key={file} className="flex items-center justify-between px-3 py-2">
                      <code className="text-xs text-slate-700">{file}</code>
                      <button
                        className="text-xs font-semibold text-blue-700 hover:underline"
                        onClick={() => revealArtifact(file)}
                      >
                        Reveal
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}

          {workspaceTab === "logs" ? (
            <div className="max-h-[520px] overflow-auto rounded-md border border-slate-200 bg-white">
              {selectedProject.logs.length === 0 ? (
                <p className="p-3 text-sm text-slate-500">No logs yet.</p>
              ) : (
                <ul className="divide-y divide-slate-100 text-sm">
                  {selectedProject.logs.map((log) => {
                    const payload = (log.payload ?? {}) as {
                      prompt?: string;
                      raw?: string;
                      parseError?: string;
                      repairedFromError?: string;
                      validated?: unknown;
                      confidence?: number;
                      warnings?: unknown;
                    };

                    return (
                      <li key={log.id} className="space-y-1 px-3 py-2">
                        <p className="font-semibold text-slate-800">
                          [{log.level.toUpperCase()}] {log.stage}
                        </p>
                        <p className="text-slate-600">{log.message}</p>
                        <p className="text-xs text-slate-400">
                          Run: <code>{log.runId}</code> • {log.createdAt}
                        </p>

                        <details className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs">
                          <summary className="cursor-pointer font-semibold text-slate-600">Stage details</summary>
                          <div className="mt-2 space-y-2">
                            {payload.prompt ? (
                              <div>
                                <p className="font-semibold">Prompt</p>
                                <pre className="overflow-auto rounded bg-slate-900 p-2 text-slate-100">{payload.prompt}</pre>
                              </div>
                            ) : null}
                            {payload.raw ? (
                              <div>
                                <p className="font-semibold">Raw Output</p>
                                <pre className="max-h-40 overflow-auto rounded bg-slate-900 p-2 text-slate-100">{payload.raw}</pre>
                              </div>
                            ) : null}
                            {payload.parseError ? (
                              <p className="text-red-700">Parse Error: {payload.parseError}</p>
                            ) : null}
                            {payload.repairedFromError ? (
                              <p className="text-amber-700">Repair Context: {payload.repairedFromError}</p>
                            ) : null}
                            {typeof payload.confidence === "number" ? (
                              <p className="text-slate-700">Confidence: {payload.confidence.toFixed(2)}</p>
                            ) : null}
                            {payload.validated ? (
                              <div>
                                <p className="font-semibold">Validated Output</p>
                                <pre className="max-h-40 overflow-auto rounded bg-slate-900 p-2 text-slate-100">
                                  {JSON.stringify(payload.validated, null, 2)}
                                </pre>
                              </div>
                            ) : null}
                            {payload.warnings ? (
                              <div>
                                <p className="font-semibold">Warnings</p>
                                <pre className="overflow-auto rounded bg-slate-900 p-2 text-slate-100">
                                  {JSON.stringify(payload.warnings, null, 2)}
                                </pre>
                              </div>
                            ) : null}
                          </div>
                        </details>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ) : null}
        </Panel>
      </div>

      <div className="space-y-4">
        <Panel title="Preview Panel">
          <div className="space-y-1 text-sm">
            <KeyValue label="Inferred Genre" value={preview.genre} />
            <KeyValue label="Biome" value={preview.biome} />
            <KeyValue label="Mood" value={preview.mood} />
            <KeyValue label="Palette" value={preview.palette} />
            <KeyValue label="Main Landmark" value={preview.landmark} />
            <KeyValue label="Gameplay Loop" value={preview.loop} />
            <KeyValue label="Hazards" value={preview.hazards} />
            <KeyValue label="Collectibles" value={String(preview.collectibles)} />
            <KeyValue label="Generated Script Count" value={String(preview.scripts)} />
            <KeyValue label="Confidence" value={preview.confidence} />
            <KeyValue label="Warning Flags" value={String(preview.warningCount)} />
          </div>
          <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-2 text-xs">
            <p className="mb-1 font-semibold text-slate-700">Points of Interest</p>
            {preview.pois.length > 0 ? (
              <ul className="list-disc space-y-1 pl-4 text-slate-600">
                {preview.pois.map((poi) => (
                  <li key={poi}>{poi}</li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-500">No POIs yet.</p>
            )}
          </div>
        </Panel>

        <Panel title="Validation Report">
          {artifacts.validationReport ? (
            <div className="space-y-3 text-sm">
              <p className="font-semibold">Status: {artifacts.validationReport.isValid ? "PASS" : "WARN"}</p>
              <p>
                Confidence: {artifacts.validationReport.confidenceSummary.average.toFixed(2)} (min {" "}
                {artifacts.validationReport.confidenceSummary.min.toFixed(2)} / max {" "}
                {artifacts.validationReport.confidenceSummary.max.toFixed(2)})
              </p>

              <div>
                <p className="font-semibold">Checks</p>
                <ul className="space-y-1">
                  {artifacts.validationReport.checks.map((check) => (
                    <li key={check.id} className="rounded border border-slate-200 px-2 py-1 text-xs">
                      <p className="font-semibold">
                        [{check.status.toUpperCase()}] {check.name}
                      </p>
                      <p className="text-slate-600">{check.details}</p>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="font-semibold">Warnings</p>
                {artifacts.validationReport.warnings.length === 0 ? (
                  <p className="text-xs text-slate-500">None</p>
                ) : (
                  <ul className="list-disc pl-4 text-xs text-amber-700">
                    {artifacts.validationReport.warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <p className="font-semibold">Errors</p>
                {artifacts.validationReport.errors.length === 0 ? (
                  <p className="text-xs text-slate-500">None</p>
                ) : (
                  <ul className="list-disc pl-4 text-xs text-red-700">
                    {artifacts.validationReport.errors.map((error) => (
                      <li key={error}>{error}</li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <p className="font-semibold">Missing Files</p>
                {artifacts.validationReport.missingFiles.length === 0 ? (
                  <p className="text-xs text-slate-500">None</p>
                ) : (
                  <ul className="list-disc pl-4 text-xs text-red-700">
                    {artifacts.validationReport.missingFiles.map((file) => (
                      <li key={file}>{file}</li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <p className="font-semibold">Next Actions</p>
                <ul className="list-disc pl-4 text-xs text-slate-700">
                  {artifacts.validationReport.nextActions.map((nextAction) => (
                    <li key={nextAction}>{nextAction}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Run Validate Output after build.</p>
          )}
        </Panel>
      </div>
    </div>
  );
}
