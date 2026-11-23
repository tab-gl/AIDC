import { expect, test } from "@playwright/test";

const app = {
  id: "7cb2e1bd-1a8a-4c70-92f4-3a2e84d24f61",
  name: "Example identity app",
  description: "Playwright fixture",
  client_id: "aidc_test_client",
  origin_url: "https://app.example.test",
  application_type: "web",
  status: "active",
  created_at: "2026-10-01T12:00:00.000Z",
  updated_at: "2026-10-01T12:00:00.000Z"
};

async function mockApi(page: import("@playwright/test").Page, options: { expireAnalytics?: boolean } = {}) {
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    if (path === "/api/me") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ user: { id: "dev-1", email: "dev@example.test", name: "Test Developer" } }) });
    } else if (path === "/api/applications" && route.request().method() === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ applications: [app] }) });
    } else if (path === "/api/applications" && route.request().method() === "POST") {
      await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "Application service unavailable" }) });
    } else if (path === "/api/quota") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ quota: { count: 1, limit: 8, remaining: 7 } }) });
    } else if (path === "/api/analytics/logins" && options.expireAnalytics) {
      await route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ error: "Session expired" }) });
    } else if (path === "/api/analytics/logins") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ days: 7, items: [], total: 0, failedAttempts: 0, uniqueUsers: 0 }) });
    } else if (path === "/api/analytics/operations") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ days: 7, sessions: { active: 0, recent: [] }, uptime: { operational: 0, total: 1, average_percent: null, applications: [] } }) });
    } else if (path === "/api/activity" || path.endsWith("/activity")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ events: [] }) });
    } else if (path === "/api/users/search") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ users: [] }) });
    } else if (path === "/api/integration/discovery") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ status: "ready", issuer: "https://identity.example.test" }) });
    } else if (path === "/api/health") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
    } else {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({}) });
    }
  });
}

test("loads the signed-in console and filters applications", async ({ page }) => {
  await mockApi(page);
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Account menu" })).toBeVisible();
  await page.getByRole("link", { name: "Applications" }).first().click();
  await expect(page.getByRole("heading", { name: "Applications", level: 1 })).toBeVisible();
  await expect(page.getByText("Example identity app")).toBeVisible();
  const search = page.getByRole("searchbox", { name: "Search applications" });
  await search.fill("not a match");
  await expect(page.getByRole("heading", { name: /no applications match/i })).toBeVisible();
  await search.fill("Example identity");
  await expect(page.getByText("Example identity app")).toBeVisible();
  await search.fill("aidc_test_client");
  await expect(page.getByText("Example identity app")).toBeVisible();
});

