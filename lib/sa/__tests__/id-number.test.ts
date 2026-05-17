import { describe, it, expect } from "vitest";
import { validateIdNumber } from "../id-number";

// Reference date kept fixed so tests don't drift as time passes
const REF = new Date("2026-05-17");

describe("validateIdNumber", () => {
  it("accepts a valid male citizen ID", () => {
    const r = validateIdNumber("8001015009087", REF);
    expect(r.valid).toBe(true);
    if (!r.valid) return;
    expect(r.gender).toBe("male");
    expect(r.citizenship).toBe("citizen");
    expect(r.dateOfBirth.getFullYear()).toBe(1980);
    expect(r.dateOfBirth.getMonth()).toBe(0); // January
    expect(r.dateOfBirth.getDate()).toBe(1);
  });

  it("accepts a valid female citizen ID", () => {
    // born 1990-01-04, female (sequence 0001), SA citizen
    const r = validateIdNumber("9001040001082", REF);
    expect(r.valid).toBe(true);
    if (!r.valid) return;
    expect(r.gender).toBe("female");
    expect(r.citizenship).toBe("citizen");
    expect(r.dateOfBirth.getFullYear()).toBe(1990);
    expect(r.dateOfBirth.getMonth()).toBe(0);
    expect(r.dateOfBirth.getDate()).toBe(4);
  });

  it("accepts a valid permanent resident ID", () => {
    // Same DOB as first test, citizenship digit = 1
    const r = validateIdNumber("8001015009186", REF);
    expect(r.valid).toBe(true);
    if (!r.valid) return;
    expect(r.citizenship).toBe("permanent_resident");
  });

  it("rejects an ID that is too short", () => {
    const r = validateIdNumber("800101500908", REF);
    expect(r.valid).toBe(false);
    if (r.valid) return;
    expect(r.error).toMatch(/13 digits/);
  });

  it("rejects an ID that is too long", () => {
    const r = validateIdNumber("80010150090871", REF);
    expect(r.valid).toBe(false);
  });

  it("rejects non-numeric input", () => {
    const r = validateIdNumber("800101500908A", REF);
    expect(r.valid).toBe(false);
  });

  it("rejects an empty string", () => {
    const r = validateIdNumber("", REF);
    expect(r.valid).toBe(false);
    if (r.valid) return;
    expect(r.error).toMatch(/required/i);
  });

  it("rejects a bad checksum (last digit changed)", () => {
    const r = validateIdNumber("8001015009088", REF); // valid ID with digit flipped
    expect(r.valid).toBe(false);
    if (r.valid) return;
    expect(r.error).toMatch(/checksum/i);
  });

  it("rejects an ID with an invalid month (13)", () => {
    // Luhn-valid but month = 13
    const r = validateIdNumber("8013015009082", REF);
    expect(r.valid).toBe(false);
    if (r.valid) return;
    expect(r.error).toMatch(/date of birth/i);
  });

  it("rejects an ID with an impossible day (00)", () => {
    // Luhn-valid but day=00 is not a real date
    const r = validateIdNumber("8001005009089", REF);
    expect(r.valid).toBe(false);
    if (r.valid) return;
    expect(r.error).toMatch(/date of birth/i);
  });

  it("rejects a future date of birth", () => {
    // 2026-12-25, male, citizen — valid Luhn, but after REF date (2026-05-17)
    const r = validateIdNumber("2612255000085", REF);
    expect(r.valid).toBe(false);
    if (r.valid) return;
    expect(r.error).toMatch(/future/i);
  });

  it("strips leading/trailing spaces before validating", () => {
    const r = validateIdNumber(" 8001015009087 ", REF);
    expect(r.valid).toBe(true);
  });
});
