import { contextBridge, ipcRenderer } from "electron";
import type { AppSettings, DesktopApi } from "../shared/contracts";

const api: DesktopApi = {
  listProjects: () => ipcRenderer.invoke("project:list"),
  createProject: (name) => ipcRenderer.invoke("project:create", name),
  getProject: (projectId) => ipcRenderer.invoke("project:get", projectId),
  deleteProject: (projectId) => ipcRenderer.invoke("project:delete", projectId),
  pickImageFile: () => ipcRenderer.invoke("dialog:pick-image"),
  pickExecutableFile: () => ipcRenderer.invoke("dialog:pick-executable"),
  uploadImage: (projectId, imagePath) => ipcRenderer.invoke("project:upload-image", projectId, imagePath),
  analyzeImage: (projectId) => ipcRenderer.invoke("generation:analyze-image", projectId),
  generateWorld: (projectId) => ipcRenderer.invoke("generation:generate-world", projectId),
  generateGameplay: (projectId) => ipcRenderer.invoke("generation:generate-gameplay", projectId),
  buildRobloxProject: (projectId) => ipcRenderer.invoke("generation:build-roblox-project", projectId),
  validateOutput: (projectId) => ipcRenderer.invoke("generation:validate-output", projectId),
  regenerateWorldOnly: (projectId) => ipcRenderer.invoke("generation:regenerate-world", projectId),
  regenerateGameplayOnly: (projectId) => ipcRenderer.invoke("generation:regenerate-gameplay", projectId),
  openOutputFolder: (projectId) => ipcRenderer.invoke("project:open-output-folder", projectId),
  revealArtifact: (projectId, relativePath) => ipcRenderer.invoke("project:reveal-artifact", projectId, relativePath),
  getSettings: () => ipcRenderer.invoke("settings:get"),
  updateSettings: (settings: AppSettings) => ipcRenderer.invoke("settings:update", settings),
  validateExecutables: (settings) => ipcRenderer.invoke("settings:validate", settings ?? {})
};

contextBridge.exposeInMainWorld("image2roblox", api);
