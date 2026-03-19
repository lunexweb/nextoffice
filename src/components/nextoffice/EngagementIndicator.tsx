import React from 'react';
import { Eye } from 'lucide-react';

export interface Engagement {
  viewCount: number;
  lastViewedAt?: string;
}

interface EngagementIndicatorProps {
  engagement: Engagement | null;
  size?: 'sm' | 'md';
  showCount?: boolean;
  showLastViewed?: boolean;
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export const EngagementIndicator: React.FC<EngagementIndicatorProps> = ({
  engagement,
  size = 'md',
  showCount = true,
  showLastViewed = true,
}) => {
  const iconSize = size === 'sm' ? 11 : 13;
  const viewCount = engagement?.viewCount ?? 0;
  const lastViewedAt = engagement?.lastViewedAt;

  if (viewCount === 0) {
    return (
      <div
        className="flex items-center gap-0.5 text-gray-300 dark:text-gray-600"
        title="Not yet viewed"
      >
        <Eye size={iconSize} />
        {showCount && <span className="text-[10px] tabular-nums">0</span>}
      </div>
    );
  }

  const isRecent = lastViewedAt
    ? (Date.now() - new Date(lastViewedAt).getTime()) < 3600000
    : false;

  const timeAgo = lastViewedAt ? formatRelativeTime(lastViewedAt) : '';
  const tooltipText = lastViewedAt
    ? `Viewed ${viewCount} time${viewCount !== 1 ? 's' : ''} · Last seen ${timeAgo}`
    : `Viewed ${viewCount} time${viewCount !== 1 ? 's' : ''}`;

  return (
    <div
      className={`flex items-center gap-0.5 ${isRecent ? 'text-blue-600 dark:text-blue-400' : 'text-blue-400 dark:text-blue-500'}`}
      title={tooltipText}
    >
      <Eye size={iconSize} className={isRecent ? 'animate-pulse' : ''} />
      {showCount && (
        <span className="text-[10px] font-bold tabular-nums">{viewCount}</span>
      )}
      {showLastViewed && timeAgo && (
        <span className="text-[9px] text-muted-foreground">{timeAgo}</span>
      )}
    </div>
  );
};
