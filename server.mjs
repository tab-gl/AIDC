import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname, normalize, relative, isAbsolute, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "dist");
const port = Number(process.env.PORT || 3000);
const MAX_PROXY_BODY_BYTES = 1024 * 1024;
const PROXY_TIMEOUT_MS = 20_000;
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".woff": "font/woff", ".txt": "text/plain; charset=utf-8", ".ico": "image/x-icon", ".webmanifest": "application/manifest+json" };
const HOP = new Set(["connection", "content-length", "host", "keep-alive", "transfer-encoding", "upgrade", "te", "trailer", "proxy-authorization", "proxy-authenticate", "accept-encoding"]);

// The console loads only its own bundle and fonts. Inline styles are unavoidable (Astryx and
// Material web components inject them), but scripts, frames and form targets stay locked down.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https:",
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  "worker-src 'self' blob:",
  "manifest-src 'self'"
].join("; ");

const SECURITY_HEADERS = {
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "x-frame-options": "DENY",
  "cross-origin-opener-policy": "same-origin",
  "permissions-policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  "content-security-policy": CSP
};

function securityHeaders(req) {
  const headers = { ...SECURITY_HEADERS };
  const proto = String(req.headers["x-forwarded-proto"] || "").split(",")[0]?.trim();
  if (proto === "https") headers["strict-transport-security"] = "max-age=31536000; includeSubDomains";
  return headers;
}

/**
 * Maps a URL path to a file inside the built bundle.
 *
 * `startsWith(root)` is not a containment check: `/srv/app/dist-evil` starts with
 * `/srv/app/dist`. Comparing the relative path rejects `..` segments and absolute paths,
 * including the ones produced by encoded traversal sequences.
 */
export function resolveStaticPath(rootDir, pathname) {
  if (typeof pathname !== "string" || pathname.includes("\0")) return null;
  const resolved = normalize(join(rootDir, pathname));
  const inside = relative(rootDir, resolved);
  if (inside === "") return resolved;
  if (inside.startsWith("..") || isAbsolute(inside)) return null;
  return resolved;
}

function backend() {
  const raw = String(process.env.AIDC_BACKEND_URL || "").trim();
  if (!raw) throw new Error("AIDC_BACKEND_URL is not configured.");
  const u = new URL(raw);
  if (!["https:", "http:"].includes(u.protocol)) throw new Error("AIDC_BACKEND_URL must be an HTTP(S) origin.");
  if (u.pathname !== "/" || u.search || u.hash || u.username || u.password) throw new Error("AIDC_BACKEND_URL must be a bare origin.");
  return u.origin;
}

function rejectLargeBody(req, res) {
  res.writeHead(413, { "content-type": "application/json", connection: "close", ...securityHeaders(req) });
  res.end(JSON.stringify({ error: "Request body exceeds the 1 MiB limit.", code: "REQUEST_BODY_TOO_LARGE" }));
  req.resume();
}

async function readProxyBody(req, res) {
  const declaredLength = Number(req.headers["content-length"]);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_PROXY_BODY_BYTES) {
    rejectLargeBody(req, res);
    return null;
  }

  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    if (size + chunk.length > MAX_PROXY_BODY_BYTES) {
      rejectLargeBody(req, res);
      chunks.length = 0;
      return null;
    }
    size += chunk.length;
    chunks.push(chunk);
  }
  return chunks.length ? Buffer.concat(chunks, size) : undefined;
}

