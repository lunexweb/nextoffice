import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  FileText, 
  Mail,
  Clock,
  Timer,
  AlertTriangle,
  CheckCircle,
  Eye,
  Send,
  ChevronRight,
  Bell,
} from 'lucide-react';
import { useDashboard, useCommunications, useBusinessProfile } from '@/hooks';
import { emailService } from '@/services/emailService';
import { communicationService } from '@/services/api/communicationService';
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
  const { stats, entries, alerts, activities, loading, error, sendTime, reminderRules, automationEnabled, commLogs } = useDashboard();
  const { analytics } = useCommunications();
  const { businessProfile } = useBusinessProfile();

  // ── Live tick: re-render every 60s for countdown ──
  const [_tick, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 60_000);
    return () => clearInterval(interval);
  }, []);

  const safeEntries = Array.isArray(entries) ? entries : [];
  const overdueInvoices = safeEntries.filter((e: any) => e.status === 'overdue');
  const dueSoonInvoices = safeEntries.filter((e: any) => e.status === 'due');
  const upcomingInvoices = safeEntries.filter((e: any) => e.status === 'sent');
  
  const totalOverdue = overdueInvoices.reduce((sum: number, inv: any) => sum + (inv.amount || 0), 0);
  const totalDueSoon = dueSoonInvoices.reduce((sum: number, inv: any) => sum + (inv.amount || 0), 0);
  const totalUpcoming = upcomingInvoices.reduce((sum: number, inv: any) => sum + (inv.amount || 0), 0);

  // ── Helpers ──
  const formatTime12h = (time24: string) => {
    const [h, m] = time24.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
  };
  const sendTimeDisplay = formatTime12h(sendTime);

  // Build exact target datetime from a date + sendTime
  const buildTargetDatetime = (dateStr: Date) => {
    const [h, m] = sendTime.split(':').map(Number);
    const target = new Date(dateStr);
    target.setHours(h, m, 0, 0);
    return target;
  };

  // Live countdown from now to a target datetime
  const getCountdown = (target: Date) => {
    const now = new Date();
    const diff = target.getTime() - now.getTime();
    if (diff <= 0) return { total: 0, days: 0, hours: 0, minutes: 0, display: 'Now', isPast: true };
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    let display = '';
    if (days > 0) display += `${days}d `;
    if (hours > 0 || days > 0) display += `${hours}h `;
    display += `${minutes}m`;
    return { total: diff, days, hours, minutes, display: display.trim(), isPast: false };
  };

  // Check if a follow-up/reminder was already sent today for a given invoice
  const getLastFollowUpForInvoice = (invoiceId: string) => {
    const logs = commLogs
      .filter((l: any) => l.invoiceId === invoiceId && (l.type === 'followup' || l.type === 'reminder'))
      .sort((a: any, b: any) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
    return logs[0] || null;
  };

  const wasSentToday = (invoiceId: string) => {
    const last = getLastFollowUpForInvoice(invoiceId);
    if (!last) return false;
    const sentDate = new Date(last.sentAt);
    const today = new Date();
    return sentDate.toDateString() === today.toDateString();
  };

  // Compute next follow-up for overdue invoices: next day after overdue, then every 2 days
  const getNextFollowUp = (dueDate: string, invoiceId: string) => {
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const sentToday = wasSentToday(invoiceId);
    const lastLog = getLastFollowUpForInvoice(invoiceId);

    const daysOverdue = Math.floor((now.getTime() - due.getTime()) / 86400000);
    if (daysOverdue < 1) {
      const followUpDate = new Date(due);
      followUpDate.setDate(followUpDate.getDate() + 1);
      const targetDt = buildTargetDatetime(followUpDate);
      const countdown = getCountdown(targetDt);
      return {
        date: followUpDate.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }),
        time: sendTimeDisplay,
        targetDt,
        countdown,
        label: 'First follow-up',
        sentToday,
        lastSentAt: lastLog?.sentAt || null,
      };
    }
    let nextStep = 1;
    while (nextStep < daysOverdue) {
      nextStep += 2;
    }
    if (nextStep === daysOverdue && sentToday) {
      nextStep += 2;
    }
    const followUpDate = new Date(due);
    followUpDate.setDate(followUpDate.getDate() + nextStep);
    const targetDt = buildTargetDatetime(followUpDate);
    const countdown = getCountdown(targetDt);
    const followUpNumber = Math.floor((nextStep - 1) / 2) + 1;
    const label = followUpNumber === 1 ? 'First follow-up' : `Follow-up #${followUpNumber}`;
    return {
      date: followUpDate.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }),
      time: sendTimeDisplay,
      targetDt,
      countdown,
      label,
      sentToday,
      lastSentAt: lastLog?.sentAt || null,
    };
  };

  // ── Build unified upcoming events (reminders + follow-ups) ──
  const [showAllEvents, setShowAllEvents] = useState(false);
  const upcomingEvents = useMemo(() => {
    const events: { type: 'reminder' | 'followup'; label: string; clientName: string; invoiceNumber: string; amount: number; targetDt: Date; countdown: ReturnType<typeof getCountdown>; sentToday: boolean; lastSentAt: string | null; viewCount: number; lastViewedAt: string | null }[] = [];

    // Reminders for due-soon / upcoming invoices (before due date)
    const reminderBeforeRules = reminderRules.filter((r: any) => r.enabled && r.triggerType === 'before');
    const reminderDaysBefore = reminderBeforeRules.length > 0
      ? reminderBeforeRules.map((r: any) => r.triggerDays as number)
      : [3]; // default: 3 days before

    for (const inv of [...dueSoonInvoices, ...upcomingInvoices]) {
      const due = new Date(inv.dueDate);
      due.setHours(0, 0, 0, 0);

      for (const daysBefore of reminderDaysBefore) {
        const reminderDate = new Date(due);
        reminderDate.setDate(reminderDate.getDate() - daysBefore);
        const targetDt = buildTargetDatetime(reminderDate);
        if (targetDt.getTime() > Date.now()) {
          const lastLog = getLastFollowUpForInvoice(inv.id);
          events.push({
            type: 'reminder',
            label: daysBefore === 0 ? 'Due date reminder' : `Reminder (${daysBefore}d before)`,
            clientName: inv.client?.name || 'Unknown',
            invoiceNumber: inv.documentNumber,
            amount: inv.amount,
            targetDt,
            countdown: getCountdown(targetDt),
            sentToday: wasSentToday(inv.id),
            lastSentAt: lastLog?.sentAt || null,
            viewCount: inv.engagement?.viewCount || 0,
            lastViewedAt: inv.engagement?.lastViewedAt || null,
          });
        }
      }

      // Due-date reminder
      const dueDateTarget = buildTargetDatetime(due);
      if (dueDateTarget.getTime() > Date.now()) {
        const lastLog = getLastFollowUpForInvoice(inv.id);
        events.push({
          type: 'reminder',
          label: 'Due date reminder',
          clientName: inv.client?.name || 'Unknown',
          invoiceNumber: inv.documentNumber,
          amount: inv.amount,
          targetDt: dueDateTarget,
          countdown: getCountdown(dueDateTarget),
          sentToday: wasSentToday(inv.id),
          lastSentAt: lastLog?.sentAt || null,
          viewCount: inv.engagement?.viewCount || 0,
          lastViewedAt: inv.engagement?.lastViewedAt || null,
        });
      }
    }

    // Follow-ups for overdue invoices
    for (const inv of overdueInvoices) {
      const followUp = getNextFollowUp(inv.dueDate, inv.id);
      events.push({
        type: 'followup',
        label: followUp.label,
        clientName: inv.client?.name || 'Unknown',
        invoiceNumber: inv.documentNumber,
        amount: inv.amount,
        targetDt: followUp.targetDt,
        countdown: followUp.countdown,
        sentToday: followUp.sentToday,
        lastSentAt: followUp.lastSentAt,
        viewCount: inv.engagement?.viewCount || 0,
        lastViewedAt: inv.engagement?.lastViewedAt || null,
      });
    }

    // Sort by nearest first
    events.sort((a, b) => a.targetDt.getTime() - b.targetDt.getTime());
    return events;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, sendTime, reminderRules, commLogs, _tick]);

  // Auto-trigger follow-up emails for overdue invoices when due
  const autoFollowUpRan = useRef(false);
  const processAutoFollowUps = useCallback(async () => {
    if (!businessProfile?.businessName || !businessProfile?.email) return;
    const now = new Date();
    const [sendH, sendM] = sendTime.split(':').map(Number);
    // Only trigger if current time >= sendTime
    if (now.getHours() < sendH || (now.getHours() === sendH && now.getMinutes() < sendM)) return;

    for (const invoice of overdueInvoices) {
      if (wasSentToday(invoice.id)) continue;
      if (!invoice.clientEmail) continue;

      const daysOverdue = Math.max(0, Math.floor((Date.now() - new Date(invoice.dueDate).getTime()) / 86400000));
      // Check if today is a follow-up day (1, 3, 5, 7, ...)
      const due = new Date(invoice.dueDate);
      due.setHours(0, 0, 0, 0);
      const todayMidnight = new Date();
      todayMidnight.setHours(0, 0, 0, 0);
      const daysSinceDue = Math.floor((todayMidnight.getTime() - due.getTime()) / 86400000);
      // Follow-up days: 1, 3, 5, 7, 9, ... i.e. odd numbers starting from 1
      if (daysSinceDue < 1) continue;
      if (daysSinceDue % 2 === 0) continue; // even days are not follow-up days

      try {
        // Send follow-up to client
        await emailService.sendFollowUp({
          to: invoice.clientEmail,
          invoiceId: invoice.id,
          clientName: invoice.client?.name || 'Client',
          invoiceNumber: invoice.documentNumber,
          amount: invoice.amount,
          dueDate: invoice.dueDate,
          daysOverdue,
          businessName: businessProfile.businessName,
          businessEmail: businessProfile.email,
          businessPhone: businessProfile.phone || '',
        });

        // Log to communication_logs
        await communicationService.create({
          invoice_id: invoice.id,
          client_id: invoice.clientId,
          type: 'followup',
          status: 'sent',
          subject: `Follow-up: Invoice ${invoice.documentNumber} (${daysOverdue}d overdue)`,
          body: `Auto follow-up sent to ${invoice.clientEmail}`,
        });

        // Send owner notification
        await emailService.sendFollowUp({
          to: businessProfile.email,
          invoiceId: invoice.id,
          clientName: invoice.client?.name || 'Client',
          invoiceNumber: invoice.documentNumber,
          amount: invoice.amount,
          dueDate: invoice.dueDate,
          daysOverdue,
          businessName: businessProfile.businessName,
          businessEmail: businessProfile.email,
          businessPhone: businessProfile.phone || '',
        });
      } catch {
        // Silently fail — don't block dashboard
      }
    }
  }, [overdueInvoices, sendTime, businessProfile, commLogs]);

  useEffect(() => {
    if (!loading && !autoFollowUpRan.current && overdueInvoices.length > 0) {
      autoFollowUpRan.current = true;
      processAutoFollowUps();
    }
  }, [loading, overdueInvoices, processAutoFollowUps]);

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

      {/* ── Live Command Center — upcoming reminders & follow-ups with countdowns ── */}
      {upcomingEvents.length > 0 && (
        <NOCard className="p-3 sm:p-6 border-l-4 border-l-primary">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-1.5 text-xs sm:text-base">
              <Timer size={15} className="text-primary sm:w-[18px] sm:h-[18px]" />
              <span>Live Automation</span>
              <span className="relative flex h-2 w-2 ml-1">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
            </h3>
            <span className="text-[10px] sm:text-xs text-muted-foreground">
              {automationEnabled ? 'Active' : 'Paused'} · Sends at {sendTimeDisplay}
            </span>
          </div>
          <div className="space-y-1.5">
            {upcomingEvents.slice(0, showAllEvents ? undefined : 10).map((event, idx) => (
              <div
                key={`${event.invoiceNumber}-${event.type}-${idx}`}
                className={`rounded-lg border overflow-hidden ${
                  event.countdown.isPast
                    ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/30'
                    : event.type === 'followup'
                    ? 'bg-red-50/50 dark:bg-red-900/10 border-red-100 dark:border-red-900/20'
                    : 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/20'
                }`}
              >
                <div className="px-2.5 py-2 sm:px-3 flex items-center gap-2.5">
                  {/* Icon */}
                  <div className={`p-1.5 rounded-md flex-shrink-0 ${
                    event.type === 'followup' ? 'bg-red-100 dark:bg-red-900/30' : 'bg-blue-100 dark:bg-blue-900/30'
                  }`}>
                    {event.type === 'followup' 
                      ? <Send size={12} className="text-red-600" />
                      : <Bell size={12} className="text-blue-600" />
                    }
                  </div>
                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-[11px] sm:text-xs truncate">{event.clientName}</span>
                      <span className="text-[9px] sm:text-[10px] text-muted-foreground font-mono">{event.invoiceNumber}</span>
                    </div>
                    <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5 flex-wrap">
                      <span className={`font-medium ${event.type === 'followup' ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}`}>
                        {event.label}
                      </span>
                      <span>· {event.targetDt.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })} at {formatTime12h(sendTime)}</span>
                      {/* View count — only if something was sent before */}
                      {event.lastSentAt && (
                        <span className={`inline-flex items-center gap-0.5 ${event.viewCount > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground/60'}`}>
                          <Eye size={9} /> {event.viewCount} view{event.viewCount !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Countdown / Sent status */}
                  <div className="flex-shrink-0 text-right">
                    {event.sentToday ? (
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-green-600 justify-end">
                          <CheckCircle size={11} />
                          <span className="text-[10px] font-bold">Sent</span>
                        </div>
                        {event.lastSentAt && (
                          <p className="text-[9px] text-green-600/80 mt-0.5">
                            {new Date(event.lastSentAt).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })} {new Date(event.lastSentAt).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                        <p className={`text-[9px] font-medium mt-0.5 flex items-center gap-0.5 justify-end ${event.viewCount > 0 ? 'text-blue-600' : 'text-muted-foreground'}`}>
                          <Eye size={8} /> {event.viewCount} view{event.viewCount !== 1 ? 's' : ''}
                        </p>
                      </div>
                    ) : event.countdown.isPast ? (
                      <span className="text-[10px] sm:text-xs font-bold text-amber-600 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded-full animate-pulse">
                        Sending...
                      </span>
                    ) : (
                      <div className="font-mono text-right">
                        <div className="text-[13px] sm:text-sm font-bold tracking-tight leading-tight">
                          {event.countdown.days > 0 && (
                            <span className="text-muted-foreground">{event.countdown.days}<span className="text-[9px] font-medium">d</span> </span>
                          )}
                          <span>{String(event.countdown.hours).padStart(2, '0')}<span className="text-[9px] font-medium">h</span> </span>
                          <span>{String(event.countdown.minutes).padStart(2, '0')}<span className="text-[9px] font-medium">m</span></span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {upcomingEvents.length > 10 && !showAllEvents && (
            <button
              onClick={() => setShowAllEvents(true)}
              className="w-full mt-2 py-1.5 text-[11px] sm:text-xs font-medium text-primary hover:text-primary/80 flex items-center justify-center gap-1 transition-colors"
            >
              View all {upcomingEvents.length} scheduled <ChevronRight size={12} />
            </button>
          )}
          {showAllEvents && upcomingEvents.length > 10 && (
            <button
              onClick={() => setShowAllEvents(false)}
              className="w-full mt-2 py-1.5 text-[11px] sm:text-xs font-medium text-muted-foreground hover:text-foreground flex items-center justify-center gap-1 transition-colors"
            >
              Show less
            </button>
          )}
        </NOCard>
      )}

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
              const followUp = getNextFollowUp(invoice.dueDate, invoice.id);
              const daysOverdue = Math.max(0, Math.floor((Date.now() - new Date(invoice.dueDate).getTime()) / 86400000));
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
                        {daysOverdue > 0 && <span className="text-red-500 font-medium"> · {daysOverdue}d overdue</span>}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="font-bold text-[13px] sm:text-sm text-red-600">R{invoice.amount.toLocaleString()}</div>
                      <div className="mt-0.5">
                        <EngagementIndicator engagement={invoice.engagement || null} size="sm" showCount={true} showLastViewed={false} />
                      </div>
                    </div>
                  </div>

                  {/* Sent-today status bar */}
                  {followUp.sentToday && (
                    <div className="px-2.5 py-1 sm:px-3 bg-green-50 dark:bg-green-900/15 border-t border-green-100 dark:border-green-900/20 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-[10px] sm:text-xs">
                        <CheckCircle size={10} className="text-green-600 flex-shrink-0" />
                        <span className="font-medium text-green-700 dark:text-green-400">Followed up today</span>
                      </div>
                      <span className="text-[10px] text-green-600 dark:text-green-400">
                        {followUp.lastSentAt ? new Date(followUp.lastSentAt).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                  )}

                  {/* Views indicator — only if a reminder/follow-up was sent before */}
                  {followUp.lastSentAt && (
                    <div className={`px-2.5 py-1 sm:px-3 border-t flex items-center justify-between ${
                      (invoice.engagement?.viewCount || 0) > 0
                        ? 'bg-blue-50 dark:bg-blue-900/15 border-blue-100 dark:border-blue-900/20'
                        : 'bg-muted/30 border-border'
                    }`}>
                      <div className={`flex items-center gap-1.5 text-[10px] sm:text-xs ${
                        (invoice.engagement?.viewCount || 0) > 0 ? 'text-blue-700 dark:text-blue-400' : 'text-muted-foreground'
                      }`}>
                        <Eye size={10} className="flex-shrink-0" />
                        <span className="font-medium">{invoice.engagement?.viewCount || 0} view{(invoice.engagement?.viewCount || 0) !== 1 ? 's' : ''}</span>
                      </div>
                      {(invoice.engagement?.viewCount || 0) > 0 && invoice.engagement?.lastViewedAt && (
                        <span className="text-[10px] text-blue-600 dark:text-blue-400">
                          last {new Date(invoice.engagement.lastViewedAt).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })} {new Date(invoice.engagement.lastViewedAt).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Next follow-up bar with live countdown */}
                  <div className="px-2.5 py-1.5 sm:px-3 sm:py-2 bg-red-100/50 dark:bg-red-900/15 border-t border-red-100 dark:border-red-900/20 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[10px] sm:text-xs">
                      <Send size={10} className="text-amber-600 flex-shrink-0" />
                      <span className="font-medium">Next Follow Up</span>
                      <span className="text-muted-foreground hidden sm:inline">· {followUp.label}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] sm:text-[10px] text-muted-foreground hidden sm:inline">
                        {followUp.date} at {followUp.time}
                      </span>
                      {followUp.countdown.isPast ? (
                        <span className="text-[10px] font-bold text-red-600 bg-red-100 dark:bg-red-900/30 px-2 py-0.5 rounded-full animate-pulse">
                          Sending now
                        </span>
                      ) : (
                        <span className="text-[10px] sm:text-[11px] font-bold font-mono text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">
                          {followUp.countdown.display}
                        </span>
                      )}
                    </div>
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
