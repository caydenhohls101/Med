type ValidResult = {
  valid: true;
  dateOfBirth: Date;
  gender: "male" | "female";
  citizenship: "citizen" | "permanent_resident";
};

type InvalidResult = {
  valid: false;
  error: string;
};

export type IdNumberResult = ValidResult | InvalidResult;

function luhnValid(digits: string): boolean {
  let sum = 0;
  let alternate = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = parseInt(digits[i]!);
    if (alternate) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    alternate = !alternate;
  }
  return sum % 10 === 0;
}

export function validateIdNumber(
  id: string,
  referenceDate: Date = new Date(),
): IdNumberResult {
  if (typeof id !== "string" || id.trim() === "") {
    return { valid: false, error: "ID number is required" };
  }

  const cleaned = id.replace(/\s/g, "");

  if (!/^\d{13}$/.test(cleaned)) {
    return { valid: false, error: "ID number must be exactly 13 digits" };
  }

  if (!luhnValid(cleaned)) {
    return { valid: false, error: "Invalid ID number (checksum failed)" };
  }

  const yy = parseInt(cleaned.slice(0, 2));
  const mm = parseInt(cleaned.slice(2, 4));
  const dd = parseInt(cleaned.slice(4, 6));

  const refYY = referenceDate.getFullYear() % 100;
  const century = yy <= refYY ? 2000 : 1900;
  const year = century + yy;

  const dob = new Date(year, mm - 1, dd);
  if (
    dob.getFullYear() !== year ||
    dob.getMonth() !== mm - 1 ||
    dob.getDate() !== dd
  ) {
    return { valid: false, error: "Invalid date of birth in ID number" };
  }

  const refDay = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate(),
  );
  if (dob > refDay) {
    return { valid: false, error: "Date of birth cannot be in the future" };
  }

  const sequence = parseInt(cleaned.slice(6, 10));
  const gender: "male" | "female" = sequence >= 5000 ? "male" : "female";

  const citizenDigit = parseInt(cleaned[10]!);
  const citizenship: "citizen" | "permanent_resident" =
    citizenDigit === 0 ? "citizen" : "permanent_resident";

  return { valid: true, dateOfBirth: dob, gender, citizenship };
}
