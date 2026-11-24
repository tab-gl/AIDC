import type { ActivityEvent, ApiError, Application, DiscoveryStatus, LoginAnalytics, OperationsAnalytics, RedirectUri, User, AppCredential, AppBranding, SessionRecord, UptimeReport, UserRecord } from "../types";

/**
 * Optional cross-origin backend. Production keeps this blank and lets the same-origin
 * `/api` + `/auth` proxy hold the session cookies; a configured value must be a plain
 * http(s) origin (a path prefix is allowed), never something a URL parser can turn into
 * a different scheme. An invalid value falls back to same-origin instead of shipping
 * requests — and credentials — somewhere unexpected.
 */
function resolveApiOrigin(raw: string | undefined): string {
  const value = (raw ?? "").trim();
  if (!value) return "";
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return "";
    if (url.username || url.password || url.search || url.hash) return "";
    return (url.origin + url.pathname).replace(/\/+$/, "");
  } catch {
    return "";
  }
}

export const API_ORIGIN = resolveApiOrigin(import.meta.env.VITE_AIDC_API_BASE_URL);
if (import.meta.env.DEV && import.meta.env.VITE_AIDC_API_BASE_URL?.trim() && !API_ORIGIN) {
  console.warn("VITE_AIDC_API_BASE_URL is not a valid http(s) origin; falling back to same-origin /api.");
}
const API_BASE = `${API_ORIGIN}/api`;
const REQUEST_TIMEOUT_MS = 15_000;

function csrfToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|; )aidc_csrf=([^;]*)/);
  if (!match?.[1]) return null;
  try { return decodeURIComponent(match[1]); } catch { return null; }
}

type RequestOptions = RequestInit & { base?: boolean; authRedirect?: boolean };

const abortError = () => {
  const error = new Error("The request was cancelled.") as ApiError;
  error.name = "AbortError";
  return error;
};

async function requestOnce<T>(path: string, options: RequestOptions = {}): Promise<T> {
  // A caller may cancel while the request is queued for a slot; never open a socket for it.
  if (options.signal?.aborted) throw abortError();
  const method = (options.method || "GET").toUpperCase();
  const useApiBase = options.base !== false;
  const fetchOptions = { ...options };
  const redirectOnAuthFailure = options.authRedirect !== false;
  const callerSignal = options.signal;
  delete fetchOptions.base;
  delete fetchOptions.authRedirect;
  delete fetchOptions.signal;
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, REQUEST_TIMEOUT_MS);
  const abortFromCaller = () => controller.abort(callerSignal?.reason);
  if (callerSignal?.aborted) abortFromCaller();
  else callerSignal?.addEventListener("abort", abortFromCaller, { once: true });
  const headers = new Headers(options.headers);

  // A JSON API should be asked for JSON: this also keeps a proxy from negotiating HTML.
  if (!headers.has("Accept")) headers.set("Accept", "application/json");

  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    const csrf = csrfToken();
    if (csrf) headers.set("X-CSRF-Token", csrf);
  }

  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  try {
    const response = await fetch((useApiBase ? API_BASE : API_ORIGIN) + path, {
      ...fetchOptions,
      headers,
      credentials: "include",
      signal: controller.signal
    });

    const data = (await response.json().catch((error: unknown) => {
      // Empty or non-JSON responses are allowed, but an interrupted body is not
      // a successful empty response. Preserve aborts for the outer handler.
      if (controller.signal.aborted) throw error;
      return null;
    })) as unknown;
    if (!response.ok) {
      const payload = data as { error?: unknown; code?: unknown } | null;
      // 4xx messages are written for the developer and worth showing; 5xx bodies can leak
      // internals, so those keep the neutral connection message.
      const serverMessage = response.status < 500 && typeof payload?.error === "string" && payload.error.trim() ? payload.error : null;
      const friendly = response.status >= 500
        ? "The console couldn't reach Ace ID. Please try again in a moment."
        : `Request failed (${response.status}).`;
      const error = new Error(serverMessage || friendly) as ApiError;
      error.status = response.status;
      error.code = typeof payload?.code === "string" ? payload.code : undefined;
      error.data = data;
      if (response.status === 401 && redirectOnAuthFailure) {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("aidc-auth-required", {
            detail: { status: response.status, message: error.message }
          }));
        }
      }
      throw error;
    }

    return data as T;
  } catch (error) {
    if (timedOut) {
      const timeout = new Error(`Request timed out after ${REQUEST_TIMEOUT_MS}ms`) as ApiError;
      timeout.name = "TimeoutError";
      timeout.status = 408;
      throw timeout;
    }
    throw error;
  } finally {
    clearTimeout(timer);
    callerSignal?.removeEventListener("abort", abortFromCaller);
  }
}

