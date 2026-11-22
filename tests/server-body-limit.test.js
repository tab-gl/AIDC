import { afterAll, beforeAll, expect, test } from "vitest";
import { spawn } from "node:child_process";
import http from "node:http";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MAX_BODY_BYTES = 1024 * 1024;
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
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error("Server did not start in time.");
}

function post(pathname, { declaredLength, chunks }) {
  return new Promise((resolve, reject) => {
    const request = http.request({
      host: "127.0.0.1",
      port,
      method: "POST",
      path: pathname,
      headers: {
        "content-type": "application/json",
        ...(declaredLength === undefined ? {} : { "content-length": String(declaredLength) })
      }
    }, (response) => {
      const body = [];
      response.on("data", (chunk) => body.push(chunk));
      response.on("end", () => resolve({ status: response.statusCode, body: Buffer.concat(body).toString("utf8") }));
    });
    request.on("error", reject);
    for (const chunk of chunks) request.write(chunk);
    request.end();
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

for (const [name, makeRequest] of [
  // The server must reject based on headers alone; sending the body as well races
  // the intentional connection close and can produce a client-side EPIPE.
  ["declared content length", () => post("/api/test", { declaredLength: MAX_BODY_BYTES + 1, chunks: [] })],
  ["chunked request body", () => post("/api/test", { chunks: [Buffer.alloc(MAX_BODY_BYTES), Buffer.from("x")] })]
]) {
  test(`rejects an oversized ${name} before proxying`, async () => {
    const response = await makeRequest();
    expect(response.status).toBe(413);
    expect(JSON.parse(response.body)).toMatchObject({ code: "REQUEST_BODY_TOO_LARGE" });
  });
}
