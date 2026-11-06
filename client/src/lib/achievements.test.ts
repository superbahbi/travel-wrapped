import { describe, expect, it } from 'vitest';
import { computeTrip, parseTransactions } from './csvParser';
import { getAchievements } from './achievements';

const HEADER =
  'Date,Merchant,Amount,Currency,AmountUSD,FXRate,FXDate,Category,Payment,City,Country,Notes';

interface RowOptions {
  date: string;
  usd: number;
  merchant?: string;
  category?: string;
  city?: string;
  time?: string;
}

function row({
  date,
  usd,
  merchant = 'Shop',
  category = 'Food',
  city = 'Chengdu',
  time = '12:00:00',
}: RowOptions): string {
  const cny = (usd * 7).toFixed(2);
  return `${date} ${time},${merchant},${cny},CNY,${usd.toFixed(2)},7.0000,${date},${category},Alipay,${city},China,`;
}

function build(rows: string[]) {
  const transactions = parseTransactions([HEADER, ...rows].join('\n'));
  const series = computeTrip(transactions);
  return getAchievements(series, transactions);
}

function unlocked(rows: string[], id: string) {
  return build(rows).find((achievement) => achievement.id === id)?.unlocked;
}

describe('achievement rule table', () => {
  it('keeps only the general badges', () => {
    const achievements = build([]);
    const ids = achievements.map((achievement) => achievement.id);
    expect(achievements).toHaveLength(14);
    expect(ids).not.toContain('mixue-enthusiast');
    expect(ids).not.toContain('noodle-master');
    expect(ids).not.toContain('street-foodie');
    expect(ids).not.toContain('train-hopper');
  });

  it('carries the badge image with the rule', () => {
    const cityExplorer = build([]).find(
      (achievement) => achievement.id === 'city-explorer',
    );
    expect(cityExplorer?.image).toContain('badge-city-explorer');
    expect(build([]).every((achievement) => achievement.image)).toBe(true);
  });

  it('does not unlock budget badges on an empty trip', () => {
    expect(unlocked([], 'budget-master')).toBe(false);
    expect(unlocked([], 'frugal-traveler')).toBe(false);
  });
});

describe('Consistent Spender', () => {
  const days = (count: number) =>
    Array.from({ length: count }, (_, i) => {
      const day = String(8 + i).padStart(2, '0');
      return row({ date: `2026-06-${day}`, usd: -30 });
    });

  it('unlocks from five days in the $20-40 band', () => {
    expect(unlocked(days(5), 'consistent-spender')).toBe(true);
  });

  it('does not unlock from four such days', () => {
    expect(unlocked(days(4), 'consistent-spender')).toBe(false);
  });
});

describe('city badges', () => {
  const cities = (names: string[]) =>
    names.map((city, i) =>
      row({
        date: `2026-06-${String(8 + i).padStart(2, '0')}`,
        usd: -10,
        city,
      }),
    );

  const seven = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

  it('counts named cities for City Explorer', () => {
    expect(unlocked(cities(seven), 'city-explorer')).toBe(true);
    expect(unlocked(cities(seven.slice(0, 6)), 'city-explorer')).toBe(false);
  });

  it('does not count the generic China bucket as a city', () => {
    const withGeneric = [...cities(seven), row({ date: '2026-06-20', usd: -5, city: 'China' })];
    expect(unlocked(withGeneric, 'city-explorer')).toBe(true);
    expect(unlocked(cities(['A', 'B', 'C', 'D', 'E', 'China']), 'accommodation-collector')).toBe(false);
    expect(unlocked(cities(['A', 'B', 'C', 'D', 'E', 'F', 'China']), 'accommodation-collector')).toBe(true);
  });
});

describe('Food Lover', () => {
  it('unlocks at a 30% food share', () => {
    const rows = [
      row({ date: '2026-06-08', usd: -30, category: 'Food' }),
      row({ date: '2026-06-08', usd: -70, category: 'Shopping' }),
    ];
    expect(unlocked(rows, 'food-lover')).toBe(true);
  });

  it('stays locked below 30%', () => {
    const rows = [
      row({ date: '2026-06-08', usd: -29, category: 'Food' }),
      row({ date: '2026-06-08', usd: -71, category: 'Shopping' }),
    ];
    expect(unlocked(rows, 'food-lover')).toBe(false);
  });
});

describe('time-of-day badges', () => {
  const at = (time: string) =>
    row({ date: '2026-06-08', usd: -5, time });

  it('unlocks Early Bird from the recorded time', () => {
    expect(unlocked([at('06:30:00'), at('07:00:00'), at('07:59:59')], 'early-bird')).toBe(true);
    expect(unlocked([at('06:30:00'), at('07:00:00')], 'early-bird')).toBe(false);
  });

  it('unlocks Night Owl from the recorded time', () => {
    expect(unlocked([at('22:00:00'), at('22:30:00'), at('23:59:59')], 'night-owl')).toBe(true);
    expect(unlocked([at('22:00:00'), at('22:30:00')], 'night-owl')).toBe(false);
  });

  it('treats midnight as unknown', () => {
    const midnight = [at('00:00:00'), at('00:00:00'), at('00:00:00')];
    expect(unlocked(midnight, 'early-bird')).toBe(false);
    expect(unlocked(midnight, 'night-owl')).toBe(false);
  });
});
