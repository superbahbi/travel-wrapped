import { describe, expect, it } from 'vitest';
import {
  daysBetween,
  formatFullDate,
  formatShortDate,
  hourOfTime,
  isCalendarDate,
  weekdayIndex,
} from './tripDate';

describe('date formatting', () => {
  it('formats a short date without a timezone shift', () => {
    expect(formatShortDate('2026-06-08')).toBe('Jun 8');
  });

  it('formats a full date', () => {
    expect(formatFullDate('2026-06-08')).toBe('Jun 8, 26');
  });

  it('accepts a timestamp and ignores the time', () => {
    expect(formatShortDate('2026-06-08 21:30:00')).toBe('Jun 8');
  });

  it('returns a dash for empty or invalid input', () => {
    expect(formatShortDate('')).toBe('—');
    expect(formatShortDate(null)).toBe('—');
    expect(formatShortDate('not-a-date')).toBe('—');
    expect(formatShortDate('2026-02-30')).toBe('—');
  });
});

describe('weekdays', () => {
  it('derives a weekday from the calendar date', () => {
    expect(weekdayIndex('2026-06-08')).toBe(1);
    expect(weekdayIndex('2026-06-13')).toBe(6);
  });

  it('returns null for invalid input', () => {
    expect(weekdayIndex('nope')).toBeNull();
  });
});

describe('isCalendarDate', () => {
  it('accepts real calendar dates, with or without a time', () => {
    expect(isCalendarDate('2026-06-08')).toBe(true);
    expect(isCalendarDate('2024-02-29')).toBe(true);
    expect(isCalendarDate('2026-06-08 21:30:00')).toBe(true);
  });

  it('rejects impossible calendar dates', () => {
    expect(isCalendarDate('2026-02-30')).toBe(false);
    expect(isCalendarDate('2026-13-01')).toBe(false);
    expect(isCalendarDate('not-a-date')).toBe(false);
    expect(isCalendarDate('')).toBe(false);
    expect(isCalendarDate(null)).toBe(false);
  });
});

describe('daysBetween', () => {
  it('counts whole calendar days', () => {
    expect(daysBetween('2026-06-08', '2026-06-09')).toBe(1);
    expect(daysBetween('2026-06-08', '2026-06-15')).toBe(7);
  });

  it('returns null when either date is invalid', () => {
    expect(daysBetween('2026-06-08', 'nope')).toBeNull();
  });
});

describe('hourOfTime', () => {
  it('reads the recorded hour', () => {
    expect(hourOfTime('09:30:00')).toBe(9);
    expect(hourOfTime('21:59:59')).toBe(21);
  });

  it('treats midnight and missing times as unknown', () => {
    expect(hourOfTime('00:00:00')).toBeNull();
    expect(hourOfTime(null)).toBeNull();
  });

  it('returns null for malformed times', () => {
    expect(hourOfTime('9:30')).toBeNull();
    expect(hourOfTime('25:00:00')).toBeNull();
  });
});