// Reads share a small request budget and retry transient server failures, so a burst of
// parallel calls on page load does not surface as errors when the backend is momentarily busy.
const MAX_IN_FLIGHT = 3;
const RETRY_DELAYS_MS = [400, 1200];
let inFlight = 0;
const waiting: Array<() => void> = [];

const releaseSlot = () => {
  if (inFlight > 0) inFlight -= 1;
  waiting.shift()?.();
};

/**
 * Waits for a read slot. Returns null when the caller aborted while queued, so a cancelled
 * navigation never starts a request it will immediately throw away.
 */
async function acquireSlot(signal?: AbortSignal | null): Promise<(() => void) | null> {
  if (signal?.aborted) return null;
  if (inFlight < MAX_IN_FLIGHT) { inFlight += 1; return releaseSlot; }
  return new Promise((resolve) => {
    const start = () => {
      signal?.removeEventListener("abort", onAbort);
      if (signal?.aborted) {
        // The slot we were handed goes to the next waiter instead of being lost.
        waiting.shift()?.();
        resolve(null);
        return;
      }
      inFlight += 1;
      resolve(releaseSlot);
    };
    const onAbort = () => {
      const index = waiting.indexOf(start);
      if (index >= 0) waiting.splice(index, 1);
      resolve(null);
    };
    signal?.addEventListener("abort", onAbort, { once: true });
    waiting.push(start);
  });
}

const sleep = (ms: number, signal?: AbortSignal) => new Promise<void>((resolve) => {
  const done = () => {
    clearTimeout(timer);
    signal?.removeEventListener("abort", done);
    resolve();
  };
  const timer = setTimeout(done, ms);
  signal?.addEventListener("abort", done, { once: true });
});

const isTransient = (error: unknown) => {
  const name = (error as Error | undefined)?.name;
  if (name === "AbortError" || name === "TimeoutError") return false;
  const status = (error as ApiError | undefined)?.status;
  return status === undefined ? true : status >= 500 || status === 429;
};

// Parallel mounts (Overview + Activity, a desktop search and the command palette) often ask
// for the same read at the same moment. Sharing one in-flight promise halves the requests
// without caching stale data. Requests with their own AbortSignal stay independent so a
// caller can always cancel exactly its own request.
const reads = new Map<string, Promise<unknown>>();

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = (options.method || "GET").toUpperCase();
  if (method !== "GET") return requestOnce<T>(path, options);

  const shareable = !options.signal;
  const key = `${options.base === false ? "origin" : "api"}:${options.authRedirect === false ? "quiet" : "loud"}:${path}`;
  if (shareable) {
    const pending = reads.get(key) as Promise<T> | undefined;
    if (pending) return pending;
  }

  // Take a free slot in the same tick as the call: a newly mounted view should fire its
  // request immediately rather than after a scheduling hop. Only a saturated budget waits.
  let slot: (() => void) | null = null;
  if (!options.signal?.aborted && inFlight < MAX_IN_FLIGHT) { inFlight += 1; slot = releaseSlot; }

  const run = (async () => {
    const release = slot ?? await acquireSlot(options.signal);
    if (!release) throw abortError();
    try {
      for (let attempt = 0; ; attempt += 1) {
        try { return await requestOnce<T>(path, options); }
        catch (error) {
          const delay = RETRY_DELAYS_MS[attempt];
          if (delay === undefined || options.signal?.aborted || !isTransient(error)) throw error;
          await sleep(delay, options.signal ?? undefined);
          if (options.signal?.aborted) throw abortError();
        }
      }
    } finally { release(); }
  })();

  if (shareable) {
    reads.set(key, run);
    // `finally` returns a new promise; clearing from the original keeps the map tidy.
    void run.finally(() => { if (reads.get(key) === run) reads.delete(key); }).catch(() => {});
  }
  return run;
}

const readSignal = (signal?: AbortSignal | null) => signal ? { signal } : {};

