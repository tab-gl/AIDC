import { describe, expect, it } from "vitest";
import { reconcileApplications } from "./applications";

const a = { id: "a", name: "Old name" };
const b = { id: "b", name: "Other" };

describe("application refresh reconciliation", () => {
  it("preserves an update over a stale list without reordering other apps", () => {
    expect(reconcileApplications([b, a], { upsert: { ...a, name: "New name" } })).toEqual([b, { ...a, name: "New name" }]);
  });
  it("retains a new app omitted from a stale list", () => {
    expect(reconcileApplications([b], { upsert: a })).toEqual([a, b]);
  });
  it("does not resurrect an app in a stale list after deletion", () => {
    expect(reconcileApplications([a, b], { removedId: "a" })).toEqual([b]);
  });
});
