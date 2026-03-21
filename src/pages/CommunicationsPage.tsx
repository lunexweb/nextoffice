import React, { useState, useMemo } from 'react';
import { Mail, Send, Eye, CheckCircle, AlertCircle, Clock, Search, Calendar, X } from 'lucide-react';
import { NOCard } from '@/components/nextoffice/shared';
import { useCommunications, useClients, useInvoices } from '@/hooks';
import type { CommunicationStatus } from '@/types';
import { SectionLoading } from '@/components/ui/LoadingStates';

const TYPE_LABELS: Record<string, string> = {
  reminder: 'Reminder',
  followup: 'Follow-up',
  confirmation: 'Confirmation',
  initial_invoice: 'Invoice',
  payment_received: 'Payment',
  commitment_confirmation: 'Commitment',
};

const TYPE_COLORS: Record<string, string> = {
  reminder: 'bg-amber-100 text-amber-800',
  followup: 'bg-blue-100 text-blue-800',
  confirmation: 'bg-green-100 text-green-800',
  initial_invoice: 'bg-purple-100 text-purple-800',
  payment_received: 'bg-emerald-100 text-emerald-800',
  commitment_confirmation: 'bg-indigo-100 text-indigo-800',
};

const STATUS_DOT: Record<string, string> = {
  sent: 'bg-blue-400',
  delivered: 'bg-green-400',
  opened: 'bg-emerald-500',
  failed: 'bg-red-500',
  bounced: 'bg-orange-500',
};

function getDateGroup(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((today.getTime() - target.getTime()) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return d.toLocaleDateString('en-ZA', { weekday: 'long' });
  return d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' });
}

function fmtTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
}

const StatusIcon = ({ status }: { status: CommunicationStatus }) => {
  const cls = 'w-3.5 h-3.5 flex-shrink-0';
  switch (status) {
    case 'sent': return <Send className={`${cls} text-blue-500`} />;
    case 'delivered': return <CheckCircle className={`${cls} text-green-500`} />;
    case 'opened': return <Eye className={`${cls} text-emerald-600`} />;
    case 'failed':
    case 'bounced': return <AlertCircle className={`${cls} text-red-500`} />;
    default: return <Clock className={`${cls} text-gray-400`} />;
  }
};

