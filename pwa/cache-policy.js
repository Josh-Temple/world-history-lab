(function exposeCachePolicy(scope) {
  const MIME = {
    script: /^(application|text)\/(javascript|ecmascript)(?:;|$)/i,
    json: /^(application\/([\w.+-]+\+)?json|text\/json)(?:;|$)/i,
    style: /^text\/css(?:;|$)/i,
    document: /^text\/html(?:;|$)/i,
  };

  function resourceKind(request) {
    const url = new URL(typeof request === "string" ? request : request.url, "https://local.invalid");
    if (/\.(m?js)$/i.test(url.pathname) || request?.destination === "script") return "script";
    if (/\.json$/i.test(url.pathname)) return "json";
    if (/\.css$/i.test(url.pathname)) return "style";
    if (/\.html?$/i.test(url.pathname) || request?.mode === "navigate") return "document";
    return "asset";
  }

  function isCacheableResponse(request, response) {
    if (!response || !response.ok || response.status < 200 || response.status >= 300 || response.redirected) return false;
    const kind = resourceKind(request);
    if (kind === "asset") return true;
    return MIME[kind].test(response.headers.get("content-type") || "");
  }

  scope.WHLCachePolicy = Object.freeze({ resourceKind, isCacheableResponse });
})(typeof self === "object" ? self : globalThis);
