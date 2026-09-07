/**
 * Money rules: store integer cents in DB. Convert at API boundaries only.
 * Never use Float/Double for money in persistence.
 */

export function randsToCents(rands: number | string): number {
  const n = typeof rands === "string" ? Number(rands) : rands;
  if (!Number.isFinite(n)) throw new Error("Invalid monetary amount");
  return Math.round(n * 100);
}

export function centsToRands(cents: number | bigint): number {
  const n = typeof cents === "bigint" ? Number(cents) : cents;
  return Math.round(n) / 100;
}

export function centsToRandsFixed(cents: number | bigint): string {
  return centsToRands(cents).toFixed(2);
}
