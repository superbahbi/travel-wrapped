import { describe, expect, it } from 'vitest';
import { formatUSD } from './money';

describe('formatUSD', () => {
  it('formats a positive amount with two decimals by default', () => {
    expect(formatUSD(1234.48)).toBe('$1234.48');
  });

  it('drops the sign', () => {
    expect(formatUSD(-4)).toBe('$4.00');
  });

  it('respects the decimal count', () => {
    expect(formatUSD(1234.48, 0)).toBe('$1234');
    expect(formatUSD(4, 1)).toBe('$4.0');
  });

  it('formats zero', () => {
    expect(formatUSD(0)).toBe('$0.00');
  });

  it('falls back to zero for non-finite and missing values', () => {
    expect(formatUSD(Number.NaN)).toBe('$0.00');
    expect(formatUSD(Number.POSITIVE_INFINITY)).toBe('$0.00');
    expect(formatUSD(undefined)).toBe('$0.00');
    expect(formatUSD(null)).toBe('$0.00');
  });
});
