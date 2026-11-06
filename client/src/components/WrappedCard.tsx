// ============================================================
// WrappedCard — base container for each "chapter" card
// Spotify Wrapped aesthetic: gradient background, bold text
// ============================================================
import { cn } from '@/lib/utils';
import { useScrollReveal } from '@/hooks/useScrollReveal';

interface WrappedCardProps {
  gradient: string;
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export function WrappedCard({ gradient, children, className, delay = 0 }: WrappedCardProps) {
  const { ref, visible } = useScrollReveal();

  return (
    <div
      ref={ref}
      className={cn('reveal rounded-3xl overflow-hidden relative', visible && 'visible', className)}
      style={{
        background: gradient,
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

// Category pill badge
interface CategoryPillProps {
  label: string;
  color: string;
  size?: 'sm' | 'md';
}

export function CategoryPill({ label, color, size = 'md' }: CategoryPillProps) {
  return (
    <span
      className={cn('category-pill', size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1')}
      style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}
    >
      {label}
    </span>
  );
}

// Progress bar
interface ProgressBarProps {
  value: number; // 0-100
  color: string;
  active?: boolean;
  height?: number;
  className?: string;
}

export function ProgressBar({ value, color, active = true, height = 6, className }: ProgressBarProps) {
  return (
    <div
      className={cn('rounded-full overflow-hidden', className)}
      style={{ height, background: 'rgba(255,255,255,0.15)' }}
    >
      <div
        className="h-full rounded-full progress-fill"
        style={{
          width: active ? `${Math.min(value, 100)}%` : '0%',
          background: color,
        }}
      />
    </div>
  );
}

// Glass panel inside a card
export function GlassPanel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('glass rounded-2xl p-4', className)}>
      {children}
    </div>
  );
}