test("returns to the signed-out overview when an authenticated API call expires", async ({ page }) => {
  await mockApi(page, { expireAnalytics: true });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Account menu" })).toBeVisible();
  await page.getByRole("link", { name: "Analytics" }).first().click();
  await expect(page.getByRole("button", { name: /continue with ace id/i }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Account menu" })).toHaveCount(0);
});


test("preserves the create form when the server rejects an application request", async ({ page }) => {
  await mockApi(page);
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Account menu" })).toBeVisible();
  await page.getByRole("button", { name: "New application" }).first().click();
  const dialog = page.getByRole("dialog", { name: "Create an application" });
  await dialog.getByLabel("Application name").fill("Keep this value");
  await dialog.getByLabel("Description").fill("Retain this description after failure");
  await dialog.getByLabel("Origin URL").fill("https://app.example.test");
  await dialog.getByRole("button", { name: "Create application", exact: true }).click();
  await expect(dialog.getByText("Application service unavailable")).toBeVisible();
  await expect(dialog.getByLabel("Application name")).toHaveValue("Keep this value");
  await expect(dialog.getByLabel("Description")).toHaveValue("Retain this description after failure");
  await expect(dialog.getByLabel("Origin URL")).toHaveValue("https://app.example.test");
});

test("failed scope loading cannot overwrite settings and can be retried", async ({ page }) => {
  await mockApi(page);
  let attempts = 0;
  let writes = 0;
  await page.route(`**/api/applications/${app.id}/scopes`, async (route) => {
    if (route.request().method() === "PUT") {
      writes++;
      await route.fulfill({ json: { scopes: JSON.parse(route.request().postData() || "{}").scopes } });
    } else if (++attempts === 1) {
      await route.fulfill({ status: 503, json: { error: "Scopes unavailable" } });
    } else {
      await route.fulfill({ json: { scopes: ["openid", "email"] } });
    }
  });
  await page.goto("/#applications");
  await page.getByRole("button", { name: "Manage" }).click();
  await page.getByRole("tab", { name: "Scopes" }).click();
  await expect(page.getByText(/could not load scopes/i)).toBeVisible();
  await expect(page.getByRole("button", { name: "Save scopes" })).toHaveCount(0);
  expect(writes).toBe(0);
  await page.getByRole("button", { name: "Retry" }).click();
  await expect(page.getByRole("switch", { name: "email" })).toBeChecked();
  await page.getByRole("button", { name: "Save scopes" }).click();
  await expect(page.getByText("Scopes saved.")).toBeVisible();
  expect(writes).toBe(1);
});

test("application creation shows confirmation and refreshes the list", async ({ page }) => {
  await mockApi(page);
  let created = false;
  const newApp = { ...app, id: "new-app", name: "New identity app" };
  await page.route("**/api/applications", async (route) => {
    if (route.request().method() === "POST") {
      created = true;
      await route.fulfill({ json: { application: newApp } });
    } else {
      await route.fulfill({ json: { applications: created ? [newApp, app] : [app] } });
    }
  });
  await page.goto("/#applications");
  await page.getByRole("button", { name: "Create application" }).first().click();
  const dialog = page.getByRole("dialog", { name: "Create an application" });
  await dialog.getByLabel("Application name").fill("New identity app");
  await dialog.getByRole("button", { name: "Create application", exact: true }).click();
  await expect(page.getByText("Application “New identity app” created.")).toBeVisible();
  await expect(page.getByText("New identity app", { exact: true })).toBeVisible();
});

test("saved theme and reduced motion reach both theme systems", async ({ page }) => {
  await mockApi(page);
  await page.goto("/#settings");
  await page.getByText("Dark", { exact: true }).click();
  await page.getByRole("switch", { name: "Reduce motion" }).check();
  await page.getByRole("button", { name: "Sync preferences" }).click();
  await expect(page.getByText("Preferences saved on this device.")).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("html")).toHaveAttribute("data-reduce-motion", "true");
  await expect(page.locator("m3e-theme")).toHaveJSProperty("scheme", "dark");
  await expect(page.locator("m3e-theme")).toHaveJSProperty("color", "#1b1b1b");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-reduce-motion", "true");
  await expect(page.locator("m3e-theme")).toHaveJSProperty("scheme", "dark");
});

test("loads drawer sections on demand and keeps the saved app open during a stale refresh", async ({ page }) => {
  await mockApi(page);
  let scopeReads = 0;
  await page.route(`**/api/applications/${app.id}/scopes`, async (route) => {
    scopeReads++;
    await route.fulfill({ json: { scopes: ["openid"] } });
  });
  await page.route(`**/api/applications/${app.id}`, async (route) => {
    await route.fulfill({ json: { application: { ...app, name: "Updated app" } } });
  });
  await page.goto("/#applications");
  await page.getByRole("button", { name: "Manage" }).click();
  await expect(page.getByRole("button", { name: "Edit application" })).toBeVisible();
  expect(scopeReads).toBe(0);
  await page.getByRole("button", { name: "Edit application" }).click();
  await page.getByLabel("Application name").fill("Updated app");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Application updated.")).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Updated app settings" })).toBeVisible();
  await page.getByRole("tab", { name: "Scopes" }).click();
  await expect(page.getByRole("switch", { name: "openid" })).toBeVisible();
  expect(scopeReads).toBe(1);
});

