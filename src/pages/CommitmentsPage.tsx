import React, { useState, useMemo } from 'react';
import { CheckCircle, XCircle, Clock, Calendar, CreditCard, TrendingUp, FileCheck, AlertCircle, DollarSign } from 'lucide-react';
import { NOCard } from '@/components/nextoffice/shared';
import { useCommitments } from '@/hooks';
import { Commitment, CommitmentType, CommitmentStatus } from '@/types';
import { communicationService } from '@/services/api/communicationService';

const TYPE_CONFIG: Record<CommitmentType, { label: string; Icon: any; dot: string; badge: string }> = {
  payment_plan:      { label: 'Payment Plan',      Icon: Calendar,    dot: 'bg-blue-500',   badge: 'bg-blue-100 text-blue-800' },
  deposit:           { label: 'Deposit',            Icon: CreditCard,  dot: 'bg-teal-500',   badge: 'bg-teal-100 text-teal-800' },
  extension:         { label: 'Extension',          Icon: Clock,       dot: 'bg-amber-500',  badge: 'bg-amber-100 text-amber-800' },
  already_paid:      { label: 'Already Paid',       Icon: FileCheck,   dot: 'bg-purple-500', badge: 'bg-purple-100 text-purple-800' },
  project_completion:{ label: 'On Completion',      Icon: TrendingUp,  dot: 'bg-indigo-500', badge: 'bg-indigo-100 text-indigo-800' },
};

const STATUS_CONFIG: Record<CommitmentStatus, { label: string; bar: string; badge: string }> = {
  pending:   { label: 'Pending',   bar: 'bg-amber-400',  badge: 'bg-amber-100 text-amber-800' },
  approved:  { label: 'Approved',  bar: 'bg-green-500',  badge: 'bg-green-100 text-green-800' },
  declined:  { label: 'Declined',  bar: 'bg-red-500',    badge: 'bg-red-100 text-red-800' },
  completed: { label: 'Completed', bar: 'bg-blue-500',   badge: 'bg-blue-100 text-blue-800' },
  cancelled: { label: 'Cancelled', bar: 'bg-gray-400',   badge: 'bg-gray-100 text-gray-600' },
};

function fmtDate(d: string) {
  return new Date(d + (d.includes('T') ? '' : 'T00:00:00')).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return fmtDate(iso);
}

