import { describe, it, expect } from "vitest";
import { normalizeMobile } from "../mobile";

describe("normalizeMobile", () => {
  it("normalises a local 082 number to E.164", () => {
    const r = normalizeMobile("0821234567");
    expect(r.valid).toBe(true);
    if (!r.valid) return;
    expect(r.e164).toBe("+27821234567");
  });

  it("accepts a number already in E.164 format", () => {
    const r = normalizeMobile("+27821234567");
    expect(r.valid).toBe(true);
    if (!r.valid) return;
    expect(r.e164).toBe("+27821234567");
  });

  it("strips spaces", () => {
    const r = normalizeMobile("082 123 4567");
    expect(r.valid).toBe(true);
    if (!r.valid) return;
    expect(r.e164).toBe("+27821234567");
  });

  it("strips dashes", () => {
    const r = normalizeMobile("082-123-4567");
    expect(r.valid).toBe(true);
    if (!r.valid) return;
    expect(r.e164).toBe("+27821234567");
  });

  it("accepts a number starting with 27 (no plus)", () => {
    const r = normalizeMobile("27821234567");
    expect(r.valid).toBe(true);
    if (!r.valid) return;
    expect(r.e164).toBe("+27821234567");
  });

  it("accepts a 071 number (Vodacom)", () => {
    const r = normalizeMobile("0711234567");
    expect(r.valid).toBe(true);
    if (!r.valid) return;
    expect(r.e164).toBe("+27711234567");
  });

  it("accepts a 060 number", () => {
    const r = normalizeMobile("0601234567");
    expect(r.valid).toBe(true);
    if (!r.valid) return;
    expect(r.e164).toBe("+27601234567");
  });

  it("rejects a SA landline (011 prefix)", () => {
    const r = normalizeMobile("0112345678");
    expect(r.valid).toBe(false);
  });

  it("rejects a number that is too short", () => {
    const r = normalizeMobile("082123456"); // 9 digits
    expect(r.valid).toBe(false);
  });

  it("rejects a number that is too long", () => {
    const r = normalizeMobile("08212345678"); // 11 digits
    expect(r.valid).toBe(false);
  });

  it("rejects non-numeric input", () => {
    const r = normalizeMobile("abc");
    expect(r.valid).toBe(false);
  });

  it("rejects an empty string", () => {
    const r = normalizeMobile("");
    expect(r.valid).toBe(false);
    if (r.valid) return;
    expect(r.error).toMatch(/required/i);
  });
});
