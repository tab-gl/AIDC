import type { Application } from "../types";

/** Keep a confirmed mutation authoritative when a list refresh is stale. */
export function reconcileApplications(items: Application[], change?: { upsert?: Application; removedId?: string }): Application[] {
  const filtered = items.filter((item) => item.id !== change?.removedId);
  if (!change?.upsert) return filtered;
  const updated = change.upsert;
  return filtered.some((item) => item.id === updated.id)
    ? filtered.map((item) => item.id === updated.id ? updated : item)
    : [updated, ...filtered];
}
