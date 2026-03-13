import { app, BrowserWindow } from "electron";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DesktopBackend } from "./backend";
import { registerIpcHandlers } from "./ipc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let backend: DesktopBackend | null = null;

function resolvePreloadPath(): string {
  const candidates = [
    path.join(__dirname, "../preload/index.mjs"),
    path.join(__dirname, "../preload/index.js")
  ];

  const existing = candidates.find((candidate) => fs.existsSync(candidate));
  if (!existing) {
    console.error("[Image2Roblox] Preload bundle not found.", { candidates });
    return candidates[0];
  }

  return existing;
}

function createWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1460,
    height: 920,
    minWidth: 1200,
    minHeight: 760,
    autoHideMenuBar: true,
    webPreferences: {
      preload: resolvePreloadPath(),
      nodeIntegration: false,
      contextIsolation: true
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
  const repoRoot = process.env.IMAGE2ROBLOX_REPO_ROOT ?? path.resolve(process.cwd(), "../..");
  backend = new DesktopBackend(repoRoot);
  registerIpcHandlers(backend);
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
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
