export const routes = [
  { id: "overview", label: "Overview" },
  { id: "applications", label: "Applications" },
  { id: "insights", label: "Insights" },
  { id: "settings", label: "Settings" }
] as const;
export type RouteId = (typeof routes)[number]["id"];

/** Sections inside the Insights page. Older links (#analytics, #activity, #users) still open them. */
export const INSIGHTS_TABS = [
  { id: "analytics", label: "Analytics" },
  { id: "activity", label: "Activity" },
  { id: "users", label: "Users" }
] as const;
export type InsightsTab = (typeof INSIGHTS_TABS)[number]["id"];

const currentHash = () => window.location.hash.replace(/^#\/?/, "");
const isInsightsTab = (value: string): value is InsightsTab => INSIGHTS_TABS.some((tab) => tab.id === value);

export function readRoute(): RouteId {
  const value = currentHash();
  if (isInsightsTab(value)) return "insights";
  return routes.some((route) => route.id === value) ? value as RouteId : "overview";
}

export function readInsightsTab(): InsightsTab {
  const value = currentHash();
  return isInsightsTab(value) ? value : "analytics";
}

export function navigate(route: RouteId | InsightsTab) {
  window.location.hash = route === "overview" ? "" : route;
}
