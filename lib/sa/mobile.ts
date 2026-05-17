type ValidResult = { valid: true; e164: string };
type InvalidResult = { valid: false; error: string };
export type MobileResult = ValidResult | InvalidResult;

// SA mobile numbers: 10 digits starting with 06x, 07x, 08x
const SA_LOCAL_RE = /^0[6-8]\d{8}$/;

export function normalizeMobile(raw: string): MobileResult {
  if (typeof raw !== "string" || raw.trim() === "") {
    return { valid: false, error: "Mobile number is required" };
  }

  const stripped = raw.replace(/[\s\-().]/g, "");

  if (stripped.startsWith("+27")) {
    const local = "0" + stripped.slice(3);
    if (!SA_LOCAL_RE.test(local)) {
      return { valid: false, error: "Invalid SA mobile number" };
    }
    return { valid: true, e164: stripped };
  }

  // Country code without +
  if (/^27\d{9}$/.test(stripped)) {
    const local = "0" + stripped.slice(2);
    if (!SA_LOCAL_RE.test(local)) {
      return { valid: false, error: "Invalid SA mobile number" };
    }
    return { valid: true, e164: "+" + stripped };
  }

  if (SA_LOCAL_RE.test(stripped)) {
    return { valid: true, e164: "+27" + stripped.slice(1) };
  }

  return { valid: false, error: "Invalid SA mobile number" };
}
