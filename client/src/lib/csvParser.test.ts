import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  computeTripStats,
  parseAccommodations,
  parseTransactions,
} from './csvParser';

const TRANSACTION_HEADER =
  '#,"Date","Merchant","CNY","USD","Category","Payment","City","Expense Type","Notes"';

const TRANSACTION_FIXTURE = [
  TRANSACTION_HEADER,
  '1,"2026-06-08 09:30:00","Cafe, Central",-28.00,-4.00,"Food","Alipay","Chengdu","Core","breakfast"',
  '2,"2026-06-08 21:30:00","Metro",-7.00,-1.00,"Transport","WeChat","Chengdu","Core",""',
  '3,"2026-06-09 12:00:00","Hostel",-200.00,-28.57,"Accommodation","Other","Lijiang","Core","2 nights"',
  '4,"2026-06-09 12:00:00","Refund",20.00,2.86,"Accommodation","Other","Lijiang","Irregular","refund"',
  '5,"not-a-date","Broken",-1,-1,"Food","Other","China","Core",""',
  '6,"2026-06-10 18:00:00","Train 12306",-300.00,-42.86,"Intercity Transport","Alipay","China","Core",""',
].join('\n');

const ACCOMMODATION_FIXTURE = [
  '"Date","Amount (CNY)","City","Merchant","Notes"',
  '"2026-06-08 12:00:00",60.10,"Shenzhen","Dengba Hostel","1 night (line 2)"',
  '"2026-06-09",58.67,"Shenzhen","Dengba Hostel","line 3 (night 1 of 3)"',
].join('\n');

describe('parseTransactions', () => {
  it('reads columns by header name and keeps quoted commas', () => {
    const [first] = parseTransactions(TRANSACTION_FIXTURE);
    expect(first.merchant).toBe('Cafe, Central');
    expect(first.cny).toBe(-28);
    expect(first.usd).toBe(-4);
    expect(first.category).toBe('Food');
  });

  it('drops the time from the date', () => {
    const [first] = parseTransactions(TRANSACTION_FIXTURE);
    expect(first.date).toBe('2026-06-08');
  });

  it('filters rows whose date is not YYYY-MM-DD', () => {
    expect(parseTransactions(TRANSACTION_FIXTURE)).toHaveLength(5);
  });

  it('returns nothing for a header-only file', () => {
    expect(parseTransactions(TRANSACTION_HEADER)).toHaveLength(0);
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
    expect(stats.cityStats.map((city) => city.city)).toEqual(['Lijiang', 'Chengdu']);
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
  it('reads the per-night file and converts with its fixed rate', () => {
    const entries = parseAccommodations(ACCOMMODATION_FIXTURE);
    expect(entries).toHaveLength(2);
    expect(entries[0].date).toBe('2026-06-08');
    expect(entries[0].amountCNY).toBeCloseTo(60.1, 2);
    expect(entries[0].amountUSD).toBeCloseTo(60.1 / 7.2, 2);
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
    expect(Math.abs(stats.biggestPurchase?.usd ?? 0)).toBeCloseTo(62.4, 2);
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
    expect(entries.reduce((sum, entry) => sum + entry.amountCNY, 0)).toBeCloseTo(
      1648.11,
      2,
    );
  });
});
