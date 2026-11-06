import type {
  AccommodationEntry,
  CategoryStats,
  Transaction,
  TripSeries,
} from './csvParser';
import { buildCityRoute } from './city';

export interface SpendRow {
  id: number;
  merchant: string;
  city: string;
  date: string;
  amountUSD: number;
}

export interface RunningPoint {
  date: string;
  running: number;
  daily: number;
}

export interface PaymentShare {
  method: string;
  amount: number;
  share: number;
}

export interface JourneyView {
  topCategories: CategoryStats[];
  categories: {
    activities: CategoryStats | null;
    transport: CategoryStats | null;
    intercityTransport: CategoryStats | null;
    transportTotal: number;
  };
  food: {
    total: number;
    meals: number;
    perMeal: number;
    perDay: number;
  };
  accommodation: {
    ledgerTotal: number;
    stays: number;
    perNightTotal: number;
    perNightAverage: number;
  };
  topSpend: {
    accommodation: SpendRow[];
    activities: SpendRow[];
  };
  route: { cityOrder: string[] };
  pace: {
    perDay: number;
    perMonth: number;
    perWeek: number;
    daysTracked: number;
    grandTotal: number;
    running: RunningPoint[];
  };
  payments: PaymentShare[];
  maxCityTotal: number;
}

function findCategory(
  categories: CategoryStats[],
  name: string,
): CategoryStats | null {
  return categories.find((category) => category.category === name) ?? null;
}

function spendRows(
  transactions: Transaction[],
  category: string,
  limit = 5,
): SpendRow[] {
  return transactions
    .filter((t) => t.category === category && t.amountUSD < 0)
    .sort((a, b) => Math.abs(b.amountUSD) - Math.abs(a.amountUSD))
    .slice(0, limit)
    .map((t) => ({
      id: t.id,
      merchant: t.merchant,
      city: t.city,
      date: t.date,
      amountUSD: t.amountUSD,
    }));
}

export function buildJourneyView(
  series: TripSeries,
  transactions: Transaction[],
  accommodations: AccommodationEntry[],
): JourneyView {
  const categoryItems = series.categories.items;
  const food = findCategory(categoryItems, 'Food');
  const accommodation = findCategory(categoryItems, 'Accommodation');
  const daysTracked = series.summary.daysTracked;

  const foodTotal = food?.total ?? 0;
  const meals = food?.count ?? 0;

  // Defense in depth for the per-night total: only positive rows count, so a
  // malformed negative row can never shrink it. The parser also rejects those.
  const perNightTotal = accommodations.reduce(
    (sum, entry) => (entry.amountUSD > 0 ? sum + entry.amountUSD : sum),
    0,
  );
  const nights = accommodations.length;

  let running = 0;
  const runningPoints = series.days.items.map((day) => {
    running += day.total;
    return { date: day.date, running, daily: day.total };
  });

  const cityOrder = buildCityRoute(
    series.days.items.flatMap((day) => day.cities),
  );

  const grandTotal = series.summary.grandTotal;
  const payments = Object.entries(series.summary.paymentMethods)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([method, amount]) => ({
      method,
      amount,
      share: grandTotal > 0 ? (amount / grandTotal) * 100 : 0,
    }));

  return {
    topCategories: categoryItems.slice(0, 6),
    categories: {
      activities: findCategory(categoryItems, 'Activities'),
      transport: findCategory(categoryItems, 'Transport'),
      intercityTransport: findCategory(categoryItems, 'Intercity Transport'),
      transportTotal: series.categories.transportTotal,
    },
    food: {
      total: foodTotal,
      meals,
      perMeal: meals > 0 ? foodTotal / meals : 0,
      perDay: daysTracked > 0 ? foodTotal / daysTracked : 0,
    },
    accommodation: {
      ledgerTotal: series.categories.accommodationTotal,
      stays: accommodation?.count ?? 0,
      perNightTotal,
      perNightAverage: nights > 0 ? perNightTotal / nights : 0,
    },
    topSpend: {
      accommodation: spendRows(transactions, 'Accommodation'),
      activities: spendRows(transactions, 'Activities'),
    },
    route: { cityOrder },
    pace: {
      perDay: series.summary.dailyAverage,
      perMonth: series.summary.dailyAverage * 30,
      perWeek: series.summary.dailyAverage * 7,
      daysTracked,
      grandTotal,
      running: runningPoints,
    },
    payments,
    maxCityTotal: series.cities.items[0]?.total || 1,
  };
}
