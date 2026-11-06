// ============================================================
// 2026 Travel Wrapped — Main Page
// Style: Gradient Feast (Spotify Wrapped × Chinese Travel)
// Dark canvas, vivid gradient cards, animated stats
// ============================================================
import { useMemo, useState, useEffect, useCallback } from 'react';
import { parseTransactions, computeTrip, TripSeries, Transaction, DayStats, getCategoryColor, parseAccommodations, AccommodationEntry } from '@/lib/csvParser';
import { buildJourneyView, JourneyView } from '@/lib/journeyView';
import { formatFullDate, formatShortDate } from '@/lib/tripDate';
import { formatUSD } from '@/lib/money';
import { getAchievements } from '@/lib/achievements';
import { WrappedCard, CategoryPill, ProgressBar, GlassPanel } from '@/components/WrappedCard';
import { AchievementsCard } from '@/components/Achievements';

import { useScrollReveal } from '@/hooks/useScrollReveal';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { MapPin, TrendingUp, Utensils, Hotel, Train, ShoppingBag, Calendar, Zap, Award, DollarSign, ArrowRight, Globe2 } from 'lucide-react';

const HERO_BG = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663789310444/gPqDA8oDXYARxj2G8GPSGZ/hero-bg-ZsqqDYb5LYENCn3sc2jL3g.webp';

// CSV URLs - using local data folder for better reliability
const TRANSACTIONS_CSV_URL = '/data/transactions.csv';

