import React, { useMemo, useState } from "react";
import { AppButton, Panel } from "@image2roblox/ui";
import { useAppStore } from "../store/useAppStore";
import type { AppSettings } from "@shared/contracts";

export function SettingsPage() {
  const { settings, executableReport, saveSettings, pickExecutablePath, validateExecutables } = useAppStore();
  const [local, setLocal] = useState<AppSettings | null>(settings);

  const model = useMemo(() => local ?? settings, [local, settings]);

  if (!model) {
    return (
      <Panel title="Settings">
        <p className="text-sm text-slate-500">Loading settings...</p>
      </Panel>
    );
  }

  const update = (patch: Partial<AppSettings>) => {
    const next = {
      ...model,
      ...patch
    };
    setLocal(next);
    void validateExecutables(next);
  };

  const pickPath = async (key: "robloxStudioPath" | "rojoPath") => {
    const picked = await pickExecutablePath();
    if (!picked) return;
    update({ [key]: picked } as Partial<AppSettings>);
  };

  return (
    <Panel title="Settings">
      <div className="space-y-4 text-sm">
        <div>
          <label className="mb-1 block font-semibold">Provider Mode</label>
          <select
            className="w-full rounded-md border border-slate-300 px-3 py-2"
            value={model.providerMode}
            onChange={(event) => update({ providerMode: event.target.value as AppSettings["providerMode"] })}
          >
            <option value="mock">Mock (offline)</option>
            <option value="real">Real provider</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block font-semibold">Provider API Key</label>
          <input
            type="password"
            className="w-full rounded-md border border-slate-300 px-3 py-2"
            value={model.providerApiKey}
            onChange={(event) => update({ providerApiKey: event.target.value })}
            placeholder="Optional in mock mode"
          />
        </div>

        <div>
          <label className="mb-1 block font-semibold">Provider Model</label>
          <input
            className="w-full rounded-md border border-slate-300 px-3 py-2"
            value={model.providerModel}
            onChange={(event) => update({ providerModel: event.target.value })}
          />
        </div>

        <div>
          <label className="mb-1 block font-semibold">Projects Root</label>
          <input
            className="w-full rounded-md border border-slate-300 px-3 py-2"
            value={model.projectsRoot}
            onChange={(event) => update({ projectsRoot: event.target.value })}
          />
        </div>

        <div>
          <label className="mb-1 block font-semibold">Roblox Studio Path</label>
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-md border border-slate-300 px-3 py-2"
              value={model.robloxStudioPath}
              onChange={(event) => update({ robloxStudioPath: event.target.value })}
              placeholder="C:\\Program Files\\Roblox\\RobloxStudioBeta.exe"
            />
            <AppButton onClick={() => pickPath("robloxStudioPath")}>Browse</AppButton>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {executableReport?.robloxStudio.exists
              ? `Detected: ${executableReport.robloxStudio.normalizedPath}`
              : `Not detected: ${executableReport?.robloxStudio.reason ?? "Path missing"}`}
          </p>
        </div>

        <div>
          <label className="mb-1 block font-semibold">Rojo Path</label>
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-md border border-slate-300 px-3 py-2"
              value={model.rojoPath}
              onChange={(event) => update({ rojoPath: event.target.value })}
              placeholder="C:\\tools\\rojo.exe"
            />
            <AppButton onClick={() => pickPath("rojoPath")}>Browse</AppButton>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {executableReport?.rojo.exists
              ? `Detected: ${executableReport.rojo.normalizedPath}`
              : `Not detected: ${executableReport?.rojo.reason ?? "Path missing"}`}
          </p>
        </div>

        <AppButton onClick={() => saveSettings(model)}>Save Settings</AppButton>
      </div>
    </Panel>
  );
}
