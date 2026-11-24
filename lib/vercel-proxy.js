const EXCLUDED_REQUEST_HEADERS = new Set([
  "connection", "content-length", "host", "keep-alive", "proxy-authenticate",
  "proxy-authorization", "te", "trailer", "transfer-encoding", "upgrade",
  "accept-encoding"
]);
function backendOrigin() {
  const value = String(process.env.AIDC_BACKEND_URL || "").trim();
  if (!value) throw new Error("AIDC_BACKEND_URL is not configured in Vercel.");
  const url = new URL(value);
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || url.pathname !== "/" || url.search || url.hash) throw new Error("AIDC_BACKEND_URL must be a bare backend origin.");
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:") throw new Error("AIDC_BACKEND_URL must use HTTPS in production.");
  return url.origin;
}
function serializeBody(req) {
  if (["GET", "HEAD"].includes(String(req.method || "GET").toUpperCase())) return undefined;
  if (req.body === undefined || req.body === null || req.body === "") return undefined;
  if (typeof req.body === "string" || Buffer.isBuffer(req.body)) return req.body;
  if (String(req.headers["content-type"] || "").toLowerCase().includes("application/x-www-form-urlencoded")) return new URLSearchParams(req.body).toString();
  return JSON.stringify(req.body);
}
export async function proxyRequest(req, res, { auth = false } = {}) {
  let base;
  try { base = backendOrigin(); }
  catch (error) { return res.status(503).json({ error: error.message, code: "AIDC_BACKEND_NOT_CONFIGURED" }); }
  try {
    const incoming = new URL(req.url || "/", "https://console.ace-base.cc");
    // `//host` and backslashes would be parsed as a different authority; refuse them rather
    // than forwarding session cookies to whatever host the path names.
    if (!incoming.pathname.startsWith("/") || incoming.pathname.startsWith("//") || incoming.pathname.includes("\\")) {
      return res.status(400).json({ error: "Invalid request path.", code: "INVALID_PATH" });
    }
    const pathname = auth ? incoming.pathname.replace(/^\/api\/auth(?=\/|$)/, "/auth") : incoming.pathname;
    const target = new URL(pathname + incoming.search, base);
    if (target.origin !== base) {
      return res.status(400).json({ error: "Invalid request path.", code: "INVALID_PATH" });
    }
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers || {})) {
      if (value == null || EXCLUDED_REQUEST_HEADERS.has(key.toLowerCase())) continue;
      headers.set(key, Array.isArray(value) ? value.join(", ") : String(value));
    }
    headers.set("x-forwarded-host", String(req.headers.host || "console.ace-base.cc"));
    headers.set("x-forwarded-proto", "https");
    headers.set("x-forwarded-for", [req.headers["x-forwarded-for"], req.socket?.remoteAddress].filter(Boolean).join(", "));
    const upstream = await fetch(target, {
      method: req.method || "GET",
      headers,
      body: serializeBody(req),
      redirect: "manual",
      signal: AbortSignal.timeout(20_000)
    });
    res.status(upstream.status);
    res.setHeader("cache-control", "no-store");
    for (const [key, value] of upstream.headers) {
      if (["connection", "content-length", "content-encoding", "keep-alive", "transfer-encoding", "set-cookie"].includes(key.toLowerCase())) continue;
      res.setHeader(key, value);
    }
    const cookies = typeof upstream.headers.getSetCookie === "function" ? upstream.headers.getSetCookie() : [];
    if (cookies.length) res.setHeader("set-cookie", cookies);
    return res.send(Buffer.from(await upstream.arrayBuffer()));
  } catch (error) {
    console.error("AIDC backend proxy failed", error instanceof Error ? error.message : "unknown error");
    return res.status(502).json({ error: "AIDC backend is unreachable.", code: "AIDC_BACKEND_UNAVAILABLE" });
  }
}