export default function Home() {
  const [stats, setStats] = useState<TripSeries | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accommodations, setAccommodations] = useState<AccommodationEntry[]>([]);
  const [loadStatus, setLoadStatus] = useState<'idle' | 'loaded' | 'error'>('idle');
  const [autoLoaded, setAutoLoaded] = useState(false);
  const processCSV = useCallback((text: string) => {
    console.log('Processing CSV, text length:', text.length);
    const txns = parseTransactions(text);
    console.log('Parsed transactions:', txns.length);
    if (txns.length === 0) {
      console.error('No transactions parsed!');
      setLoadStatus('error');
      return;
    }
    const computed = computeTrip(txns);
    console.log('Computed stats:', computed);
    setTransactions(txns);
    setStats(computed);
    setLoadStatus('loaded');
  }, []);

  // Auto-load from GitHub repo
  const refreshFromGitHub = useCallback(() => {
    setLoadStatus('idle');
    const url = TRANSACTIONS_CSV_URL + '?t=' + Date.now();
    console.log('Fetching CSV from:', url);
    fetch(url)
      .then(r => {
        console.log('CSV fetch response:', r.status, r.ok);
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.text();
      })
      .then(text => {
        console.log('CSV loaded, size:', text.length);
        if (!text || text.trim().length === 0) throw new Error('Empty CSV');
        processCSV(text);
      })
      .catch(err => {
        console.error('Failed to load CSV:', err);
        setLoadStatus('idle');
      });
  }, [processCSV]);

  useEffect(() => {
    if (autoLoaded) return;
    setAutoLoaded(true);
    refreshFromGitHub();
  }, [autoLoaded, refreshFromGitHub]);

  // Load accommodations from local data folder
  useEffect(() => {
    fetch('/data/accommodation.csv?t=' + Date.now())
      .then(r => {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.text();
      })
      .then(text => {
        if (text && text.trim().length > 0) {
          const accom = parseAccommodations(text);
          setAccommodations(accom);
        }
      })
      .catch(err => console.log('Accommodation CSV not found:', err));
  }, []);

  const view = useMemo(
    () =>
      stats ? buildJourneyView(stats, transactions, accommodations) : null,
    [stats, transactions, accommodations],
  );

  return (
    <div className="min-h-screen" style={{ background: '#0d0d0f' }}>
      {/* Sticky Header with Currency Toggle */}
      <header className="sticky top-0 z-50 backdrop-blur-md" style={{ background: 'rgba(13, 13, 15, 0.8)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <div className="container max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe2 className="w-5 h-5 text-white/60" />
            <span className="text-sm font-semibold text-white/60">Travel Wrapped</span>
          </div>

        </div>
      </header>
      {/* ── HERO ── */}
      <header
        className="relative min-h-[70vh] flex flex-col items-center justify-center text-center overflow-hidden"
        style={{
          backgroundImage: `url(${HERO_BG})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Overlay */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(13,13,15,0.3) 0%, rgba(13,13,15,0.7) 70%, rgba(13,13,15,1) 100%)' }} />

        <div className="relative z-10 flex flex-col items-center gap-4 px-4">
          <div className="w-16 h-16 rounded-full border border-white/20 bg-white/5 flex items-center justify-center">
            <Globe2 className="w-8 h-8 text-white/80" />
          </div>
          <div className="text-white/60 text-xs font-semibold tracking-[0.25em] uppercase font-mono">
            2026 · A Year of Travel
          </div>
          <h1 className="text-white font-bold leading-none" style={{ fontFamily: 'Syne, sans-serif', fontSize: 'clamp(3rem, 10vw, 7rem)', letterSpacing: '-0.03em' }}>
            Travel<br />
            <span style={{ background: 'linear-gradient(135deg, #FF6B6B, #FF8E53)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Wrapped
            </span>
          </h1>
          <p className="text-white/60 text-base max-w-sm" style={{ fontFamily: 'DM Sans, sans-serif' }}>
            A year of travel, in numbers — every currency tracked, every city counted.
          </p>

          {stats && (
            <div className="flex items-center gap-6 mt-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
                  {formatUSD(stats.summary.grandTotal, 0)}
                </div>
                <div className="text-xs text-white/50 uppercase tracking-wider">Total Spent</div>
              </div>
              <div className="w-px h-10 bg-white/20" />
              <div className="text-center">
                <div className="text-3xl font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
                  {stats.summary.daysTracked}
                </div>
                <div className="text-xs text-white/50 uppercase tracking-wider">Days</div>
              </div>
              <div className="w-px h-10 bg-white/20" />
              <div className="text-center">
                <div className="text-3xl font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
                  {stats.cities.visitedCount}
                </div>
                <div className="text-xs text-white/50 uppercase tracking-wider">Cities</div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* ── MAIN CONTENT ── */}
      <main className="container max-w-3xl mx-auto px-4 py-8 space-y-6">



        {!stats && loadStatus === 'idle' && (
          <div className="text-center py-20 text-white/30">
            <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg">Loading travel data...</p>
          </div>
        )}

        {stats && view && (
          <>
            {/* ── CARD 1: Total Spent ── */}
            <WrappedCard gradient="linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)">
              <div className="p-8 text-white">
                <div className="text-sm font-semibold tracking-widest uppercase opacity-70 mb-2">I've spent</div>
                <div className="flex items-end gap-3 mb-1">
                  <div className="text-7xl sm:text-8xl font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
                    {formatUSD(stats.summary.grandTotal)}
                  </div>
                </div>
                <div className="text-white/70 text-lg mb-6">
                  That's <span className="font-bold text-white">{formatUSD(stats.summary.grandTotal, 0)}</span> spent across {stats.summary.daysTracked} days of travel
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <GlassPanel>
                    <div className="text-2xl font-bold" style={{ fontFamily: 'Syne, sans-serif' }}>{formatUSD(stats.summary.dailyAverage, 0)}</div>
                    <div className="text-xs opacity-70 mt-1">per day</div>
                  </GlassPanel>
                  <GlassPanel>
                    <div className="text-2xl font-bold" style={{ fontFamily: 'Syne, sans-serif' }}>{stats.summary.transactionCount}</div>
                    <div className="text-xs opacity-70 mt-1">transactions</div>
                  </GlassPanel>
                  <GlassPanel>
                    <div className="text-2xl font-bold" style={{ fontFamily: 'Syne, sans-serif' }}>{formatUSD(stats.summary.avgTransactionSize, 0)}</div>
                    <div className="text-xs opacity-70 mt-1">avg per txn</div>
                  </GlassPanel>
                </div>
              </div>
            </WrappedCard>

            {/* ── CARD 2: Daily Burn Chart ── */}
            <WrappedCard gradient="linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)">
              <div className="p-8 text-white">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-5 h-5 text-[#FF6B6B]" />
                  <div className="text-sm font-semibold tracking-widest uppercase opacity-70">Daily Burn Rate</div>
                </div>
                <div className="text-3xl font-bold mb-1" style={{ fontFamily: 'Syne, sans-serif' }}>
                  {formatUSD(stats.days.mostExpensive?.total, 0)} peak
                </div>
                <div className="text-white/50 text-sm mb-6">
                  on {formatShortDate(stats.days.mostExpensive?.date || '')} · my biggest spending day
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={stats.days.items.map(d => ({ date: formatShortDate(d.date), total: d.total, city: d.cities[0] || 'Trip' }))}>
                    <defs>
                      <linearGradient id="burnGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#FF6B6B" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#FF6B6B" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                    <YAxis hide />
                    <Tooltip
                      contentStyle={{ background: 'rgba(13,13,15,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff' }}
                      formatter={(v: number) => [`${formatUSD(v, 2)}`, 'Spent']}
                    />
                    <Area type="monotone" dataKey="total" stroke="#FF6B6B" strokeWidth={2.5} fill="url(#burnGrad)" dot={{ fill: '#FF6B6B', r: 3, strokeWidth: 0 }} />
                  </AreaChart>
                </ResponsiveContainer>
                <div className="flex items-center justify-between mt-4 text-sm">
                  <span className="text-white/50">Lightest day: <span className="text-white font-semibold">{formatUSD(stats.days.cheapest?.total, 2)}</span> on {formatShortDate(stats.days.cheapest?.date || '')}</span>
                </div>
              </div>
            </WrappedCard>

            {/* ── CARD 3: Top Category ── */}
            <WrappedCard gradient={`linear-gradient(135deg, ${getCategoryColor(stats.categories.top?.category || 'Food')}cc 0%, ${getCategoryColor(stats.categories.top?.category || 'Food')}44 100%)`}>
              <div className="p-8 text-white">
                <div className="text-sm font-semibold tracking-widest uppercase opacity-70 mb-2">My #1 spend</div>
                <div className="text-6xl font-bold mb-2" style={{ fontFamily: 'Syne, sans-serif' }}>
                  {stats.categories.top?.category}
                </div>
                <div className="text-white/70 text-lg mb-6">
                  <span className="font-bold text-white">{formatUSD(stats.categories.top?.total, 0)}</span> — {stats.categories.top?.percentage.toFixed(0)}% of my total budget
                </div>
                <div className="space-y-3">
                  {view.topCategories.map((cat) => (
                    <div key={cat.category}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium">{cat.category}</span>
                        <span className="mono text-white/70">{formatUSD(cat.total, 0)}</span>
                      </div>
                      <ProgressBar
                        value={cat.percentage}
                        color={cat.color}
                        active
                        height={6}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </WrappedCard>

            {/* ── CARD 4: Category Donut ── */}
            <WrappedCard gradient="linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)">
              <div className="p-8 text-white">
                <div className="flex items-center gap-2 mb-6">
                  <ShoppingBag className="w-5 h-5 text-[#f7971e]" />
                  <div className="text-sm font-semibold tracking-widest uppercase opacity-70">Where It Went</div>
                </div>
                <div className="flex gap-6 items-center">
                  <div className="flex-shrink-0">
                    <PieChart width={180} height={180}>
                      <Pie
                        data={stats.categories.items}
                        cx={90}
                        cy={90}
                        innerRadius={55}
                        outerRadius={85}
                        dataKey="total"
                        strokeWidth={2}
                        stroke="#0d0d0f"
                      >
                        {stats.categories.items.map((cat) => (
                          <Cell key={cat.category} fill={cat.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: 'rgba(13,13,15,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff' }}
                        formatter={(v: number) => [`${formatUSD(v, 2)}`, '']}
                      />
                    </PieChart>
                  </div>
                  <div className="flex-1 space-y-2">
                    {stats.categories.items.map((cat) => (
                      <div key={cat.category} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: cat.color }} />
                          <span className="text-sm text-white/80">{cat.category}</span>
                        </div>
                        <span className="text-sm mono text-white/60">{cat.percentage.toFixed(0)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </WrappedCard>

            {/* ── CARD 5: Cities ── */}
            <WrappedCard gradient="linear-gradient(135deg, #11998e 0%, #38ef7d 100%)">
              <div className="p-8 text-white">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-5 h-5 text-white/70" />
                  <div className="text-sm font-semibold tracking-widest uppercase opacity-70">Cities Conquered</div>
                </div>
                <div className="text-7xl font-bold mb-6" style={{ fontFamily: 'Syne, sans-serif' }}>
                  {stats.cities.visitedCount}
                </div>
                <div className="space-y-3">
                  {stats.cities.items.map((city, i) => {
                    const maxTotal = view.maxCityTotal;
                    return (
                      <div key={city.city} className="flex items-center gap-3">
                        <div className="text-sm font-bold w-5 text-white/50">{i + 1}</div>
                        <div className="flex-1">
                          <div className="flex justify-between mb-1">
                            <span className="font-semibold text-sm">{city.city}</span>
                            <span className="mono text-sm text-white/70">{formatUSD(city.total, 0)}</span>
                          </div>
                          <ProgressBar
                            value={(city.total / maxTotal) * 100}
                            color="rgba(255,255,255,0.9)"
                            active
                            height={5}
                          />
                          <div className="text-xs text-white/50 mt-1">{city.days} days · {formatUSD(city.avgPerDay, 0)}/day</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </WrappedCard>

            {/* ── CARD 6: Food Stats ── */}
            <WrappedCard gradient="linear-gradient(135deg, #FF6B6B 0%, #b91d73 100%)">
              <div className="p-8 text-white">
                <div className="flex items-center gap-2 mb-2">
                  <Utensils className="w-5 h-5 text-white/70" />
                  <div className="text-sm font-semibold tracking-widest uppercase opacity-70">I ate well</div>
                </div>
                <div className="text-7xl font-bold mb-2" style={{ fontFamily: 'Syne, sans-serif' }}>
                  {formatUSD(view.food.total, 0)}
                </div>
                <div className="text-white/70 text-lg mb-6">
                  spent on food — that's <span className="font-bold text-white">{formatUSD(view.food.perDay)}/day</span> on average
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <GlassPanel>
                    <div className="text-2xl font-bold" style={{ fontFamily: 'Syne, sans-serif' }}>
                      {view.food.meals}
                    </div>
                    <div className="text-xs opacity-70 mt-1">meals logged</div>
                  </GlassPanel>
                  <GlassPanel>
                    <div className="text-2xl font-bold" style={{ fontFamily: 'Syne, sans-serif' }}>
                      {formatUSD(view.food.perMeal, 1)}
                    </div>
                    <div className="text-xs opacity-70 mt-1">avg per meal</div>
                  </GlassPanel>
                </div>
              </div>
            </WrappedCard>

            {/* ── CARD 7: Accommodation ── */}
            <WrappedCard gradient="linear-gradient(135deg, #8360c3 0%, #2ebf91 100%)">
              <div className="p-8 text-white">
                <div className="flex items-center gap-2 mb-2">
                  <Hotel className="w-5 h-5 text-white/70" />
                  <div className="text-sm font-semibold tracking-widest uppercase opacity-70">Beds & Hostels</div>
                </div>
                <div className="text-7xl font-bold mb-2" style={{ fontFamily: 'Syne, sans-serif' }}>
                  {formatUSD(view.accommodation.ledgerTotal, 0)}
                </div>
                <div className="text-white/70 text-lg mb-6">
                  on accommodation · <span className="font-bold text-white">{view.accommodation.stays} stays</span>
                </div>
                <div className="space-y-2">
                  {view.topSpend.accommodation.map((t) => (
                    <div key={t.id} className="flex justify-between items-center py-2 border-b border-white/10">
                      <div>
                        <div className="text-sm font-semibold">{t.merchant}</div>
                        <div className="text-xs text-white/50">{t.city} · {formatShortDate(t.date)}</div>
                      </div>
                      <div className="mono text-sm font-bold">{formatUSD(t.amountUSD)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </WrappedCard>

            {/* ── CARD 8: Transport ── */}
            <WrappedCard gradient="linear-gradient(135deg, #2193b0 0%, #6dd5ed 100%)">
              <div className="p-8 text-white">
                <div className="flex items-center gap-2 mb-2">
                  <Train className="w-5 h-5 text-white/70" />
                  <div className="text-sm font-semibold tracking-widest uppercase opacity-70">Getting Around</div>
                </div>
                <div className="text-7xl font-bold mb-2" style={{ fontFamily: 'Syne, sans-serif' }}>
                  {formatUSD(view.categories.transportTotal, 0)}
                </div>
                <div className="text-white/70 text-lg mb-6">
                  on transport — trains, metros, bikes
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <GlassPanel>
                    <div className="text-2xl font-bold" style={{ fontFamily: 'Syne, sans-serif' }}>
                      {formatUSD(view.categories.intercityTransport?.total ?? 0, 0)}
                    </div>
                    <div className="text-xs opacity-70 mt-1">intercity trains</div>
                  </GlassPanel>
                  <GlassPanel>
                    <div className="text-2xl font-bold" style={{ fontFamily: 'Syne, sans-serif' }}>
                      {formatUSD(view.categories.transport?.total ?? 0, 0)}
                    </div>
                    <div className="text-xs opacity-70 mt-1">local transport</div>
                  </GlassPanel>
                </div>
              </div>
            </WrappedCard>

            {/* ── CARD 9: Biggest Purchase ── */}
            {stats.summary.biggestPurchase && (
              <WrappedCard gradient="linear-gradient(135deg, #f7971e 0%, #ffd200 100%)">
                <div className="p-8 text-white">
                  <div className="flex items-center gap-2 mb-2">
                    <Award className="w-5 h-5 text-white/70" />
                    <div className="text-sm font-semibold tracking-widest uppercase opacity-70">Biggest splurge</div>
                  </div>
                  <div className="text-7xl font-bold mb-2" style={{ fontFamily: 'Syne, sans-serif', color: '#1a1a1a' }}>
                    {formatUSD(Math.abs(stats.summary.biggestPurchase.amountUSD), 0)}
                  </div>
                  <div className="text-black/60 text-lg mb-4">
                    <span className="font-bold text-black">{stats.summary.biggestPurchase.merchant}</span>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <CategoryPill label={stats.summary.biggestPurchase.category} color="#1a1a1a" />
                    <CategoryPill label={stats.summary.biggestPurchase.city} color="#1a1a1a" />
                    <CategoryPill label={formatShortDate(stats.summary.biggestPurchase.date)} color="#1a1a1a" />
                  </div>
                </div>
              </WrappedCard>
            )}

            {/* ── CARD 10: Top Merchant ── */}
            {stats.summary.topMerchant && (
              <WrappedCard gradient="linear-gradient(135deg, #f953c6 0%, #b91d73 100%)">
                <div className="p-8 text-white">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-5 h-5 text-white/70" />
                    <div className="text-sm font-semibold tracking-widest uppercase opacity-70">My go-to spot</div>
                  </div>
                  <div className="text-5xl font-bold mb-2 leading-tight" style={{ fontFamily: 'Syne, sans-serif' }}>
                    {stats.summary.topMerchant.name}
                  </div>
                  <div className="text-white/70 text-lg mb-6">
                    I went back <span className="font-bold text-white">{stats.summary.topMerchant.count} times</span> — spending {formatUSD(stats.summary.topMerchant.total, 2)} total
                  </div>
                </div>
              </WrappedCard>
            )}

            {/* ── CARD 11: City Route ── */}
            <CityRouteCard route={view.route} />

            {/* ── CARD 11.5: Travel Achievements ── */}
            <AchievementsCard achievements={getAchievements(stats, transactions)} />

            {/* ── CARD 12: Weekday Spending ── */}
            <WrappedCard gradient="linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)">
              <div className="p-8 text-white">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-5 h-5 text-[#8360c3]" />
                  <div className="text-sm font-semibold tracking-widest uppercase opacity-70">Day of the Week</div>
                </div>
                <div className="text-white/70 text-sm mb-6">Which days cost you the most?</div>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => ({ day: d, total: stats.days.weekdaySpend[d] || 0 }))}>
                    <XAxis dataKey="day" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip
                      contentStyle={{ background: 'rgba(13,13,15,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff' }}
                      formatter={(v: number) => [`${formatUSD(v, 2)}`, 'Total']}
                    />
                    <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                      {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d, i) => (
                        <Cell key={d} fill={`hsl(${i * 51}, 80%, 65%)`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </WrappedCard>

            {/* ── CARD 12: Activities ── */}
            {view.categories.activities && (
              <WrappedCard gradient="linear-gradient(135deg, #f953c6 0%, #8360c3 100%)">
                <div className="p-8 text-white">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-5 h-5 text-white/70" />
                    <div className="text-sm font-semibold tracking-widest uppercase opacity-70">Adventures</div>
                  </div>
                  <div className="text-7xl font-bold mb-2" style={{ fontFamily: 'Syne, sans-serif' }}>
                    {formatUSD(view.categories.activities?.total ?? 0, 0)}
                  </div>
                  <div className="text-white/70 text-lg mb-6">
                    on activities · <span className="font-bold text-white">{view.categories.activities?.count ?? 0} experiences</span>
                  </div>
                  <div className="space-y-2">
                    {view.topSpend.activities.map((t) => (
                      <div key={t.id} className="flex justify-between items-center py-2 border-b border-white/10">
                        <div>
                          <div className="text-sm font-semibold">{t.merchant}</div>
                          <div className="text-xs text-white/50">{t.city} · {formatShortDate(t.date)}</div>
                        </div>
                        <div className="mono text-sm font-bold">{formatUSD(t.amountUSD)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </WrappedCard>
            )}

            {/* ── CARD 13: Pace Tracker ── */}
            <PaceTrackerCard pace={view.pace} />

            {/* ── CARD 14: Trip Highlights Grid ── */}
            <div className="grid grid-cols-2 gap-4">
              <HighlightMiniCard
                gradient="linear-gradient(135deg, #11998e 0%, #38ef7d 100%)"
                label="Streak"
                value={`${stats.summary.longestStreak} days`}
                sub="consecutive spending"
                delay={0}
              />
              <HighlightMiniCard
                gradient="linear-gradient(135deg, #f7971e 0%, #ffd200 100%)"
                label="Trip-wide"
                value={`${formatUSD(stats.cities.tripWideTotal, 0)}`}
                sub="SIM, VPN, rail"
                delay={100}
                dark
              />
              <HighlightMiniCard
                gradient="linear-gradient(135deg, #8360c3 0%, #2ebf91 100%)"
                label="Cheapest Day"
                value={`${formatUSD(stats.days.cheapest?.total, 2)}`}
                sub={formatShortDate(stats.days.cheapest?.date || '')}
                delay={200}
              />
              <HighlightMiniCard
                gradient="linear-gradient(135deg, #2193b0 0%, #6dd5ed 100%)"
                label="Most Active"
                value={stats.cities.mostVisited?.city || '—'}
                sub={`${stats.cities.mostVisited?.days} days`}
                delay={300}
              />
            </div>

            {/* ── CARD 13: Payment Methods ── */}
            <WrappedCard gradient="linear-gradient(135deg, #0f0c29 0%, #302b63 100%)">
              <div className="p-8 text-white">
                <div className="text-sm font-semibold tracking-widest uppercase opacity-70 mb-6">How I Paid</div>
                <div className="space-y-3">
                  {view.payments.map(({ method, amount, share }) => (
                    <div key={method}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium">{method}</span>
                        <span className="mono text-white/60">{formatUSD(amount, 0)} · {share.toFixed(0)}%</span>
                      </div>
                      <ProgressBar value={share} color="#8360c3" active height={5} />
                    </div>
                  ))}
                </div>
              </div>
            </WrappedCard>

            {/* ── CARD 14: Daily Log Table ── */}
            <DailyLogCard days={stats.days.items} />

            {/* ── CARD 15: Accommodation Daily ── */}
            {accommodations.length > 0 && (
              <WrappedCard gradient="linear-gradient(135deg, #8360c3 0%, #2ebf91 100%)">
                <div className="p-8 text-white">
                  <div className="flex items-center gap-2 mb-6">
                    <Hotel className="w-5 h-5" />
                    <div className="text-sm font-semibold tracking-widest uppercase opacity-70">Where I Slept</div>
                  </div>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {accommodations.map((acc, i) => (
                      <div key={i} className="flex justify-between items-center py-2 border-b border-white/10">
                        <div>
                          <div className="text-sm font-medium text-white">{acc.merchant}</div>
                          <div className="text-xs text-white/50">{formatFullDate(acc.date)} · {acc.city}</div>
                        </div>
                        <div className="text-sm mono font-bold text-white/80">{formatUSD(acc.amountUSD)}</div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 pt-4 border-t border-white/20">
                    <div className="flex justify-between text-sm">
                      <span className="text-white/60">Total Accommodations</span>
                      <span className="font-bold">{formatUSD(view.accommodation.perNightTotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-2">
                      <span className="text-white/60">Average per night</span>
                      <span className="font-bold">{formatUSD(view.accommodation.perNightAverage)}</span>
                    </div>
                  </div>
                </div>
              </WrappedCard>
            )}

            {/* ── Footer ── */}
            <div className="text-center py-8 text-white/30 text-sm">
              <div className="text-2xl mb-2">✈</div>
              <div>2026 Travel · {stats.summary.dateRange.start} → {stats.summary.dateRange.end}</div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

// Mini highlight card
function HighlightMiniCard({ gradient, label, value, sub, delay = 0, dark = false }: {
  gradient: string; label: string; value: string; sub: string; delay?: number; dark?: boolean;
}) {
  const { ref, visible } = useScrollReveal();
  return (
    <div
      ref={ref}
      className={`reveal rounded-2xl p-5 text-white ${visible ? 'visible' : ''}`}
      style={{ background: gradient, transitionDelay: `${delay}ms` }}
    >
      <div className={`text-xs font-semibold tracking-widest uppercase mb-2 ${dark ? 'text-black/50' : 'text-white/60'}`}>{label}</div>
      <div className={`text-2xl font-bold leading-tight ${dark ? 'text-black' : 'text-white'}`} style={{ fontFamily: 'Syne, sans-serif' }}>{value}</div>
      <div className={`text-xs mt-1 ${dark ? 'text-black/50' : 'text-white/50'}`}>{sub}</div>
    </div>
  );
}

// Pace tracker card — shows spending velocity over time
function PaceTrackerCard({ pace }: { pace: JourneyView['pace'] }) {
  const { ref, visible } = useScrollReveal();

  return (
    <div
      ref={ref}
      className={`reveal rounded-3xl overflow-hidden p-8 text-white ${visible ? 'visible' : ''}`}
      style={{ background: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)', transitionDelay: '0ms' }}
    >
      <div className="text-sm font-semibold tracking-widest uppercase text-white/50 mb-2">Spending Pace</div>
      <div className="flex items-end gap-4 mb-6">
        <div>
          <div className="text-5xl font-bold" style={{ fontFamily: 'Syne, sans-serif' }}>{formatUSD(pace.perDay, 0)}<span className="text-2xl text-white/50">/day</span></div>
          <div className="text-white/50 text-sm mt-1">At this pace: <span className="text-white font-semibold">{formatUSD(pace.perMonth, 0)}/month</span></div>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={160}>
        <AreaChart data={pace.running.map((point) => ({ ...point, date: formatShortDate(point.date) }))}>
          <defs>
            <linearGradient id="paceGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6dd5ed" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#6dd5ed" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
          <YAxis hide />
          <Tooltip
            contentStyle={{ background: 'rgba(13,13,15,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff' }}
            formatter={(v: number, name: string) => [formatUSD(v), name === 'running' ? 'Running Total' : 'Daily']}
          />
          <Area type="monotone" dataKey="running" stroke="#6dd5ed" strokeWidth={2.5} fill="url(#paceGrad)" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
      <div className="grid grid-cols-3 gap-3 mt-4">
        <div className="glass rounded-xl p-3 text-center">
          <div className="text-lg font-bold" style={{ fontFamily: 'Syne, sans-serif' }}>{pace.daysTracked}</div>
          <div className="text-xs text-white/50">days tracked</div>
        </div>
        <div className="glass rounded-xl p-3 text-center">
          <div className="text-lg font-bold" style={{ fontFamily: 'Syne, sans-serif' }}>{formatUSD(pace.grandTotal, 0)}</div>
          <div className="text-xs text-white/50">total so far</div>
        </div>
        <div className="glass rounded-xl p-3 text-center">
          <div className="text-lg font-bold" style={{ fontFamily: 'Syne, sans-serif' }}>{formatUSD(pace.perWeek, 0)}</div>
          <div className="text-xs text-white/50">weekly rate</div>
        </div>
      </div>
    </div>
  );
}

// City route timeline card
function CityRouteCard({ route }: { route: JourneyView['route'] }) {
  const { ref, visible } = useScrollReveal();

  return (
    <div
      ref={ref}
      className={`reveal rounded-3xl overflow-hidden p-8 text-white ${visible ? 'visible' : ''}`}
      style={{ background: 'linear-gradient(135deg, #1a0533 0%, #0d1b2a 100%)', border: '1px solid rgba(255,255,255,0.08)', transitionDelay: '0ms' }}
    >
      <div className="text-sm font-semibold tracking-widest uppercase text-white/50 mb-4">My Journey</div>
      <div className="text-3xl font-bold leading-tight" style={{ fontFamily: 'Syne, sans-serif' }}>
        {route.cityOrder.map((city, i) => (
          <div key={i}>
            {city} {i < route.cityOrder.length - 1 && <span className="text-white/40">→</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

// Daily log expandable card
function DailyLogCard({ days }: { days: DayStats[] }) {
  const { ref, visible } = useScrollReveal();
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div
      ref={ref}
      className={`reveal rounded-3xl overflow-hidden ${visible ? 'visible' : ''}`}
      style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #0d0d0f 100%)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <div className="p-6 pb-4">
        <div className="text-sm font-semibold tracking-widest uppercase text-white/50 mb-1">Daily Log</div>
        <div className="text-2xl font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>Every day, every purchase</div>
      </div>
      <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto">
        {days.slice().reverse().map((day) => (
          <div key={day.date}>
            <button
              className="w-full flex items-center justify-between px-6 py-4 hover:bg-white/5 transition-colors text-left group"
              onClick={() => setExpanded(expanded === day.date ? null : day.date)}
            >
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <span className="text-white/40 text-xs mono font-medium flex-shrink-0">{formatFullDate(day.date)}</span>
                {day.cities.length > 0 && (
                  <span className="text-xs text-white/50 flex items-center gap-1 flex-shrink-0">
                    <MapPin className="w-3 h-3" />{day.cities.join(' → ')}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 flex-shrink-0">
                <span className="mono text-sm font-bold text-white/90">{formatUSD(day.total)}</span>
                <ArrowRight className={`w-4 h-4 text-white/30 transition-transform group-hover:text-white/60 ${expanded === day.date ? 'rotate-90' : ''}`} />
              </div>
            </button>
            {expanded === day.date && (
              <div className="px-6 py-3 space-y-2 bg-white/2 border-t border-white/5">
                {day.transactions.filter(t => t.amountUSD < 0).map((t, i) => (
                  <div key={i} className="flex justify-between items-start py-2 hover:bg-white/5 px-2 rounded transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white/90 font-medium truncate">{t.merchant}</div>
                      <div className="text-xs text-white/40 mt-0.5">{t.category}</div>
                    </div>
                    <span className="mono text-sm text-white/70 font-semibold ml-3 flex-shrink-0">{formatUSD(t.amountUSD)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
