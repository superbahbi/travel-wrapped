import type {
  CategorySeries,
  DaySeries,
  Transaction,
  TripSeries,
  TripSummary,
} from './csvParser';
import { isGenericCity } from './csvParser';
import { hourOfTime, weekdayIndex } from './tripDate';

const BADGE_BASE =
  'https://d2xsxph8kpxj0f.cloudfront.net/310519663789310444/gPqDA8oDXYARxj2G8GPSGZ';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  category: 'spending' | 'travel' | 'food' | 'lifestyle';
  image?: string;
}

interface AchievementFacts {
  summary: TripSummary;
  days: DaySeries;
  cities: { visitedCount: number };
  accommodationCities: number;
  foodTotal: number;
  activitiesTotal: number;
  cafeVisits: number;
  weekendPurchases: number;
  earlyPurchases: number;
  latePurchases: number;
  daysWithinBudget: number;
}

interface Rule {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: Achievement['category'];
  image: string;
  unlocked: (facts: AchievementFacts) => boolean;
}

function categoryTotal(categories: CategorySeries, name: string): number {
  return (
    categories.items.find((category) => category.category === name)?.total ?? 0
  );
}

function buildFacts(
  series: TripSeries,
  transactions: Transaction[],
): AchievementFacts {
  const spend = transactions.filter((t) => t.amountUSD < 0);

  return {
    summary: series.summary,
    days: series.days,
    cities: { visitedCount: series.cities.visitedCount },
    accommodationCities: new Set(
      spend
        .filter((t) => t.category === 'Accommodation')
        .map((t) => t.city)
        .filter((city) => !isGenericCity(city)),
    ).size,
    foodTotal: series.categories.foodTotal,
    activitiesTotal: categoryTotal(series.categories, 'Activities'),
    cafeVisits: new Set(
      spend
        .map((t) => t.merchant.toLowerCase())
        .filter(
          (merchant) =>
            merchant.includes('cafe') ||
            merchant.includes('coffee') ||
            merchant.includes('tea house'),
        ),
    ).size,
    weekendPurchases: spend.filter((t) => {
      const day = weekdayIndex(t.date);
      return day === 0 || day === 6;
    }).length,
    earlyPurchases: spend.filter((t) => {
      const hour = hourOfTime(t.time);
      return hour !== null && hour < 8;
    }).length,
    latePurchases: spend.filter((t) => {
      const hour = hourOfTime(t.time);
      return hour !== null && hour >= 22;
    }).length,
    daysWithinBudget: series.days.items.filter(
      (day) => day.total >= 20 && day.total <= 40,
    ).length,
  };
}