export const api = {
  auth: {
    me: () => request<{ user: User }>("/me", { authRedirect: false }),
    logout: () => request<void>("/auth/logout", { method: "POST", base: false })
  },
  applications: {
    list: () => request<{ applications: Application[] }>("/applications"),
    create: (input: {
      name: string;
      description: string;
      origin_url?: string;
      application_type?: string;
    }) => request<{ application: Application }>("/applications", {
      method: "POST",
      body: JSON.stringify(input)
    }),
    get: (id: string) => request<{ application: Application }>(`/applications/${encodeURIComponent(id)}`),
    update: (id: string, input: Partial<Pick<Application, "name" | "description" | "origin_url" | "application_type">>) => request<{ application: Application }>(`/applications/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(input) }),
    remove: (id: string) => request<{ deleted: boolean }>(`/applications/${encodeURIComponent(id)}`, { method: "DELETE" }),
    activity: (id: string, limit = 50, signal?: AbortSignal) => request<{ events: ActivityEvent[] }>(`/applications/${encodeURIComponent(id)}/activity?limit=${Math.min(100, Math.max(1, limit))}`, readSignal(signal)),
    redirectUris: (id: string) => request<{ redirect_uris: RedirectUri[] }>(`/applications/${encodeURIComponent(id)}/redirect-uris`),
    addRedirectUri: (id: string, uri: string) => request<{ redirect_uri: RedirectUri }>(`/applications/${encodeURIComponent(id)}/redirect-uris`, { method: "POST", body: JSON.stringify({ uri }) }),
    removeRedirectUri: (id: string, uriId: string) => request<{ deleted: boolean }>(`/applications/${encodeURIComponent(id)}/redirect-uris/${encodeURIComponent(uriId)}`, { method: "DELETE" }),
    sessions: (id: string, status: "active" | "all" | "revoked" = "active", limit = 50) => request<{ sessions: SessionRecord[] }>(`/applications/${encodeURIComponent(id)}/sessions?status=${status}&limit=${Math.min(100, Math.max(1, limit))}`),
    uptime: (id: string, days = 30) => request<UptimeReport>(`/applications/${encodeURIComponent(id)}/uptime?days=${[7,14,30].includes(days) ? days : 30}`),
    checkUptime: (id: string) => request<{ check: { success: boolean; created_at: string; metadata?: Record<string, unknown> } | null }>(`/applications/${encodeURIComponent(id)}/uptime/check`, { method: "POST", body: "{}" }),
    scopes: (id: string) => request<{ scopes: string[] }>(`/applications/${encodeURIComponent(id)}/scopes`),
    updateScopes: (id: string, scopes: string[]) => request<{ scopes: string[] }>(`/applications/${encodeURIComponent(id)}/scopes`, { method: "PUT", body: JSON.stringify({ scopes }) }),
    credentials: (id: string) => request<{ credentials: AppCredential[] }>(`/applications/${encodeURIComponent(id)}/credentials`),
    rotateCredentials: (id: string) => request<{ credential: AppCredential }>(`/applications/${encodeURIComponent(id)}/credentials/rotate`, { method: "POST" }),
    revokeCredential: (id: string, credentialId: string) => request<{ revoked: boolean }>(`/applications/${encodeURIComponent(id)}/credentials/${encodeURIComponent(credentialId)}`, { method: "DELETE" }),
    branding: (id: string) => request<{ branding: AppBranding }>(`/applications/${encodeURIComponent(id)}/branding`),
    updateBranding: (id: string, branding: Pick<AppBranding, "display_name" | "logo_url" | "accent_color">) => request<{ branding: AppBranding }>(`/applications/${encodeURIComponent(id)}/branding`, { method: "PUT", body: JSON.stringify(branding) })
  },
  activity: {
    list: (limit = 50, signal?: AbortSignal) => request<{ events: ActivityEvent[] }>(`/activity?limit=${Math.min(100, Math.max(1, limit))}`, readSignal(signal))
  },
  analytics: {
    logins: (days = 7) => request<LoginAnalytics>(`/analytics/logins?days=${[7,14,30].includes(days) ? days : 7}`),
    operations: (days = 30) => request<OperationsAnalytics>(`/analytics/operations?days=${[7,14,30].includes(days) ? days : 30}`)
  },
  integration: { discovery: () => request<DiscoveryStatus>("/integration/discovery") },
  users: {
    search: (q = "", limit = 20, signal?: AbortSignal) => request<{ users: UserRecord[] }>(`/users/search?q=${encodeURIComponent(q.slice(0, 120))}&limit=${Math.min(50, Math.max(1, limit))}`, readSignal(signal))
  },
  health: {
    get: () => request<{ ok: boolean }>("/health")
  }
};