const CommitmentsPage: React.FC = () => {
  const { commitments, updateStatus } = useCommitments();

  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'declined' | 'completed'>('pending');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean; action: 'approve' | 'decline' | null; commitment: Commitment | null;
  }>({ show: false, action: null, commitment: null });

  const handleConfirmAction = async () => {
    if (!confirmModal.commitment) return;
    setProcessingId(confirmModal.commitment.id);
    setConfirmModal({ show: false, action: null, commitment: null });
    try {
      if (confirmModal.action === 'approve') {
        await updateStatus(confirmModal.commitment.id, 'approved');
        communicationService.create({
          invoice_id: confirmModal.commitment.invoiceId,
          client_id: confirmModal.commitment.clientId,
          type: 'commitment_confirmation',
          status: 'sent',
          subject: `Commitment approved for ${confirmModal.commitment.invoiceNumber}`,
          body: `${confirmModal.commitment.type.replace('_', ' ')} approved for ${confirmModal.commitment.clientName}`,
        }).catch(console.error);
      } else {
        await updateStatus(confirmModal.commitment.id, 'declined');
      }
    } finally {
      setProcessingId(null);
    }
  };

  const counts = useMemo(() => ({
    all: commitments.length,
    pending: commitments.filter(c => c.status === 'pending').length,
    approved: commitments.filter(c => c.status === 'approved').length,
    declined: commitments.filter(c => c.status === 'declined').length,
    completed: commitments.filter(c => c.status === 'completed').length,
  }), [commitments]);

  const filtered = useMemo(() =>
    filter === 'all' ? commitments : commitments.filter(c => c.status === filter),
    [commitments, filter]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-serif text-lg sm:text-2xl leading-tight">Client Commitments</h2>
            <p className="text-xs text-muted-foreground">Review and respond to payment arrangements</p>
          </div>
        </div>
        {counts.pending > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
            <span className="text-xs font-semibold text-amber-800">{counts.pending} awaiting review</span>
          </div>
        )}
      </div>

      {/* Stats — compact */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: counts.all,      color: 'border-l-primary',    icon: <TrendingUp className="w-4 h-4 text-primary" /> },
          { label: 'Pending',  value: counts.pending,  color: 'border-l-amber-500',  icon: <Clock className="w-4 h-4 text-amber-500" /> },
          { label: 'Approved', value: counts.approved, color: 'border-l-green-500',  icon: <CheckCircle className="w-4 h-4 text-green-500" /> },
          { label: 'Declined', value: counts.declined, color: 'border-l-red-500',    icon: <XCircle className="w-4 h-4 text-red-500" /> },
        ].map(({ label, value, color, icon }) => (
          <NOCard key={label} className={`px-4 py-3 border-l-4 ${color}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
                <p className="text-xl font-bold leading-tight">{value}</p>
              </div>
              {icon}
            </div>
          </NOCard>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {(['all', 'pending', 'approved', 'declined', 'completed'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              filter === f
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted hover:bg-accent text-muted-foreground'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f !== 'all' && counts[f] > 0 && (
              <span className={`text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none ${
                filter === f ? 'bg-white/25 text-white' : 'bg-background text-foreground'
              }`}>{counts[f]}</span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <NOCard className="py-14 text-center">
            <TrendingUp className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
            <p className="font-medium text-sm">No {filter === 'all' ? '' : filter} commitments</p>
            <p className="text-xs text-muted-foreground mt-1">
              {filter === 'pending' ? 'All caught up — nothing to review' : 'Nothing here yet'}
            </p>
          </NOCard>
        ) : (
          filtered.map((c) => {
            const type = TYPE_CONFIG[c.type];
            const status = STATUS_CONFIG[c.status];
            const TypeIcon = type.Icon;
            const isPending = c.status === 'pending';
            const isProcessing = processingId === c.id;

            return (
              <NOCard key={c.id} className={`overflow-hidden transition-shadow hover:shadow-md`}>
                {/* Status bar — top accent */}
                <div className={`h-1 w-full ${status.bar}`} />

                <div className="p-4">
                  {/* Row 1: client + invoice + amount + status + time */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-base leading-tight">{c.clientName}</h3>
                        <span className="font-mono text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{c.invoiceNumber}</span>
                        <span className="text-xs font-bold text-foreground">R{c.amount.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${type.badge}`}>
                          <TypeIcon className="w-2.5 h-2.5" />
                          {type.label}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${status.badge}`}>
                          {status.label}
                        </span>
                        <span className="text-[11px] text-muted-foreground">{timeAgo(c.requestedAt)}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    {isPending && (
                      <div className="flex gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => setConfirmModal({ show: true, action: 'approve', commitment: c })}
                          disabled={processingId !== null}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                        >
                          {isProcessing ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                          Approve
                        </button>
                        <button
                          onClick={() => setConfirmModal({ show: true, action: 'decline', commitment: c })}
                          disabled={processingId !== null}
                          className="flex items-center gap-1.5 px-3 py-1.5 border border-red-200 hover:bg-red-50 text-red-600 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                        >
                          <XCircle className="w-3 h-3" />
                          Decline
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Row 2: commitment details — prominent date display */}
                  <div className="border-t border-border/60 pt-3 mt-1">
                    {c.type === 'payment_plan' && c.details.installments && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Payment Schedule</p>
                          {(() => {
                            const paidCount = (c.details.paymentSchedule || []).filter((p: any) => p.status === 'paid').length;
                            const total = c.details.paymentSchedule?.length || 0;
                            return total > 0 ? (
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${paidCount === total ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                {paidCount}/{total} paid
                              </span>
                            ) : null;
                          })()}
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                          {c.details.paymentSchedule?.map((p: any, i: number) => {
                            const isPaid = p.status === 'paid';
                            return (
                              <div key={i} className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 border ${isPaid ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-100'}`}>
                                {isPaid
                                  ? <CheckCircle className="w-3 h-3 text-green-600 flex-shrink-0" />
                                  : <Calendar className="w-3 h-3 text-blue-500 flex-shrink-0" />
                                }
                                <div className="min-w-0">
                                  <p className={`text-[10px] font-semibold ${isPaid ? 'text-green-600' : 'text-blue-500'}`}>Instalment {p.installment}</p>
                                  <p className={`text-xs font-bold leading-tight ${isPaid ? 'text-green-900' : 'text-blue-900'}`}>{fmtDate(p.dueDate)}</p>
                                  <div className="flex items-center gap-1">
                                    <p className={`text-[10px] ${isPaid ? 'text-green-600' : 'text-blue-600'}`}>R{p.amount.toLocaleString()}</p>
                                    {isPaid && <span className="text-[9px] font-bold text-green-700">✓</span>}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {c.type === 'deposit' && (
                      <div className="flex flex-wrap gap-2">
                        <div className="flex items-center gap-2 bg-teal-50 border border-teal-100 rounded-md px-2.5 py-1.5">
                          <DollarSign className="w-3 h-3 text-teal-500 flex-shrink-0" />
                          <div>
                            <p className="text-[10px] text-teal-600 font-semibold">Deposit ({c.details.depositPercentage}%)</p>
                            <p className="text-xs font-bold text-teal-900">R{c.details.depositAmount?.toLocaleString()}</p>
                          </div>
                        </div>
                        {c.details.committedDate && (
                          <div className="flex items-center gap-2 bg-teal-50 border border-teal-100 rounded-md px-2.5 py-1.5">
                            <Calendar className="w-3 h-3 text-teal-500 flex-shrink-0" />
                            <div>
                              <p className="text-[10px] text-teal-600 font-semibold">Pay by</p>
                              <p className="text-xs font-bold text-teal-900">{fmtDate(c.details.committedDate)}</p>
                            </div>
                          </div>
                        )}
                        {c.details.balanceAmount != null && c.details.balanceAmount > 0 && (
                          <div className="flex items-center gap-2 bg-muted border border-border rounded-md px-2.5 py-1.5">
                            <div>
                              <p className="text-[10px] text-muted-foreground font-semibold">Balance</p>
                              <p className="text-xs font-bold text-foreground">R{c.details.balanceAmount.toLocaleString()}{c.details.balance_after_completion ? ' on completion' : ''}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {c.type === 'extension' && (
                      <div className="flex flex-wrap gap-2">
                        <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-md px-2.5 py-1.5">
                          <Clock className="w-3 h-3 text-amber-500 flex-shrink-0" />
                          <div>
                            <p className="text-[10px] text-amber-600 font-semibold">Extension</p>
                            <p className="text-xs font-bold text-amber-900">{c.details.extensionDays} days</p>
                          </div>
                        </div>
                        {c.details.newDueDate && (
                          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-1.5">
                            <Calendar className="w-3 h-3 text-amber-600 flex-shrink-0" />
                            <div>
                              <p className="text-[10px] text-amber-600 font-semibold">New payment date</p>
                              <p className="text-xs font-bold text-amber-900">{fmtDate(c.details.newDueDate)}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {c.type === 'already_paid' && (
                      <div className="flex flex-wrap gap-2">
                        {c.details.paymentDate && (
                          <div className="flex items-center gap-2 bg-purple-50 border border-purple-100 rounded-md px-2.5 py-1.5">
                            <Calendar className="w-3 h-3 text-purple-500 flex-shrink-0" />
                            <div>
                              <p className="text-[10px] text-purple-600 font-semibold">Paid on</p>
                              <p className="text-xs font-bold text-purple-900">{fmtDate(c.details.paymentDate)}</p>
                            </div>
                          </div>
                        )}
                        <div className="flex items-center gap-2 bg-purple-50 border border-purple-100 rounded-md px-2.5 py-1.5">
                          <div>
                            <p className="text-[10px] text-purple-600 font-semibold">Status</p>
                            <p className="text-xs font-bold text-purple-900">Pending verification</p>
                          </div>
                        </div>
                      </div>
                    )}
                    {c.type === 'project_completion' && (
                      <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-md px-2.5 py-1.5 w-fit">
                        <TrendingUp className="w-3 h-3 text-indigo-500 flex-shrink-0" />
                        <p className="text-xs font-bold text-indigo-800">Pays upon project completion</p>
                      </div>
                    )}
                    {c.respondedAt && (
                      <p className="text-[10px] text-muted-foreground mt-2">Responded {timeAgo(c.respondedAt)}</p>
                    )}
                  </div>

                  {/* Row 3: client message — only shown when meaningful */}
                  {c.message && (
                    <p className="mt-2.5 text-xs text-muted-foreground italic border-l-2 border-muted pl-3">"{c.message}"</p>
                  )}
                </div>
              </NOCard>
            );
          })
        )}
      </div>

      {/* Confirmation Modal */}
      {confirmModal.show && confirmModal.commitment && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <NOCard className="w-full max-w-sm shadow-2xl">
            <div className={`h-1 w-full ${confirmModal.action === 'approve' ? 'bg-green-500' : 'bg-red-500'}`} />
            <div className="p-5">
              <h3 className="font-semibold text-base mb-1">
                {confirmModal.action === 'approve' ? '✅ Approve commitment?' : '❌ Decline commitment?'}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {confirmModal.action === 'approve'
                  ? `You're accepting the ${TYPE_CONFIG[confirmModal.commitment.type].label.toLowerCase()} request from`
                  : `You're declining the ${TYPE_CONFIG[confirmModal.commitment.type].label.toLowerCase()} request from`}{' '}
                <strong>{confirmModal.commitment.clientName}</strong>.
              </p>
              <div className="flex items-center justify-between bg-muted rounded-lg px-3 py-2 mb-5 text-sm">
                <span className="font-mono font-semibold">{confirmModal.commitment.invoiceNumber}</span>
                <span className="font-bold">R{confirmModal.commitment.amount.toLocaleString()}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmModal({ show: false, action: null, commitment: null })}
                  className="flex-1 px-4 py-2 rounded-lg border border-border text-sm font-semibold hover:bg-accent transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmAction}
                  className={`flex-1 px-4 py-2 rounded-lg text-white text-sm font-semibold transition-colors ${
                    confirmModal.action === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {confirmModal.action === 'approve' ? 'Approve' : 'Decline'}
                </button>
              </div>
            </div>
          </NOCard>
        </div>
      )}
    </div>
  );
};

export default CommitmentsPage;
