// Canonical CSV parsing and trip statistics.
// The canonical schema is documented in docs/canonical-csv.md.
// ============================================================

export interface Transaction {
  id: number;
  date: string; // YYYY-MM-DD
  time: string | null; // HH:mm:ss, or null when the source has no time
  merchant: string;
  amount: number; // signed amount in the row's native currency
  currency: string; // ISO 4217
  amountUSD: number; // signed amount in the base currency
  fxRate: number; // native units per USD
  fxDate: string; // YYYY-MM-DD
  category: string;
  payment: string;
  city: string;
  country: string;
  notes: string;
}

export interface DayStats {
  date: string;
  total: number;
  transactions: Transaction[];
  topCategory: string;
  cities: string[];
}

export interface CityStats {
  city: string;
  total: number;
  days: number;
  transactions: number;
  avgPerDay: number;
}

export interface CategoryStats {
  category: string;
  total: number;
  count: number;
  percentage: number;
  color: string;
}

export interface TripSummary {
  grandTotal: number;
  transactionCount: number;
  daysTracked: number;
  dailyAverage: number;
  avgTransactionSize: number;
  dateRange: { start: string; end: string };
  longestStreak: number;
  biggestPurchase: Transaction | null;
  topMerchant: { name: string; count: number; total: number } | null;
  paymentMethods: Record<string, number>;
}

export interface DaySeries {
  items: DayStats[];
  mostExpensive: DayStats | null;
  cheapest: DayStats | null;
  weekdaySpend: Record<string, number>;
}

export interface CitySeries {
  items: CityStats[];
  visitedCount: number;
  mostVisited: CityStats | null;
  tripWideTotal: number;
}

export interface CategorySeries {
  items: CategoryStats[];
  top: CategoryStats | null;
  foodTotal: number;
  accommodationTotal: number;
  transportTotal: number;
}

/** Four narrow series behind one compute call. */
export interface TripSeries {
  summary: TripSummary;
  days: DaySeries;
  cities: CitySeries;
  categories: CategorySeries;
}

export interface AccommodationEntry {
  date: string;
  merchant: string;
  city: string;
  country: string;
  amount: number; // signed amount in the row's native currency
  currency: string;
  amountUSD: number;
  fxRate: number;
  fxDate: string;
  notes: string;
}

/** Raised when a canonical CSV does not match the documented schema. */
export class CanonicalCsvError extends Error {
  constructor(
    public readonly row: number | null,
    message: string,
  ) {
    super(row === null ? message : `Row ${row}: ${message}`);
    this.name = 'CanonicalCsvError';
  }
}

const TRANSACTION_COLUMNS = [
  'Date',
  'Merchant',
  'Amount',
  'Currency',
  'AmountUSD',
  'FXRate',
  'FXDate',
  'Category',
  'Payment',
  'City',
  'Country',
  'Notes',
] as const;

const ACCOMMODATION_COLUMNS = [
  'Date',
  'Merchant',
  'City',
  'Country',
  'Amount',
  'Currency',
  'AmountUSD',
  'FXRate',
  'FXDate',
  'Notes',
] as const;

const GENERIC_CITIES = new Set(['china', 'unknown', '']);
export const isGenericCity = (city: string) =>
  GENERIC_CITIES.has((city || '').trim().toLowerCase());

// Category color palette — Spotify Wrapped style
export const CATEGORY_COLORS: Record<string, string> = {
  Food: '#FF6B6B',
  Accommodation: '#8360c3',
  Transport: '#2193b0',
  'Intercity Transport': '#11998e',
  Activities: '#F4A261',
  Shopping: '#E76F51',
  'Trip-wide': '#95B8D1',
};

export function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] || '#9D84B7';
}

