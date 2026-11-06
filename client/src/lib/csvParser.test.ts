import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  CanonicalCsvError,
  computeTripStats,
  parseAccommodations,
  parseTransactions,
} from './csvParser';

const TRANSACTION_HEADER =
  'Date,Merchant,Amount,Currency,AmountUSD,FXRate,FXDate,Category,Payment,City,Country,Notes';

const TRANSACTION_FIXTURE = [
  TRANSACTION_HEADER,
  '2026-06-08 09:30:00,"Cafe, Central",-28.00,CNY,-4.00,7.0000,2026-06-08,Food,Alipay,Chengdu,China,breakfast',
  '2026-06-08 21:30:00,Metro,-7.00,CNY,-1.00,7.0000,2026-06-08,Transport,WeChat,Chengdu,China,',
  '2026-06-09 12:00:00,Hostel,-200.00,CNY,-28.57,7.0000,2026-06-09,Accommodation,Other,Lijiang,China,2 nights',
  '2026-06-09 12:00:00,Refund,20.00,CNY,2.86,7.0000,2026-06-09,Accommodation,Other,Lijiang,China,refund',
  '2026-06-10 18:00:00,Train 12306,-300.00,CNY,-42.86,7.0000,2026-06-10,Intercity Transport,Alipay,China,China,',
].join('\n');

const ACCOMMODATION_FIXTURE = [
  'Date,Merchant,City,Country,Amount,Currency,AmountUSD,FXRate,FXDate,Notes',
  '2026-06-08,Dengba Hostel,Shenzhen,China,60.10,CNY,8.347222,7.2000,2026-06-08,1 night',
  '2026-06-09,Dengba Hostel,Shenzhen,China,58.67,CNY,8.148611,7.2000,2026-06-09,night 2',
].join('\n');

describe('parseTransactions', () => {
  it('reads columns by header name and keeps quoted commas', () => {
    const [first] = parseTransactions(TRANSACTION_FIXTURE);
    expect(first.merchant).toBe('Cafe, Central');
    expect(first.amount).toBe(-28);
    expect(first.currency).toBe('CNY');
    expect(first.amountUSD).toBe(-4);
    expect(first.fxRate).toBe(7);
    expect(first.fxDate).toBe('2026-06-08');
    expect(first.country).toBe('China');
  });

  it('splits the timestamp into date and time', () => {
    const [first] = parseTransactions(TRANSACTION_FIXTURE);
    expect(first.date).toBe('2026-06-08');
    expect(first.time).toBe('09:30:00');
  });

  it('treats midnight as an unknown time', () => {
    const [first] = parseTransactions(
      [
        TRANSACTION_HEADER,
        '2026-06-08 00:00:00,Hostel,-100.00,CNY,-14.29,7.0000,2026-06-08,Accommodation,Other,Lijiang,China,',
      ].join('\n'),
    );
    expect(first.date).toBe('2026-06-08');
    expect(first.time).toBeNull();
  });

  it('returns nothing for an empty or header-only file', () => {
    expect(parseTransactions('')).toHaveLength(0);
    expect(parseTransactions(TRANSACTION_HEADER)).toHaveLength(0);
  });
});

describe('canonical schema validation', () => {
  it('rejects a missing column', () => {
    const csv = TRANSACTION_FIXTURE.replace(',Country', '');
    expect(() => parseTransactions(csv)).toThrow(CanonicalCsvError);
    expect(() => parseTransactions(csv)).toThrow(
      /missing required columns: Country/,
    );
  });

  it('rejects a malformed date and names the row', () => {
    const csv = TRANSACTION_FIXTURE.replace(
      '2026-06-08 09:30:00',
      '08/06/2026',
    );
    expect(() => parseTransactions(csv)).toThrow(/Row 2: Date must be/);
  });

  it('rejects a malformed currency', () => {
    const csv = TRANSACTION_FIXTURE.replace(',CNY,', ',EURO,');
    expect(() => parseTransactions(csv)).toThrow(/Currency must be/);
  });

  it('rejects a non-numeric amount', () => {
    const csv = TRANSACTION_FIXTURE.replace(',-28.00,CNY', ',abc,CNY');
    expect(() => parseTransactions(csv)).toThrow(/Amount must be a number/);
  });

  it('rejects a malformed FX date', () => {
    const csv = TRANSACTION_FIXTURE.replace(',2026-06-08,Food', ',06/08,Food');
    expect(() => parseTransactions(csv)).toThrow(/FXDate must be/);
  });
});

