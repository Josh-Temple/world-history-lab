import { readFile, readdir, access } from "node:fs/promises";
import path from "node:path";
const ROOT = process.cwd();
const IMPORT = /(?:import\s+(?:[^"']+\s+from\s+)?|import\s*\()\s*(["'])([^"']+)\1/g;
const JS_REFERENCE = /["\'](\/?(?:apps|pwa)\/[^"\']+\.(?:m?js))["\']/g;
const SCRIPT = /<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi;
const RELATIVE_ENTRY = /<script\b[^>]*\b(?:type=["']module["'][^>]*\s)?src=["'](?:\.\/)?[^/][^"']*["']/i;
const LOADING = /Loading|Preparing|preparing/i;
const exists = async p => access(path.join(ROOT,p)).then(()=>true,()=>false);
const resolve = (from,spec) => spec.startsWith('/') ? spec.slice(1) : path.normalize(path.join(path.dirname(from),spec));
async function crawl(entries) {
  const seen=new Set(), missing=[]; const stack=[...entries];
  while(stack.length){ const file=stack.pop(); if(seen.has(file)) continue; if(!(await exists(file))){missing.push(file);continue;} seen.add(file);
    if(!/\.(?:m?js)$/.test(file)) continue; const text=await readFile(path.join(ROOT,file),'utf8');
    for(const [, ,spec] of text.matchAll(IMPORT)){ if(spec.startsWith('.')||spec.startsWith('/')) stack.push(resolve(file,spec)); }
  }
  return {seen,missing};
}
const dirs=(await readdir(path.join(ROOT,'apps'),{withFileTypes:true})).filter(d=>d.isDirectory()&&d.name!=='shared');
const entries=[], errors=[];
for(const dir of dirs){ const htmlFile=`apps/${dir.name}/index.html`; if(!(await exists(htmlFile))){errors.push(`missing ${htmlFile}`);continue;}
 const html=await readFile(path.join(ROOT,htmlFile),'utf8');
 if(RELATIVE_ENTRY.test(html)) errors.push(`${htmlFile}: relative script entry is unsafe with clean URLs`);
 for(const [,src] of html.matchAll(SCRIPT)){if(!src.startsWith('http')) entries.push(resolve(htmlFile,src));}
 for(const [, ,spec] of html.matchAll(IMPORT)){if(spec.startsWith('/')||spec.startsWith('.')) entries.push(resolve(htmlFile,spec));}
 for(const [,spec] of html.matchAll(JS_REFERENCE)) entries.push(spec.replace(/^\//,''));
 if(LOADING.test(html) && !/app-boot|catch\s*\(|role=["']alert/.test(html)) errors.push(`${htmlFile}: loading placeholder has no boot failure fallback`);
}
const graph=await crawl(entries); errors.push(...graph.missing.map(f=>`missing local script/import ${f}`));
const session=await readFile(path.join(ROOT,'apps/session-runner/index.html'),'utf8');
for(const id of ['restart','next-step']) if(!new RegExp(`<button[^>]*id=["']${id}["'][^>]*disabled`).test(session)) errors.push(`session-runner #${id} must start disabled`);
if(errors.length){errors.forEach(e=>console.error(`[smoke-loading-resilience] ${e}`));throw new Error(`${errors.length} resilience error(s)`);}
console.log(`[smoke-loading-resilience] OK (${dirs.length} app indexes, ${graph.seen.size} local scripts/modules)`);
