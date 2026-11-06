// Achievement detection helper
import { hourOfTime, weekdayIndex } from './tripDate';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedDate?: string;
  category: 'spending' | 'travel' | 'food' | 'lifestyle';
}

export function getAchievements(transactions: any[], stats: any): Achievement[] {
  const achievements: Achievement[] = [];

  // Street Foodie - spent >5 times on street food
  const streetFoodCount = transactions.filter(t => 
    t.merchant?.toLowerCase().includes('street') || 
    t.merchant?.toLowerCase().includes('food stall') ||
    t.notes?.toLowerCase().includes('street')
  ).length;
  achievements.push({
    id: 'street-foodie',
    name: 'Street Foodie',
    description: 'Enjoyed street food 5+ times',
    icon: '🍜',
    unlocked: streetFoodCount >= 5,
    category: 'food'
  });

  // Train Hopper - used trains for >50% of transport
  const trainTransactions = transactions.filter(t => 
    t.category === 'Transport' && 
    (t.merchant?.toLowerCase().includes('train') || 
     t.merchant?.toLowerCase().includes('rail') ||
     t.merchant?.toLowerCase().includes('railway'))
  ).length;
  const totalTransport = transactions.filter(t => t.category === 'Transport').length;
  const trainPercentage = totalTransport > 0 ? (trainTransactions / totalTransport) * 100 : 0;
  achievements.push({
    id: 'train-hopper',
    name: 'Train Hopper',
    description: 'Used trains for 50%+ of transport',
    icon: '🚂',
    unlocked: trainPercentage >= 50,
    category: 'travel'
  });

  // Budget Master - average daily spend below $30
  const budgetThreshold = 30;
  achievements.push({
    id: 'budget-master',
    name: 'Budget Master',
    description: `Average daily spend below $${budgetThreshold}`,
    icon: '💰',
    unlocked: stats.dailyAverage < budgetThreshold,
    category: 'spending'
  });

  // Accommodation Collector - stayed in 6+ different places
  const uniqueCities = new Set(transactions.map(t => t.city)).size;
  achievements.push({
    id: 'accommodation-collector',
    name: 'Accommodation Collector',
    description: 'Stayed in 6+ different cities',
    icon: '🏨',
    unlocked: uniqueCities >= 6,
    category: 'travel'
  });

  // Food Lover - spent >30% on food
  const foodTotal = transactions
    .filter(t => t.category === 'Food')
    .reduce((sum, t) => sum + Math.abs(t.amountUSD), 0);
  const foodPercentage = stats.grandTotal > 0 ? (foodTotal / stats.grandTotal) * 100 : 0;
  achievements.push({
    id: 'food-lover',
    name: 'Food Lover',
    description: 'Spent 30%+ on food',
    icon: '🍱',
    unlocked: foodPercentage >= 30,
    category: 'food'
  });

  // Long Journey - traveled 25+ days
  achievements.push({
    id: 'long-journey',
    name: 'Long Journey',
    description: 'Traveled 25+ days',
    icon: '✈️',
    unlocked: stats.daysTracked >= 25,
    category: 'travel'
  });

  // Mixue Enthusiast - visited Mixue 5+ times
  const mixueCount = transactions.filter(t => 
    t.merchant?.toLowerCase().includes('mixue')
  ).length;
  achievements.push({
    id: 'mixue-enthusiast',
    name: 'Mixue Enthusiast',
    description: 'Visited Mixue 5+ times',
    icon: '🧋',
    unlocked: mixueCount >= 5,
    category: 'food'
  });

  // Spender - spent >$1000 total
  achievements.push({
    id: 'big-spender',
    name: 'Big Spender',
    description: 'Spent $1000+ total',
    icon: '💸',
    unlocked: stats.grandTotal >= 1000,
    category: 'spending'
  });

  // Early Bird - made purchases before 8am
  const earlyBirdCount = transactions.filter((t) => {
    const hour = hourOfTime(t.time);
    return hour !== null && hour < 8;
  }).length;
  achievements.push({
    id: 'early-bird',
    name: 'Early Bird',
    description: 'Made 3+ purchases before 8am',
    icon: '🌅',
    unlocked: earlyBirdCount >= 3,
    category: 'lifestyle'
  });

  // Night Owl - made purchases after 10pm
  const nightOwlCount = transactions.filter((t) => {
    const hour = hourOfTime(t.time);
    return hour !== null && hour >= 22;
  }).length;
  achievements.push({
    id: 'night-owl',
    name: 'Night Owl',
    description: 'Made 3+ purchases after 10pm',
    icon: '🌙',
    unlocked: nightOwlCount >= 3,
    category: 'lifestyle'
  });

  // City Explorer - visited all 7 cities
  achievements.push({
    id: 'city-explorer',
    name: 'City Explorer',
    description: 'Visited all 7 cities',
    icon: '🗺️',
    unlocked: uniqueCities >= 7,
    category: 'travel'
  });

  // Weekend Warrior - made 10+ purchases on weekends
  const weekendCount = transactions.filter((t) => {
    const day = weekdayIndex(t.date);
    return day === 0 || day === 6; // Sunday or Saturday
  }).length;
  achievements.push({
    id: 'weekend-warrior',
    name: 'Weekend Warrior',
    description: 'Made 10+ purchases on weekends',
    icon: '🎉',
    unlocked: weekendCount >= 10,
    category: 'lifestyle'
  });

  // Noodle Master - spent $50+ on noodles
  const noodleTotal = transactions
    .filter(t => t.merchant?.toLowerCase().includes('noodle') || 
                 t.merchant?.toLowerCase().includes('ramen') ||
                 t.merchant?.toLowerCase().includes('pho'))
    .reduce((sum, t) => sum + Math.abs(t.amountUSD), 0);
  achievements.push({
    id: 'noodle-master',
    name: 'Noodle Master',
    description: 'Spent $50+ on noodles',
    icon: '🍜',
    unlocked: noodleTotal >= 50,
    category: 'food'
  });

  // Cafe Hopper - visited 5+ cafes
  const cafeCount = transactions.filter(t =>
    t.merchant?.toLowerCase().includes('cafe') ||
    t.merchant?.toLowerCase().includes('coffee') ||
    t.merchant?.toLowerCase().includes('tea house')
  ).length;
  achievements.push({
    id: 'cafe-hopper',
    name: 'Cafe Hopper',
    description: 'Visited 5+ cafes',
    icon: '☕',
    unlocked: cafeCount >= 5,
    category: 'food'
  });

  // Spender Supreme - spent $500+ on food
  const foodTotalSpender = transactions
    .filter(t => t.category === 'Food')
    .reduce((sum, t) => sum + Math.abs(t.amountUSD), 0);
  achievements.push({
    id: 'spender-supreme',
    name: 'Spender Supreme',
    description: 'Spent $500+ on food',
    icon: '🍽️',
    unlocked: foodTotalSpender >= 500,
    category: 'spending'
  });

  // Frugal Traveler - average daily spend below $25
  achievements.push({
    id: 'frugal-traveler',
    name: 'Frugal Traveler',
    description: 'Average daily spend below $25',
    icon: '💵',
    unlocked: stats.dailyAverage < 25,
    category: 'spending'
  });

  // Activity Seeker - spent $100+ on activities
  const activitiesTotal = transactions
    .filter(t => t.category === 'Activities')
    .reduce((sum, t) => sum + Math.abs(t.amountUSD), 0);
  achievements.push({
    id: 'activity-seeker',
    name: 'Activity Seeker',
    description: 'Spent $100+ on activities',
    icon: '🎭',
    unlocked: activitiesTotal >= 100,
    category: 'spending'
  });

  // Consistent Spender - spent between $20-40 on 5+ days
  const consistentDays = Object.values(stats.dailySpend || {}).filter((d: any) => d >= 20 && d <= 40).length;
  achievements.push({
    id: 'consistent-spender',
    name: 'Consistent Spender',
    description: 'Spent $20-40 on 5+ days',
    icon: '📊',
    unlocked: consistentDays >= 5,
    category: 'spending'
  });

  return achievements;
}
