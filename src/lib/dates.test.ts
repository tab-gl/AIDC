import { describe, expect, it } from "vitest";
import { dayLabel, parseDay } from "./dates";

describe("day labels", () => {
  it("reads RFC 3339 timestamps returned by the API", () => {
    const parsed = parseDay("2026-11-23T00:00:00Z");
    expect(parsed?.getFullYear()).toBe(2026);
    expect(parsed?.getMonth()).toBe(10);
    expect(parsed?.getDate()).toBe(23);
    expect(dayLabel("2026-11-23T00:00:00Z")).not.toBe("Invalid Date");
  });
  it("reads plain calendar dates", () => {
    expect(dayLabel("2026-10-01")).toContain("Oct");
  });
  it("leaves values it cannot parse untouched", () => {
    expect(dayLabel("not a date")).toBe("not a date");
  });
});