const RULES: Rule[] = [
  {
    id: 'budget-master',
    name: 'Budget Master',
    description: 'Average daily spend below $30',
    icon: '💰',
    category: 'spending',
    image: `${BADGE_BASE}/badge-budget-master-Hmpnn4h68u2sXkh3WTvXKT.webp`,
    unlocked: (facts) =>
      facts.summary.daysTracked > 0 && facts.summary.dailyAverage < 30,
  },
  {
    id: 'big-spender',
    name: 'Big Spender',
    description: 'Spent $1000+ total',
    icon: '💸',
    category: 'spending',
    image: `${BADGE_BASE}/badge-big-spender-QEYBS5SvA2wydBcw3GWGWe.webp`,
    unlocked: (facts) => facts.summary.grandTotal >= 1000,
  },
  {
    id: 'frugal-traveler',
    name: 'Frugal Traveler',
    description: 'Average daily spend below $25',
    icon: '💵',
    category: 'spending',
    image: `${BADGE_BASE}/badge-frugal-traveler-8d9HSptFCoyMyCj4uKcBP4.webp`,
    unlocked: (facts) =>
      facts.summary.daysTracked > 0 && facts.summary.dailyAverage < 25,
  },
  {
    id: 'spender-supreme',
    name: 'Spender Supreme',
    description: 'Spent $500+ on food',
    icon: '🍽️',
    category: 'spending',
    image: `${BADGE_BASE}/badge-spender-supreme-H6bQiuSwoP6j7rDs34WdYz.webp`,
    unlocked: (facts) => facts.foodTotal >= 500,
  },
  {
    id: 'consistent-spender',
    name: 'Consistent Spender',
    description: 'Spent $20-40 on 5+ days',
    icon: '📊',
    category: 'spending',
    image: `${BADGE_BASE}/badge-consistent-spender-FqwQ5yybCoWiY93YJMojXM.webp`,
    unlocked: (facts) => facts.daysWithinBudget >= 5,
  },
  {
    id: 'activity-seeker',
    name: 'Activity Seeker',
    description: 'Spent $100+ on activities',
    icon: '🎭',
    category: 'spending',
    image: `${BADGE_BASE}/badge-activity-seeker-KPvqFcjy5CYHuKoBfgog9U.webp`,
    unlocked: (facts) => facts.activitiesTotal >= 100,
  },
  {
    id: 'food-lover',
    name: 'Food Lover',
    description: 'Spent 30%+ on food',
    icon: '🍱',
    category: 'food',
    image: `${BADGE_BASE}/badge-food-lover-Q69vQRFKkfNnumoohuQRzE.webp`,
    unlocked: (facts) =>
      facts.summary.grandTotal > 0 &&
      facts.foodTotal / facts.summary.grandTotal >= 0.3,
  },
  {
    id: 'cafe-hopper',
    name: 'Cafe Hopper',
    description: 'Visited 5+ cafes',
    icon: '☕',
    category: 'food',
    image: `${BADGE_BASE}/badge-cafe-hopper-UXDdNcfhxUo4aG7aaX2KUG.webp`,
    unlocked: (facts) => facts.cafeVisits >= 5,
  },
  {
    id: 'long-journey',
    name: 'Long Journey',
    description: 'Traveled 25+ days',
    icon: '✈️',
    category: 'travel',
    image: `${BADGE_BASE}/badge-long-journey-Y4NwUbK6XFSnZ2NxxEfVoG.webp`,
    unlocked: (facts) => facts.summary.daysTracked >= 25,
  },
  {
    id: 'accommodation-collector',
    name: 'Accommodation Collector',
    description: 'Stayed in 6+ different cities',
    icon: '🏨',
    category: 'travel',
    image: `${BADGE_BASE}/badge-accommodation-collector-MoydeTiPAjMQ5CCnqPVafh.webp`,
    unlocked: (facts) => facts.accommodationCities >= 6,
  },
  {
    id: 'city-explorer',
    name: 'City Explorer',
    description: 'Visited 7+ cities',
    icon: '🗺️',
    category: 'travel',
    image: `${BADGE_BASE}/badge-city-explorer-cdiaMyuxv4N9MQbDLfbMeR.webp`,
    unlocked: (facts) => facts.cities.visitedCount >= 7,
  },
  {
    id: 'early-bird',
    name: 'Early Bird',
    description: 'Made 3+ purchases before 8am',
    icon: '🌅',
    category: 'lifestyle',
    image: `${BADGE_BASE}/badge-early-bird-4Uhs87Y8vA5j2mLfMTWhpF.webp`,
    unlocked: (facts) => facts.earlyPurchases >= 3,
  },
  {
    id: 'night-owl',
    name: 'Night Owl',
    description: 'Made 3+ purchases after 10pm',
    icon: '🌙',
    category: 'lifestyle',
    image: `${BADGE_BASE}/badge-night-owl-Ebu2sYUSkENpBqgSbKTBrz.webp`,
    unlocked: (facts) => facts.latePurchases >= 3,
  },
  {
    id: 'weekend-warrior',
    name: 'Weekend Warrior',
    description: 'Made 10+ purchases on weekends',
    icon: '🎉',
    category: 'lifestyle',
    image: `${BADGE_BASE}/badge-weekend-warrior-UKVpPydCsPDEanDsA5FymE.webp`,
    unlocked: (facts) => facts.weekendPurchases >= 10,
  },
];

export function getAchievements(
  series: TripSeries,
  transactions: Transaction[],
): Achievement[] {
  const facts = buildFacts(series, transactions);
  return RULES.map((rule) => ({
    id: rule.id,
    name: rule.name,
    description: rule.description,
    icon: rule.icon,
    category: rule.category,
    image: rule.image,
    unlocked: rule.unlocked(facts),
  }));
}
