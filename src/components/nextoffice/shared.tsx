import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export const ScoreBar: React.FC<{ value: number; color?: string }> = ({ value, color }) => (
  <div className="w-full h-2 bg-foreground/10 rounded-full overflow-hidden">
    <motion.div
      initial={{ width: 0 }}
      animate={{ width: `${value}%` }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
      className="h-full rounded-full"
      style={{ backgroundColor: color || 'hsl(var(--primary))' }}
    />
  </div>
);

export const CountUp: React.FC<{ value: number; prefix?: string }> = ({ value, prefix = 'R' }) => {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const end = value;
    const duration = 800;
    const inc = end / (duration / 16);
    const timer = setInterval(() => {
      start += inc;
      if (start >= end) {
        setDisplay(end);
        clearInterval(timer);
      } else {
        setDisplay(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [value]);
  return <span className="font-mono">{prefix}{display.toLocaleString()}</span>;
};

export const Logo: React.FC<{ className?: string }> = ({ className = 'text-2xl' }) => (
  <div className={`flex items-center gap-0.5 ${className}`}>
    <span className="font-serif font-bold text-foreground">Next</span>
    <span className="font-serif text-primary">Office</span>
    <span className="w-1.5 h-1.5 rounded-full bg-primary mt-3 ml-0.5" />
  </div>
);

export const ThemeToggle: React.FC<{ isDark: boolean; toggle: () => void; className?: string }> = ({ isDark, toggle, className }) => (
  <button
    onClick={toggle}
    className={`p-2 rounded-full border border-border hover:bg-accent transition-colors duration-200 ${className || ''}`}
    aria-label="Toggle theme"
  >
    {isDark ? (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
    ) : (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
    )}
  </button>
);

export const NOCard: React.FC<{
  children: React.ReactNode;
  className?: string;
  goldBorder?: boolean;
  borderColor?: string;
}> = ({ children, className = '', goldBorder, borderColor }) => (
  <div className={`rounded-lg border border-border bg-card no-shadow transition-colors duration-200 ${goldBorder ? 'border-l-4 border-l-primary' : ''} ${className}`}
    style={borderColor ? { borderLeftWidth: '4px', borderLeftColor: borderColor } : undefined}
  >
    {children}
  </div>
);

export { InvoiceStatusBadge } from './InvoiceStatusBadge';
export { EngagementIndicator } from './EngagementIndicator';
export { CommunicationSummary } from './CommunicationSummary';
export { LoadingSpinner } from '../ui/skeleton';
