import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, request } from "./api";

describe("API requests", () => {
  let events: EventTarget;

  beforeEach(() => {
    events = new EventTarget();
    vi.stubGlobal("window", Object.assign(events, { setTimeout, clearTimeout }));
    vi.stubGlobal("document", { cookie: "other=1; aidc_csrf=token%20value" });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("sends credentials, decoded CSRF token and JSON content type on mutations", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ deleted: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetch);
    await api.applications.remove("app/id");
    const [url, options] = fetch.mock.calls[0]!;
    expect(url).toBe("/api/applications/app%2Fid");
    expect(options.credentials).toBe("include");
    expect(options.method).toBe("DELETE");
    expect(options.headers.get("X-CSRF-Token")).toBe("token value");
    expect(options.headers.has("Content-Type")).toBe(false);
  });

  it("uses the correct non-API logout endpoint and emits auth-required on 401", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "Expired", code: "EXPIRED" }), { status: 401 }));
    const listener = vi.fn();
    events.addEventListener("aidc-auth-required", listener);
    vi.stubGlobal("fetch", fetch);
    await expect(api.auth.logout()).rejects.toMatchObject({ status: 401, code: "EXPIRED", message: "Expired" });
    expect(fetch.mock.calls[0]![0]).toBe("/auth/logout");
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("does not emit auth-required during the initial session check", async () => {
    const listener = vi.fn();
    events.addEventListener("aidc-auth-required", listener);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 401 })));
    await expect(api.auth.me()).rejects.toMatchObject({ status: 401 });
    expect(listener).not.toHaveBeenCalled();
  });

  it("preserves a caller's content type and supports empty successful responses", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetch);
    await expect(request("/test", { method: "POST", headers: { "Content-Type": "text/plain" }, body: "hi" })).resolves.toBeNull();
    expect(fetch.mock.calls[0]![1].headers.get("Content-Type")).toBe("text/plain");
  });

  it("encodes a JSON body and does not send CSRF headers on safe requests", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetch);
    await api.applications.create({ name: "Test", description: "Example" });
    const [, post] = fetch.mock.calls[0]!;
    expect(post.headers.get("Content-Type")).toBe("application/json");
    expect(JSON.parse(post.body)).toEqual({ name: "Test", description: "Example" });
    await api.applications.list();
    expect(fetch.mock.calls[1]![1].headers.has("X-CSRF-Token")).toBe(false);
  });

  it("propagates caller cancellation while the response is being read", async () => {
    const controller = new AbortController();
    vi.stubGlobal("fetch", vi.fn((_url, options: RequestInit) => Promise.resolve({
      ok: true,
      json: () => new Promise((_resolve, reject) => options.signal!.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true }))
    })));
    const result = request("/slow", { signal: controller.signal });
    await Promise.resolve();
    controller.abort();
    await expect(result).rejects.toMatchObject({ name: "AbortError" });
  });

  it("reports timeout if the response body is aborted while being read", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("window", Object.assign(events, { setTimeout, clearTimeout }));
    vi.stubGlobal("fetch", vi.fn((_url, options: RequestInit) => Promise.resolve({
      ok: true,
      json: () => new Promise((_resolve, reject) => options.signal!.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true }))
    })));
    const result = request("/slow");
    const assertion = expect(result).rejects.toMatchObject({ name: "TimeoutError", status: 408 });
    await vi.advanceTimersByTimeAsync(15_000);
    await assertion;
  });
});
