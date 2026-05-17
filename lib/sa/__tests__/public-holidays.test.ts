import { describe, it, expect } from "vitest";
import { publicHolidaysZA, isPublicHoliday } from "../public-holidays";

// Easter 2026 = 5 April  →  Good Friday = 3 April, Family Day = 6 April
// August 9 2026 = Sunday →  observed Monday = August 10

describe("publicHolidaysZA", () => {
  it("returns at least 12 entries for 2026", () => {
    expect(publicHolidaysZA(2026).length).toBeGreaterThanOrEqual(12);
  });

  it("includes the observed Monday when Women's Day falls on Sunday (2026)", () => {
    const holidays = publicHolidaysZA(2026);
    const aug10 = holidays.some(
      (h) => h.getMonth() === 7 && h.getDate() === 10 && h.getFullYear() === 2026
    );
    expect(aug10).toBe(true);
  });

  it("returns dates sorted in ascending order", () => {
    const holidays = publicHolidaysZA(2026);
    for (let i = 1; i < holidays.length; i++) {
      expect(holidays[i]!.getTime()).toBeGreaterThanOrEqual(holidays[i - 1]!.getTime());
    }
  });
});

describe("isPublicHoliday", () => {
  it("identifies New Year's Day", () => {
    expect(isPublicHoliday(new Date(2026, 0, 1))).toBe(true);
  });

  it("identifies Good Friday (2026-04-03)", () => {
    expect(isPublicHoliday(new Date(2026, 3, 3))).toBe(true);
  });

  it("identifies Family Day / Easter Monday (2026-04-06)", () => {
    expect(isPublicHoliday(new Date(2026, 3, 6))).toBe(true);
  });

  it("identifies Women's Day on the Sunday (2026-08-09)", () => {
    expect(isPublicHoliday(new Date(2026, 7, 9))).toBe(true);
  });

  it("identifies the observed Women's Day Monday (2026-08-10)", () => {
    expect(isPublicHoliday(new Date(2026, 7, 10))).toBe(true);
  });

  it("identifies Christmas Day", () => {
    expect(isPublicHoliday(new Date(2026, 11, 25))).toBe(true);
  });

  it("identifies Day of Goodwill (Boxing Day)", () => {
    expect(isPublicHoliday(new Date(2026, 11, 26))).toBe(true);
  });

  it("returns false for a regular working day", () => {
    expect(isPublicHoliday(new Date(2026, 4, 17))).toBe(false); // May 17
  });

  it("returns false for New Year's Eve", () => {
    expect(isPublicHoliday(new Date(2026, 11, 31))).toBe(false);
  });
});
