import React from 'react';
import { Mail, Send, Clock, TrendingUp } from 'lucide-react';
import { NOCard } from './shared';

interface CommunicationAnalytics {
  totalSent: number;
  totalOpened: number;
  openRate: number;
  avgResponseTime: string;
}

interface CommunicationSummaryProps {
  analytics: CommunicationAnalytics;
  onViewDetails: () => void;
}

export const CommunicationSummary: React.FC<CommunicationSummaryProps> = ({ analytics, onViewDetails }) => {
  return (
    <NOCard className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Mail size={20} className="text-purple-500" />
          Communication Summary
        </h3>
        <button 
          onClick={onViewDetails}
          className="text-sm text-purple-500 hover:text-purple-600"
        >
          View Details
        </button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Send size={16} className="text-blue-500" />
            <span className="text-2xl font-bold">{analytics.totalSent}</span>
          </div>
          <p className="text-xs text-muted-foreground">Emails Sent</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Mail size={16} className="text-green-500" />
            <span className="text-2xl font-bold">{analytics.totalOpened}</span>
          </div>
          <p className="text-xs text-muted-foreground">Emails Opened</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <TrendingUp size={16} className="text-purple-500" />
            <span className="text-2xl font-bold">{analytics.openRate}%</span>
          </div>
          <p className="text-xs text-muted-foreground">Open Rate</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Clock size={16} className="text-amber-500" />
            <span className="text-2xl font-bold">{analytics.avgResponseTime}</span>
          </div>
          <p className="text-xs text-muted-foreground">Avg Response</p>
        </div>
      </div>
    </NOCard>
  );
};