test("diagnostics report partial failures without misreporting API health", async ({ page }) => {
  await mockApi(page);
  await page.route("**/api/integration/discovery", (route) => route.fulfill({ status: 503, json: { error: "unavailable" } }));
  await page.goto("/#settings");
  await expect(page.getByText(/Could not check Ace ID discovery/)).toBeVisible();
  await expect(page.getByText("Healthy", { exact: true })).toBeVisible();
});

test("daily sign-in values remain accessible", async ({ page }) => {
  await mockApi(page);
  await page.route("**/api/analytics/logins**", (route) => route.fulfill({ json: { days: 7, items: [{ date: "2026-10-01", count: 8, uniqueUsers: 4, failedAttempts: 0 }], total: 8, failedAttempts: 0, uniqueUsers: 4 } }));
  await page.goto("/#analytics");
  await expect(page.getByRole("progressbar", { name: "2026-10-01: 8 sign-ins" })).toBeVisible();
});

for (const width of [320, 390, 1440]) {
  test(`editorial landing keeps its typography and fits at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.route("**/api/me", (route) => route.fulfill({ status: 401, json: { error: "Signed out" } }));
    await page.goto("/");
    const heading = page.getByRole("heading", { level: 1, name: /Identity infrastructure/ });
    await expect(heading).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    await expect(heading).toHaveCSS("font-family", /Instrument Serif/);
    await expect(page.locator(".landing-lede")).toHaveCSS("font-family", /Figtree/);
    await expect(page.getByRole("button", { name: "Continue with Ace ID" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Read the documentation" })).toHaveAttribute("href", "https://docs.ace-base.cc/projects/aidc");
    const widths = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }));
    expect(widths.content).toBeLessThanOrEqual(widths.viewport);
  });
}

test("invalid session responses show a recoverable error", async ({ page }) => {
  await mockApi(page);
  let recovered = false;
  await page.route("**/api/me", (route) => route.fulfill({ json: recovered ? { user: { id: "dev-1", name: "Developer" } } : {} }));
  await page.goto("/");
  await expect(page.getByText(/invalid session response/i)).toBeVisible();
  await expect(page.getByRole("button", { name: "Account menu" })).toHaveCount(0);
  recovered = true;
  await page.getByRole("button", { name: "Retry" }).click();
  await expect(page.getByRole("button", { name: "Account menu" })).toBeVisible();
});

test("redirect URIs can be added and removed only after confirmation", async ({ page }) => {
  await mockApi(page);
  const uri = "https://app.example.test/auth/callback";
  let removed = false;
  await page.route(`**/api/applications/${app.id}/redirect-uris`, async (route) => {
    if (route.request().method() === "POST") {
      expect(JSON.parse(route.request().postData() || "{}")).toEqual({ uri });
      await route.fulfill({ json: { redirect_uri: { id: "uri-1", application_id: app.id, uri } } });
    } else {
      await route.fulfill({ json: { redirect_uris: [] } });
    }
  });
  await page.route(`**/api/applications/${app.id}/redirect-uris/uri-1`, async (route) => {
    removed = true;
    await route.fulfill({ json: { deleted: true } });
  });
  await page.goto("/#applications");
  await page.getByRole("button", { name: "Manage" }).click();
  await page.getByRole("tab", { name: "Redirect URIs" }).click();
  await page.getByRole("textbox", { name: "New redirect URI" }).fill(uri);
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByText("Redirect URI added.")).toBeVisible();
  await expect(page.getByText(uri, { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Remove", exact: true }).click();
  const confirmation = page.getByRole("alertdialog", { name: "Remove this redirect URI?" });
  await expect(confirmation).toBeVisible();
  expect(removed).toBe(false);
  await confirmation.getByRole("button", { name: "Remove", exact: true }).click();
  await expect(page.getByText("Redirect URI removed.")).toBeVisible();
  await expect(page.getByText(uri, { exact: true })).toHaveCount(0);
  expect(removed).toBe(true);
});

test("rotated credentials are visible once and cleared on leaving the tab", async ({ page }) => {
  await mockApi(page);
  await page.route(`**/api/applications/${app.id}/credentials`, (route) => route.fulfill({ json: { credentials: [] } }));
  await page.route(`**/api/applications/${app.id}/credentials/rotate`, (route) => route.fulfill({ json: { credential: { id: "credential-1", application_id: app.id, secret_prefix: "secret", secret: "secret-once-only", created_at: "2026-10-01T12:00:00Z" } } }));
  await page.goto("/#applications");
  await page.getByRole("button", { name: "Manage" }).click();
  await page.getByRole("tab", { name: "Credentials" }).click();
  await page.getByRole("button", { name: "Rotate client secret" }).click();
  await page.getByRole("alertdialog", { name: "Rotate credentials?" }).getByRole("button", { name: "Rotate", exact: true }).click();
  await expect(page.getByText("secret-once-only", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Overview" }).click();
  await page.getByRole("tab", { name: "Credentials" }).click();
  await expect(page.getByText("secret-once-only", { exact: true })).toHaveCount(0);
  await expect(page.getByText("secret…", { exact: true })).toBeVisible();
});

test("settings drafts survive navigation, revert, and sync useful defaults", async ({ page }) => {
  await mockApi(page);
  const analyticsRequests: string[] = [];
  page.on("request", (request) => { if (request.url().includes("/api/analytics/logins")) analyticsRequests.push(request.url()); });
  await page.goto("/#settings");
  const theme = page.getByRole("radiogroup", { name: "Theme" });
  await theme.getByRole("radio", { name: "Dark" }).click();
  await expect(page.getByText(/Unsynced changes/)).toBeVisible();
  await expect(page.locator("m3e-theme")).toHaveJSProperty("scheme", "auto");
  await page.getByRole("link", { name: "Applications" }).first().click();
  await page.getByRole("link", { name: "Settings" }).first().click();
  await expect(page.getByText(/Unsynced changes/)).toBeVisible();
  await expect(theme.getByRole("radio", { name: "Dark" })).toHaveAttribute("aria-checked", "true");
  await page.getByRole("button", { name: "Revert changes" }).click();
  await expect(theme.getByRole("radio", { name: "System" })).toHaveAttribute("aria-checked", "true");
  await page.getByRole("radiogroup", { name: "Default reporting range" }).getByRole("radio", { name: "30 days" }).click();
  await page.getByRole("radiogroup", { name: "Text size" }).getByRole("radio", { name: "Large" }).click();
  await page.getByRole("radiogroup", { name: "Material contrast" }).getByRole("radio", { name: "High" }).click();
  await page.getByRole("switch", { name: "Haptic feedback" }).uncheck();
  await page.getByRole("button", { name: "Sync preferences" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-text-size", "large");
  await expect(page.locator("m3e-theme")).toHaveJSProperty("contrast", "high");
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("aidc-neo-preferences-v1") || "{}"))).toMatchObject({ defaultRange: 30, hapticFeedback: false });
  await page.getByRole("link", { name: "Analytics" }).first().click();
  await expect.poll(() => analyticsRequests.some((url) => new URL(url).searchParams.get("days") === "30")).toBe(true);
  await page.getByRole("link", { name: "Settings" }).first().click();
  await page.getByRole("button", { name: "Restore defaults" }).click();
  await expect(page.getByText(/Unsynced changes/)).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-text-size", "large");
  await page.getByRole("button", { name: "Revert changes" }).click();
  await expect(page.getByRole("radiogroup", { name: "Text size" }).getByRole("radio", { name: "Large" })).toHaveAttribute("aria-checked", "true");
});

test("settings avoid overwriting changes from another tab", async ({ page, context }) => {
  await mockApi(page);
  await page.goto("/#settings");
  await page.getByRole("radiogroup", { name: "Theme" }).getByRole("radio", { name: "Dark" }).click();
  const other = await context.newPage();
  await mockApi(other);
  await other.goto("/#settings");
  await other.getByRole("radiogroup", { name: "Theme" }).getByRole("radio", { name: "Light" }).click();
  await other.getByRole("button", { name: "Sync preferences" }).click();
  await expect(page.getByText(/Saved preferences changed in another tab/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Sync preferences" })).toBeDisabled();
  await expect(page.getByRole("radiogroup", { name: "Theme" }).getByRole("radio", { name: "Dark" })).toHaveAttribute("aria-checked", "true");
  await page.getByRole("button", { name: "Revert changes" }).click();
  await expect(page.getByRole("radiogroup", { name: "Theme" }).getByRole("radio", { name: "Light" })).toHaveAttribute("aria-checked", "true");
  await other.close();
});

test("failed preference sync keeps the draft available for retry", async ({ page }) => {
  await mockApi(page);
  await page.goto("/#settings");
  await page.getByRole("radiogroup", { name: "Theme" }).getByRole("radio", { name: "Dark" }).click();
  await page.evaluate(() => { Storage.prototype.setItem = () => { throw new Error("Storage denied"); }; });
  await page.getByRole("button", { name: "Sync preferences" }).click();
  await expect(page.getByRole("alert")).toContainText("Your changes are still here");
  await expect(page.getByText(/Unsynced changes/)).toBeVisible();
  await expect(page.getByRole("radiogroup", { name: "Theme" }).getByRole("radio", { name: "Dark" })).toHaveAttribute("aria-checked", "true");
});

test("settings controls fit a narrow viewport", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await mockApi(page);
  await page.goto("/#settings");
  await expect(page.getByRole("heading", { name: "Settings", level: 1 })).toBeVisible();
  const widths = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }));
  expect(widths.content).toBeLessThanOrEqual(widths.viewport);
});

test("phone shell floats the navigation and keeps settings behind the profile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockApi(page);
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Primary" });
  await expect(nav).toBeVisible();
  // Settings is not a destination any more, and the header no longer duplicates the account menu.
  await expect(nav.getByRole("button", { name: "Settings", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Account menu" })).toHaveCount(0);
  await expect(nav.getByRole("button")).toHaveCount(5);
  const analytics = nav.getByRole("button", { name: "Analytics" });
  await analytics.click();
  await expect(analytics).toHaveAttribute("aria-current", "page");
  await expect(analytics.locator(".mobile-nav-label")).toHaveText("Analytics");
  await expect(page.getByRole("heading", { name: "Analytics", level: 1 })).toBeVisible();
  const profile = nav.getByRole("button", { name: /account and settings/i });
  await profile.click();
  const sheet = page.getByRole("dialog", { name: "Account" });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByText("Test Developer")).toBeVisible();
  await expect(profile).toHaveAttribute("aria-expanded", "true");
  await sheet.getByRole("button", { name: /^Settings/ }).click();
  await expect(page.getByRole("heading", { name: "Settings", level: 1 })).toBeVisible();
  await expect(page).toHaveURL(/#settings$/);
  await expect(profile).toHaveClass(/is-active/);
});

test("floating navigation fits the narrowest phone", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await mockApi(page);
  await page.goto("/#analytics");
  const nav = page.getByRole("navigation", { name: "Primary" });
  await expect(nav).toBeVisible();
  await expect(nav.getByRole("button", { name: "Analytics" })).toHaveAttribute("aria-current", "page");
  const widths = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }));
  expect(widths.content).toBeLessThanOrEqual(widths.viewport);
  const box = await nav.boundingBox();
  expect(box).not.toBeNull();
  expect(box?.x ?? -1).toBeGreaterThanOrEqual(0);
  expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(widths.viewport);
});
