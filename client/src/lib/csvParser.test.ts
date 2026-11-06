import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  CanonicalCsvError,
  computeTrip,
  isLayover,
  parseAccommodations,
  parseTransactions,
} from './csvParser';
import { buildJourneyView } from './journeyView';
import { CITY_ROUTE, buildCityRoute } from './city';

const TRANSACTION_HEADER =
  'Date,Merchant,Amount,Currency,AmountUSD,FXRate,FXDate,Category,Payment,City,Country,Notes';

const TRANSACTION_FIXTURE = [
  TRANSACTION_HEADER,
  '2026-06-08 09:30:00,"Cafe, Central",-28.00,CNY,-4.00,7.0000,2026-06-08,Food,Alipay,Chengdu,China,breakfast',
  '2026-06-08 21:30:00,Metro,-7.00,CNY,-1.00,7.0000,2026-06-08,Transport,WeChat,Chengdu,China,',
  '2026-06-09 12:00:00,Hostel,-200.00,CNY,-28.57,7.0000,2026-06-09,Accommodation,Other,Lijiang,China,2 nights',
  '2026-06-09 12:00:00,Refund,20.00,CNY,2.86,7.0000,2026-06-09,Shopping,Other,Lijiang,China,refund',
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

  it('rejects an impossible calendar date and names the row', () => {
    const csv = TRANSACTION_FIXTURE.replace(
      '2026-06-08 09:30:00',
      '2026-02-30 09:30:00',
    );
    expect(() => parseTransactions(csv)).toThrow(
      /Row 2: Date is not a real calendar date/,
    );
  });

  it('rejects an impossible month', () => {
    const csv = TRANSACTION_FIXTURE.replace(
      '2026-06-08 09:30:00',
      '2026-13-01 09:30:00',
    );
    expect(() => parseTransactions(csv)).toThrow(
      /Row 2: Date is not a real calendar date/,
    );
  });

  it('rejects an impossible time', () => {
    const csv = TRANSACTION_FIXTURE.replace(
      '2026-06-08 09:30:00',
      '2026-06-08 25:00:00',
    );
    expect(() => parseTransactions(csv)).toThrow(
      /Row 2: Date time must be a real time of day/,
    );
  });

  it('rejects impossible minutes and seconds', () => {
    const csv = TRANSACTION_FIXTURE.replace(
      '2026-06-08 09:30:00',
      '2026-06-08 09:99:99',
    );
    expect(() => parseTransactions(csv)).toThrow(
      /Row 2: Date time must be a real time of day/,
    );
  });

  it('rejects a zero or negative FXRate', () => {
    const zero = TRANSACTION_FIXTURE.replace(
      ',7.0000,2026-06-08,Food',
      ',0,2026-06-08,Food',
    );
    expect(() => parseTransactions(zero)).toThrow(
      /Row 2: FXRate must be greater than zero/,
    );

    const negative = TRANSACTION_FIXTURE.replace(
      ',7.0000,2026-06-08,Food',
      ',-7.0000,2026-06-08,Food',
    );
    expect(() => parseTransactions(negative)).toThrow(
      /Row 2: FXRate must be greater than zero/,
    );
  });

  it('rejects rows where Amount and AmountUSD have opposite signs', () => {
    const positiveNative = TRANSACTION_FIXTURE.replace(
      ',-28.00,CNY,-4.00,',
      ',28.00,CNY,-4.00,',
    );
    expect(() => parseTransactions(positiveNative)).toThrow(
      /Row 2: Amount and AmountUSD must have the same sign/,
    );

    const negativeBase = TRANSACTION_FIXTURE.replace(
      ',-28.00,CNY,-4.00,',
      ',-28.00,CNY,4.00,',
    );
    expect(() => parseTransactions(negativeBase)).toThrow(
      /Row 2: Amount and AmountUSD must have the same sign/,
    );
  });

  it('reports the original line number when blank lines precede a bad row', () => {
    const csv = [
      TRANSACTION_HEADER,
      '',
      '2026-06-08 09:30:00,Bad Row,abc,CNY,-4.00,7.0000,2026-06-08,Food,Alipay,Chengdu,China,',
    ].join('\n');
    expect(() => parseTransactions(csv)).toThrow(
      /Row 3: Amount must be a number/,
    );
  });
});