export function getCityGradient(city: string): string {
  const gradients: Record<string, string> = {
    Shanghai: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    Beijing: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    Chengdu: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    "Xi'an": 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    Hangzhou: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    Guilin: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
    Yangshuo: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    Nanjing: 'linear-gradient(135deg, #ff9a56 0%, #ff6a88 100%)',
    Suzhou: 'linear-gradient(135deg, #2e2e78 0%, #662d8c 100%)',
    Wuhan: 'linear-gradient(135deg, #ffa751 0%, #ffe259 100%)',
    Chongqing: 'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)',
    Kunming: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    Lijiang: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
    Dali: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
  };
  return gradients[city] || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function splitLines(csv: string): string[] {
  return csv
    .replace(/\r\n/g, '\n')
    .split('\n')
    .filter((line) => line.trim().length > 0);
}

function readColumns(
  headerLine: string,
  required: readonly string[],
  label: string,
): Record<string, number> {
  const header = parseCSVLine(headerLine);
  const index: Record<string, number> = {};
  header.forEach((cell, position) => {
    index[cell] = position;
  });
  const missing = required.filter((column) => index[column] === undefined);
  if (missing.length > 0) {
    throw new CanonicalCsvError(
      null,
      `${label} is missing required columns: ${missing.join(', ')}`,
    );
  }
  return index;
}

function requiredText(
  fields: string[],
  columns: Record<string, number>,
  column: string,
  row: number,
): string {
  const value = (fields[columns[column]] ?? '').trim();
  if (!value) throw new CanonicalCsvError(row, `${column} is required`);
  return value;
}

function requiredNumber(
  fields: string[],
  columns: Record<string, number>,
  column: string,
  row: number,
): number {
  const raw = (fields[columns[column]] ?? '').trim();
  const value = Number(raw);
  if (raw === '' || !Number.isFinite(value)) {
    throw new CanonicalCsvError(row, `${column} must be a number; got "${raw}"`);
  }
  return value;
}

function requiredCurrency(
  fields: string[],
  columns: Record<string, number>,
  row: number,
): string {
  const value = requiredText(fields, columns, 'Currency', row);
  if (!/^[A-Z]{3}$/.test(value)) {
    throw new CanonicalCsvError(
      row,
      `Currency must be a 3-letter ISO code; got "${value}"`,
    );
  }
  return value;
}

function parseTimestamp(
  raw: string,
  row: number,
): { date: string; time: string | null } {
  const value = raw.trim();
  const match = /^(\d{4}-\d{2}-\d{2})(?: (\d{2}:\d{2}:\d{2}))?$/.exec(value);
  if (!match) {
    throw new CanonicalCsvError(
      row,
      `Date must be "YYYY-MM-DD" or "YYYY-MM-DD HH:mm:ss"; got "${value}"`,
    );
  }
  return {
    date: match[1],
    time: match[2] && match[2] !== '00:00:00' ? match[2] : null,
  };
}

function requiredDate(
  fields: string[],
  columns: Record<string, number>,
  row: number,
): string {
  const value = requiredText(fields, columns, 'FXDate', row);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new CanonicalCsvError(
      row,
      `FXDate must be "YYYY-MM-DD"; got "${value}"`,
    );
  }
  return value;
}

export function parseTransactions(csv: string): Transaction[] {
  const lines = splitLines(csv);
  if (lines.length === 0) return [];

  const columns = readColumns(lines[0], TRANSACTION_COLUMNS, 'transactions CSV');

  return lines.slice(1).map((line, position) => {
    const row = position + 2;
    const fields = parseCSVLine(line);
    const { date, time } = parseTimestamp(
      requiredText(fields, columns, 'Date', row),
      row,
    );
    return {
      id: position,
      date,
      time,
      merchant: requiredText(fields, columns, 'Merchant', row),
      amount: requiredNumber(fields, columns, 'Amount', row),
      currency: requiredCurrency(fields, columns, row),
      amountUSD: requiredNumber(fields, columns, 'AmountUSD', row),
      fxRate: requiredNumber(fields, columns, 'FXRate', row),
      fxDate: requiredDate(fields, columns, row),
      category: requiredText(fields, columns, 'Category', row),
      payment: requiredText(fields, columns, 'Payment', row),
      city: requiredText(fields, columns, 'City', row),
      country: requiredText(fields, columns, 'Country', row),
      notes: (fields[columns.Notes] ?? '').trim(),
    };
  });
}