describe('computeTripStats', () => {
  const stats = computeTripStats(parseTransactions(TRANSACTION_FIXTURE));

  it('counts only negative rows as spend', () => {
    expect(stats.transactionCount).toBe(4);
    expect(stats.grandTotal).toBeCloseTo(76.43, 2);
  });

  it('excludes refunds from day totals', () => {
    const refundDay = stats.dayStats.find((day) => day.date === '2026-06-09');
    expect(refundDay?.total).toBeCloseTo(28.57, 2);
  });

  it('records the date range and tracked days', () => {
    expect(stats.daysTracked).toBe(3);
    expect(stats.dateRange).toEqual({ start: '2026-06-08', end: '2026-06-10' });
  });

  it('derives the longest consecutive-day streak', () => {
    expect(stats.longestStreak).toBe(3);
  });

  it('sorts category stats by total, descending', () => {
    const totals = stats.categoryStats.map((category) => category.total);
    expect(totals).toEqual([...totals].sort((a, b) => b - a));
    expect(stats.topCategory?.category).toBe('Intercity Transport');
  });

  it('excludes transport from the top merchant', () => {
    expect(stats.topMerchant?.name).toBe('Cafe, Central');
  });

  it('excludes generic cities from city stats', () => {
    expect(stats.citiesVisited).toBe(2);
    expect(stats.cityStats.map((city) => city.city)).toEqual([
      'Lijiang',
      'Chengdu',
    ]);
  });

  it('sorts city stats by total, descending, after picking the most visited', () => {
    expect(stats.mostVisitedCity?.city).toBe('Lijiang');
    expect(stats.cityStats[0].city).toBe('Lijiang');
  });

  it('rolls trip-wide spend into its own total', () => {
    expect(stats.tripWideTotal).toBeCloseTo(42.86, 2);
  });

  it('rolls both transport categories into transportTotal', () => {
    expect(stats.transportTotal).toBeCloseTo(43.86, 2);
  });

  it('buckets day totals into weekdays', () => {
    expect(stats.weekdaySpend.Mon).toBeCloseTo(5, 2);
    expect(stats.weekdaySpend.Tue).toBeCloseTo(28.57, 2);
    expect(stats.weekdaySpend.Wed).toBeCloseTo(42.86, 2);
  });

  it('groups payment totals by method', () => {
    expect(stats.paymentMethods.Alipay).toBeCloseTo(46.86, 2);
    expect(stats.paymentMethods.WeChat).toBeCloseTo(1, 2);
  });

  it('picks the biggest purchase by absolute USD', () => {
    expect(stats.biggestPurchase?.merchant).toBe('Train 12306');
  });

  it('picks the most and least expensive days', () => {
    expect(stats.mostExpensiveDay?.date).toBe('2026-06-10');
    expect(stats.cheapestDay?.date).toBe('2026-06-08');
  });
});

describe('parseAccommodations', () => {
  it('reads the canonical per-night file', () => {
    const entries = parseAccommodations(ACCOMMODATION_FIXTURE);
    expect(entries).toHaveLength(2);
    expect(entries[0].date).toBe('2026-06-08');
    expect(entries[0].amount).toBeCloseTo(60.1, 2);
    expect(entries[0].amountUSD).toBeCloseTo(8.347222, 4);
    expect(entries[0].currency).toBe('CNY');
    expect(entries[0].country).toBe('China');
  });
});

/**
 * Baseline for the seeded 2026 trip. These numbers are the contract the
 * refactor must preserve; the accommodation total is intentionally the
 * ledger's, not the per-night file's.
 */
describe('seeded dataset', () => {
  const csv = readFileSync(
    new URL('../../public/data/transactions.csv', import.meta.url),
    'utf8',
  );
  const transactions = parseTransactions(csv);
  const stats = computeTripStats(transactions);

  it('parses every row', () => {
    expect(transactions).toHaveLength(292);
    expect(stats.transactionCount).toBe(291);
  });

  it('keeps the seeded totals', () => {
    expect(stats.grandTotal).toBeCloseTo(1234.48, 2);
    expect(stats.daysTracked).toBe(39);
    expect(stats.citiesVisited).toBe(11);
  });

  it('keeps the date range', () => {
    expect(stats.dateRange).toEqual({ start: '2026-06-08', end: '2026-07-16' });
  });

  it('keeps the category breakdown', () => {
    expect(stats.topCategory?.category).toBe('Food');
    expect(stats.topCategory?.total).toBeCloseTo(460.95, 2);
    expect(stats.topCategory?.count).toBe(144);
    expect(stats.accommodationTotal).toBeCloseTo(250.91, 2);
    expect(stats.transportTotal).toBeCloseTo(322.42, 2);
  });

  it('keeps the merchant and purchase highlights', () => {
    expect(stats.topMerchant?.name).toBe('Fast Food');
    expect(stats.topMerchant?.count).toBe(13);
    expect(stats.biggestPurchase?.merchant).toBe('Railway 12306');
    expect(Math.abs(stats.biggestPurchase?.amountUSD ?? 0)).toBeCloseTo(62.4, 2);
  });

  it('keeps the day highlights', () => {
    expect(stats.mostExpensiveDay?.date).toBe('2026-07-13');
    expect(stats.mostExpensiveDay?.total).toBeCloseTo(90.77, 2);
    expect(stats.cheapestDay?.date).toBe('2026-06-29');
    expect(stats.cheapestDay?.total).toBeCloseTo(3.98, 2);
  });

  it('keeps the per-night accommodations file intact', () => {
    const accommodationCsv = readFileSync(
      new URL('../../public/data/accommodation.csv', import.meta.url),
      'utf8',
    );
    const entries = parseAccommodations(accommodationCsv);
    expect(entries).toHaveLength(38);
    expect(entries.reduce((sum, entry) => sum + entry.amount, 0)).toBeCloseTo(
      1648.11,
      2,
    );
    expect(
      entries.reduce((sum, entry) => sum + entry.amountUSD, 0),
    ).toBeCloseTo(228.9, 1);
  });
});
