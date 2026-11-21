import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "dist");
const port = Number(process.env.PORT || 3000);
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".ico": "image/x-icon", ".webmanifest": "application/manifest+json" };
const HOP = new Set(["connection", "content-length", "host", "keep-alive", "transfer-encoding", "upgrade", "te", "trailer", "proxy-authorization", "proxy-authenticate", "accept-encoding"]);

const MAX_BODY = Number(process.env.AIDC_MAX_BODY_BYTES) || 1024 * 1024;
const BODY_TIMEOUT_MS = Number(process.env.AIDC_BODY_TIMEOUT_MS) || 15000;

/* Reads a request body with a hard byte ceiling and a total time limit. Rejects
   with .status 413 / 408 without retaining the oversized data. */
function readBody(req) {
  return new Promise((resolve, reject) => {
    const declared = Number(req.headers["content-length"]);
    if (Number.isFinite(declared) && declared > MAX_BODY) return reject(Object.assign(new Error("Request body too large."), { status: 413 }));
    const chunks = [];
    let size = 0, done = false;
    const finish = (fn, v) => { if (done) return; done = true; clearTimeout(timer); req.off("data", onData); fn(v); };
    const timer = setTimeout(() => finish(reject, Object.assign(new Error("Request body timed out."), { status: 408 })), BODY_TIMEOUT_MS);
    const onData = c => {
      size += c.length;
      if (size > MAX_BODY) { chunks.length = 0; return finish(reject, Object.assign(new Error("Request body too large."), { status: 413 })); }
      chunks.push(c);
    };
    req.on("data", onData);
    req.once("end", () => finish(resolve, Buffer.concat(chunks)));
    req.once("error", e => finish(reject, e));
    req.once("aborted", () => finish(reject, Object.assign(new Error("Request aborted."), { status: 400 })));
  });
}

function backend() {
  const raw = String(process.env.AIDC_BACKEND_URL || "").trim();
  if (!raw) throw new Error("AIDC_BACKEND_URL is not configured.");
  const u = new URL(raw);
  if (u.pathname !== "/" || u.search || u.hash || u.username || u.password) throw new Error("AIDC_BACKEND_URL must be a bare origin.");
  return u.origin;
}

async function proxy(req, res) {
  let base;
  try { base = backend(); } catch (e) { res.writeHead(503, { "content-type": "application/json" }); return res.end(JSON.stringify({ error: e.message, code: "AIDC_BACKEND_NOT_CONFIGURED" })); }
  try {
    const incoming = new URL(req.url, "http://x");
    const path = incoming.pathname.replace(/^\/api\/auth(?=\/|$)/, "/auth");
    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers)) if (v != null && !HOP.has(k)) headers.set(k, Array.isArray(v) ? v.join(", ") : v);
    headers.set("x-forwarded-host", req.headers.host || "");
    headers.set("x-forwarded-proto", req.headers["x-forwarded-proto"] || "https");
    headers.set("x-forwarded-for", [req.headers["x-forwarded-for"], req.socket.remoteAddress].filter(Boolean).join(", "));
    let body;
    if (!["GET", "HEAD"].includes(req.method)) {
      try { body = await readBody(req); } catch (e) {
        if (!e.status) throw e;
        res.writeHead(e.status, { "content-type": "application/json", connection: "close" });
        return res.end(JSON.stringify({ error: e.message, code: e.status === 413 ? "AIDC_BODY_TOO_LARGE" : "AIDC_BODY_TIMEOUT" }), () => req.destroy());
      }
    }
    const up = await fetch(new URL(path + incoming.search, base), { method: req.method, headers, body: body && body.length ? body : undefined, redirect: "manual" });
    const out = {};
    for (const [k, v] of up.headers) if (!["connection", "content-length", "content-encoding", "keep-alive", "transfer-encoding", "set-cookie"].includes(k)) out[k] = v;
    const cookies = up.headers.getSetCookie?.() ?? [];
    if (cookies.length) out["set-cookie"] = cookies;
    res.writeHead(up.status, out);
    res.end(Buffer.from(await up.arrayBuffer()));
  } catch (e) {
    console.error("backend proxy failed:", e?.message);
    res.writeHead(502, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "AIDC backend is unreachable.", code: "AIDC_BACKEND_UNAVAILABLE" }));
  }
}

async function serve(req, res) {
  const pathname = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let file = normalize(join(root, pathname));
  if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
  let isAsset = true;
  try { const s = await stat(file); if (s.isDirectory()) file = join(file, "index.html"); } catch { file = join(root, "index.html"); isAsset = false; }
  try {
    const body = await readFile(file);
    const ext = extname(file);
    res.writeHead(200, {
      "content-type": types[ext] || "application/octet-stream",
      "cache-control": file.includes("/assets/") && isAsset ? "public, max-age=31536000, immutable" : "no-cache",
      "x-content-type-options": "nosniff", "referrer-policy": "strict-origin-when-cross-origin", "x-frame-options": "DENY"
    });
    res.end(req.method === "HEAD" ? undefined : body);
  } catch { res.writeHead(404); res.end("Not found"); }
}

http.createServer((req, res) => {
  if (req.url === "/healthz") { res.writeHead(200); return res.end("ok"); }
  if (/^\/(api|auth)(\/|\?|$)/.test(req.url)) return proxy(req, res);
  return serve(req, res);
}).listen(port, "0.0.0.0", () => console.log(`AIDC frontend on :${port}`));
