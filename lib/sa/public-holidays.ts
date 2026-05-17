// Anonymous Gregorian algorithm for Easter Sunday
function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// Returns all public holiday dates for the year, including observed Mondays
// when a fixed holiday falls on a Sunday (SA Public Holidays Act 36 of 1994).
export function publicHolidaysZA(year: number): Date[] {
  const easter = easterSunday(year);

  const holidays: Date[] = [
    new Date(year, 0, 1),   // New Year's Day
    new Date(year, 2, 21),  // Human Rights Day
    addDays(easter, -2),    // Good Friday
    addDays(easter, 1),     // Family Day
    new Date(year, 3, 27),  // Freedom Day
    new Date(year, 4, 1),   // Workers' Day
    new Date(year, 5, 16),  // Youth Day
    new Date(year, 7, 9),   // National Women's Day
    new Date(year, 8, 24),  // Heritage Day
    new Date(year, 11, 16), // Day of Reconciliation
    new Date(year, 11, 25), // Christmas Day
    new Date(year, 11, 26), // Day of Goodwill
  ];

  // Add observed Monday when a fixed holiday falls on Sunday
  const observed: Date[] = [];
  for (const h of holidays) {
    if (h.getDay() === 0) {
      observed.push(addDays(h, 1));
    }
  }

  return [...holidays, ...observed].sort((a, b) => a.getTime() - b.getTime());
}

export function isPublicHoliday(date: Date): boolean {
  const holidays = publicHolidaysZA(date.getFullYear());
  return holidays.some((h) => sameDay(h, date));
}