describe('computeTrip', () => {
  const stats = computeTrip(parseTransactions(TRANSACTION_FIXTURE));

  it('counts only negative rows as spend', () => {
    expect(stats.summary.transactionCount).toBe(4);
    expect(stats.summary.grandTotal).toBeCloseTo(76.43, 2);
  });

  it('excludes refunds from day totals', () => {
    const refundDay = stats.days.items.find((day) => day.date === '2026-06-09');
    expect(refundDay?.total).toBeCloseTo(28.57, 2);
  });

  it("excludes refunds from a day's top category", () => {
    const refundDay = stats.days.items.find((day) => day.date === '2026-06-09');
    expect(refundDay?.topCategory).toBe('Accommodation');
  });

  it('does not mutate the city series when picking the most visited', () => {
    const totals = stats.cities.items.map((city) => city.total);
    expect(totals).toEqual([...totals].sort((a, b) => b - a));
    expect(stats.cities.mostVisited?.city).toBe('Lijiang');
  });

  it('records the date range and tracked days', () => {
    expect(stats.summary.daysTracked).toBe(3);
    expect(stats.summary.dateRange).toEqual({ start: '2026-06-08', end: '2026-06-10' });
  });

  it('derives the longest consecutive-day streak', () => {
    expect(stats.summary.longestStreak).toBe(3);
  });

  it('sorts category stats by total, descending', () => {
    const totals = stats.categories.items.map((category) => category.total);
    expect(totals).toEqual([...totals].sort((a, b) => b - a));
    expect(stats.categories.top?.category).toBe('Intercity Transport');
  });

  it('excludes transport from the top merchant', () => {
    expect(stats.summary.topMerchant?.name).toBe('Cafe, Central');
  });

  it('excludes generic cities from city stats', () => {
    expect(stats.cities.visitedCount).toBe(2);
    expect(stats.cities.items.map((city) => city.city)).toEqual([
      'Lijiang',
      'Chengdu',
    ]);
  });

  it('sorts city stats by total, descending, after picking the most visited', () => {
    expect(stats.cities.mostVisited?.city).toBe('Lijiang');
    expect(stats.cities.items[0].city).toBe('Lijiang');
  });

  it('rolls trip-wide spend into its own total', () => {
    expect(stats.cities.tripWideTotal).toBeCloseTo(42.86, 2);
  });

  it('rolls both transport categories into transportTotal', () => {
    expect(stats.categories.transportTotal).toBeCloseTo(43.86, 2);
  });

  it('buckets day totals into weekdays', () => {
    expect(stats.days.weekdaySpend.Mon).toBeCloseTo(5, 2);
    expect(stats.days.weekdaySpend.Tue).toBeCloseTo(28.57, 2);
    expect(stats.days.weekdaySpend.Wed).toBeCloseTo(42.86, 2);
  });

  it('groups payment totals by method', () => {
    expect(stats.summary.paymentMethods.Alipay).toBeCloseTo(46.86, 2);
    expect(stats.summary.paymentMethods.WeChat).toBeCloseTo(1, 2);
  });

  it('picks the biggest purchase by absolute USD', () => {
    expect(stats.summary.biggestPurchase?.merchant).toBe('Train 12306');
  });

  it('picks the most and least expensive days', () => {
    expect(stats.days.mostExpensive?.date).toBe('2026-06-10');
    expect(stats.days.cheapest?.date).toBe('2026-06-08');
  });
});

