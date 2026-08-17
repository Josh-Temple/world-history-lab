const THEME_HREF = "/styles/baukasten-ui.css";

export function ensureBaukastenTheme() {
  document.documentElement.dataset.baukastenUi = "1";
  const existing = document.querySelector('link[data-baukasten-ui="1"]');
  if (existing) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = THEME_HREF;
    link.dataset.baukastenUi = "1";
    link.addEventListener("load", () => resolve(), { once: true });
    link.addEventListener("error", () => reject(new Error(`Failed to load ${THEME_HREF}`)), { once: true });
    document.head.appendChild(link);
  });
}

export { THEME_HREF };
