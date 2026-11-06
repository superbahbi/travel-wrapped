/**
 * Trip dates are calendar dates, not instants. Everything here is anchored to
 * UTC so a viewer's timezone can never move a date or a weekday.
 */

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})(?: \d{2}:\d{2}(?::\d{2})?)?$/;

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface CalendarDate {
  year: number;
  month: number;
  day: number;
}

function calendarDate(input: string | null | undefined): CalendarDate | null {
  if (!input) return null;
  const match = DATE_PATTERN.exec(input.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day
  ) {
    return null;
  }
  return { year, month, day };
}

/**
 * Whether the input names a real calendar date. The optional time is ignored;
 * callers that accept a timestamp validate its time themselves.
 */
export function isCalendarDate(input: string | null | undefined): boolean {
  return calendarDate(input) !== null;
}

export function formatShortDate(input: string | null | undefined): string {
  const date = calendarDate(input);
  if (!date) return '—';
  return new Date(Date.UTC(date.year, date.month - 1, date.day)).toLocaleDateString(
    'en-US',
    { month: 'short', day: 'numeric', timeZone: 'UTC' },
  );
}

export function formatFullDate(input: string | null | undefined): string {
  const date = calendarDate(input);
  if (!date) return '—';
  return new Date(
    Date.UTC(date.year, date.month - 1, date.day),
  ).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: '2-digit',
    timeZone: 'UTC',
  });
}

export function weekdayIndex(input: string | null | undefined): number | null {
  const date = calendarDate(input);
  if (!date) return null;
  return new Date(Date.UTC(date.year, date.month - 1, date.day)).getUTCDay();
}

export function daysBetween(
  start: string | null | undefined,
  end: string | null | undefined,
): number | null {
  const first = calendarDate(start);
  const second = calendarDate(end);
  if (!first || !second) return null;
  const from = Date.UTC(first.year, first.month - 1, first.day);
  const to = Date.UTC(second.year, second.month - 1, second.day);
  return Math.round((to - from) / (1000 * 60 * 60 * 24));
}

/**
 * Hour of day from a recorded `HH:mm:ss`. `00:00:00` means the source had no
 * time, so it returns null rather than midnight.
 */
export function hourOfTime(time: string | null | undefined): number | null {
  if (!time) return null;
  const match = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(time.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const second = Number(match[3] ?? '0');
  if (hour === 0 && minute === 0 && second === 0) return null;
  if (hour < 0 || hour > 23) return null;
  return hour;
}
