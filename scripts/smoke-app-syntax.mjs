import { readdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";

const ROOT = process.cwd();
const TARGET_DIRS = ["apps"];
const TARGET_FILES = ["service-worker.js", "pwa/register-sw.js"];

async function collectJsFiles(dir) {
  const absoluteDir = path.join(ROOT, dir);
  const entries = await readdir(absoluteDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const relativePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectJsFiles(relativePath));
    } else if (entry.isFile() && entry.name.endsWith(".js")) {
      files.push(relativePath);
    }
  }

  return files;
}

function checkSyntax(file) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ["--check", file], {
      cwd: ROOT,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stderr = "";
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("close", (code) => {
      resolve({ file, ok: code === 0, stderr });
    });
  });
}

async function main() {
  const files = [
    ...(await Promise.all(TARGET_DIRS.map(collectJsFiles))).flat(),
    ...TARGET_FILES,
  ].sort();

  const results = await Promise.all(files.map(checkSyntax));
  const failures = results.filter((result) => !result.ok);

  if (failures.length > 0) {
    for (const failure of failures) {
      console.error(`[smoke-app-syntax] ${failure.file}\n${failure.stderr.trim()}`);
    }
    throw new Error(`${failures.length} app JavaScript file(s) failed syntax checks.`);
  }

  console.log(`[smoke-app-syntax] OK (${files.length} JavaScript files checked)`);
}

main().catch((error) => {
  console.error(`[smoke-app-syntax] Failed: ${error.message}`);
  process.exitCode = 1;
});
