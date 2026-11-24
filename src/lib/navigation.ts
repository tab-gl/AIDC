export const routes = [
  { id: "overview", label: "Overview" },
  { id: "applications", label: "Applications" },
  { id: "analytics", label: "Analytics" },
  { id: "activity", label: "Activity" },
  { id: "users", label: "Users" },
  { id: "settings", label: "Settings" }
] as const;
export type RouteId = (typeof routes)[number]["id"];
export function readRoute(): RouteId {
  const value = window.location.hash.replace(/^#\/?/, "");
  return routes.some((route) => route.id === value) ? value as RouteId : "overview";
}
export function navigate(route: RouteId) {
  window.location.hash = route === "overview" ? "" : route;
}
