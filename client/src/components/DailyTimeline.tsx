// Daily Timeline Component - Vertical scrollable story
import { useState } from 'react';
import { TripStats } from '@/lib/csvParser';
import { WrappedCard } from '@/components/WrappedCard';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { MapPin, TrendingUp } from 'lucide-react';

interface DayHighlight {
  date: string;
  total: number;
  topCategory: string;
  topCategoryAmount: number;
  cities: string[];
  transactionCount: number;
  highlight: string;
}

function generateDayHighlights(dayStats: any[]): DayHighlight[] {
  return dayStats.map(day => {
    const categoryStats = new Map<string, number>();
    day.transactions.forEach((t: any) => {
      if (t.amountUSD < 0) {
        categoryStats.set(t.category, (categoryStats.get(t.category) || 0) + Math.abs(t.amountUSD));
      }
    });
    
    const topCategory = Array.from(categoryStats.entries()).sort((a, b) => b[1] - a[1])[0];
    const topCategoryAmount = topCategory ? topCategory[1] : 0;
    
    let highlight = '';
    if (day.total > 100) {
      highlight = `Big spending day! You spent $${day.total.toFixed(0)}.`;
    } else if (day.total < 10) {
      highlight = `Frugal day! You only spent $${day.total.toFixed(2)}.`;
    } else if (topCategory && topCategory[0] === 'Food') {
      highlight = `Food lover! Spent $${topCategoryAmount.toFixed(2)} on meals.`;
    } else if (topCategory && topCategory[0] === 'Accommodation') {
      highlight = `Settled in for the night.`;
    } else if (topCategory && topCategory[0] === 'Transport') {
      highlight = `Travel day! Moving between cities.`;
    } else {
      highlight = `Another day, another adventure!`;
    }
    
    return {
      date: day.date,
      total: day.total,
      topCategory: topCategory ? topCategory[0] : 'Other',
      topCategoryAmount,
      cities: day.cities,
      transactionCount: day.transactions.filter((t: any) => t.amountUSD < 0).length,
      highlight
    };
  });
}

export function DailyTimelineCard({ stats }: { stats: TripStats }) {
  const { ref, visible } = useScrollReveal();
  const [activeDay, setActiveDay] = useState<string | null>(null);
  
  const highlights = generateDayHighlights(stats.dayStats);
  
  return (
    <div
      ref={ref}
      className={`reveal rounded-3xl overflow-hidden ${visible ? 'visible' : ''}`}
      style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #0d0d0f 100%)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <div className="p-6 pb-4 sticky top-0 z-10" style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #0d0d0f 100%)' }}>
        <div className="text-sm font-semibold tracking-widest uppercase text-white/50 mb-1">Daily Timeline</div>
        <div className="text-2xl font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>Your journey, day by day</div>
      </div>
      
      <div className="relative px-6 pb-6">
        {/* Timeline line */}
        <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-white/20 via-white/10 to-transparent ml-6"></div>
        
        <div className="space-y-6 ml-8">
          {highlights.map((day, idx) => (
            <div key={day.date} className="relative">
              {/* Timeline dot */}
              <div className="absolute -left-8 top-2 w-4 h-4 rounded-full bg-white/20 border border-white/40"></div>
              
              <button
                onClick={() => setActiveDay(activeDay === day.date ? null : day.date)}
                className="w-full text-left p-4 rounded-xl hover:bg-white/5 transition-all duration-200 cursor-pointer group"
                style={{ background: activeDay === day.date ? 'rgba(255,255,255,0.08)' : 'transparent' }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-white/40 mono mb-1">Day {idx + 1}</div>
                    <div className="text-sm font-semibold text-white mb-2">{new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
                    {day.cities.length > 0 && (
                      <div className="flex items-center gap-1 text-xs text-white/60 mb-2">
                        <MapPin className="w-3 h-3" />
                        <span>{day.cities.join(' → ')}</span>
                      </div>
                    )}
                    <p className="text-sm text-white/70 italic">{day.highlight}</p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <div className="text-lg font-bold text-white">${day.total.toFixed(2)}</div>
                    <div className="text-xs text-white/50 mt-1">{day.transactionCount} transactions</div>
                  </div>
                </div>
              </button>
              
              {/* Expanded details */}
              {activeDay === day.date && (
                <div className="mt-2 p-3 rounded-lg bg-white/5 border border-white/10 text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-white/60">Top Category:</span>
                    <span className="text-white font-semibold">{day.topCategory} (${day.topCategoryAmount.toFixed(2)})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Daily Average:</span>
                    <span className="text-white font-semibold">${(day.total / day.transactionCount).toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
