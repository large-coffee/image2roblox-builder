import React, { useState } from "react";
import { AppButton, Panel } from "@image2roblox/ui";
import { useAppStore } from "../store/useAppStore";

export function DashboardPage() {
  const { projects, selectedProject, createProject, selectProject, deleteProject, setScreen } = useAppStore();
  const [name, setName] = useState("New Image World");

  const onCreate = async () => {
    if (!name.trim()) return;
    await createProject(name.trim());
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
      <Panel title="Create New Project">
        <div className="space-y-3">
          <label className="block text-sm text-slate-600">Project Name</label>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="Enter project name"
          />
          <AppButton className="w-full" onClick={onCreate}>
            Create Project
          </AppButton>
        </div>
      </Panel>

      <Panel title="Recent Projects">
        {projects.length === 0 ? (
          <p className="text-sm text-slate-500">No projects yet. Create one to start.</p>
        ) : (
          <div className="space-y-2">
            {projects.map((project) => (
              <div
                key={project.projectId}
                className={`flex items-center justify-between rounded-md border px-3 py-2 ${
                  selectedProject?.projectId === project.projectId ? "border-blue-400 bg-blue-50" : "border-slate-200 bg-white"
                }`}
              >
                <button
                  className="text-left"
                  onClick={async () => {
                    await selectProject(project.projectId);
                    setScreen("workspace");
                  }}
                >
                  <p className="text-sm font-semibold">{project.name}</p>
                  <p className="text-xs text-slate-500">
                    {project.status} • {project.slug}
                  </p>
                </button>
                <button
                  className="rounded px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
                  onClick={() => deleteProject(project.projectId)}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
