import { describe, expect, it } from 'vitest';
import { getAchievements } from './achievements';

const stats = { grandTotal: 0, dailyAverage: 100, daysTracked: 1 };

function row(time: string | null) {
  return {
    date: '2026-06-08',
    time,
    merchant: 'Cafe',
    amountUSD: -1,
    category: 'Food',
    city: 'Chengdu',
    notes: '',
  };
}

function unlocked(rows: ReturnType<typeof row>[], id: string) {
  return getAchievements(rows, stats).find(
    (achievement) => achievement.id === id,
  )?.unlocked;
}

const mornings = [
  row('06:30:00'),
  row('07:00:00'),
  row('07:59:59'),
];

const nights = [
  row('22:00:00'),
  row('22:30:00'),
  row('23:59:59'),
];

describe('time-of-day achievements', () => {
  it('unlocks Early Bird from the recorded time', () => {
    expect(unlocked(mornings, 'early-bird')).toBe(true);
    expect(unlocked(mornings.slice(0, 2), 'early-bird')).toBe(false);
  });

  it('unlocks Night Owl from the recorded time', () => {
    expect(unlocked(nights, 'night-owl')).toBe(true);
    expect(unlocked(nights.slice(0, 2), 'night-owl')).toBe(false);
  });

  it('treats an unknown time as neither early nor late', () => {
    expect(unlocked([row(null), row(null), row(null)], 'early-bird')).toBe(
      false,
    );
    expect(unlocked([row(null), row(null), row(null)], 'night-owl')).toBe(false);
  });
});
