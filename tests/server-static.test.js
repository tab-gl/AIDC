import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { spawn } from "node:child_process";
import http from "node:http";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveStaticPath } from "../server.mjs";

// Static serving is the only thing between the public internet and the bundle directory,
// so containment and headers are checked directly as well as over HTTP.

describe("static path containment", () => {
  const root = path.join(path.sep, "srv", "app", "dist");

  test("keeps ordinary paths inside the bundle", () => {
    expect(resolveStaticPath(root, "/index.html")).toBe(path.join(root, "index.html"));
    expect(resolveStaticPath(root, "/")).toBe(root + path.sep);
    expect(resolveStaticPath(root, "/assets/app.js")).toBe(path.join(root, "assets", "app.js"));
  });

  test("rejects parent traversal and sibling directories that share the prefix", () => {
    expect(resolveStaticPath(root, "/../secret")).toBeNull();
    expect(resolveStaticPath(root, "/../../etc/passwd")).toBeNull();
    expect(resolveStaticPath(root, "/../dist-evil/secret")).toBeNull();
    expect(resolveStaticPath(root, "/assets/../../package.json")).toBeNull();
  });

  test("rejects null bytes and non-string input", () => {
    expect(resolveStaticPath(root, "/index.html\0.png")).toBeNull();
    expect(resolveStaticPath(root, undefined)).toBeNull();
  });
});

const serverPath = fileURLToPath(new URL("../server.mjs", import.meta.url));
const workspace = path.dirname(serverPath);
let child;
let port;

async function availablePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => server.once("error", reject).listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return port;
}

async function waitForServer() {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Server exited with code ${child.exitCode}.`);
    try {
      const response = await fetch(`http://127.0.0.1:${port}/healthz`, { signal: AbortSignal.timeout(300) });
      if (response.ok) return;
    } catch { /* not up yet */ }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error("Server did not start in time.");
}

function request(method, pathname) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: "127.0.0.1", port, method, path: pathname }, (response) => {
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => resolve({ status: response.statusCode, headers: response.headers, body: Buffer.concat(chunks).toString("utf8") }));
    });
    req.on("error", reject);
    req.end();
  });
}

beforeAll(async () => {
  port = await availablePort();
  child = spawn(process.execPath, [serverPath], {
    cwd: workspace,
    env: { ...process.env, PORT: String(port), AIDC_BACKEND_URL: "http://127.0.0.1:1" },
    stdio: "ignore"
  });
  await waitForServer();
}, 10_000);

afterAll(async () => {
  if (!child || child.exitCode !== null) return;
  child.kill("SIGTERM");
  await new Promise((resolve) => {
    child.once("exit", resolve);
    setTimeout(resolve, 2_000).unref();
  });
});

describe("static responses", () => {
  test("sends the security policy with a not-found response", async () => {
    const response = await request("GET", "/definitely-not-here");
    expect([200, 404]).toContain(response.status);
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["x-frame-options"]).toBe("DENY");
    expect(response.headers["content-security-policy"]).toContain("default-src 'self'");
    expect(response.headers["content-security-policy"]).toContain("frame-ancestors 'none'");
  });

  test("refuses to read outside the bundle", async () => {
    const response = await request("GET", "/..%2fpackage.json");
    expect(response.status).toBe(403);
    expect(response.body).not.toContain("\"name\"");
  });

  test("only serves static files with GET and HEAD", async () => {
    const response = await request("POST", "/");
    expect(response.status).toBe(405);
    expect(response.headers.allow).toBe("GET, HEAD");
  });
});