describe('spend-only day series', () => {
  const csv = [
    TRANSACTION_HEADER,
    '2026-06-08 09:30:00,Shop,-10.00,CNY,-2.00,7.0000,2026-06-08,Shopping,Cash,Chengdu,China,',
    '2026-06-10 09:30:00,Refund,10.00,CNY,2.00,7.0000,2026-06-10,Shopping,Cash,Chengdu,China,refund',
  ].join('\n');
  const stats = computeTrip(parseTransactions(csv));

  it('omits a refund-only date from days, daysTracked, dateRange, and the streak', () => {
    expect(stats.days.items.map((day) => day.date)).toEqual(['2026-06-08']);
    expect(stats.summary.daysTracked).toBe(1);
    expect(stats.summary.dateRange).toEqual({
      start: '2026-06-08',
      end: '2026-06-08',
    });
    expect(stats.summary.longestStreak).toBe(1);
  });

  it('keeps refund rows out of day transactions and spend totals', () => {
    const [day] = stats.days.items;
    expect(day.transactions).toHaveLength(1);
    expect(day.transactions.every((transaction) => transaction.amountUSD < 0)).toBe(
      true,
    );
    expect(day.total).toBeCloseTo(2, 2);
    expect(stats.summary.grandTotal).toBeCloseTo(2, 2);
    expect(stats.summary.transactionCount).toBe(1);
  });
});

describe('layover cities', () => {
  const csv = [
    TRANSACTION_HEADER,
    '2026-05-13 09:00:00,Layover Food,-11.36,USD,-11.36,1.0000,2026-05-13,Food,Chase 1388,Brisbane,Australia,Layover Sydney → Bali',
    '2026-05-13 12:00:00,Bali Food,-10.00,USD,-10.00,1.0000,2026-05-13,Food,Chase 1388,Bali,Indonesia,',
  ].join('\n');
  const stats = computeTrip(parseTransactions(csv));

  it('keeps layover spend in totals and categories while excluding the city from stats', () => {
    expect(stats.summary.grandTotal).toBeCloseTo(21.36, 2);
    expect(stats.days.items[0].total).toBeCloseTo(21.36, 2);

    const food = stats.categories.items.find(
      (category) => category.category === 'Food',
    );
    expect(food?.total).toBeCloseTo(21.36, 2);
    expect(food?.count).toBe(2);

    expect(stats.cities.visitedCount).toBe(1);
    expect(stats.cities.items.map((city) => city.city)).toEqual(['Bali']);
    expect(stats.days.items[0].cities).toEqual(['Bali']);
    expect(stats.cities.tripWideTotal).toBeCloseTo(11.36, 2);
  });
});

describe('layover note matching', () => {
  it.each([
    'Layover Sydney → Bali',
    '  Layover Sydney → Bali  ',
    'layover sydney → bali',
    'LAYOVER SYDNEY → BALI',
    'Layover',
    'Chase 1388: MCDONALDS BRIS AIRP | Layover Sydney → Bali',
    'Chase 1388: MCDONALDS BRIS AIRP |layover sydney → bali',
  ])('treats %j as a layover', (notes) => {
    expect(isLayover(notes)).toBe(true);
  });

  it.each([
    '',
    'no layover',
    'Layovers',
    'layover-free',
    'Chase 1388: MCDONALDS BRIS AIRP',
    'arrived after a layover',
    'Chase 1388: MCDONALDS BRIS AIRP | no layover',
    'Chase 1388: MCDONALDS BRIS AIRP | Layovers',
    'Chase 1388: MCDONALDS BRIS AIRP | layover-free',
  ])('does not treat %j as a layover', (notes) => {
    expect(isLayover(notes)).toBe(false);
  });
});