export function computeTrip(transactions: Transaction[]): TripSeries {
  const expenses = transactions.filter((t) => t.amountUSD < 0);
  const grandTotal = expenses.reduce((s, t) => s + Math.abs(t.amountUSD), 0);

  const byDay: Record<string, Transaction[]> = {};
  transactions.forEach((t) => {
    if (!byDay[t.date]) byDay[t.date] = [];
    byDay[t.date].push(t);
  });

  const days = Object.keys(byDay).sort();
  const daysTracked = days.length;

  const dayItems: DayStats[] = days.map((date) => {
    const spend = byDay[date].filter((t) => t.amountUSD < 0);
    const total = spend.reduce((s, t) => s + Math.abs(t.amountUSD), 0);
    const catTotals: Record<string, number> = {};
    spend.forEach((t) => {
      catTotals[t.category] =
        (catTotals[t.category] || 0) + Math.abs(t.amountUSD);
    });
    const topCategory =
      Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
    const cities = Array.from(
      new Set(
        spend.map((t) => t.city).filter((city) => !isGenericCity(city)),
      ),
    );
    return { date, total, transactions: byDay[date], topCategory, cities };
  });

  const catTotals: Record<string, { total: number; count: number }> = {};
  expenses.forEach((t) => {
    if (!catTotals[t.category]) catTotals[t.category] = { total: 0, count: 0 };
    catTotals[t.category].total += Math.abs(t.amountUSD);
    catTotals[t.category].count += 1;
  });
  const categoryItems: CategoryStats[] = Object.entries(catTotals)
    .sort((a, b) => b[1].total - a[1].total)
    .map(([category, { total, count }]) => ({
      category,
      total,
      count,
      percentage: grandTotal > 0 ? (total / grandTotal) * 100 : 0,
      color: getCategoryColor(category),
    }));

  const cityTotals: Record<
    string,
    { total: number; days: Set<string>; count: number }
  > = {};
  expenses.forEach((t) => {
    if (isGenericCity(t.city)) return;
    if (!cityTotals[t.city])
      cityTotals[t.city] = { total: 0, days: new Set(), count: 0 };
    cityTotals[t.city].total += Math.abs(t.amountUSD);
    cityTotals[t.city].days.add(t.date);
    cityTotals[t.city].count += 1;
  });
  const cityItems: CityStats[] = Object.entries(cityTotals)
    .sort((a, b) => b[1].total - a[1].total)
    .map(([city, { total, days: cityDays, count }]) => ({
      city,
      total,
      days: cityDays.size,
      transactions: count,
      avgPerDay: cityDays.size > 0 ? total / cityDays.size : 0,
    }));

  const biggestPurchase = expenses.reduce<Transaction | null>(
    (max, t) =>
      !max || Math.abs(t.amountUSD) > Math.abs(max.amountUSD) ? t : max,
    null,
  );

  const mostExpensive = dayItems.reduce<DayStats | null>(
    (max, day) => (!max || day.total > max.total ? day : max),
    null,
  );
  const cheapest = dayItems
    .filter((day) => day.total > 0)
    .reduce<DayStats | null>(
      (min, day) => (!min || day.total < min.total ? day : min),
      null,
    );

  const merchantMap: Record<string, { count: number; total: number }> = {};
  expenses.forEach((t) => {
    if (t.category === 'Transport' || t.category === 'Intercity Transport')
      return;
    if (!merchantMap[t.merchant])
      merchantMap[t.merchant] = { count: 0, total: 0 };
    merchantMap[t.merchant].count += 1;
    merchantMap[t.merchant].total += Math.abs(t.amountUSD);
  });
  const topMerchantEntry = Object.entries(merchantMap).sort(
    (a, b) => b[1].count - a[1].count,
  )[0];
  const topMerchant = topMerchantEntry
    ? { name: topMerchantEntry[0], ...topMerchantEntry[1] }
    : null;

  const foodTotal = catTotals['Food']?.total || 0;
  const accommodationTotal = catTotals['Accommodation']?.total || 0;
  const transportTotal =
    (catTotals['Transport']?.total || 0) +
    (catTotals['Intercity Transport']?.total || 0);
  const tripWideTotal = expenses
    .filter((t) => isGenericCity(t.city))
    .reduce((s, t) => s + Math.abs(t.amountUSD), 0);

  const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weekdaySpend: Record<string, number> = {};
  weekdayNames.forEach((day) => {
    weekdaySpend[day] = 0;
  });
  dayItems.forEach((day) => {
    const date = new Date(day.date + 'T00:00:00');
    if (!isNaN(date.getTime())) {
      weekdaySpend[weekdayNames[date.getDay()]] += day.total;
    }
  });

  const paymentMethods: Record<string, number> = {};
  expenses.forEach((t) => {
    paymentMethods[t.payment] =
      (paymentMethods[t.payment] || 0) + Math.abs(t.amountUSD);
  });

  let longestStreak = 0;
  let currentStreak = 0;
  for (let i = 0; i < days.length; i++) {
    if (i === 0) {
      currentStreak = 1;
      continue;
    }
    const prev = new Date(days[i - 1] + 'T00:00:00');
    const curr = new Date(days[i] + 'T00:00:00');
    const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
    if (diff === 1) {
      currentStreak++;
    } else {
      longestStreak = Math.max(longestStreak, currentStreak);
      currentStreak = 1;
    }
  }
  longestStreak = Math.max(longestStreak, currentStreak);

  const mostVisited = cityItems.reduce<CityStats | null>(
    (best, city) => (!best || city.days > best.days ? city : best),
    null,
  );

  return {
    summary: {
      grandTotal,
      transactionCount: expenses.length,
      daysTracked,
      dailyAverage: daysTracked > 0 ? grandTotal / daysTracked : 0,
      avgTransactionSize:
        expenses.length > 0 ? grandTotal / expenses.length : 0,
      dateRange: {
        start: days[0] || '',
        end: days[days.length - 1] || '',
      },
      longestStreak,
      biggestPurchase,
      topMerchant,
      paymentMethods,
    },
    days: {
      items: dayItems,
      mostExpensive,
      cheapest,
      weekdaySpend,
    },
    cities: {
      items: cityItems,
      visitedCount: cityItems.length,
      mostVisited,
      tripWideTotal,
    },
    categories: {
      items: categoryItems,
      top: categoryItems[0] || null,
      foodTotal,
      accommodationTotal,
      transportTotal,
    },
  };
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  const dt = new Date(dateStr + 'T00:00:00');
  if (isNaN(dt.getTime())) return dateStr;
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatDateFull(dateStr: string): string {
  if (!dateStr) return '—';
  const dt = new Date(dateStr + 'T00:00:00');
  if (isNaN(dt.getTime())) return dateStr;
  return dt.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: '2-digit',
  });
}

export function parseAccommodations(csv: string): AccommodationEntry[] {
  const lines = splitLines(csv);
  if (lines.length === 0) return [];

  const columns = readColumns(
    lines[0],
    ACCOMMODATION_COLUMNS,
    'accommodation CSV',
  );

  return lines.slice(1).map((line, position) => {
    const row = position + 2;
    const fields = parseCSVLine(line);
    const { date } = parseTimestamp(
      requiredText(fields, columns, 'Date', row),
      row,
    );
    return {
      date,
      merchant: requiredText(fields, columns, 'Merchant', row),
      city: requiredText(fields, columns, 'City', row),
      country: requiredText(fields, columns, 'Country', row),
      amount: requiredNumber(fields, columns, 'Amount', row),
      currency: requiredCurrency(fields, columns, row),
      amountUSD: requiredNumber(fields, columns, 'AmountUSD', row),
      fxRate: requiredNumber(fields, columns, 'FXRate', row),
      fxDate: requiredDate(fields, columns, row),
      notes: (fields[columns.Notes] ?? '').trim(),
    };
  });
}
