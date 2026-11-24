import type { ActivityEvent, ApiError, Application, DiscoveryStatus, LoginAnalytics, OperationsAnalytics, Quota, RedirectUri, User, AppCredential, AppBranding, SessionRecord, UptimeReport, UserRecord } from "../types";

export const API_ORIGIN = (import.meta.env.VITE_AIDC_API_BASE_URL ?? "").trim().replace(/\/+$/, "");
const API_BASE = `${API_ORIGIN}/api`;
const REQUEST_TIMEOUT_MS = 15_000;

function csrfToken(): string | null {
  const match = document.cookie.match(/(?:^|; )aidc_csrf=([^;]*)/);
  if (!match?.[1]) return null;
  try { return decodeURIComponent(match[1]); } catch { return null; }
}

type RequestOptions = RequestInit & { base?: boolean; authRedirect?: boolean };
async function requestOnce<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = (options.method || "GET").toUpperCase();
  const useApiBase = (options as RequestInit & { base?: boolean }).base !== false;
  const fetchOptions = { ...options };
  const redirectOnAuthFailure = options.authRedirect !== false;
  const callerSignal = options.signal;
  delete fetchOptions.base;
  delete fetchOptions.authRedirect;
  delete fetchOptions.signal;
  const controller = new AbortController();
  let timedOut = false;
  const timer = window.setTimeout(() => { timedOut = true; controller.abort(); }, REQUEST_TIMEOUT_MS);
  const abortFromCaller = () => controller.abort(callerSignal?.reason);
  if (callerSignal?.aborted) abortFromCaller();
  else callerSignal?.addEventListener("abort", abortFromCaller, { once: true });
  const headers = new Headers(options.headers);

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
      const payload = data as { error?: string; code?: string } | null;
      const friendly = response.status >= 500
        ? "The console couldn't reach Ace ID. Please try again in a moment."
        : `Request failed (${response.status}).`;
      const error = new Error(payload?.error || friendly) as ApiError;
      error.status = response.status;
      error.code = payload?.code;
      error.data = data;
      if (response.status === 401 && redirectOnAuthFailure) {
        window.dispatchEvent(new CustomEvent("aidc-auth-required", {
          detail: { status: response.status, message: error.message }
        }));
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
    window.clearTimeout(timer);
    callerSignal?.removeEventListener("abort", abortFromCaller);
  }
}

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
    }) => request<{ application: Application; quota?: Quota }>("/applications", {
      method: "POST",
      body: JSON.stringify(input)
    }),
    get: (id: string) => request<{ application: Application }>(`/applications/${encodeURIComponent(id)}`),
    update: (id: string, input: Partial<Pick<Application, "name" | "description" | "origin_url" | "application_type">>) => request<{ application: Application }>(`/applications/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(input) }),
    remove: (id: string) => request<{ deleted: boolean }>(`/applications/${encodeURIComponent(id)}`, { method: "DELETE" }),
    activity: (id: string, limit = 50) => request<{ events: ActivityEvent[] }>(`/applications/${encodeURIComponent(id)}/activity?limit=${Math.min(100, Math.max(1, limit))}`),
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
    list: (limit = 50) => request<{ events: ActivityEvent[] }>(`/activity?limit=${Math.min(100, Math.max(1, limit))}`)
  },
  analytics: {
    logins: (days = 7) => request<LoginAnalytics>(`/analytics/logins?days=${[7,14,30].includes(days) ? days : 7}`),
    operations: (days = 30) => request<OperationsAnalytics>(`/analytics/operations?days=${[7,14,30].includes(days) ? days : 30}`)
  },
  integration: { discovery: () => request<DiscoveryStatus>("/integration/discovery") },
  users: {
    search: (q = "", limit = 20) => request<{ users: UserRecord[] }>(`/users/search?q=${encodeURIComponent(q.slice(0, 120))}&limit=${Math.min(50, Math.max(1, limit))}`)
  },
  quota: {
    get: () => request<{ quota: Quota }>("/quota")
  },
  health: {
    get: () => request<{ ok: boolean }>("/health")
  }
};


// Reads share a small request budget and retry transient server failures, so a burst of
// parallel calls on page load does not surface as errors when the backend is momentarily busy.
const MAX_IN_FLIGHT = 3;
const RETRY_DELAYS_MS = [400, 1200];
let inFlight = 0;
const waiting: Array<() => void> = [];
const release = () => { inFlight -= 1; waiting.shift()?.(); };
const sleep = (ms: number, signal?: AbortSignal) => new Promise<void>((resolve) => {
  const timer = window.setTimeout(resolve, ms);
  signal?.addEventListener("abort", () => { window.clearTimeout(timer); resolve(); }, { once: true });
});
const isTransient = (error: unknown) => {
  const status = (error as ApiError | undefined)?.status;
  return status === undefined ? (error as Error)?.name !== "AbortError" : status >= 500 || status === 429;
};

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = (options.method || "GET").toUpperCase();
  if (method !== "GET") return requestOnce<T>(path, options);
  // Take a free slot synchronously so the request starts in the same tick, as before.
  if (inFlight < MAX_IN_FLIGHT) inFlight += 1;
  else await new Promise<void>((resolve) => { waiting.push(() => { inFlight += 1; resolve(); }); });
  try {
    for (let attempt = 0; ; attempt += 1) {
      try { return await requestOnce<T>(path, options); }
      catch (error) {
        const delay = RETRY_DELAYS_MS[attempt];
        if (delay === undefined || options.signal?.aborted || !isTransient(error)) throw error;
        await sleep(delay, options.signal ?? undefined);
        if (options.signal?.aborted) throw error;
      }
    }
  } finally { release(); }
}
