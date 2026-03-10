import { readFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();

async function read(relativePath) {
  return readFile(path.join(ROOT, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function collectIds(html) {
  const ids = new Set();
  const regex = /\bid="([^"]+)"/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    ids.add(match[1]);
  }
  return ids;
}

function collectGetElementIds(js) {
  const ids = new Set();
  const regex = /getElementById\("([^"]+)"\)/g;
  let match;
  while ((match = regex.exec(js)) !== null) {
    ids.add(match[1]);
  }
  return ids;
}

async function main() {
  const html = await read("apps/timeline-trainer/index.html");
  const appJs = await read("apps/timeline-trainer/src/App.js");
  const mainJs = await read("apps/timeline-trainer/src/main.js");

  assert(html.includes('src="/apps/timeline-trainer/src/main.js"'), "timeline-trainer index must load src/main.js");
  assert(html.includes('href="/apps/timeline-trainer/src/styles.css"'), "timeline-trainer index must load styles.css");

  assert(mainJs.includes('import { startApp } from "./App.js";'), "main.js must import startApp from App.js");
  assert(mainJs.includes("startApp();"), "main.js must call startApp()");

  const htmlIds = collectIds(html);
  const appIds = collectGetElementIds(appJs);
  for (const id of appIds) {
    assert(htmlIds.has(id), `App.js references missing DOM id: ${id}`);
  }

  const requiredUiIds = [
    "practice-mode-select",
    "unit-select",
    "quality-select",
    "mode-select",
    "availability-hint",
    "mode-help",
    "question-text",
    "result-text",
    "next-button",
    "error-panel",
  ];

  for (const id of requiredUiIds) {
    assert(htmlIds.has(id), `timeline-trainer UI missing expected id: ${id}`);
  }

  console.log(`[smoke] timeline-trainer OK (${appIds.size} bound IDs checked)`);
}

main().catch((error) => {
  console.error(`[smoke] Failed: ${error.message}`);
  process.exitCode = 1;
});
