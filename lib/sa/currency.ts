// Integer cents only — never pass floats.
export function formatZAR(cents: number): string {
  const negative = cents < 0;
  const abs = Math.abs(Math.round(cents));
  const randCents = abs % 100;
  const rands = Math.floor(abs / 100);
  const randsStr = rands.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${negative ? "-" : ""}R ${randsStr},${randCents.toString().padStart(2, "0")}`;
}
