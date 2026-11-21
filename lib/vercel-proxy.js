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
const MAX_BODY = Number(process.env.AIDC_MAX_BODY_BYTES) || 1024 * 1024;
export async function proxyRequest(req, res, { auth = false } = {}) {
  /* Vercel parses the body before this runs (platform cap ~4.5 MB); refuse anything over our own ceiling. */
  const declared = Number(req.headers?.["content-length"]);
  if (Number.isFinite(declared) && declared > MAX_BODY) return res.status(413).json({ error: "Request body too large.", code: "AIDC_BODY_TOO_LARGE" });
  let base;
  try { base = backendOrigin(); }
  catch (error) { return res.status(503).json({ error: error.message, code: "AIDC_BACKEND_NOT_CONFIGURED" }); }
  try {
    const incoming = new URL(req.url || "/", "https://console.ace-base.cc");
    const pathname = auth ? incoming.pathname.replace(/^\/api\/auth(?=\/|$)/, "/auth") : incoming.pathname;
    const target = new URL(pathname + incoming.search, base);
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers || {})) {
      if (value == null || EXCLUDED_REQUEST_HEADERS.has(key.toLowerCase())) continue;
      headers.set(key, Array.isArray(value) ? value.join(", ") : String(value));
    }
    headers.set("x-forwarded-host", String(req.headers.host || "console.ace-base.cc"));
    headers.set("x-forwarded-proto", "https");
    headers.set("x-forwarded-for", String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || ""));
    const upstream = await fetch(target, { method: req.method || "GET", headers, body: serializeBody(req), redirect: "manual" });
    res.status(upstream.status);
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
