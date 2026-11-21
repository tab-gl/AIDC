import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import net from "node:net";
import { spawn } from "node:child_process";

let backend, child, got = [];
const PORT = 38431, BPORT = 38432, LIMIT = 1024;

before(async () => {
  backend = http.createServer((req, res) => {
    let n = 0; req.on("data", c => (n += c.length)); req.on("end", () => { got.push(n); res.end("ok"); });
  });
  await new Promise(r => backend.listen(BPORT, "127.0.0.1", r));
  child = spawn(process.execPath, ["server.mjs"], { env: { ...process.env, PORT: String(PORT), AIDC_BACKEND_URL: `http://127.0.0.1:${BPORT}`, AIDC_MAX_BODY_BYTES: String(LIMIT), AIDC_BODY_TIMEOUT_MS: "500" }, stdio: "ignore" });
  for (let i = 0; i < 50; i++) { try { await fetch(`http://127.0.0.1:${PORT}/healthz`); return; } catch { await new Promise(r => setTimeout(r, 100)); } }
  throw new Error("server did not start");
});
after(() => { child.kill(); backend.close(); });

const post = body => fetch(`http://127.0.0.1:${PORT}/api/auth/login`, { method: "POST", body });

test("small body reaches the backend", async () => {
  got = []; const r = await post("x".repeat(10));
  assert.equal(r.status, 200); assert.deepEqual(got, [10]);
});
test("exactly-at-limit body passes", async () => {
  got = []; const r = await post("x".repeat(LIMIT));
  assert.equal(r.status, 200); assert.deepEqual(got, [LIMIT]);
});
test("oversized declared body gets 413 and never reaches the backend", async () => {
  got = []; const r = await post("x".repeat(LIMIT + 1));
  assert.equal(r.status, 413); assert.deepEqual(got, []);
});
function raw(lines, bodyChunks, hold = 0) {
  return new Promise(resolve => {
    const s = net.connect(PORT, "127.0.0.1"); let out = "";
    s.on("data", d => (out += d)); s.on("close", () => resolve(out)); s.on("error", () => resolve(out));
    s.write(lines.join("\r\n") + "\r\n\r\n");
    for (const c of bodyChunks) s.write(c);
    if (!hold) setTimeout(() => s.end(), 50);
  });
}
test("oversized chunked body gets 413 and never reaches the backend", async () => {
  got = [];
  const chunk = n => `${n.toString(16)}\r\n${"x".repeat(n)}\r\n`;
  const out = await raw(["POST /api/auth/login HTTP/1.1", "Host: t", "Transfer-Encoding: chunked"], [chunk(LIMIT), chunk(10), "0\r\n\r\n"]);
  assert.match(out, /^HTTP\/1\.1 413/); assert.deepEqual(got, []);
});
test("stalled body times out with 408", async () => {
  got = [];
  const out = await raw(["POST /api/auth/login HTTP/1.1", "Host: t", "Content-Length: 100"], ["abc"], 1);
  assert.match(out, /^HTTP\/1\.1 408/); assert.deepEqual(got, []);
});
