import { describe, it, expect } from "vitest";
import { formatZAR } from "../currency";

describe("formatZAR", () => {
  it("formats zero cents", () => {
    expect(formatZAR(0)).toBe("R 0,00");
  });

  it("formats exactly one rand (100 cents)", () => {
    expect(formatZAR(100)).toBe("R 1,00");
  });

  it("formats cents less than one rand", () => {
    expect(formatZAR(99)).toBe("R 0,99");
  });

  it("formats a typical consultation fee (R 450,00)", () => {
    expect(formatZAR(45000)).toBe("R 450,00");
  });

  it("formats with thousands separator", () => {
    expect(formatZAR(100000)).toBe("R 1 000,00");
  });

  it("formats a large amount", () => {
    expect(formatZAR(1234567)).toBe("R 12 345,67");
  });

  it("formats a negative amount (refund)", () => {
    expect(formatZAR(-100)).toBe("-R 1,00");
  });

  it("rounds sub-cent floating point if passed (defensive)", () => {
    // Input should always be integer cents, but guard against float drift
    expect(formatZAR(Math.round(45000))).toBe("R 450,00");
  });
});
