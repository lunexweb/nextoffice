import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { NOCard, ScoreBar, EngagementIndicator } from '@/components/nextoffice/shared';
import { Client, Invoice, Commitment, ClientNote } from '@/types';
import { getClientColorClasses, getScoreBarColor, formatCurrency, formatDate } from '@/utils/styles';
import { Calendar, Clock, CreditCard, TrendingUp, AlertTriangle, CheckCircle, Zap, Eye, Download, Copy, Phone, FileText } from 'lucide-react';
import { clientService } from '@/services/api/clientService';
import { invoiceService } from '@/services/api/invoiceService';
import { commitmentServiceApi } from '@/services/api/commitmentService';
import { useBusinessProfile, usePDF } from '@/hooks';
import { supabase } from '@/lib/supabase';
import type { InvoicePDFData } from '@/services/pdfService';

const ClientProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const { businessProfile } = useBusinessProfile();
  const { downloadInvoicePDF, previewInvoicePDF, generating } = usePDF();
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [tab, setTab] = useState<'overview' | 'documents' | 'notes'>('overview');
  const [notes, setNotes] = useState<ClientNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [client, setClient] = useState<Client | null>(null);
  const [liveScore, setLiveScore] = useState<{ score: number; score_label: string; level: string } | null>(null);
  const [clientInvoices, setClientInvoices] = useState<Invoice[]>([]);
  const [clientCommitments, setClientCommitments] = useState<Commitment[]>([]);
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!slug) return;
      try {
        setPageLoading(true);
        const foundClient = await clientService.getBySlug(slug);
        if (!foundClient) { setPageLoading(false); return; }
        setClient(foundClient);
        const [invoices, allCommitments] = await Promise.all([
          invoiceService.getByClientId(foundClient.id),
          commitmentServiceApi.getAll(),
        ]);
        setClientInvoices(invoices);
        setClientCommitments(allCommitments.filter(c => c.clientId === foundClient.id));

        // Fetch live computed score from RPC
        try {
          const { data: scoreData } = await supabase.rpc('get_client_score', { p_client_id: foundClient.id });
          if (scoreData) setLiveScore(scoreData as any);
        } catch { /* fall back to static score */ }
      } finally {
        setPageLoading(false);
      }
    };
    load();
  }, [slug]);

  if (pageLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <button onClick={() => navigate('/app/clients')} className="text-primary hover:underline text-sm font-medium mb-6">
          ← Back to Clients
        </button>
        <div className="text-center py-12">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <button onClick={() => navigate('/app/clients')} className="text-primary hover:underline text-sm font-medium mb-6">
          ← Back to Clients
        </button>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Client not found</p>
        </div>
      </div>
    );
  }

  const displayScore = liveScore ? liveScore.score : client.score;

  // Compute level and color from live score instead of stale DB values
  const getScoreLevel = (score: number) => {
    if (score >= 90) return { label: 'Excellent', color: 'green' as const };
    if (score >= 75) return { label: 'Reliable', color: 'green' as const };
    if (score >= 60) return { label: 'Good Standing', color: 'amber' as const };
    if (score >= 40) return { label: 'Needs Attention', color: 'amber' as const };
    if (score >= 20) return { label: 'At Risk', color: 'red' as const };
    if (score > 0) return { label: 'Unreliable', color: 'red' as const };
    return { label: 'New', color: 'muted' as const };
  };
  const scoreInfo = getScoreLevel(displayScore);
  const displayLevel = liveScore?.score_label || scoreInfo.label;
  const displayColor = scoreInfo.color;

  const totalInvoiced = clientInvoices.reduce((sum, inv) => sum + inv.amount, 0);
  const totalPaid = clientInvoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + inv.amount, 0);
  const outstanding = totalInvoiced - totalPaid;

  // Generate real payment history starting from first invoice month
  const generatePaymentHistory = () => {
    const now = new Date();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const result: { m: string; s: string; c: string }[] = [];
    if (clientInvoices.length === 0) return result;

    // Find the earliest invoice month
    const earliest = clientInvoices.reduce((min, inv) => {
      const d = new Date(inv.createdAt);
      return d < min ? d : min;
    }, new Date());
    const startMonth = new Date(earliest.getFullYear(), earliest.getMonth(), 1);
    const endMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Iterate from first invoice month to current month
    const d = new Date(startMonth);
    while (d <= endMonth) {
      const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      const monthInvoices = clientInvoices.filter(inv => {
        const created = new Date(inv.createdAt);
        return created >= monthStart && created <= monthEnd;
      });
      const isCurrent = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      if (monthInvoices.length === 0) {
        result.push({ m: monthNames[d.getMonth()], s: '—', c: 'bg-muted/50 text-muted-foreground' });
      } else if (isCurrent && monthInvoices.some(inv => ['sent', 'overdue'].includes(inv.status))) {
        result.push({ m: monthNames[d.getMonth()], s: '●', c: 'bg-primary/10 text-primary' });
      } else if (monthInvoices.every(inv => inv.status === 'paid')) {
        const allOnTime = monthInvoices.every(inv => inv.paidDate && new Date(inv.paidDate) <= new Date(inv.dueDate));
        result.push({ m: monthNames[d.getMonth()], s: '✓', c: allOnTime ? 'bg-no-green-bg text-no-green' : 'bg-no-amber-bg text-no-amber' });
      } else if (monthInvoices.some(inv => inv.status === 'overdue')) {
        result.push({ m: monthNames[d.getMonth()], s: '!', c: 'bg-no-red-bg text-no-red' });
      } else {
        result.push({ m: monthNames[d.getMonth()], s: '~', c: 'bg-no-amber-bg text-no-amber' });
      }
      d.setMonth(d.getMonth() + 1);
    }
    return result;
  };
  const months = generatePaymentHistory();

  // Generate real intelligence insights from invoice data
  const generateInsights = () => {
    const insights: { icon: React.ReactNode; title: string; desc: string; bg: string }[] = [];
    const paidInvoices = clientInvoices.filter(inv => inv.status === 'paid' && inv.paidDate);
    const overdueInvoices = clientInvoices.filter(inv => inv.status === 'overdue');

    if (paidInvoices.length >= 2) {
      const avgDays = paidInvoices.reduce((sum, inv) => {
        const paid = new Date(inv.paidDate!);
        const created = new Date(inv.createdAt);
        return sum + Math.max(1, Math.floor((paid.getTime() - created.getTime()) / 86400000));
      }, 0) / paidInvoices.length;

      if (avgDays <= 7) {
        insights.push({ icon: <CheckCircle className="w-5 h-5 text-green-600" />, title: 'Fast Payer', desc: `Pays within ${Math.round(avgDays)} days on average`, bg: 'bg-green-50 dark:bg-green-950/30' });
      } else if (avgDays <= 14) {
        insights.push({ icon: <Clock className="w-5 h-5 text-amber-600" />, title: 'Moderate Payment Speed', desc: `Pays within ${Math.round(avgDays)} days on average`, bg: 'bg-amber-50 dark:bg-amber-950/30' });
      } else {
        insights.push({ icon: <AlertTriangle className="w-5 h-5 text-red-600" />, title: 'Slow Payer', desc: `Takes ~${Math.round(avgDays)} days to pay on average`, bg: 'bg-red-50 dark:bg-red-950/30' });
      }

      const onTime = paidInvoices.filter(inv => new Date(inv.paidDate!) <= new Date(inv.dueDate)).length;
      const pct = Math.round((onTime / paidInvoices.length) * 100);
      if (pct >= 80) {
        insights.push({ icon: <TrendingUp className="w-5 h-5 text-green-600" />, title: 'Reliable', desc: `${pct}% of invoices paid on or before due date`, bg: 'bg-green-50 dark:bg-green-950/30' });
      } else if (pct >= 50) {
        insights.push({ icon: <Clock className="w-5 h-5 text-amber-600" />, title: 'Sometimes Late', desc: `${pct}% paid on time — consider reminders`, bg: 'bg-amber-50 dark:bg-amber-950/30' });
      } else {
        insights.push({ icon: <AlertTriangle className="w-5 h-5 text-red-600" />, title: 'Frequently Late', desc: `Only ${pct}% paid on time`, bg: 'bg-red-50 dark:bg-red-950/30' });
      }
    }

    if (overdueInvoices.length > 0) {
      const totalOverdue = overdueInvoices.reduce((s, i) => s + i.amount, 0);
      insights.push({ icon: <AlertTriangle className="w-5 h-5 text-red-600" />, title: `${overdueInvoices.length} Overdue Invoice${overdueInvoices.length > 1 ? 's' : ''}`, desc: `${formatCurrency(totalOverdue)} outstanding past due date`, bg: 'bg-red-50 dark:bg-red-950/30' });
    }

    if (clientCommitments.length > 0) {
      const kept = clientCommitments.filter(c => c.status === 'completed' || c.status === 'approved').length;
      const broken = clientCommitments.filter(c => c.status === 'declined').length;
      if (kept > 0) {
        insights.push({ icon: <Zap className="w-5 h-5 text-blue-600" />, title: `${kept} Commitment${kept > 1 ? 's' : ''} Kept`, desc: broken > 0 ? `${broken} declined` : 'All commitments honoured', bg: 'bg-blue-50 dark:bg-blue-950/30' });
      }
    }

    if (clientInvoices.length === 0) {
      insights.push({ icon: <Clock className="w-5 h-5 text-muted-foreground" />, title: 'No Invoice History', desc: 'Create an invoice to start building insights', bg: 'bg-muted/50' });
    } else if (paidInvoices.length === 0 && overdueInvoices.length === 0) {
      insights.push({ icon: <Zap className="w-5 h-5 text-blue-600" />, title: 'Invoices Sent', desc: `${clientInvoices.length} invoice${clientInvoices.length > 1 ? 's' : ''} awaiting payment`, bg: 'bg-blue-50 dark:bg-blue-950/30' });
    }

    return insights;
  };
  const insights = generateInsights();

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleAddNote = () => {
    if (newNote.trim()) {
      const note: ClientNote = {
        id: Date.now().toString(),
        date: new Date().toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' }),
        author: businessProfile?.ownerName || 'You',
        text: newNote
      };
      setNotes([note, ...notes]);
      setNewNote('');
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
      <button onClick={() => navigate('/app/clients')} className="text-primary hover:underline text-sm font-medium">
        ← Back to Clients
      </button>

      <NOCard className="p-4 sm:p-6 flex flex-col md:flex-row justify-between gap-4 sm:gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-serif font-bold text-xl">
            {getInitials(client.name)}
          </div>
          <div>
            <h2 className="font-serif text-lg sm:text-2xl font-bold">{client.name}</h2>
            <p className="text-sm text-muted-foreground">{client.email}</p>
            {client.phone && (
              <div className="flex items-center gap-1.5 mt-0.5">
                <Phone className="w-3 h-3 text-muted-foreground" />
                <a href={`tel:${client.phone}`} className="text-sm text-primary hover:underline">{client.phone}</a>
                <button
                  onClick={() => { navigator.clipboard.writeText(client.phone); setCopiedPhone(true); setTimeout(() => setCopiedPhone(false), 2000); }}
                  className="p-0.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                  title="Copy phone number"
                >
                  {copiedPhone ? <CheckCircle className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            )}
            <p className="text-sm text-muted-foreground">{client.address}, {client.city}, {client.postalCode}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono text-xl sm:text-3xl font-bold text-primary">{displayScore}%</div>
          <div className={`text-sm font-medium ${getClientColorClasses(displayColor).text}`}>{displayLevel}</div>
          <div className="w-32 mt-2">
            <ScoreBar value={displayScore} color={getScoreBarColor(displayColor)} />
          </div>
        </div>
      </NOCard>

      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {[
          { l: 'Total Invoiced', v: formatCurrency(totalInvoiced), icon: <FileText className="w-4 h-4" />, accent: 'border-l-blue-500', iconBg: 'bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400', valueColor: 'text-foreground' },
          { l: 'Total Paid', v: formatCurrency(totalPaid), icon: <CheckCircle className="w-4 h-4" />, accent: 'border-l-green-500', iconBg: 'bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400', valueColor: 'text-green-600 dark:text-green-400' },
          { l: 'Outstanding', v: formatCurrency(outstanding), icon: <AlertTriangle className="w-4 h-4" />, accent: outstanding > 0 ? 'border-l-red-500' : 'border-l-muted', iconBg: outstanding > 0 ? 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400' : 'bg-muted text-muted-foreground', valueColor: outstanding > 0 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground' },
        ].map((s, i) => (
          <NOCard key={i} className={`p-3 sm:p-5 border-l-4 ${s.accent}`}>
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center ${s.iconBg}`}>
                {s.icon}
              </div>
              <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide">{s.l}</p>
            </div>
            <p className={`font-mono text-base sm:text-2xl font-bold ${s.valueColor}`}>{s.v}</p>
          </NOCard>
        ))}
      </div>

      <div className="flex gap-1 border-b border-border">
        {(['overview', 'documents', 'notes'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-6 py-3 text-sm font-medium capitalize transition-colors border-b-2 ${tab === t ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-6">
          <NOCard className="p-4 sm:p-6">
            <h4 className="font-serif text-sm sm:text-lg font-bold mb-3 sm:mb-4">Intelligence Insights</h4>
            <div className="space-y-3">
              {insights.map((insight, i) => (
                <div key={i} className={`flex items-start gap-3 p-3 rounded-md ${insight.bg}`}>
                  <div className="flex-shrink-0 mt-0.5">{insight.icon}</div>
                  <div>
                    <p className="text-sm font-medium">{insight.title}</p>
                    <p className="text-xs text-muted-foreground">{insight.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </NOCard>

          {months.length > 0 && (
            <div>
              <h4 className="font-serif text-sm sm:text-lg font-bold mb-4">Payment History</h4>
              <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2">
                {months.map((m, i) => (
                  <div key={i} className={`flex flex-col items-center p-2 sm:p-3 rounded-md flex-shrink-0 min-w-[48px] ${m.c}`}>
                    <span className="text-[10px] sm:text-xs font-medium">{m.m}</span>
                    <span className="text-base sm:text-lg font-bold">{m.s}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <NOCard className="p-4 sm:p-6">
            <h4 className="font-serif text-sm sm:text-lg font-bold mb-3 sm:mb-4">Commitment History</h4>
            {(() => {
              
              if (clientCommitments.length === 0) {
                return (
                  <p className="text-sm text-muted-foreground">No commitments yet</p>
                );
              }

              return (
                <div className="space-y-3">
                  {clientCommitments.map((commitment) => (
                    <div key={commitment.id} className="flex items-start gap-3 p-3 rounded-md border border-border">
                      <div className="flex-shrink-0 mt-1">
                        {commitment.type === 'payment_plan' && <Calendar className="w-4 h-4 text-blue-600" />}
                        {commitment.type === 'extension' && <Clock className="w-4 h-4 text-amber-600" />}
                        {commitment.type === 'deposit' && <CreditCard className="w-4 h-4 text-green-600" />}
                        {commitment.type === 'already_paid' && <span className="text-purple-600">✓</span>}
                      </div>
                      <div className="flex-grow">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-semibold">{commitment.invoiceNumber}</p>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            commitment.status === 'approved' ? 'bg-green-100 text-green-800' :
                            commitment.status === 'declined' ? 'bg-red-100 text-red-800' :
                            'bg-amber-100 text-amber-800'
                          }`}>
                            {commitment.status.charAt(0).toUpperCase() + commitment.status.slice(1)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {commitment.type === 'payment_plan' && `${commitment.details.installments} installments of R${commitment.details.installmentAmount?.toLocaleString()}`}
                          {commitment.type === 'extension' && `${commitment.details.extensionDays} days extension`}
                          {commitment.type === 'deposit' && `${commitment.details.depositPercentage}% deposit`}
                          {commitment.type === 'already_paid' && 'Payment confirmation'}
                        </p>
                        {commitment.message && (
                          <p className="text-xs text-muted-foreground italic mt-1">"{commitment.message}"</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </NOCard>
        </div>
      )}

      {tab === 'documents' && (
        <div className="space-y-4">
          <div className="flex justify-end gap-3">
            <button 
              onClick={() => navigate('/app/invoices')} 
              className="px-4 py-2 rounded-md bg-primary text-primary-foreground font-medium hover:opacity-90 transition-all text-sm"
            >
              + New Invoice
            </button>
          </div>
          
          {clientInvoices.length === 0 ? (
            <NOCard className="p-8 text-center">
              <p className="text-muted-foreground">No documents found for this client</p>
            </NOCard>
          ) : (
            <div className="space-y-3">
              {clientInvoices.map((inv) => {
                const pdfData: InvoicePDFData = {
                  invoiceNumber: inv.number,
                  invoiceDate: formatDate(inv.createdAt),
                  dueDate: formatDate(inv.dueDate),
                  status: inv.status,
                  businessName: businessProfile?.businessName || '',
                  businessAddress: businessProfile?.address ? `${businessProfile.address}, ${businessProfile.city}` : '',
                  businessPhone: businessProfile?.phone || '',
                  businessEmail: businessProfile?.email || '',
                  clientName: client.name,
                  clientEmail: client.email,
                  clientAddress: client.address ? `${client.address}, ${client.city}` : '',
                  items: inv.lineItems.map(li => ({
                    description: li.description,
                    quantity: li.quantity,
                    rate: li.rate,
                    amount: li.quantity * li.rate,
                  })),
                  subtotal: inv.amount,
                  total: inv.amount,
                };
                return (
                  <NOCard key={inv.id} className="p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-sm">{inv.number}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            inv.status === 'paid' ? 'bg-no-green-bg text-no-green' :
                            inv.status === 'overdue' ? 'bg-no-red-bg text-no-red' :
                            'bg-no-amber-bg text-no-amber'
                          }`}>
                            {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                          </span>
                          <EngagementIndicator engagement={{ viewCount: inv.viewCount || 0, lastViewedAt: inv.lastViewedAt }} size="sm" showCount={true} showLastViewed={true} />
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                          <span>{formatDate(inv.createdAt)}</span>
                          <span>Due: {formatDate(inv.dueDate)}</span>
                          {inv.paidDate && <span className="text-green-600">Paid: {formatDate(inv.paidDate)}</span>}
                        </div>
                        <p className="font-mono font-bold text-lg mt-1">{formatCurrency(inv.amount)}</p>
                      </div>
                      <div className="flex gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => previewInvoicePDF(pdfData)}
                          disabled={generating}
                          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-border hover:bg-accent transition-colors disabled:opacity-50"
                          title="View invoice"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">View</span>
                        </button>
                        <button
                          onClick={() => downloadInvoicePDF(pdfData, `${inv.number}.pdf`)}
                          disabled={generating}
                          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-colors disabled:opacity-50"
                          title="Download PDF"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Download</span>
                        </button>
                      </div>
                    </div>
                  </NOCard>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'notes' && (
        <div className="space-y-6">
          {notes.map((n) => (
            <NOCard key={n.id} className="p-4 sm:p-6">
              <p className="text-xs text-muted-foreground mb-2">{n.date} · {n.author}</p>
              <p className="text-sm">{n.text}</p>
            </NOCard>
          ))}
          <div className="space-y-3">
            <textarea 
              value={newNote} 
              onChange={e => setNewNote(e.target.value)} 
              placeholder="Add a note..."
              rows={3} 
              className="w-full p-3 rounded-md border border-border bg-no-surface-raised outline-none focus:ring-2 focus:ring-primary resize-none" 
            />
            <button 
              onClick={handleAddNote}
              className="px-6 py-2.5 rounded-md bg-primary text-primary-foreground font-medium hover:opacity-90 transition-all active:scale-[0.98]"
            >
              Save Note
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientProfilePage;
