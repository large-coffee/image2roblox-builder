import { app, BrowserWindow, dialog } from "electron";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DesktopBackend } from "./backend";
import { registerIpcHandlers } from "./ipc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let backend: DesktopBackend | null = null;

function appendStartupLog(event: string, details?: Record<string, unknown>): void {
  try {
    const logDir = app.getPath("userData");
    const logPath = path.join(logDir, "startup.log");
    const timestamp = new Date().toISOString();
    const payload = details ? ` ${JSON.stringify(details)}` : "";
    fs.mkdirSync(logDir, { recursive: true });
    fs.appendFileSync(logPath, `[${timestamp}] ${event}${payload}\n`, "utf8");
  } catch {
    // Avoid blocking app startup if logging fails.
  }
}

function resolvePreloadPath(): string {
  const appPath = app.getAppPath();
  const candidates = [
    path.join(__dirname, "../preload/index.cjs"),
    path.join(__dirname, "../preload/index.js"),
    path.join(__dirname, "../preload/index.mjs"),
    path.join(appPath, "out/preload/index.cjs"),
    path.join(appPath, "out/preload/index.js"),
    path.join(appPath, "out/preload/index.mjs"),
    path.join(process.resourcesPath, "app.asar", "out/preload/index.cjs"),
    path.join(process.resourcesPath, "app.asar", "out/preload/index.js"),
    path.join(process.resourcesPath, "app.asar", "out/preload/index.mjs"),
    path.join(process.resourcesPath, "app.asar.unpacked", "out/preload/index.cjs"),
    path.join(process.resourcesPath, "app.asar.unpacked", "out/preload/index.js"),
    path.join(process.resourcesPath, "app.asar.unpacked", "out/preload/index.mjs")
  ];

  appendStartupLog("preload:candidates", {
    isPackaged: app.isPackaged,
    appPath,
    dirname: __dirname,
    resourcesPath: process.resourcesPath,
    candidates
  });

  const existing = candidates.find((candidate) => fs.existsSync(candidate));
  if (!existing) {
    console.error("[Image2Roblox] Preload bundle not found.", { candidates });
    appendStartupLog("preload:missing", { selected: candidates[0] });
    return candidates[0];
  }

  appendStartupLog("preload:resolved", { selected: existing });
  return existing;
}

function resolveWorkspaceRoot(): string {
  const envRoot = process.env.IMAGE2ROBLOX_REPO_ROOT;
  if (envRoot && envRoot.trim()) {
    return envRoot;
  }

  if (app.isPackaged) {
    return app.getPath("userData");
  }

  return path.resolve(process.cwd(), "../..");
}

function createWindow(): BrowserWindow {
  const preloadPath = resolvePreloadPath();
  appendStartupLog("window:create", { preloadPath });
  const window = new BrowserWindow({
    width: 1460,
    height: 920,
    minWidth: 1200,
    minHeight: 760,
    autoHideMenuBar: true,
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    }
  });

  window.webContents.on("preload-error", (_event, pathFromEvent, error) => {
    const message = error instanceof Error ? error.stack ?? error.message : String(error);
    appendStartupLog("preload:error", { preloadPath: pathFromEvent, message });
    dialog.showErrorBox("Image2Roblox preload failed", `Preload path: ${pathFromEvent}\n\n${message}`);
  });

  window.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL) => {
    appendStartupLog("window:did-fail-load", { errorCode, errorDescription, validatedURL });
  });

  window.webContents.on("did-finish-load", async () => {
    try {
      const bridgeType = await window.webContents.executeJavaScript("typeof window.image2roblox", true);
      appendStartupLog("bridge:check", { bridgeType });
      if (bridgeType === "undefined") {
        const message = `window.image2roblox is undefined after page load.\n\nPreload path: ${preloadPath}`;
        appendStartupLog("bridge:missing", { preloadPath });
        dialog.showErrorBox(
          "Image2Roblox desktop bridge missing",
          message
        );
      }
    } catch (error) {
      appendStartupLog("bridge:check-error", {
        message: error instanceof Error ? error.stack ?? error.message : String(error)
      });
      console.error("[Image2Roblox] Failed to validate bridge availability.", error);
    }
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    window.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    window.loadFile(path.join(__dirname, "../renderer/index.html"));
  }

  return window;
}

app.whenReady().then(() => {
  try {
    const workspaceRoot = resolveWorkspaceRoot();
    appendStartupLog("app:ready", { workspaceRoot });
    backend = new DesktopBackend(workspaceRoot);
    registerIpcHandlers(backend);
    createWindow();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.stack ?? error.message : String(error);
    appendStartupLog("app:start-failed", { message });
    dialog.showErrorBox("Image2Roblox Builder failed to start", message);
    app.quit();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  backend?.dispose();
  backend = null;
});
