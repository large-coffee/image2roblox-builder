import React, { useEffect } from "react";
import { useAppStore } from "./store/useAppStore";
import { DashboardPage } from "./pages/DashboardPage";
import { WorkspacePage } from "./pages/WorkspacePage";
import { SettingsPage } from "./pages/SettingsPage";

export default function App() {
  const {
    initialize,
    screen,
    setScreen,
    busy,
    busyLabel,
    error,
    clearError,
    warnings,
    selectedProject
  } = useAppStore();

  useEffect(() => {
    void initialize();
  }, [initialize]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-cyan-100 text-slate-900">
      <header className="border-b border-blue-200/60 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Image2Roblox Builder</h1>
            <p className="text-xs text-slate-500">Windows-first autonomous Roblox world generation from one image.</p>
          </div>
          <nav className="flex gap-2">
            <button
              className={`rounded-md px-3 py-2 text-sm font-medium ${screen === "dashboard" ? "bg-slate-900 text-white" : "bg-white text-slate-700"}`}
              onClick={() => setScreen("dashboard")}
            >
              Dashboard
            </button>
            <button
              className={`rounded-md px-3 py-2 text-sm font-medium ${screen === "workspace" ? "bg-slate-900 text-white" : "bg-white text-slate-700"}`}
              onClick={() => setScreen("workspace")}
              disabled={!selectedProject}
            >
              Workspace
            </button>
            <button
              className={`rounded-md px-3 py-2 text-sm font-medium ${screen === "settings" ? "bg-slate-900 text-white" : "bg-white text-slate-700"}`}
              onClick={() => setScreen("settings")}
            >
              Settings
            </button>
          </nav>
        </div>
      </header>

      {busy ? (
        <div className="mx-auto mt-4 max-w-[1600px] rounded-md border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-900">
          {busyLabel || "Working..."}
        </div>
      ) : null}

      {error ? (
        <div className="mx-auto mt-4 flex max-w-[1600px] items-center justify-between rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-900">
          <span>{error}</span>
          <button className="font-semibold underline" onClick={clearError}>
            Dismiss
          </button>
        </div>
      ) : null}

      {warnings.length > 0 ? (
        <div className="mx-auto mt-4 max-w-[1600px] rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
          <p className="font-semibold">Warnings</p>
          <ul className="ml-5 list-disc">
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <main className="mx-auto max-w-[1600px] px-6 py-6">
        {screen === "dashboard" ? <DashboardPage /> : null}
        {screen === "workspace" ? <WorkspacePage /> : null}
        {screen === "settings" ? <SettingsPage /> : null}
      </main>
    </div>
  );
}
