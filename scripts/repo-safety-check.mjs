#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const requiredFiles = ["README.md", ".env.example", ".gitignore"];
const checks = [];

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function hasIgnoreLine(content, target) {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .includes(target);
}

for (const file of requiredFiles) {
  const exists = fs.existsSync(path.join(root, file));
  checks.push({
    name: `${file} exists`,
    ok: exists,
    message: exists ? "OK" : `Missing ${file}`
  });
}

const gitignore = fs.existsSync(path.join(root, ".gitignore")) ? read(".gitignore") : "";

const ignoreExpectations = [
  "node_modules/",
  ".env",
  "projects/**/source-image/",
  "projects/**/logs/",
  "projects/**/exports/"
];

for (const pattern of ignoreExpectations) {
  const ok = hasIgnoreLine(gitignore, pattern);
  checks.push({
    name: `.gitignore contains ${pattern}`,
    ok,
    message: ok ? "OK" : `Missing ignore pattern: ${pattern}`
  });
}

const envIgnored = hasIgnoreLine(gitignore, ".env");
checks.push({
  name: ".env is ignored",
  ok: envIgnored,
  message: envIgnored ? "OK" : "Expected .env to be ignored"
});

const trackedConfigPaths = [
  "package.json",
  "apps/desktop/package.json",
  "apps/desktop/src/main/index.ts"
].filter((p) => fs.existsSync(path.join(root, p)));

let hasAbsoluteWindowsPath = false;
for (const configPath of trackedConfigPaths) {
  const content = read(configPath);
  if (/[A-Za-z]:\\[^\s"']+/.test(content)) {
    hasAbsoluteWindowsPath = true;
  }
}
checks.push({
  name: "Tracked config avoids absolute Windows paths",
  ok: !hasAbsoluteWindowsPath,
  message: hasAbsoluteWindowsPath ? "Detected absolute Windows path in tracked config" : "OK"
});

const textExtensions = new Set([".ts", ".tsx", ".js", ".mjs", ".json", ".md", ".yaml", ".yml"]);
const suspectPatterns = [/OPENAI_API_KEY\s*=\s*sk-[A-Za-z0-9_-]{10,}/, /ghp_[A-Za-z0-9]{20,}/, /AIza[0-9A-Za-z_-]{35}/];
let foundSecretHit = null;

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === ".git" || entry.name === "node_modules" || entry.name === "dist" || entry.name === "out") {
      continue;
    }

    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(absolute);
      if (foundSecretHit) return;
      continue;
    }

    const ext = path.extname(entry.name).toLowerCase();
    if (!textExtensions.has(ext)) continue;

    const content = fs.readFileSync(absolute, "utf8");
    for (const pattern of suspectPatterns) {
      if (pattern.test(content)) {
        foundSecretHit = absolute;
        return;
      }
    }
  }
}

walk(root);
checks.push({
  name: "No obvious hardcoded secrets detected",
  ok: !foundSecretHit,
  message: foundSecretHit ? `Potential secret pattern found in ${foundSecretHit}` : "OK"
});

let failed = 0;
for (const check of checks) {
  const status = check.ok ? "PASS" : "FAIL";
  if (!check.ok) failed += 1;
  console.log(`[${status}] ${check.name} - ${check.message}`);
}

if (failed > 0) {
  console.error(`\nRepository safety check failed: ${failed} check(s) failed.`);
  process.exit(1);
}

console.log("\nRepository safety check passed.");