const CommunicationsPage: React.FC = () => {
  const { logs, analytics, loading, error } = useCommunications();
  const { clients } = useClients();
  const { invoices } = useInvoices();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>('');

  const getClientName = (clientId: string) => clients.find(c => c.id === clientId)?.name || '—';
  const getInvoiceNumber = (invoiceId: string) => invoices.find(i => i.id === invoiceId)?.number || '—';

  const filteredLogs = useMemo(() => logs.filter(log => {
    const q = searchTerm.toLowerCase();
    const matchesSearch = !q ||
      log.content.subject.toLowerCase().includes(q) ||
      getClientName(log.clientId).toLowerCase().includes(q) ||
      getInvoiceNumber(log.invoiceId).toLowerCase().includes(q);
    const matchesType = filterType === 'all' || log.type === filterType;
    const matchesStatus = filterStatus === 'all' || log.status === filterStatus;
    const matchesDate = !filterDate || new Date(log.sentAt).toISOString().slice(0, 10) === filterDate;
    return matchesSearch && matchesType && matchesStatus && matchesDate;
  }), [logs, searchTerm, filterType, filterStatus, filterDate, clients, invoices]);

  const grouped = useMemo(() => {
    const groups: { label: string; items: typeof filteredLogs }[] = [];
    let currentLabel = '';
    filteredLogs.forEach(log => {
      const label = getDateGroup(log.sentAt);
      if (label !== currentLabel) {
        currentLabel = label;
        groups.push({ label, items: [] });
      }
      groups[groups.length - 1].items.push(log);
    });
    return groups;
  }, [filteredLogs]);

  if (loading) return (
    <div className="p-4 sm:p-6 lg:p-8">
      <h2 className="font-serif text-lg sm:text-2xl mb-6">Communications</h2>
      <SectionLoading message="Loading communications..." height="h-64" />
    </div>
  );

  if (error) return (
    <div className="p-4 sm:p-6 lg:p-8 flex items-center justify-center">
      <div className="text-red-500 text-center">
        <AlertCircle className="w-12 h-12 mx-auto mb-4" />
        <p className="font-medium">Error loading communications</p>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Mail className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="font-serif text-lg sm:text-2xl leading-tight">Communications</h2>
          <p className="text-xs text-muted-foreground">All automated emails and reminders</p>
        </div>
      </div>

      {/* Analytics — compact row */}
      {analytics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Sent', value: analytics.total, sub: 'emails', color: 'border-l-blue-500', icon: <Send className="w-4 h-4 text-blue-500" /> },
            { label: 'Open Rate', value: `${analytics.openRate.toFixed(0)}%`, sub: `${analytics.opened} opened`, color: 'border-l-green-500', icon: <Eye className="w-4 h-4 text-green-600" /> },
            { label: 'Delivered', value: `${analytics.deliveryRate.toFixed(0)}%`, sub: `${analytics.delivered} of ${analytics.total}`, color: 'border-l-emerald-500', icon: <CheckCircle className="w-4 h-4 text-emerald-600" /> },
            { label: 'Failed', value: analytics.failed, sub: 'undelivered', color: 'border-l-red-500', icon: <AlertCircle className="w-4 h-4 text-red-500" /> },
          ].map(({ label, value, sub, color, icon }) => (
            <NOCard key={label} className={`px-4 py-3 border-l-4 ${color}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
                  <p className="text-xl font-bold leading-tight">{value}</p>
                  <p className="text-[11px] text-muted-foreground">{sub}</p>
                </div>
                {icon}
              </div>
            </NOCard>
          ))}
        </div>
      )}

      {/* History Card */}
      <NOCard className="overflow-hidden">
        {/* Toolbar */}
        <div className="px-4 py-3 border-b border-border flex flex-col md:flex-row gap-2 items-start md:items-center">
          <div className="flex items-center gap-2 flex-1">
            <h3 className="font-semibold text-sm whitespace-nowrap">Communication History</h3>
            <span className="text-xs text-muted-foreground">
              {filteredLogs.length !== logs.length
                ? `${filteredLogs.length} of ${logs.length}`
                : `${logs.length} total`}
            </span>
          </div>
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <div className="relative flex-1 min-w-[160px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground w-3.5 h-3.5" />
              <input
                placeholder="Search…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-sm rounded border border-border bg-background outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-2 py-1.5 text-sm rounded border border-border bg-background outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">All types</option>
              <option value="reminder">Reminders</option>
              <option value="followup">Follow-ups</option>
              <option value="confirmation">Confirmations</option>
              <option value="initial_invoice">Invoices</option>
              <option value="payment_received">Payments</option>
              <option value="commitment_confirmation">Commitments</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-2 py-1.5 text-sm rounded border border-border bg-background outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">All statuses</option>
              <option value="sent">Sent</option>
              <option value="delivered">Delivered</option>
              <option value="opened">Opened</option>
              <option value="failed">Failed</option>
              <option value="bounced">Bounced</option>
            </select>
            <div className="relative">
              <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground w-3.5 h-3.5 pointer-events-none" />
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="pl-8 pr-2 py-1.5 text-sm rounded border border-border bg-background outline-none focus:ring-1 focus:ring-primary min-w-[140px]"
              />
              {filterDate && (
                <button
                  onClick={() => setFilterDate('')}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Scrollable log list */}
        {filteredLogs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Mail className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium text-sm">No communications found</p>
            <p className="text-xs mt-1">
              {searchTerm || filterType !== 'all' || filterStatus !== 'all' || filterDate
                ? 'Try adjusting your filters'
                : 'No emails have been sent yet'}
            </p>
          </div>
        ) : (
          <div className="overflow-y-auto max-h-[520px]">
            {grouped.map(({ label, items }) => (
              <div key={label}>
                {/* Date group header */}
                <div className="sticky top-0 z-10 px-4 py-1.5 bg-muted/60 backdrop-blur-sm border-b border-border">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
                  <span className="ml-2 text-[11px] text-muted-foreground">{items.length}</span>
                </div>

                {/* Rows */}
                {items.map((log, idx) => (
                  <div
                    key={log.id}
                    className={`flex items-center gap-3 px-4 py-2.5 hover:bg-accent/40 transition-colors ${idx < items.length - 1 ? 'border-b border-border/50' : ''}`}
                  >
                    {/* Status icon */}
                    <StatusIcon status={log.status} />

                    {/* Type badge */}
                    <span className={`hidden sm:inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap ${TYPE_COLORS[log.type] || 'bg-gray-100 text-gray-700'}`}>
                      {TYPE_LABELS[log.type] || log.type}
                    </span>

                    {/* Subject */}
                    <p className="flex-1 text-sm font-medium truncate min-w-0">{log.content.subject}</p>

                    {/* Client */}
                    {log.clientId && (
                      <span className="hidden md:block text-xs text-muted-foreground truncate max-w-[130px]">
                        {getClientName(log.clientId)}
                      </span>
                    )}

                    {/* Invoice # */}
                    {log.invoiceId && (
                      <span className="hidden lg:block text-xs font-mono text-muted-foreground whitespace-nowrap">
                        #{getInvoiceNumber(log.invoiceId)}
                      </span>
                    )}

                    {/* Opens */}
                    {log.engagement.opens > 0 && (
                      <span className="hidden sm:flex items-center gap-1 text-[11px] text-emerald-600 whitespace-nowrap">
                        <Eye className="w-3 h-3" />
                        {log.engagement.opens}
                      </span>
                    )}

                    {/* Status dot + time */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[log.status] || 'bg-gray-300'}`} />
                      <span className="text-[11px] text-muted-foreground">{fmtTime(log.sentAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </NOCard>
    </div>
  );
};

export default CommunicationsPage;
