import { describe, expect, it } from 'vitest';
import { computeTrip, parseTransactions } from './csvParser';
import { buildJourneyView } from './journeyView';

const HEADER =
  'Date,Merchant,Amount,Currency,AmountUSD,FXRate,FXDate,Category,Payment,City,Country,Notes';

const FIXTURE = [
  HEADER,
  '2026-06-08 09:30:00,Cafe,-28.00,CNY,-4.00,7.0000,2026-06-08,Food,Alipay,Chengdu,China,',
  '2026-06-08 21:30:00,Metro,-7.00,CNY,-1.00,7.0000,2026-06-08,Transport,WeChat,Chengdu,China,',
  '2026-06-09 12:00:00,Hostel,-200.00,CNY,-28.57,7.0000,2026-06-09,Accommodation,Other,Lijiang,China,',
  '2026-06-09 18:00:00,Temple,-70.00,CNY,-10.00,7.0000,2026-06-09,Activities,Alipay,Lijiang,China,',
  '2026-06-10 18:00:00,Train,-300.00,CNY,-42.86,7.0000,2026-06-10,Intercity Transport,Alipay,China,China,',
  '2026-06-11 12:00:00,Hostel 2,-100.00,CNY,-14.29,7.0000,2026-06-11,Accommodation,Other,Lijiang,China,',
  '2026-06-12 12:00:00,Refund,50.00,CNY,7.14,7.0000,2026-06-12,Accommodation,Other,Lijiang,China,',
].join('\n');

const transactions = parseTransactions(FIXTURE);
const series = computeTrip(transactions);
const accommodations = [
  {
    date: '2026-06-09',
    merchant: 'Hostel',
    city: 'Lijiang',
    country: 'China',
    amount: 200,
    currency: 'CNY',
    amountUSD: 28.57,
    fxRate: 7,
    fxDate: '2026-06-09',
    notes: '',
  },
  {
    date: '2026-06-10',
    merchant: 'Hostel',
    city: 'Lijiang',
    country: 'China',
    amount: 100,
    currency: 'CNY',
    amountUSD: 14.29,
    fxRate: 7,
    fxDate: '2026-06-10',
    notes: '',
  },
];

const view = buildJourneyView(series, transactions, accommodations);

describe('buildJourneyView', () => {
  it('shapes the top categories once', () => {
    expect(view.topCategories.map((category) => category.category)).toEqual([
      'Accommodation',
      'Intercity Transport',
      'Activities',
      'Food',
      'Transport',
    ]);
  });

  it('answers category questions without callers scanning the series', () => {
    expect(view.categories.activities?.total).toBeCloseTo(10, 2);
    expect(view.categories.transport?.total).toBeCloseTo(1, 2);
    expect(view.categories.intercityTransport?.total).toBeCloseTo(42.86, 2);
    expect(view.categories.transportTotal).toBeCloseTo(43.86, 2);
  });

  it('derives food averages', () => {
    expect(view.food.total).toBeCloseTo(4, 2);
    expect(view.food.meals).toBe(1);
    expect(view.food.perMeal).toBeCloseTo(4, 2);
    expect(view.food.perDay).toBeCloseTo(0.8, 2);
  });

  it('keeps ledger and per-night accommodation separate', () => {
    expect(view.accommodation.ledgerTotal).toBeCloseTo(42.86, 2);
    expect(view.accommodation.stays).toBe(2);
    expect(view.accommodation.perNightTotal).toBeCloseTo(42.86, 2);
    expect(view.accommodation.perNightAverage).toBeCloseTo(21.43, 2);
  });

  it('ignores negative per-night rows in the per-night total', () => {
    const viewWithBadRow = buildJourneyView(series, transactions, [
      ...accommodations,
      { ...accommodations[0], amountUSD: -28.57 },
    ]);
    expect(viewWithBadRow.accommodation.perNightTotal).toBeCloseTo(42.86, 2);
  });

  it('shapes top spend rows per category, excluding refunds', () => {
    expect(view.topSpend.accommodation.map((row) => row.merchant)).toEqual([
      'Hostel',
      'Hostel 2',
    ]);
    expect(view.topSpend.activities.map((row) => row.merchant)).toEqual([
      'Temple',
    ]);
  });

  it('builds the city route in visit order', () => {
    expect(view.route.cityOrder).toEqual(['Chengdu', 'Lijiang']);
  });

  it('accumulates the running total', () => {
    expect(view.pace.running.map((point) => point.running)).toEqual([
      5, 43.57, 86.43, 100.72, 100.72,
    ]);
    expect(view.pace.running[3].daily).toBeCloseTo(14.29, 2);
  });

  it('derives pace figures', () => {
    expect(view.pace.daysTracked).toBe(5);
    expect(view.pace.perDay).toBeCloseTo(20.14, 2);
    expect(view.pace.perMonth).toBeCloseTo(604.32, 2);
    expect(view.pace.perWeek).toBeCloseTo(141.01, 2);
    expect(view.pace.perWeek).toBe(view.pace.perDay * 7);
  });

  it('derives payment shares', () => {
    const alipay = view.payments.find((payment) => payment.method === 'Alipay');
    expect(alipay?.amount).toBeCloseTo(56.86, 2);
    expect(alipay?.share).toBeCloseTo(56.45, 2);
  });

  it('falls back to one for the widest city total', () => {
    expect(view.maxCityTotal).toBeCloseTo(52.86, 2);
  });

  it('survives an empty trip', () => {
    const empty = buildJourneyView(
      computeTrip([]),
      [],
      [],
    );
    expect(empty.topCategories).toEqual([]);
    expect(empty.route.cityOrder).toEqual([]);
    expect(empty.pace.running).toEqual([]);
    expect(empty.food.perMeal).toBe(0);
    expect(empty.accommodation.perNightAverage).toBe(0);
    expect(empty.maxCityTotal).toBe(1);
  });
});
