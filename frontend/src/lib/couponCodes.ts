/**
 * Professional campaign coupon codes:
 * - Prefix `FND` (Fondly)
 * - 12 hex chars from CSPRNG (48 bits entropy) — no ambiguous manual glyphs vs Crockford, strong for single-use vouchers
 * - Normalized form: uppercase A–F0–9 only (15 characters total)
 */

const PREFIX = 'FND';

/** Strip spaces/dashes and uppercase for DB lookup */
export function normalizeCouponInput(raw: string): string {
  return raw.replace(/[\s-–—]/g, '').toUpperCase();
}

/** One cryptographically random coupon, e.g. `FND9A3F2E1B8C4D7A5E6F0` */
export function generateCouponCode(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  return `${PREFIX}${hex}`;
}

/** `count` unique codes (collision-resistant for campaign sizes). */
export function generateUniqueCouponCodes(count: number): string[] {
  const set = new Set<string>();
  const maxAttempts = Math.max(count * 64, 10_000);
  let attempts = 0;
  while (set.size < count && attempts < maxAttempts) {
    set.add(generateCouponCode());
    attempts++;
  }
  if (set.size < count) {
    throw new Error(`Could not generate ${count} unique coupon codes`);
  }
  return [...set];
}
