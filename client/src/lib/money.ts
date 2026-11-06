/**
 * Money display. The app shows one base currency (USD); native amounts stay on
 * the parsed rows, and no view switches currency.
 *
 * Formats a magnitude: the sign is intentionally dropped, because callers
 * already render spending as a positive figure.
 */
export function formatUSD(
  amount: number | null | undefined,
  decimals = 2,
): string {
  const value = typeof amount === 'number' && Number.isFinite(amount)
    ? Math.abs(amount)
    : 0;
  return `$${value.toFixed(decimals)}`;
}
