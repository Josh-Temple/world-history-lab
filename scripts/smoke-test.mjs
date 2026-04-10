import { readFile } from "node:fs/promises";

async function readJson(path) {
  const raw = await readFile(path, "utf8");
  return JSON.parse(raw);
}

async function main() {
  const events = await readJson("data/events.json");
  const chains = await readJson("data/derived/causal_chains.json");

  const checks = [];
  const fail = (message) => {
    throw new Error(message);
  };

  if (!Array.isArray(events) || events.length === 0) {
    fail("No events found in data/events.json");
  }
  checks.push(`[smoke] events loaded: ${events.length}`);

  if (!Array.isArray(chains) || chains.length === 0) {
    fail("No causal chains found in data/derived/causal_chains.json");
  }
  checks.push(`[smoke] causal chains loaded: ${chains.length}`);

  const eventIdSet = new Set(events.map((event) => event.id));
  if (eventIdSet.has(undefined) || eventIdSet.has(null) || eventIdSet.has("")) {
    fail("Events include undefined/empty ids");
  }

  const randomEvent = events[Math.floor(Math.random() * events.length)];
  if (!randomEvent || typeof randomEvent.id !== "string" || typeof randomEvent.label !== "string") {
    fail("Random event selection returned invalid shape");
  }
  checks.push(`[smoke] random event check passed: ${randomEvent.id}`);

  const randomChain = chains[Math.floor(Math.random() * chains.length)];
  if (!Array.isArray(randomChain) || randomChain.length === 0) {
    fail("Random chain selection returned invalid shape");
  }

  for (const eventId of randomChain) {
    if (!eventIdSet.has(eventId)) {
      fail(`Invalid chain reference: ${eventId}`);
    }
  }
  checks.push(`[smoke] random chain check passed: ${randomChain.join(" -> ")}`);

  for (const chain of chains) {
    if (!Array.isArray(chain) || chain.length === 0) {
      fail("Found empty/invalid chain in data/derived/causal_chains.json");
    }
    for (const eventId of chain) {
      if (!eventIdSet.has(eventId)) {
        fail(`Invalid chain reference found in dataset: ${eventId}`);
      }
    }
  }
  checks.push("[smoke] full chain-reference scan passed");

  for (const line of checks) {
    console.log(line);
  }
  console.log("Smoke test passed");
}

main().catch((error) => {
  console.error(`[smoke] Failed: ${error.message}`);
  process.exitCode = 1;
});