describe('layover notes only in the opening word', () => {
  const csv = [
    TRANSACTION_HEADER,
    '2026-05-13 09:00:00,Brisbane Food,-11.36,USD,-11.36,1.0000,2026-05-13,Food,Chase 1388,Brisbane,Australia,no layover',
    '2026-05-13 12:00:00,Bali Food,-10.00,USD,-10.00,1.0000,2026-05-13,Food,Chase 1388,Bali,Indonesia,',
  ].join('\n');
  const stats = computeTrip(parseTransactions(csv));

  it('keeps the city when a note merely mentions a layover', () => {
    expect(stats.summary.grandTotal).toBeCloseTo(21.36, 2);
    expect(stats.cities.visitedCount).toBe(2);
    expect(stats.cities.items.map((city) => city.city)).toEqual([
      'Brisbane',
      'Bali',
    ]);
  });

  it('keeps a layover purchase in its own category total', () => {
    const categorizedCsv = [
      TRANSACTION_HEADER,
      '2026-05-13 09:00:00,Brisbane Airport Shop,-11.36,USD,-11.36,1.0000,2026-05-13,Shopping,Chase 1388,Brisbane,Australia,Layover Sydney → Bali',
      '2026-05-13 12:00:00,Bali Food,-10.00,USD,-10.00,1.0000,2026-05-13,Food,Chase 1388,Bali,Indonesia,',
    ].join('\n');
    const categorized = computeTrip(parseTransactions(categorizedCsv));
    const shopping = categorized.categories.items.find(
      (category) => category.category === 'Shopping',
    );

    expect(shopping?.total).toBeCloseTo(11.36, 2);
    expect(shopping?.count).toBe(1);
  });

  it('drops a layover-only day from the route without an empty entry', () => {
    const layoverOnlyCsv = [
      TRANSACTION_HEADER,
      '2026-05-13 09:00:00,Layover Food,-11.36,USD,-11.36,1.0000,2026-05-13,Food,Chase 1388,Brisbane,Australia,Layover Sydney → Bali',
      '2026-05-14 12:00:00,Bali Food,-10.00,USD,-10.00,1.0000,2026-05-14,Food,Chase 1388,Bali,Indonesia,',
    ].join('\n');
    const layoverOnlyTransactions = parseTransactions(layoverOnlyCsv);
    const layoverOnlyStats = computeTrip(layoverOnlyTransactions);
    const layoverDay = layoverOnlyStats.days.items.find(
      (day) => day.date === '2026-05-13',
    );

    expect(layoverDay?.cities).toEqual([]);

    const view = buildJourneyView(layoverOnlyStats, layoverOnlyTransactions, []);
    expect(view.route.cityOrder).toEqual(['Bali']);
    expect(view.route.cityOrder).not.toContain('Brisbane');
    expect(
      view.route.cityOrder.every(
        (city) => typeof city === 'string' && city.trim().length > 0,
      ),
    ).toBe(true);
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

describe('parseAccommodations validation', () => {
  it('rejects a zero or negative FXRate', () => {
    const zero = ACCOMMODATION_FIXTURE.replace(',7.2000,', ',0,');
    expect(() => parseAccommodations(zero)).toThrow(
      /Row 2: FXRate must be greater than zero/,
    );

    const negative = ACCOMMODATION_FIXTURE.replace(',7.2000,', ',-7.2000,');
    expect(() => parseAccommodations(negative)).toThrow(
      /Row 2: FXRate must be greater than zero/,
    );
  });

  it('rejects a negative or zero native Amount', () => {
    const negative = ACCOMMODATION_FIXTURE.replace(',60.10,CNY,', ',-60.10,CNY,');
    expect(() => parseAccommodations(negative)).toThrow(
      /Row 2: Amount must be greater than zero/,
    );

    const zero = ACCOMMODATION_FIXTURE.replace(',60.10,CNY,', ',0,CNY,');
    expect(() => parseAccommodations(zero)).toThrow(
      /Row 2: Amount must be greater than zero/,
    );
  });

  it('rejects a negative or zero AmountUSD', () => {
    const negative = ACCOMMODATION_FIXTURE.replace(',8.347222,', ',-8.347222,');
    expect(() => parseAccommodations(negative)).toThrow(
      /Row 2: AmountUSD must be greater than zero/,
    );

    const zero = ACCOMMODATION_FIXTURE.replace(',8.347222,', ',0,');
    expect(() => parseAccommodations(zero)).toThrow(
      /Row 2: AmountUSD must be greater than zero/,
    );
  });

  it('rejects an impossible calendar date', () => {
    const csv = ACCOMMODATION_FIXTURE.replace(
      '2026-06-08,Dengba',
      '2026-02-30,Dengba',
    );
    expect(() => parseAccommodations(csv)).toThrow(
      /Row 2: Date is not a real calendar date/,
    );
  });
});

/**
 * Baseline for the merged 2026 ledger (China trip + Chase import). These
 * numbers are the contract the app renders; the accommodation total is
 * intentionally the ledger's, not the per-night file's.
 */
describe('seeded dataset', () => {
  const csv = readFileSync(
    new URL('../../public/data/transactions.csv', import.meta.url),
    'utf8',
  );
  const transactions = parseTransactions(csv);
  const stats = computeTrip(transactions);

  it('parses every row', () => {
    expect(transactions).toHaveLength(984);
    expect(stats.summary.transactionCount).toBe(983);
  });

  it('keeps the seeded totals', () => {
    expect(stats.summary.grandTotal).toBeCloseTo(9351.21, 2);
    expect(stats.summary.daysTracked).toBe(194);
    expect(stats.cities.visitedCount).toBe(38);
  });

  it('attributes every expense to exactly one city or the trip-wide bucket', () => {
    const citySum = stats.cities.items.reduce(
      (sum, city) => sum + city.total,
      0,
    );
    expect(citySum + stats.cities.tripWideTotal).toBeCloseTo(
      stats.summary.grandTotal,
      2,
    );
  });

  it('excludes the Brisbane layover city from the seeded city stats', () => {
    expect(stats.cities.items.map((city) => city.city)).not.toContain(
      'Brisbane',
    );
  });

  it('folds every day trip into its base city', () => {
    const cities = stats.cities.items.map((city) => city.city);
    expect(cities).not.toContain('Santa Monica');
    expect(cities).not.toContain('Torrance');
    expect(cities).not.toContain('El Segundo');
    expect(cities).not.toContain('Katoomba');
    expect(cities).not.toContain('Picton');
    expect(cities).not.toContain('Hangzhou');
    expect(cities).not.toContain('Apollo Bay');
    expect(cities).not.toContain('Arrowtown');
    expect(cities).not.toContain('Fiordland');
    expect(cities).toEqual(
      expect.arrayContaining(['Los Angeles', 'Sydney', 'Blenheim', 'Litang']),
    );
    expect(cities).toEqual(
      expect.arrayContaining(['Melbourne', 'Queenstown']),
    );
  });

  it('keeps genuinely visited cities that were missing from the list', () => {
    const cities = stats.cities.items.map((city) => city.city);
    expect(cities).toEqual(
      expect.arrayContaining(['Kuala Lumpur', 'Daegu']),
    );
  });

  it('renders the travelled route, round trip included', () => {
    const route = buildCityRoute(
      stats.days.items.flatMap((day) => day.cities),
    );
    expect(route).toEqual([...CITY_ROUTE]);
  });

  it('keeps the date range', () => {
    expect(stats.summary.dateRange).toEqual({ start: '2026-02-17', end: '2026-11-02' });
  });

  it('keeps the category breakdown', () => {
    expect(stats.categories.top?.category).toBe('Food');
    expect(stats.categories.top?.total).toBeCloseTo(2515.14, 2);
    expect(stats.categories.top?.count).toBe(475);
    expect(stats.categories.accommodationTotal).toBeCloseTo(1823.58, 2);
    expect(stats.categories.transportTotal).toBeCloseTo(2339.52, 2);
  });

  it('keeps the merchant and purchase highlights', () => {
    expect(stats.summary.topMerchant?.name).toBe('Fast Food');
    expect(stats.summary.topMerchant?.count).toBe(13);
    expect(stats.summary.biggestPurchase?.merchant).toBe('VIRGIN AU');
    expect(Math.abs(stats.summary.biggestPurchase?.amountUSD ?? 0)).toBeCloseTo(338.25, 2);
  });

  it('keeps the day highlights', () => {
    expect(stats.days.mostExpensive?.date).toBe('2026-05-05');
    expect(stats.days.mostExpensive?.total).toBeCloseTo(443.12, 2);
    expect(stats.days.cheapest?.date).toBe('2026-04-01');
    expect(stats.days.cheapest?.total).toBeCloseTo(0.11, 2);
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
