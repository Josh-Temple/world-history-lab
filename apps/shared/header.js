const HEADER_STYLE_ID = "whl-shared-header-style";

function ensureHeaderStyles() {
  if (document.getElementById(HEADER_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = HEADER_STYLE_ID;
  style.textContent = `
    .whl-shared-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      font-size: 14px;
      opacity: 0.78;
      margin: 0 0 8px;
      padding: 0.2rem 0;
      line-height: 1.3;
      flex-wrap: wrap;
    }
    .whl-shared-header__unit {
      font-weight: 600;
    }
    .whl-shared-header__mode,
    .whl-shared-header__progress {
      color: #475569;
    }
    @media (max-width: 640px) {
      .whl-shared-header {
        font-size: 13px;
      }
    }
  `;
  document.head.appendChild(style);
}

export function renderHeader({ unit = "All units", mode = "Practice", progress = "0/0" } = {}) {
  ensureHeaderStyles();

  const el = document.createElement("div");
  el.className = "whl-shared-header";

  const unitEl = document.createElement("span");
  unitEl.className = "whl-shared-header__unit";

  const modeEl = document.createElement("span");
  modeEl.className = "whl-shared-header__mode";

  const progressEl = document.createElement("span");
  progressEl.className = "whl-shared-header__progress";

  el.append(unitEl, modeEl, progressEl);

  const api = {
    element: el,
    update(next = {}) {
      if (next.unit) unitEl.textContent = next.unit;
      if (next.mode) modeEl.textContent = next.mode;
      if (next.progress) progressEl.textContent = next.progress;
    },
  };

  api.update({ unit, mode, progress });
  return api;
}

export function mountHeader(options = {}) {
  const { container = document.body, prepend = true } = options;
  const header = renderHeader(options);

  if (container instanceof HTMLElement && container !== document.body) {
    if (prepend) container.prepend(header.element);
    else container.append(header.element);
  } else {
    document.body.prepend(header.element);
  }

  return header;
}
