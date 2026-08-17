import { ensureBaukastenTheme, THEME_HREF } from "/apps/shared/baukasten-theme.js";

ensureBaukastenTheme().catch((error) => {
  console.warn("[theme] Baukasten UI stylesheet failed to load", { href: THEME_HREF, error });
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      await navigator.serviceWorker.register('/service-worker.js', { scope: '/' });
    } catch (error) {
      console.warn('[PWA] service worker registration failed', error);
    }
  });
}