async function proxy(req, res) {
  let base;
  try { base = backend(); } catch (e) {
    const headers = { "content-type": "application/json", "cache-control": "no-store", ...securityHeaders(req) };
    delete headers["content-security-policy"];
    res.writeHead(503, headers);
    return res.end(JSON.stringify({ error: e.message, code: "AIDC_BACKEND_NOT_CONFIGURED" }));
  }
  try {
    const incoming = new URL(req.url, "http://x");
    // Collapse extra leading slashes: `//host` would otherwise be read as a scheme-relative
    // URL and send the request (with cookies) to a different origin.
    if (!incoming.pathname.startsWith("/") || incoming.pathname.startsWith("//") || incoming.pathname.includes("\\")) {
      res.writeHead(400, { "content-type": "application/json", ...securityHeaders(req) });
      return res.end(JSON.stringify({ error: "Invalid request path.", code: "INVALID_PATH" }));
    }
    const path = incoming.pathname.replace(/^\/api\/auth(?=\/|$)/, "/auth");
    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers)) if (v != null && !HOP.has(k)) headers.set(k, Array.isArray(v) ? v.join(", ") : v);
    headers.set("x-forwarded-host", req.headers.host || "");
    headers.set("x-forwarded-proto", req.headers["x-forwarded-proto"] || "https");
    headers.set("x-forwarded-for", [req.headers["x-forwarded-for"], req.socket.remoteAddress].filter(Boolean).join(", "));
    const body = ["GET", "HEAD"].includes(req.method) ? undefined : await readProxyBody(req, res);
    if (body === null) return;
    const up = await fetch(new URL(path + incoming.search, base), {
      method: req.method,
      headers,
      body,
      redirect: "manual",
      signal: AbortSignal.timeout(PROXY_TIMEOUT_MS)
    });
    const out = { ...securityHeaders(req), "cache-control": "no-store" };
    delete out["content-security-policy"];
    for (const [k, v] of up.headers) if (!["connection", "content-length", "content-encoding", "keep-alive", "transfer-encoding", "set-cookie"].includes(k)) out[k] = v;
    const cookies = up.headers.getSetCookie?.() ?? [];
    if (cookies.length) out["set-cookie"] = cookies;
    res.writeHead(up.status, out);
    res.end(Buffer.from(await up.arrayBuffer()));
  } catch (e) {
    console.error("backend proxy failed:", e?.message);
    const headers = { "content-type": "application/json", "cache-control": "no-store", ...securityHeaders(req) };
    delete headers["content-security-policy"];
    res.writeHead(502, headers);
    res.end(JSON.stringify({ error: "AIDC backend is unreachable.", code: "AIDC_BACKEND_UNAVAILABLE" }));
  }
}

async function serve(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { allow: "GET, HEAD", ...securityHeaders(req) });
    return res.end("Method not allowed");
  }
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, "http://x").pathname);
  } catch {
    res.writeHead(400, { ...securityHeaders(req) });
    return res.end("Bad request");
  }
  let file = resolveStaticPath(root, pathname);
  if (!file) { res.writeHead(403, { ...securityHeaders(req) }); return res.end("Forbidden"); }
  let isAsset = true;
  try { const s = await stat(file); if (s.isDirectory()) file = join(file, "index.html"); } catch { file = join(root, "index.html"); isAsset = false; }
  try {
    const body = await readFile(file);
    const ext = extname(file);
    const immutable = ext !== ".html" && file.split(sep).includes("assets");
    res.writeHead(200, {
      ...securityHeaders(req),
      "content-type": types[ext] || "application/octet-stream",
      "cache-control": immutable && isAsset ? "public, max-age=31536000, immutable" : "no-store"
    });
    res.end(req.method === "HEAD" ? undefined : body);
  } catch { res.writeHead(404, { ...securityHeaders(req) }); res.end("Not found"); }
}

export function createServer() {
  return http.createServer((req, res) => {
    if (req.url === "/healthz") { res.writeHead(200, { "content-type": "text/plain", "cache-control": "no-store" }); return res.end("ok"); }
    if (/^\/(api|auth)(\/|\?|$)/.test(req.url)) return proxy(req, res);
    return serve(req, res).catch((e) => {
      console.error("serve failed:", e?.message);
      if (!res.headersSent) { res.writeHead(500, { ...securityHeaders(req) }); res.end("Internal error"); }
    });
  });
}

// Only listen when executed (`node server.mjs`), so tests can import the helpers.
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  createServer().listen(port, "0.0.0.0", () => console.log(`AIDC frontend on :${port}`));
}
