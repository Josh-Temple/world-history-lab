import { readFile } from "node:fs/promises";
import path from "node:path";
import { DIFFICULTY, filterByDifficulty } from "../apps/timeline-trainer/src/logic/difficulty-filter.js";
import { filterEligibleEvents } from "../apps/timeline-trainer/src/logic/question-generator.js";

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
  const events = JSON.parse(await read("data/events.json"));
  const comparisonUnit = JSON.parse(await read("data/units/industrialization-pathways-comparison.json"));

  assert(html.includes('entry: "/apps/timeline-trainer/src/main.js"'), "timeline-trainer index must boot the absolute src/main.js entry");
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

  const eventsById = new Map(events.map((event) => [event.id, event]));
  const unitEvents = comparisonUnit.event_ids.map((id) => eventsById.get(id)).filter(Boolean);
  const coreEvents = filterByDifficulty(unitEvents, DIFFICULTY.CORE);
  const eligibleCoreEvents = filterEligibleEvents(
    coreEvents,
    { minStatus: "reviewed" },
    "timeline_before_after"
  );
  assert(
    eligibleCoreEvents.length >= 2,
    "Industrialization Pathways Comparison must generate a default Core Before / After question"
  );

  console.log(`[smoke] timeline-trainer OK (${appIds.size} bound IDs checked; ${eligibleCoreEvents.length} default comparison candidates)`);
}

main().catch((error) => {
  console.error(`[smoke] Failed: ${error.message}`);
  process.exitCode = 1;
});
