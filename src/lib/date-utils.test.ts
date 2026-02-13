import { describe, it, expect } from "vitest";
import {
  formatLocalDate,
  parseLocalDate,
  addLocalDays,
  diffLocalDays,
  localDateTimeToISO,
} from "./date-utils";

describe("formatLocalDate", () => {
  it("formats a Date to YYYY-MM-DD using local components", () => {
    // Feb 13, 2025 local
    const d = new Date(2025, 1, 13);
    expect(formatLocalDate(d)).toBe("2025-02-13");
  });

  it("pads single-digit month and day", () => {
    const d = new Date(2025, 0, 5); // Jan 5
    expect(formatLocalDate(d)).toBe("2025-01-05");
  });
});

describe("parseLocalDate", () => {
  it("parses YYYY-MM-DD to local midnight Date", () => {
    const d = parseLocalDate("2025-02-13");
    expect(d.getFullYear()).toBe(2025);
    expect(d.getMonth()).toBe(1); // 0-indexed
    expect(d.getDate()).toBe(13);
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
  });

  it("round-trips with formatLocalDate", () => {
    const dateStr = "2025-03-10";
    expect(formatLocalDate(parseLocalDate(dateStr))).toBe(dateStr);
  });

  it("selecting Feb 13 shows Feb 13 (not Feb 14)", () => {
    const selected = "2025-02-13";
    const parsed = parseLocalDate(selected);
    const displayed = formatLocalDate(parsed);
    expect(displayed).toBe("2025-02-13");
  });
});

describe("addLocalDays", () => {
  it("adds 1 day", () => {
    expect(addLocalDays("2025-02-13", 1)).toBe("2025-02-14");
  });

  it("handles month boundary", () => {
    expect(addLocalDays("2025-02-28", 1)).toBe("2025-03-01");
  });

  it("subtracts days with negative value", () => {
    expect(addLocalDays("2025-03-01", -1)).toBe("2025-02-28");
  });
});

describe("diffLocalDays", () => {
  it("returns 0 for same date", () => {
    expect(diffLocalDays("2025-02-13", "2025-02-13")).toBe(0);
  });

  it("returns correct days for multi-day span", () => {
    expect(diffLocalDays("2025-03-05", "2025-03-10")).toBe(5);
  });

  it("returns 1 for consecutive days", () => {
    expect(diffLocalDays("2025-02-13", "2025-02-14")).toBe(1);
  });
});

describe("localDateTimeToISO", () => {
  it("converts date + time to an ISO string preserving the correct date", () => {
    const iso = localDateTimeToISO("2025-03-10", "10:00");
    const d = new Date(iso);
    // The local date should be March 10 regardless of timezone
    expect(d.getFullYear()).toBe(2025);
    expect(d.getMonth()).toBe(2); // March = 2
    expect(d.getDate()).toBe(10);
    expect(d.getHours()).toBe(10);
    expect(d.getMinutes()).toBe(0);
  });

  it("preserves date across reload (round-trip via localStorage)", () => {
    const originalDate = "2025-03-10";
    // Simulate: user picks date → stored in localStorage → reloaded
    const parsed = parseLocalDate(originalDate);
    const storedStr = formatLocalDate(parsed);
    const reloaded = parseLocalDate(storedStr);
    expect(formatLocalDate(reloaded)).toBe("2025-03-10");
  });
});
