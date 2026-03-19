import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  FileText, 
  Mail,
  Clock,
  AlertTriangle,
  CheckCircle,
  Eye,
  Send,
  ChevronRight,
} from 'lucide-react';
import { useDashboard, useCommunications, useBusinessProfile } from '@/hooks';
import { 
  NOCard, 
  ScoreBar, 
  InvoiceStatusBadge, 
  EngagementIndicator,
  CommunicationSummary
} from '@/components/nextoffice/shared';

const getClientSlug = (clientName: string): string => {
  return clientName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
};

const getBorderColor = (type: 'red' | 'amber' | 'green' | 'blue') => {
  const colors = {
    red: 'rgb(239, 68, 68)',
    amber: 'rgb(245, 158, 11)',
    green: 'rgb(34, 197, 94)',
    blue: 'rgb(59, 130, 246)',
  };
  return colors[type];
};

const getScoreBarColor = (color: string) => {
  const colorMap: Record<string, string> = {
    green: 'rgb(34, 197, 94)',
    amber: 'rgb(245, 158, 11)',
    red: 'rgb(239, 68, 68)',
    blue: 'rgb(59, 130, 246)',
  };
  return colorMap[color] || 'rgb(156, 163, 175)';
};

const getActivityIcon = (action: string) => {
  const iconMap: Record<string, any> = {
    viewed_invoice:             { icon: Eye,           color: 'text-blue-500' },
    opened_invoice:             { icon: FileText,      color: 'text-amber-500' },
    initial_invoice:            { icon: FileText,      color: 'text-blue-500' },
    reminder:                   { icon: Clock,         color: 'text-amber-500' },
    followup:                   { icon: Mail,          color: 'text-purple-500' },
    confirmation:               { icon: CheckCircle,   color: 'text-green-500' },
    payment_received:           { icon: CheckCircle,   color: 'text-green-500' },
    commitment_confirmation:    { icon: Clock,         color: 'text-blue-500' },
    commitment_pending:         { icon: Clock,         color: 'text-amber-500' },
    commitment_approved:        { icon: CheckCircle,   color: 'text-green-500' },
    commitment_declined:        { icon: AlertTriangle, color: 'text-red-500' },
    commitment_completed:       { icon: CheckCircle,   color: 'text-green-500' },
    commitment_cancelled:       { icon: AlertTriangle, color: 'text-red-500' },
  };
  return iconMap[action] || { icon: FileText, color: 'text-gray-500' };
};

