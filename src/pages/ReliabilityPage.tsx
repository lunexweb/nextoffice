import React, { useState, useMemo } from 'react';
import { TrendingUp, CheckCircle2, AlertTriangle, Clock, Search, Users, Star, ShieldCheck, ThumbsUp, Minus, ArrowUp } from 'lucide-react';
import { NOCard } from '@/components/nextoffice/shared';
import { useClients, useInvoices } from '@/hooks';
import { useCommitments } from '@/hooks/useCommitments';
import { SectionLoading } from '@/components/ui/LoadingStates';
import { computeAndRateClient } from '@/utils/scoring';

const ReliabilityPage: React.FC = () => {
  const { clients, loading: clientsLoading } = useClients();
  const { invoices, loading: invoicesLoading } = useInvoices();
  const { commitments, loading: commitmentsLoading } = useCommitments();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSignal, setFilterSignal] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'score' | 'name'>('score');

  const loading = clientsLoading || invoicesLoading || commitmentsLoading;

  const clientsWithScores = useMemo(() => {
    return clients.map(client => {
      const clientInvoices = invoices.filter(inv => inv.clientId === client.id);
      const clientCommitments = commitments.filter(c => c.clientId === client.id);
      const rated = computeAndRateClient(clientInvoices, clientCommitments, client.relationshipType === 'recurring');
      return {
        id: client.id,
        name: client.name,
        email: client.email,
        totalInvoices: clientInvoices.length,
        paidInvoices: clientInvoices.filter(inv => inv.status === 'paid').length,
        overdueInvoices: clientInvoices.filter(inv => inv.status === 'overdue').length,
        totalCommitments: clientCommitments.length,
        ...rated,
      };
    });
  }, [clients, invoices, commitments]);

  const filteredClients = useMemo(() => {
    let filtered = clientsWithScores.filter(client => {
      const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filterSignal === 'all' || client.signal === filterSignal;
      return matchesSearch && matchesFilter;
    });
    filtered.sort((a, b) => sortBy === 'score' ? b.score - a.score : a.name.localeCompare(b.name));
    return filtered;
  }, [clientsWithScores, searchTerm, filterSignal, sortBy]);

  const scoredClients = clientsWithScores.filter(c => !c.isNew);
  const averageScore = scoredClients.length > 0
    ? scoredClients.reduce((sum, c) => sum + c.score, 0) / scoredClients.length
    : 0;
  const excellentCount = clientsWithScores.filter(c => c.signal === 'excellent').length;
  const atRiskCount = clientsWithScores.filter(c => c.signal === 'risk' || c.signal === 'poor' || c.signal === 'attention').length;

  const getBarColor = (signal: string) => {
    switch (signal) {
      case 'excellent': return 'bg-emerald-500';
      case 'good': return 'bg-green-500';
      case 'attention': return 'bg-orange-500';
      case 'risk': return 'bg-red-400';
      case 'poor': return 'bg-red-600';
      default: return 'bg-blue-400';
    }
  };

  const getSignalIcon = (signal: string) => {
    switch (signal) {
      case 'excellent': return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case 'good': return <ShieldCheck className="w-4 h-4 text-green-600" />;
      case 'attention': return <Clock className="w-4 h-4 text-orange-500" />;
      case 'risk': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'poor': return <AlertTriangle className="w-4 h-4 text-red-700" />;
      default: return <Minus className="w-4 h-4 text-blue-500" />;
    }
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <h2 className="font-serif text-lg sm:text-2xl mb-6">Client Reliability</h2>
        <SectionLoading message="Loading reliability data..." height="h-64" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
      <div>
        <h2 className="font-serif text-lg sm:text-2xl">Client Reliability</h2>
        <p className="text-sm text-muted-foreground">Scores based on payment behaviour and commitments kept — not just invoice count</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
        <NOCard className="p-3 sm:p-6">
          <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1 sm:mb-2">Average Score</p>
          <div className="text-xl sm:text-3xl font-bold text-blue-600">{Math.round(averageScore)}</div>
          <div className="w-full bg-muted rounded-full h-2 mt-2">
            <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${averageScore}%` }} />
          </div>
          <p className="text-xs text-muted-foreground mt-1">across {scoredClients.length} active clients</p>
        </NOCard>

        <NOCard className="p-3 sm:p-6">
          <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1 sm:mb-2">Excellent Clients</p>
          <div className="text-xl sm:text-3xl font-bold text-emerald-600">{excellentCount}</div>
          <p className="text-xs text-muted-foreground mt-1">Score 90+ — always reliable</p>
        </NOCard>

        <NOCard className="p-3 sm:p-6">
          <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1 sm:mb-2">Needs Attention</p>
          <div className="text-xl sm:text-3xl font-bold text-red-600">{atRiskCount}</div>
          <p className="text-xs text-muted-foreground mt-1">Score below 60 — act now</p>
        </NOCard>

        <NOCard className="p-3 sm:p-6">
          <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1 sm:mb-2">Total Clients</p>
          <div className="text-xl sm:text-3xl font-bold">{clientsWithScores.length}</div>
          <p className="text-xs text-muted-foreground mt-1">{clientsWithScores.filter(c => c.isNew).length} new (no history yet)</p>
        </NOCard>
      </div>

      {/* Filters */}
      <NOCard className="p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <input
              placeholder="Search clients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-md border border-border bg-no-surface-raised outline-none focus:ring-2 focus:ring-primary text-sm"
            />
          </div>
          <select
            value={filterSignal}
            onChange={(e) => setFilterSignal(e.target.value)}
            className="px-3 py-2 rounded-md border border-border bg-no-surface-raised outline-none focus:ring-2 focus:ring-primary text-sm"
          >
            <option value="all">All Tiers</option>
            <option value="excellent">Excellent (90+)</option>
            <option value="reliable">Reliable (75–89)</option>
            <option value="good">Good Standing (60–74)</option>
            <option value="attention">Needs Attention (40–59)</option>
            <option value="risk">At Risk (20–39)</option>
            <option value="poor">Unreliable (0–19)</option>
            <option value="new">New Client</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 rounded-md border border-border bg-no-surface-raised outline-none focus:ring-2 focus:ring-primary text-sm"
          >
            <option value="score">Sort by Score</option>
            <option value="name">Sort by Name</option>
          </select>
        </div>
      </NOCard>

      {/* Client List */}
      <NOCard className="p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-1">
          <Users className="w-5 h-5" />
          <h3 className="font-serif font-bold text-sm sm:text-lg">Client Reliability Scores</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Starts at 60 · +10 paid on time · +6 commitment kept · −10 commitment broken · overdue with no commitment = neutral
        </p>

        <div className="space-y-3">
          {filteredClients.length > 0 ? filteredClients.slice(0, 10).map((client) => (
            <div key={client.id} className="flex items-center gap-2 sm:gap-4 p-2 sm:p-3 border rounded-lg hover:bg-accent/30 transition-colors">
              <div className="flex-shrink-0">{getSignalIcon(client.signal)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <h4 className="font-medium text-xs sm:text-sm truncate">{client.name}</h4>
                  <span className={`px-1 sm:px-1.5 py-0.5 rounded text-[10px] sm:text-[11px] font-semibold border ${client.colorClasses}`}>
                    {client.longLabel}
                  </span>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1 flex-wrap">
                  <span>{client.totalInvoices} inv</span>
                  <span className="text-green-600">{client.paidInvoices} paid</span>
                  {client.overdueInvoices > 0 && <span className="text-red-500">{client.overdueInvoices} overdue</span>}
                  {client.totalCommitments > 0 && <span className="text-blue-500">{client.totalCommitments} commits</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                <div className="w-12 sm:w-24 bg-muted rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full transition-all ${getBarColor(client.signal)}`}
                    style={{ width: client.isNew ? '0%' : `${client.score}%` }}
                  />
                </div>
                <div className="text-right w-8 sm:w-10">
                  {client.isNew
                    ? <span className="text-[10px] sm:text-xs text-blue-500 font-medium">New</span>
                    : <span className="text-sm sm:text-base font-bold">{client.score}</span>
                  }
                </div>
              </div>
            </div>
          )) : (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No clients found</h3>
              <p className="text-muted-foreground text-sm">
                {searchTerm || filterSignal !== 'all' ? 'Try adjusting your search or filters' : 'No client data available'}
              </p>
            </div>
          )}
        </div>
      </NOCard>

      {/* How scores are earned + Improving Reliability */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6">

        {/* Score breakdown */}
        <NOCard className="p-4 sm:p-6">
          <h3 className="font-serif font-bold text-lg mb-1">How Scores Are Earned</h3>
          <p className="text-xs text-muted-foreground mb-4">Base starts at 60 (or 70 for active recurring clients). Actions move it up or down.</p>
          <div className="space-y-2">
            {[
              { icon: <Star className="w-3.5 h-3.5" />, color: 'text-blue-700 bg-blue-100', points: '70', label: 'Base: active recurring invoice (owner trusts them long-term)' },
              { icon: <ArrowUp className="w-3.5 h-3.5" />, color: 'text-emerald-600 bg-emerald-50', points: '+10', label: 'Paid on time (no commitment needed)' },
              { icon: <ShieldCheck className="w-3.5 h-3.5" />, color: 'text-emerald-700 bg-emerald-100', points: '+8', label: 'Owner manually approved a commitment' },
              { icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: 'text-green-600 bg-green-50', points: '+6', label: 'Commitment system-completed + paid' },
              { icon: <Clock className="w-3.5 h-3.5" />, color: 'text-amber-600 bg-amber-50', points: '+3', label: 'Committed and paid (even if late)' },
              { icon: <TrendingUp className="w-3.5 h-3.5" />, color: 'text-blue-600 bg-blue-50', points: '+1', label: 'Requested an extension (proactive)' },
              { icon: <Minus className="w-3.5 h-3.5" />, color: 'text-orange-600 bg-orange-50', points: '−4', label: 'Paid late with no communication' },
              { icon: <AlertTriangle className="w-3.5 h-3.5" />, color: 'text-red-700 bg-red-100', points: '−10', label: 'Commitment made and broken' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${item.color}`}>
                  {item.icon}
                </span>
                <span className="text-xs text-muted-foreground flex-1">{item.label}</span>
                <span className={`text-xs font-bold ${item.points.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>{item.points}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground">Score is capped between <strong>0</strong> and <strong>100</strong>. "New" shows until first invoice is issued.</p>
          </div>
        </NOCard>

        {/* Improving Reliability — what to do per tier */}
        <NOCard className="p-4 sm:p-6">
          <h3 className="font-serif font-bold text-sm sm:text-lg mb-1">Improving Reliability</h3>
          <p className="text-xs text-muted-foreground mb-4">How to handle each tier to protect your cash flow</p>
          <div className="space-y-2.5">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Star className="w-3.5 h-3.5 text-emerald-600" />
                <h4 className="text-sm font-semibold text-emerald-900">Excellent (90–100)</h4>
              </div>
              <p className="text-xs text-emerald-800">Reward with extended payment terms, priority service, or larger project trust. These clients are your backbone.</p>
            </div>
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck className="w-3.5 h-3.5 text-green-600" />
                <h4 className="text-sm font-semibold text-green-900">Reliable (75–89)</h4>
              </div>
              <p className="text-xs text-green-800">Standard terms. Occasional flexibility is fine. Keep using commitment links to maintain momentum.</p>
            </div>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <ThumbsUp className="w-3.5 h-3.5 text-amber-600" />
                <h4 className="text-sm font-semibold text-amber-900">Good Standing (60–74)</h4>
              </div>
              <p className="text-xs text-amber-800">Always send commitment links. Enable payment plans so they can commit in smaller steps — that earns them +6 per kept commitment.</p>
            </div>
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-3.5 h-3.5 text-orange-600" />
                <h4 className="text-sm font-semibold text-orange-900">Needs Attention (40–59)</h4>
              </div>
              <p className="text-xs text-orange-800">Require a deposit before starting work. Keep invoices smaller and more frequent. Reminders are critical here.</p>
            </div>
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                <h4 className="text-sm font-semibold text-red-900">At Risk / Unreliable (0–39)</h4>
              </div>
              <p className="text-xs text-red-800">Full payment upfront or 50%+ deposit. Do not extend credit. Every broken commitment costs them −10, so their score reflects their true behaviour.</p>
            </div>
          </div>
        </NOCard>
      </div>
    </div>
  );
};

export default ReliabilityPage;
