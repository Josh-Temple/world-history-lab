const THEME_HREF = "/styles/baukasten-ui.css";
const LEARNING_THEME_HREF = "/styles/baukasten-learning.css";

function markPageContext() {
  document.documentElement.dataset.baukastenUi = "1";

  if (window.location.pathname.startsWith("/apps/")) {
    document.documentElement.dataset.baukastenContext = "learning";
    if (document.body) {
      document.body.classList.add("learning-page");
    } else {
      document.addEventListener("DOMContentLoaded", () => {
        document.body?.classList.add("learning-page");
      }, { once: true });
    }
  }
}

function ensureStylesheet(href, key) {
  const existing = document.querySelector(`link[data-baukasten-style="${key}"]`);
  if (existing) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.dataset.baukastenStyle = key;
    link.addEventListener("load", () => resolve(), { once: true });
    link.addEventListener("error", () => reject(new Error(`Failed to load ${href}`)), { once: true });
    document.head.appendChild(link);
  });
}

export function ensureBaukastenTheme() {
  markPageContext();
  const styles = [ensureStylesheet(THEME_HREF, "base")];
  if (window.location.pathname.startsWith("/apps/")) {
    styles.push(ensureStylesheet(LEARNING_THEME_HREF, "learning"));
  }
  return Promise.all(styles).then(() => undefined);
}

export { THEME_HREF, LEARNING_THEME_HREF };
