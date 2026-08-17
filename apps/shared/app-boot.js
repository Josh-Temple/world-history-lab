const CACHE_PREFIX = "world-history-lab-";
const BAUKASTEN_THEME_HREF = "/styles/baukasten-ui.css";

function ensureBaukastenTheme() {
  document.documentElement.dataset.baukastenUi = "1";
  const existing = document.querySelector('link[data-baukasten-ui="1"]');
  if (existing) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = BAUKASTEN_THEME_HREF;
    link.dataset.baukastenUi = "1";
    link.addEventListener("load", () => resolve(), { once: true });
    link.addEventListener("error", () => reject(new Error(`Failed to load ${BAUKASTEN_THEME_HREF}`)), { once: true });
    document.head.appendChild(link);
  });
}

export async function resetAppCacheAndReload() {
  if ("caches" in window) {
    const names = await caches.keys();
    await Promise.all(names.filter((name) => name.startsWith(CACHE_PREFIX)).map((name) => caches.delete(name)));
  }
  if ("serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  }
  // Deliberately do not touch localStorage: learning history and unit choices survive recovery.
  window.location.reload();
}

function renderBootError({ app, entry, error }) {
  document.documentElement.dataset.appState = "error";
  console.error("[app-boot]", { app, phase: "module-import", entry, error });

  const existing = document.getElementById("app-boot-error");
  if (existing) existing.remove();
  const alert = document.createElement("section");
  alert.id = "app-boot-error";
  alert.setAttribute("role", "alert");
  alert.style.cssText = "margin:1rem;padding:1rem;border:2px solid #b91c1c;border-radius:.75rem;background:#fff7f7;color:#7f1d1d;font:16px system-ui";
  alert.innerHTML = `<strong>The application could not be loaded.</strong><p>Reload the page, or reset the offline app cache. Your learning history will be kept.</p>`;
  const reload = document.createElement("button");
  reload.type = "button";
  reload.textContent = "Reload";
  reload.addEventListener("click", () => window.location.reload());
  const reset = document.createElement("button");
  reset.type = "button";
  reset.textContent = "Reset app cache and reload";
  reset.style.marginLeft = ".5rem";
  reset.addEventListener("click", () => resetAppCacheAndReload().catch((resetError) => {
    console.error("[app-boot]", { app, phase: "cache-reset", error: resetError });
    window.location.reload();
  }));
  alert.append(reload, reset);
  document.body.prepend(alert);
}

export async function bootApp({ app, entry }) {
  document.documentElement.dataset.appState = "loading";
  await ensureBaukastenTheme().catch((error) => {
    console.warn("[app-boot]", { app, phase: "theme-load", href: BAUKASTEN_THEME_HREF, error });
  });
  try {
    await import(entry);
    // An app with asynchronous initialization may keep loading and set ready itself.
    if (document.documentElement.dataset.appState === "loading") {
      document.documentElement.dataset.appState = "ready";
    }
    console.info("[app-boot]", { app, entry, url: window.location.href, state: document.documentElement.dataset.appState });
  } catch (error) {
    renderBootError({ app, entry, error });
  }
}
