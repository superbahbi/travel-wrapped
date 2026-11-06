import { useState, useEffect } from 'react';
import { Achievement } from '@/lib/achievements';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function AchievementsCard({ achievements }: { achievements: Achievement[] }) {
  const { ref, visible } = useScrollReveal();
  const [unlockedCount, setUnlockedCount] = useState(0);
  const [flipped, setFlipped] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<string>('all');

  useEffect(() => {
    setUnlockedCount(achievements.filter(a => a.unlocked).length);
  }, [achievements]);

  const categories = [
    { id: 'all', label: 'All', icon: '🏆' },
    { id: 'spending', label: 'Spending', icon: '💰' },
    { id: 'travel', label: 'Travel', icon: '✈️' },
    { id: 'food', label: 'Food', icon: '🍽️' },
    { id: 'lifestyle', label: 'Lifestyle', icon: '🌟' }
  ];

  const getFilteredAchievements = () => {
    if (activeTab === 'all') return achievements;
    return achievements.filter((a) => a.category === activeTab);
  };

  const filteredAchievements = getFilteredAchievements();

  const toggleFlip = (id: string) => {
    const newFlipped = new Set(flipped);
    if (newFlipped.has(id)) {
      newFlipped.delete(id);
    } else {
      newFlipped.add(id);
    }
    setFlipped(newFlipped);
  };

  return (
    <div
      ref={ref}
      className={`reveal rounded-3xl overflow-hidden ${visible ? 'visible' : ''}`}
      style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #0d0d0f 100%)' }}
    >
      <div className="p-6 pb-4">
        <div className="text-sm font-semibold tracking-widest uppercase text-white/50 mb-1">Travel Achievements</div>
        <div className="text-2xl font-bold text-white mb-2" style={{ fontFamily: 'Syne, sans-serif' }}>
          {unlockedCount} of {achievements.length} Unlocked
        </div>
        <div className="w-full bg-white/10 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-yellow-400 to-yellow-500 h-full rounded-full transition-all duration-500"
            style={{ width: `${achievements.length > 0 ? (unlockedCount / achievements.length) * 100 : 0}%` }}
          />
        </div>
      </div>

      <div className="px-6 pb-6 max-h-[600px] overflow-y-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-6 bg-white/5 border border-white/10 p-1">
            {categories.map(cat => (
              <TabsTrigger key={cat.id} value={cat.id} className="text-xs sm:text-sm py-1">
                <span className="mr-1">{cat.icon}</span>
                <span className="hidden sm:inline">{cat.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            {filteredAchievements.length === 0 ? (
              <div className="text-center py-8 text-white/50">
                No achievements in this category yet
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                {filteredAchievements.map((achievement, idx) => {
                  const badgeImage = achievement.image;
                  return (
                    <div
                      key={achievement.id}
                      className="relative w-full aspect-square cursor-pointer group"
                      onClick={() => toggleFlip(achievement.id)}
                      style={{
                        perspective: '1000px',
                        animation: `slideIn 0.5s ease-out ${idx * 0.05}s both`
                      }}
                    >
                      <div
                        style={{
                          transformStyle: 'preserve-3d',
                          transform: flipped.has(achievement.id) ? 'rotateY(180deg)' : 'rotateY(0deg)',
                          transition: 'transform 0.6s',
                          width: '100%',
                          height: '100%'
                        }}
                      >
                        {/* Front - Badge Image */}
                        <div
                          className="absolute w-full h-full rounded-lg overflow-hidden flex items-center justify-center"
                          style={{
                            backfaceVisibility: 'hidden',
                            backgroundColor: '#2a2a3e',
                            backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)',
                            backdropFilter: 'blur(10px)',
                            border: '1px solid rgba(255,255,255,0.1)'
                          }}
                        >
                          {badgeImage ? (
                            <img
                              src={badgeImage}
                              alt={achievement.name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                              onError={(e) => {
                                // Fallback if image fails to load
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="text-4xl">{achievement.icon}</div>
                          )}
                          {!achievement.unlocked && (
                            <div className="absolute inset-0 bg-black/60 rounded-lg flex items-center justify-center">
                              <div className="text-2xl">🔒</div>
                            </div>
                          )}
                        </div>

                        {/* Back - Description */}
                        <div
                          className="absolute w-full h-full rounded-lg p-3 flex flex-col items-center justify-center text-center"
                          style={{
                            backfaceVisibility: 'hidden',
                            transform: 'rotateY(180deg)',
                            backgroundColor: '#2a2a3e',
                            backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 100%)',
                            backdropFilter: 'blur(10px)',
                            border: '1px solid rgba(255,255,255,0.15)'
                          }}
                        >
                          <div className="text-xs font-semibold text-white/90 mb-2">{achievement.name}</div>
                          <div className="text-xs text-white/70 leading-tight">{achievement.description}</div>
                          {achievement.unlocked && (
                            <div className="mt-2 text-yellow-400 text-xs font-bold">✓ UNLOCKED</div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
