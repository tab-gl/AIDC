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
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ quota: { plan: "base", status: "active", count: 1, limit: 8, remaining: 7 }, entitlements: { plan: "base", status: "active", applications: 8, mau: 5000, usage: { applications: 1 }, subscription: null, features: {}, offers: [], accessories: [] } }) });
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
    } else if (path === "/api/plans") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ plans: [{ id: "base", name: "Base", priceInrMonthly: 0, applications: 8, mau: 5000 }], payments: { razorpayConfigured: false } }) });
    } else {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({}) });
    }
  });
}

test("loads the signed-in console and filters applications", async ({ page }) => {
  await mockApi(page);
  await page.goto("/");
  await expect(page.getByText("Test Developer")).toBeVisible();
  await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("button", { name: "Applications" }).click();
  await expect(page.getByRole("heading", { name: "Applications", level: 2 })).toBeVisible();
  await expect(page.getByText("Example identity app")).toBeVisible();
  const search = page.getByRole("textbox", { name: "Search applications" });
  await search.fill("not a match");
  await expect(page.getByText(/no applications match/i)).toBeVisible();
  await search.fill("Example identity");
  await expect(page.getByText("Example identity app")).toBeVisible();
});

test("returns to the signed-out overview when an authenticated API call expires", async ({ page }) => {
  await mockApi(page, { expireAnalytics: true });
  await page.goto("/");
  await expect(page.getByText("Test Developer")).toBeVisible();
  await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("button", { name: "Analytics" }).click();
  await expect(page.getByRole("button", { name: /continue with ace id/i }).first()).toBeVisible();
  await expect(page.getByText("Test Developer")).toHaveCount(0);
});


test("preserves the create form when the server rejects an application request", async ({ page }) => {
  await mockApi(page);
  await page.goto("/");
  await expect(page.getByText("Test Developer")).toBeVisible();
  await page.getByRole("button", { name: "Create application" }).first().click();
  const dialog = page.getByRole("dialog", { name: "Create a real client" });
  await dialog.getByLabel("Application name").fill("Keep this value");
  await dialog.getByLabel("Description").fill("Retain this description after failure");
  await dialog.getByLabel("Origin URL").fill("https://app.example.test");
  await dialog.getByRole("button", { name: "Create application", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("Application service unavailable");
  await expect(dialog.getByLabel("Application name")).toHaveValue("Keep this value");
  await expect(dialog.getByLabel("Description")).toHaveValue("Retain this description after failure");
  await expect(dialog.getByLabel("Origin URL")).toHaveValue("https://app.example.test");
});
