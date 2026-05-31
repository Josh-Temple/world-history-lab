import { readFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const APP_LINK_PATTERN = /href=["'](\/apps\/[^"'#?]+\/?)(?:[?#][^"']*)?["']/g;
const SCRIPT_SRC_PATTERN = /<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi;
const INLINE_SCRIPT_PATTERN = /<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
const IMPORT_PATTERN = /(?:import\s+(?:[^"']+\s+from\s+)?|import\s*\()(["'])([^"']+)\1/g;
const FETCH_PATTERN = /\bfetch\s*\(/g;
const LOADING_PATTERN = /Loading(?:\.{3}|…|\s|<|$)/i;
const ERROR_STATE_PATTERN = /(Unable to load|Failed to load|Loading failed|Data error|error\.message|catch\s*\()/i;

function normalizeAppPath(href) {
  const normalized = href.replace(/^\//, "").replace(/\/$/, "");
  return `${normalized}/index.html`;
}

async function readText(relativePath) {
  return readFile(path.join(ROOT, relativePath), "utf8");
}

function toRelativeFromImport(fromFile, specifier) {
  if (!specifier.endsWith(".js")) return null;
  if (specifier.startsWith("/")) return specifier.replace(/^\//, "");
  if (specifier.startsWith(".")) {
    return path.normalize(path.join(path.dirname(fromFile), specifier));
  }
  return null;
}

async function fileExists(relativePath) {
  try {
    await readFile(path.join(ROOT, relativePath));
    return true;
  } catch {
    return false;
  }
}

function collectScriptSources(html, htmlFile) {
  const sources = [];
  for (const match of html.matchAll(SCRIPT_SRC_PATTERN)) {
    const src = match[1];
    if (src.startsWith("http://") || src.startsWith("https://")) continue;
    if (src.startsWith("/")) {
      sources.push(src.replace(/^\//, ""));
    } else {
      sources.push(path.normalize(path.join(path.dirname(htmlFile), src)));
    }
  }
  return sources;
}

function collectInlineScripts(html) {
  return Array.from(html.matchAll(INLINE_SCRIPT_PATTERN), (match) => match[1]);
}

async function crawlModules(entryFiles) {
  const visited = new Set();
  const stack = [...entryFiles];

  while (stack.length > 0) {
    const relativePath = path.normalize(stack.pop());
    if (visited.has(relativePath) || !relativePath.endsWith(".js")) continue;
    if (!(await fileExists(relativePath))) continue;
    visited.add(relativePath);

    const source = await readText(relativePath);
    for (const match of source.matchAll(IMPORT_PATTERN)) {
      const imported = toRelativeFromImport(relativePath, match[2]);
      if (imported) stack.push(imported);
    }
  }

  return [...visited].sort();
}

function findUnsafeFetches(relativePath, source) {
  const unsafe = [];
  for (const match of source.matchAll(FETCH_PATTERN)) {
    const start = match.index ?? 0;
    const snippet = source.slice(start, start + 220);
    const line = source.slice(0, start).split("\n").length;
    const surrounding = source.slice(Math.max(0, start - 320), start + 420);
    const hasSignal = /\bsignal\s*:/.test(snippet);
    const hasAbortContext = /AbortController|controller\.abort|timeout/i.test(surrounding);
    if (!hasSignal && !hasAbortContext) {
      unsafe.push(`${relativePath}:${line}`);
    }
  }
  return unsafe;
}

async function main() {
  const rootHtml = await readText("index.html");
  const appHtmlFiles = [...new Set(Array.from(rootHtml.matchAll(APP_LINK_PATTERN), (match) => normalizeAppPath(match[1])))]
    .sort();

  if (appHtmlFiles.length === 0) {
    throw new Error("No /apps/ links found in index.html.");
  }

  const missing = [];
  const loadingWithoutFailureState = [];
  const allAppScriptEntries = new Set();
  const inlineScriptChecks = [];

  for (const appHtmlFile of appHtmlFiles) {
    if (!(await fileExists(appHtmlFile))) {
      missing.push(appHtmlFile);
      continue;
    }

    const html = await readText(appHtmlFile);
    const scriptSources = collectScriptSources(html, appHtmlFile);
    for (const source of scriptSources) allAppScriptEntries.add(path.normalize(source));

    const inlineScripts = collectInlineScripts(html);
    const hasLoadingPlaceholder = LOADING_PATTERN.test(html);
    const inlineHasFailureState = inlineScripts.some((script) => ERROR_STATE_PATTERN.test(script));
    inlineScriptChecks.push({ appHtmlFile, hasLoadingPlaceholder, inlineHasFailureState, scriptSources });
  }

  const crawledScripts = await crawlModules([...allAppScriptEntries]);
  const scriptSourcesByPath = new Map();
  for (const scriptPath of crawledScripts) {
    scriptSourcesByPath.set(scriptPath, await readText(scriptPath));
  }

  for (const check of inlineScriptChecks) {
    if (!check.hasLoadingPlaceholder) continue;
    const linkedSourceHasFailureState = check.scriptSources.some((source) => {
      const normalized = path.normalize(source);
      return ERROR_STATE_PATTERN.test(scriptSourcesByPath.get(normalized) || "");
    });
    if (!check.inlineHasFailureState && !linkedSourceHasFailureState) {
      loadingWithoutFailureState.push(check.appHtmlFile);
    }
  }

  const directFetchFiles = [
    ...crawledScripts,
    ...appHtmlFiles,
    "apps/shared/data-access.js",
    "apps/shared/data-store.js",
  ];
  const uniqueDirectFetchFiles = [...new Set(directFetchFiles)].sort();
  const unsafeFetches = [];
  for (const relativePath of uniqueDirectFetchFiles) {
    if (!(await fileExists(relativePath))) continue;
    const source = scriptSourcesByPath.get(relativePath) || await readText(relativePath);
    unsafeFetches.push(...findUnsafeFetches(relativePath, source));
  }

  if (missing.length > 0 || loadingWithoutFailureState.length > 0 || unsafeFetches.length > 0) {
    for (const file of missing) console.error(`[smoke-loading-resilience] Missing linked app: ${file}`);
    for (const file of loadingWithoutFailureState) console.error(`[smoke-loading-resilience] Loading placeholder lacks a detectable failure state: ${file}`);
    for (const location of unsafeFetches) console.error(`[smoke-loading-resilience] Fetch lacks detectable timeout/AbortController guard: ${location}`);
    throw new Error("Loading resilience smoke checks failed.");
  }

  console.log(`[smoke-loading-resilience] OK (${appHtmlFiles.length} linked apps, ${crawledScripts.length} JavaScript modules checked)`);
}

main().catch((error) => {
  console.error(`[smoke-loading-resilience] Failed: ${error.message}`);
  process.exitCode = 1;
});
