import { BrowserWindow, dialog, ipcMain, shell } from "electron";
import path from "node:path";
import type { AppSettings } from "../shared/contracts";
import { DesktopBackend } from "./backend";

export function registerIpcHandlers(backend: DesktopBackend): void {
  ipcMain.handle("project:list", async () => backend.listProjects());
  ipcMain.handle("project:create", async (_event, name: string) => backend.createProject(name));
  ipcMain.handle("project:get", async (_event, projectId: string) => backend.getProject(projectId));
  ipcMain.handle("project:delete", async (_event, projectId: string) => backend.deleteProject(projectId));

  ipcMain.handle("dialog:pick-image", async () => {
    const parent = BrowserWindow.getFocusedWindow();
    const result = parent
      ? await dialog.showOpenDialog(parent, {
          title: "Select Source Image",
          properties: ["openFile"],
          filters: [
            { name: "Images", extensions: ["png", "jpg", "jpeg", "webp", "bmp"] },
            { name: "All Files", extensions: ["*"] }
          ]
        })
      : await dialog.showOpenDialog({
          title: "Select Source Image",
          properties: ["openFile"],
          filters: [
            { name: "Images", extensions: ["png", "jpg", "jpeg", "webp", "bmp"] },
            { name: "All Files", extensions: ["*"] }
          ]
        });

    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  ipcMain.handle("dialog:pick-executable", async () => {
    const parent = BrowserWindow.getFocusedWindow();
    const result = parent
      ? await dialog.showOpenDialog(parent, {
          title: "Select Executable",
          properties: ["openFile"],
          filters: [
            { name: "Executable", extensions: ["exe", "cmd", "bat"] },
            { name: "All Files", extensions: ["*"] }
          ]
        })
      : await dialog.showOpenDialog({
          title: "Select Executable",
          properties: ["openFile"],
          filters: [
            { name: "Executable", extensions: ["exe", "cmd", "bat"] },
            { name: "All Files", extensions: ["*"] }
          ]
        });

    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  ipcMain.handle("project:upload-image", async (_event, projectId: string, imagePath: string) =>
    backend.uploadImage(projectId, imagePath)
  );

  ipcMain.handle("generation:analyze-image", async (_event, projectId: string) => backend.analyzeImage(projectId));
  ipcMain.handle("generation:generate-world", async (_event, projectId: string) => backend.generateWorld(projectId));
  ipcMain.handle("generation:generate-gameplay", async (_event, projectId: string) => backend.generateGameplay(projectId));
  ipcMain.handle("generation:build-roblox-project", async (_event, projectId: string) =>
    backend.buildRobloxProject(projectId)
  );
  ipcMain.handle("generation:validate-output", async (_event, projectId: string) => backend.validateOutput(projectId));
  ipcMain.handle("generation:regenerate-world", async (_event, projectId: string) => backend.regenerateWorldOnly(projectId));
  ipcMain.handle("generation:regenerate-gameplay", async (_event, projectId: string) =>
    backend.regenerateGameplayOnly(projectId)
  );

  ipcMain.handle("project:open-output-folder", async (_event, projectId: string) => {
    const root = backend.getProjectRoot(projectId);
    await shell.openPath(root);
  });

  ipcMain.handle("project:reveal-artifact", async (_event, projectId: string, relativePath: string) => {
    const root = backend.getProjectRoot(projectId);
    shell.showItemInFolder(path.join(root, relativePath));
  });

  ipcMain.handle("settings:get", async () => backend.getSettings());
  ipcMain.handle("settings:update", async (_event, settings: AppSettings) => backend.updateSettings(settings));
  ipcMain.handle("settings:validate", async (_event, settingsPatch: Partial<AppSettings>) =>
    backend.validateExecutables(settingsPatch)
  );
}