const formatRelativeTime = (timestamp: Date) => {
  const now = new Date();
  const diff = now.getTime() - timestamp.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  return `${days} day${days !== 1 ? 's' : ''} ago`;
};

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { stats, entries, alerts, activities, loading, error } = useDashboard();
  const { analytics } = useCommunications();
  const { businessProfile } = useBusinessProfile();

  const safeEntries = Array.isArray(entries) ? entries : [];
  const overdueInvoices = safeEntries.filter((e: any) => e.status === 'overdue');
  const dueSoonInvoices = safeEntries.filter((e: any) => e.status === 'due');
  const upcomingInvoices = safeEntries.filter((e: any) => e.status === 'sent');
  
  const totalOverdue = overdueInvoices.reduce((sum: number, inv: any) => sum + (inv.amount || 0), 0);
  const totalDueSoon = dueSoonInvoices.reduce((sum: number, inv: any) => sum + (inv.amount || 0), 0);
  const totalUpcoming = upcomingInvoices.reduce((sum: number, inv: any) => sum + (inv.amount || 0), 0);

  // Compute next follow-up for overdue invoices: next day after overdue, then every 2 days
  const getNextFollowUp = (dueDate: string) => {
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    // Schedule: day 1 after due, then every 2 days (1, 3, 5, 7, 9, ...)
    const daysOverdue = Math.floor((now.getTime() - due.getTime()) / 86400000);
    if (daysOverdue < 1) {
      // Not overdue yet
      const followUpDate = new Date(due);
      followUpDate.setDate(followUpDate.getDate() + 1);
      const daysUntil = Math.floor((followUpDate.getTime() - now.getTime()) / 86400000);
      return {
        date: followUpDate.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }),
        daysUntil,
        label: 'First follow-up',
        isPast: false,
      };
    }
    // Find the next follow-up day: 1, 3, 5, 7, 9, ...
    let nextStep = 1;
    while (nextStep < daysOverdue) {
      nextStep += 2;
    }
    const followUpDate = new Date(due);
    followUpDate.setDate(followUpDate.getDate() + nextStep);
    const daysUntil = Math.floor((followUpDate.getTime() - now.getTime()) / 86400000);
    const followUpNumber = Math.floor((nextStep - 1) / 2) + 1;
    const label = followUpNumber === 1 ? 'First follow-up' : `Follow-up #${followUpNumber}`;
    return {
      date: followUpDate.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }),
      daysUntil,
      label,
      isPast: false,
    };
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-red-500">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="px-3 py-3 sm:p-6 lg:p-8 space-y-3 sm:space-y-6">
      {/* Morning Briefing — compact on mobile */}
      <NOCard goldBorder className="p-3 sm:p-6 lg:p-8">
        <p className="text-[11px] sm:text-sm text-muted-foreground mb-0.5 sm:mb-1">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
        <h2 className="font-serif text-xl sm:text-3xl md:text-4xl font-bold mb-0.5 sm:mb-2">
          Welcome, {businessProfile?.ownerName?.split(' ')[0] || 'there'}.
        </h2>
        <p className="italic text-primary text-xs sm:text-base">{overdueInvoices.length} client{overdueInvoices.length !== 1 ? 's' : ''} need{overdueInvoices.length === 1 ? 's' : ''} your attention today.</p>
      </NOCard>

      {/* Stats — mobile: 2 prominent on top, 3 compact below */}
      <div className="space-y-2 sm:space-y-0 sm:grid sm:grid-cols-3 lg:grid-cols-5 sm:gap-3">
        {/* Top row on mobile: Overdue + Due Today side by side */}
        <div className="grid grid-cols-2 gap-2 sm:contents">
          <div className="rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50/50 dark:bg-red-950/20 p-3 sm:p-4 text-center">
            <div className="text-lg sm:text-xl font-bold text-red-600 leading-tight truncate">
              R{totalOverdue.toLocaleString()}
            </div>
            <div className="text-[10px] sm:text-xs text-red-600/70 font-medium mt-0.5">
              {overdueInvoices.length} Overdue
            </div>
          </div>
          <div className="rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20 p-3 sm:p-4 text-center">
            <div className="text-lg sm:text-xl font-bold text-amber-600 leading-tight truncate">
              R{totalDueSoon.toLocaleString()}
            </div>
            <div className="text-[10px] sm:text-xs text-amber-600/70 font-medium mt-0.5">
              {dueSoonInvoices.length} Due Today
            </div>
          </div>
        </div>
        {/* Bottom row on mobile: 3 compact stats */}
        <div className="grid grid-cols-3 gap-2 sm:contents">
          <div className="rounded-xl border border-border bg-card p-2.5 sm:p-4 text-center">
            <div className="text-sm sm:text-lg font-bold text-blue-600 leading-tight truncate">
              R{totalUpcoming.toLocaleString()}
            </div>
            <div className="text-[9px] sm:text-xs text-muted-foreground mt-0.5">Pending</div>
          </div>
          <div className="rounded-xl border border-border bg-card p-2.5 sm:p-4 text-center">
            <div className="text-sm sm:text-lg font-bold text-green-600 leading-tight truncate">
              R{stats.monthlyRevenue.toLocaleString()}
            </div>
            <div className="text-[9px] sm:text-xs text-muted-foreground mt-0.5">This Month</div>
          </div>
          <div className="rounded-xl border-2 border-primary/20 bg-card p-2.5 sm:p-4 text-center">
            <div className="text-sm sm:text-lg font-bold text-primary leading-tight truncate">
              R{stats.totalCollected.toLocaleString()}
            </div>
            <div className="text-[9px] sm:text-xs text-muted-foreground mt-0.5">All Time</div>
          </div>
        </div>
      </div>

      {/* Overdue Invoices — mobile optimised */}
      <NOCard className="p-3 sm:p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold flex items-center gap-1.5 text-xs sm:text-base">
            <AlertTriangle size={15} className="text-red-500 sm:w-[18px] sm:h-[18px]" />
            Overdue Invoices
          </h3>
          <button 
            onClick={() => navigate('/app/invoices')}
            className="text-xs sm:text-sm text-red-500 hover:text-red-600 font-medium"
          >
            View All
          </button>
        </div>
        {overdueInvoices.length === 0 ? (
          <div className="text-center py-6 sm:py-8 text-muted-foreground">
            <CheckCircle size={36} className="mx-auto mb-3 text-green-500 sm:w-12 sm:h-12" />
            <p className="text-sm">No overdue invoices!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {overdueInvoices.slice(0, 5).map((invoice: any, index: number) => {
              const followUp = getNextFollowUp(invoice.dueDate);
              return (
                <div key={invoice.id || index} className="rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 overflow-hidden">
                  {/* Main row — tap to go to client */}
                  <div
                    className="p-2.5 sm:p-3 flex items-start justify-between gap-2 cursor-pointer active:bg-red-100/50 dark:active:bg-red-900/20 transition-colors"
                    onClick={() => navigate(`/app/clients/${getClientSlug(invoice.client?.name || '')}`)}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-[13px] sm:text-sm truncate leading-tight">{invoice.client?.name || 'Unknown Client'}</p>
                      <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
                        {invoice.documentNumber} · Due {invoice.dueDate}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="font-bold text-[13px] sm:text-sm text-red-600">R{invoice.amount.toLocaleString()}</div>
                      <div className="mt-0.5">
                        <EngagementIndicator engagement={invoice.engagement || null} size="sm" showCount={true} showLastViewed={false} />
                      </div>
                    </div>
                  </div>
                  {/* Follow-up bar */}
                  <div className="px-2.5 py-1.5 sm:px-3 sm:py-2 bg-red-100/50 dark:bg-red-900/15 border-t border-red-100 dark:border-red-900/20 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[10px] sm:text-xs">
                      <Send size={10} className="text-amber-600 flex-shrink-0" />
                      <span className="font-medium">Next Follow Up</span>
                      <span className="text-muted-foreground hidden sm:inline">· {followUp.label}</span>
                    </div>
                    {followUp.daysUntil === 0 ? (
                      <span className="text-[10px] font-bold text-red-600 bg-red-100 dark:bg-red-900/30 px-2 py-0.5 rounded-full animate-pulse">Today!</span>
                    ) : followUp.daysUntil === 1 ? (
                      <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">
                        {followUp.date} (tomorrow)
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">
                        {followUp.date} (in {followUp.daysUntil} days)
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </NOCard>

      {/* Quick Actions — horizontal scroll on mobile */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-3 px-3 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-4 sm:gap-3 scrollbar-hide">
        {[
          { label: 'New Invoice', sub: 'Create & send', icon: FileText, color: 'text-blue-500', bg: 'bg-blue-500/10', path: '/app/invoices?action=create' },
          { label: 'Clients', sub: 'View all', icon: Users, color: 'text-green-500', bg: 'bg-green-500/10', path: '/app/clients' },
          { label: 'Comms', sub: 'Track emails', icon: Mail, color: 'text-purple-500', bg: 'bg-purple-500/10', path: '/app/communications' },
          { label: 'Recurring', sub: 'Monthly', icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10', path: '/app/invoices' },
        ].map(a => (
          <button key={a.label} onClick={() => navigate(a.path)}
            className="flex-shrink-0 w-[100px] sm:w-auto p-3 sm:p-4 rounded-xl border border-border bg-card hover:bg-accent text-center transition-colors active:scale-[0.97]">
            <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg ${a.bg} flex items-center justify-center mx-auto mb-1.5`}>
              <a.icon size={16} className={`${a.color} sm:w-[18px] sm:h-[18px]`} />
            </div>
            <p className="font-semibold text-[11px] sm:text-sm leading-tight">{a.label}</p>
            <p className="text-[9px] sm:text-xs text-muted-foreground mt-0.5 hidden sm:block">{a.sub}</p>
          </button>
        ))}
      </div>

      {/* Communication Summary */}
      {analytics && (
        <CommunicationSummary
          analytics={{
            totalSent: analytics.sent,
            totalOpened: analytics.opened,
            openRate: analytics.openRate,
            avgResponseTime: '—',
          }}
          onViewDetails={() => navigate('/app/communications')}
        />
      )}

      {/* Client Activity Feed */}
      <NOCard className="p-3 sm:p-6">
        <div className="flex items-center justify-between mb-2.5 sm:mb-4">
          <h3 className="font-semibold flex items-center gap-1.5 text-xs sm:text-base">
            <Users size={15} className="text-blue-500 sm:w-[18px] sm:h-[18px]" />
            Recent Activity
          </h3>
          <button 
            onClick={() => navigate('/app/clients')}
            className="text-xs sm:text-sm text-blue-500 hover:text-blue-600 font-medium"
          >
            View All
          </button>
        </div>
        <div className="space-y-1 sm:space-y-2">
          {Array.isArray(activities) && activities.length > 0 ? (
            activities.slice(0, 4).map((activity: any) => {
              const { icon: Icon, color } = getActivityIcon(activity.action);
              return (
                <div 
                  key={activity.id}
                  className="flex items-center gap-2.5 sm:gap-3 p-2 sm:p-3 rounded-lg cursor-pointer active:bg-accent transition-colors"
                  onClick={() => navigate(`/app/clients/${activity.clientSlug}`)}
                >
                  <div className={`p-1.5 rounded-lg bg-muted/70 ${color} flex-shrink-0`}>
                    <Icon size={13} className="sm:w-4 sm:h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-[12px] sm:text-sm truncate">{activity.clientName}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground flex-shrink-0">{formatRelativeTime(activity.timestamp)}</p>
                    </div>
                    <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                      {activity.action.replace(/_/g, ' ')} · {activity.documentNumber}
                    </p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-6 text-muted-foreground text-sm">
              No recent activity
            </div>
          )}
        </div>
      </NOCard>

      {/* Intelligence Alerts */}
      {Array.isArray(alerts) && alerts.length > 0 && (
        <section>
          <h3 className="font-semibold text-xs sm:text-lg mb-2 sm:mb-4 text-primary flex items-center gap-1.5">
            <AlertTriangle size={14} className="sm:w-5 sm:h-5" />
            Needs Attention
          </h3>
          <div className="space-y-2 sm:space-y-3">
            {alerts.map((alert: any) => (
              <div
                key={alert.id}
                onClick={() => navigate(`/app/clients/${getClientSlug(alert.clientName)}`)}
                className="rounded-xl border bg-card p-3 sm:p-4 flex items-center gap-3 cursor-pointer active:bg-accent transition-colors"
                style={{ borderLeftWidth: '3px', borderLeftColor: getBorderColor(alert.type === 'overdue' ? 'red' : alert.type === 'opened' ? 'amber' : 'green') }}
              >
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-[12px] sm:text-sm leading-tight">{alert.title}</h4>
                  <p className="text-[10px] sm:text-xs text-muted-foreground truncate mt-0.5">{alert.description}</p>
                </div>
                <ChevronRight size={16} className="text-muted-foreground flex-shrink-0" />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Ledger */}
      <section>
        <div className="flex justify-between items-center mb-2 sm:mb-4">
          <h3 className="font-semibold text-xs sm:text-lg">Client Ledger</h3>
          <span className="text-[10px] sm:text-sm text-muted-foreground">{safeEntries.length} active</span>
        </div>
        {/* Mobile: compact stacked cards */}
        <div className="md:hidden space-y-2">
          {safeEntries.length > 0 ? (
            safeEntries.map((row: any) => (
              <div
                key={row.id}
                onClick={() => navigate(`/app/clients/${getClientSlug(row.client?.name || '')}`)}
                className="rounded-xl border border-border bg-card p-3 cursor-pointer active:bg-accent transition-colors"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-[13px] truncate flex-1 mr-2">{row.client?.name || 'Unknown'}</span>
                  <span className="font-bold text-[13px]">R{(row.amount || 0).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-muted-foreground font-mono">{row.documentNumber}</span>
                  <InvoiceStatusBadge status={row.status as any} size="sm" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <span className="text-[10px] font-mono font-bold w-7">{row.score || 0}%</span>
                    <div className="flex-1"><ScoreBar value={row.score || 0} color={getScoreBarColor(row.color)} /></div>
                  </div>
                  <EngagementIndicator engagement={row.engagement || null} size="sm" showCount={true} showLastViewed={false} />
                </div>
              </div>
            ))
          ) : (
            <div className="py-8 text-center text-muted-foreground text-xs">
              No entries yet. Create your first invoice to get started.
            </div>
          )}
        </div>

        {/* Desktop: table */}
        <NOCard className="overflow-x-auto hidden md:block">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                <th className="p-4 font-medium">Client</th>
                <th className="p-4 font-medium">Document</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Score</th>
                <th className="p-4 font-medium">Pattern</th>
                <th className="p-4 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {safeEntries.length > 0 ? (
                safeEntries.map((row: any) => (
                  <tr key={row.id} className="border-b border-border last:border-0 hover:bg-accent/50 transition-colors">
                    <td className="p-4 font-bold">{row.client?.name || 'Unknown Client'}</td>
                    <td className="p-4">
                      <span className="font-mono">{row.documentNumber}</span> 
                      <span className="text-muted-foreground ml-2">R{(row.amount || 0).toLocaleString()}</span>
                    </td>
                    <td className="p-4">
                      <InvoiceStatusBadge status={row.status as any} size="sm" />
                    </td>
                    <td className="p-4 w-40">
                      <div className="flex items-center gap-3">
                        <span className="font-mono w-8">{row.score || 0}%</span>
                        <ScoreBar value={row.score || 0} color={getScoreBarColor(row.color)} />
                      </div>
                    </td>
                    <td className="p-4 text-xs text-muted-foreground">
                      <div className="max-w-[200px] truncate" title={row.pattern}>
                        {row.pattern}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <EngagementIndicator 
                          engagement={row.engagement || null} 
                          size="sm" 
                          showCount={true}
                          showLastViewed={false}
                        />
                        <button 
                          onClick={() => navigate(`/app/clients/${getClientSlug(row.client?.name || '')}`)}
                          className="text-primary hover:underline font-medium text-sm"
                        >
                          {row.action}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    No ledger entries found. Create your first invoice to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </NOCard>
      </section>
    </div>
  );
};

export default DashboardPage;
