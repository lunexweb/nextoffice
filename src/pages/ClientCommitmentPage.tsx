import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Calendar, CheckCircle2, DollarSign, CreditCard, Clock, Bell, Copy, Check, Download, Eye, ChevronRight, Briefcase, ChevronDown, History } from 'lucide-react';
import { NOCard } from '@/components/nextoffice/shared';
import { commitmentServiceApi } from '@/services/api/commitmentService';
import { usePDF } from '@/hooks';
import { supabase } from '@/lib/supabase';
import type { CommitmentType } from '@/types';

const ClientCommitmentPage: React.FC = () => {
  const { invoiceNumber } = useParams<{ invoiceNumber: string }>();
  const { generating, downloadInvoicePDF, previewInvoicePDF } = usePDF();

  const [invoiceData, setInvoiceData] = useState<any>(null);
  const [loadingInvoice, setLoadingInvoice] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [commitmentType, setCommitmentType] = useState<string>('');
  const [committedDate, setCommittedDate] = useState<string>('');
  const [installments, setInstallments] = useState<number>(3);
  const [paymentDates, setPaymentDates] = useState<string[]>([]);
  const [extensionDays, setExtensionDays] = useState<number>(7);
  const [depositPercentage, setDepositPercentage] = useState<number>(50);
  const [extensionReason, setExtensionReason] = useState<string>('');
  const [paidDate, setPaidDate] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showBankingDetails, setShowBankingDetails] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [errorModal, setErrorModal] = useState<{ show: boolean; message: string }>({ show: false, message: '' });
  const [successData, setSuccessData] = useState<{ commitmentType: string; dates: string[] } | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    const fetchInvoice = async () => {
      if (!invoiceNumber) { setNotFound(true); setLoadingInvoice(false); return; }
      try {
        const { data, error } = await supabase.rpc('get_public_invoice_data', { p_invoice_number: invoiceNumber });
        if (error || !data) { setNotFound(true); } else {
          setInvoiceData(data);
          void (async () => {
            try {
              await supabase.rpc('track_invoice_view', {
                p_invoice_number: invoiceNumber,
                p_user_agent: navigator.userAgent,
              });
            } catch {}
          })();
        }
      } catch {
        setNotFound(true);
      } finally {
        setLoadingInvoice(false);
      }
    };
    fetchInvoice();
  }, [invoiceNumber]);

  if (loadingInvoice) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <p className="text-blue-700 font-medium">Loading invoice...</p>
      </div>
    );
  }

  if (notFound || !invoiceData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <NOCard className="max-w-md w-full p-8 text-center">
          <h2 className="font-serif text-2xl font-bold mb-2">Invoice Not Found</h2>
          <p className="text-muted-foreground">This invoice link is invalid or has expired.</p>
        </NOCard>
      </div>
    );
  }

  const invoice = {
    number: invoiceData.number,
    amount: parseFloat(invoiceData.amount) || 0,
    dueDate: invoiceData.due_date,
    clientName: invoiceData.client_name || '',
    lineItems: invoiceData.line_items || [],
    notes: invoiceData.notes || '',
    bankingDetails: invoiceData.banking_details || {},
    businessName: invoiceData.business_name || '',
    businessEmail: invoiceData.business_email || '',
    businessPhone: invoiceData.business_phone || '',
    businessAddress: invoiceData.business_address || '',
  };

  const clientScore: number = invoiceData.client_score || 0;
  const scoreLabel: string = invoiceData.score_label || 'New';
  const paymentHistory: Array<{ number: string; amount: number; status: string; due_date: string; paid_date: string | null; created_at: string }> = invoiceData.payment_history || [];
  const hasHistory: boolean = invoiceData.has_history ?? false;
  const isNewClient = !hasHistory;

  const SCORE_BADGE_CONFIG: Record<string, { bg: string; border: string; text: string; icon: string }> = {
    'Excellent':     { bg: 'bg-emerald-50',  border: 'border-emerald-200', text: 'text-emerald-700', icon: '🌟' },
    'Good':          { bg: 'bg-green-50',    border: 'border-green-200',   text: 'text-green-700',   icon: '✅' },
    'Average':       { bg: 'bg-amber-50',    border: 'border-amber-200',   text: 'text-amber-700',   icon: '⚡' },
    'Below Average': { bg: 'bg-orange-50',   border: 'border-orange-200',  text: 'text-orange-700',  icon: '⚠️' },
    'Unreliable':    { bg: 'bg-red-50',      border: 'border-red-200',     text: 'text-red-700',     icon: '❌' },
    'New':           { bg: 'bg-blue-50',     border: 'border-blue-200',    text: 'text-blue-700',    icon: '🆕' },
  };
  const scoreBadge = SCORE_BADGE_CONFIG[scoreLabel] || SCORE_BADGE_CONFIG['New'];

  const STATUS_PILL: Record<string, string> = {
    paid: 'bg-green-100 text-green-700',
    sent: 'bg-amber-100 text-amber-700',
    overdue: 'bg-red-100 text-red-700',
    project_completed: 'bg-indigo-100 text-indigo-700',
  };

  const fmtDate = (d: string) => {
    try { return new Date(d + (d.includes('T') ? '' : 'T00:00:00')).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }); }
    catch { return d; }
  };


  const no = invoiceData.negotiation_options || {};
  const negotiationOptions = {
    allow_deposit: no.allow_deposit ?? false,
    deposit_min_percentage: no.deposit_min_percentage ?? 50,
    deposit_max_percentage: no.deposit_max_percentage ?? 70,
    balance_after_completion: no.balance_after_completion ?? false,
    allow_payment_plans: no.allow_payment_plans ?? false,
    max_payment_plan_installments: no.max_payment_plan_installments ?? 3,
    allow_extensions: no.allow_extensions ?? false,
    max_extension_days: no.max_extension_days ?? 14,
    allow_project_completion: no.allow_project_completion ?? false,
    followup_days: no.followup_days ?? 3,
    final_deadline: no.final_deadline ?? '',
  };


  const existingCommitmentStatus: string | null = invoiceData.commitment_status ?? null;
  const existingCommitmentType: string | null = invoiceData.commitment_type ?? null;

  const COMMIT_TYPE_LABELS: Record<string, string> = {
    deposit: 'Deposit',
    payment_plan: 'Payment Plan',
    extension: 'Extension Request',
    already_paid: 'Already Paid',
    project_completion: 'On Project Completion',
    pay_now: 'Full Payment',
    pay_on_due_date: 'Full Payment on Due Date',
  };

  const COMMIT_STATUS_CONFIG: Record<string, { label: string; bg: string; border: string; color: string }> = {
    pending:   { label: 'Pending Review',  bg: 'bg-amber-50',  border: 'border-amber-200', color: 'text-amber-800' },
    approved:  { label: 'Approved',        bg: 'bg-green-50',  border: 'border-green-200',  color: 'text-green-800' },
    declined:  { label: 'Declined',        bg: 'bg-red-50',    border: 'border-red-200',    color: 'text-red-800' },
    completed: { label: 'Completed',       bg: 'bg-blue-50',   border: 'border-blue-200',   color: 'text-blue-800' },
  };

  // Invoice already paid — show receipt + score + history
  if (invoiceData.status === 'paid') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex flex-col items-center justify-center p-5">
        <div className="w-full max-w-sm space-y-4">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-9 h-9 text-green-600" />
            </div>
            <h1 className="text-2xl font-serif font-bold text-slate-900">{invoice.businessName || 'Invoice'}</h1>
            <p className="text-sm text-slate-500 mt-1 font-mono">{invoice.number}</p>
          </div>

          <div className="rounded-xl border-2 p-5 bg-green-50 border-green-200">
            <p className="text-xs font-bold uppercase tracking-widest mb-1 text-green-700">Invoice Status</p>
            <p className="text-xl font-bold mb-2 text-green-700">Paid</p>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Amount</span>
                <span className="font-bold text-slate-800">R{invoice.amount.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Due Date</span>
                <span className="font-semibold text-slate-800">{fmtDate(invoice.dueDate)}</span>
              </div>
              {invoiceData.paid_date && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Paid Date</span>
                  <span className="font-semibold text-green-700">{fmtDate(invoiceData.paid_date)}</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <p className="text-sm text-slate-600 leading-relaxed">
              Thank you for your payment! This invoice has been marked as paid.
            </p>
          </div>

          {/* Reliability Score Badge */}
          {hasHistory && (
            <div className={`rounded-xl border-2 p-4 ${scoreBadge.bg} ${scoreBadge.border}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-full bg-white/80 flex items-center justify-center text-lg">
                    {scoreBadge.icon}
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Your Reliability</p>
                    <p className={`text-lg font-bold ${scoreBadge.text}`}>{scoreLabel} Client</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-2xl font-bold ${scoreBadge.text}`}>{clientScore}</p>
                  <p className="text-[10px] text-slate-400 font-medium">/ 100</p>
                </div>
              </div>
            </div>
          )}

          {/* Payment History Accordion */}
          {paymentHistory.length > 1 && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <button
                onClick={() => setShowHistory(v => !v)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <History size={15} className="text-slate-400" />
                  <span className="text-sm font-semibold text-slate-700">Payment History</span>
                  <span className="px-1.5 py-0.5 rounded-full bg-slate-100 text-[10px] font-bold text-slate-500">{paymentHistory.length}</span>
                </div>
                <ChevronDown size={16} className={`text-slate-400 transition-transform ${showHistory ? 'rotate-180' : ''}`} />
              </button>
              {showHistory && (
                <div className="border-t border-slate-100 divide-y divide-slate-50">
                  {paymentHistory.map((h) => (
                    <div key={h.number} className={`flex items-center justify-between px-4 py-2.5 ${h.number === invoice.number ? 'bg-green-50/50' : ''}`}>
                      <div className="flex flex-col">
                        <span className="text-xs font-mono font-bold text-slate-700">
                          {h.number}
                          {h.number === invoice.number && <span className="ml-1.5 text-[10px] font-sans text-green-600">(this invoice)</span>}
                        </span>
                        <span className="text-[11px] text-slate-400">{fmtDate(h.due_date)}</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <span className="text-xs font-bold text-slate-700">R{parseFloat(String(h.amount)).toLocaleString()}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_PILL[h.status] || 'bg-gray-100 text-gray-600'}`}>
                          {h.status === 'project_completed' ? 'Project Done' : h.status.charAt(0).toUpperCase() + h.status.slice(1)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <p className="text-center text-xs text-slate-400">Need help? Contact {invoice.businessName || 'the business'} directly.</p>
        </div>
      </div>
    );
  }

  if (existingCommitmentStatus && ['pending', 'approved'].includes(existingCommitmentStatus)) {
    const sc = COMMIT_STATUS_CONFIG[existingCommitmentStatus];
    const typeLabel = existingCommitmentType ? (COMMIT_TYPE_LABELS[existingCommitmentType] ?? existingCommitmentType) : 'Payment Commitment';
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex flex-col items-center justify-center p-5">
        <div className="w-full max-w-sm space-y-4">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-9 h-9 text-blue-600" />
            </div>
            <h1 className="text-2xl font-serif font-bold text-slate-900">{invoice.businessName || 'Invoice'}</h1>
            <p className="text-sm text-slate-500 mt-1 font-mono">{invoice.number}</p>
          </div>

          <div className={`rounded-xl border-2 p-5 ${sc.bg} ${sc.border}`}>
            <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${sc.color}`}>Commitment Status</p>
            <p className={`text-xl font-bold mb-2 ${sc.color}`}>{sc.label}</p>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Type</span>
                <span className="font-semibold text-slate-800">{typeLabel}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Invoice Amount</span>
                <span className="font-bold text-slate-800">R{invoice.amount.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Due Date</span>
                <span className="font-semibold text-slate-800">{new Date(invoice.dueDate + 'T00:00:00').toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <p className="text-sm text-slate-600 leading-relaxed">
              {existingCommitmentStatus === 'approved'
                ? 'Your commitment has been approved. Please proceed with payment on your committed date.'
                : 'Your commitment has been received and is currently under review. You will be notified once it is approved.'}
            </p>
            {existingCommitmentStatus === 'approved' && Object.keys(invoice.bankingDetails).length > 0 && (
              <button
                onClick={() => setShowBankingDetails(v => !v)}
                className="mt-3 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg w-full"
              >
                {showBankingDetails ? 'Hide' : 'View'} Banking Details
              </button>
            )}
          </div>

          {showBankingDetails && existingCommitmentStatus === 'approved' && (
            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2.5">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Banking Details</p>
              {Object.entries(invoice.bankingDetails).filter(([, v]) => v).map(([key, val]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-sm text-slate-500 capitalize">{key}</span>
                  <span className="text-sm font-semibold text-slate-800">{String(val)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Reliability Score Badge */}
          {hasHistory && (
            <div className={`rounded-xl border-2 p-4 ${scoreBadge.bg} ${scoreBadge.border}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-full bg-white/80 flex items-center justify-center text-lg">
                    {scoreBadge.icon}
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Your Reliability</p>
                    <p className={`text-lg font-bold ${scoreBadge.text}`}>{scoreLabel} Client</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-2xl font-bold ${scoreBadge.text}`}>{clientScore}</p>
                  <p className="text-[10px] text-slate-400 font-medium">/ 100</p>
                </div>
              </div>
            </div>
          )}

          {/* Payment History Accordion */}
          {paymentHistory.length > 1 && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <button
                onClick={() => setShowHistory(v => !v)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <History size={15} className="text-slate-400" />
                  <span className="text-sm font-semibold text-slate-700">Payment History</span>
                  <span className="px-1.5 py-0.5 rounded-full bg-slate-100 text-[10px] font-bold text-slate-500">{paymentHistory.length}</span>
                </div>
                <ChevronDown size={16} className={`text-slate-400 transition-transform ${showHistory ? 'rotate-180' : ''}`} />
              </button>
              {showHistory && (
                <div className="border-t border-slate-100 divide-y divide-slate-50">
                  {paymentHistory.map((h) => (
                    <div key={h.number} className={`flex items-center justify-between px-4 py-2.5 ${h.number === invoice.number ? 'bg-blue-50/50' : ''}`}>
                      <div className="flex flex-col">
                        <span className="text-xs font-mono font-bold text-slate-700">
                          {h.number}
                          {h.number === invoice.number && <span className="ml-1.5 text-[10px] font-sans text-blue-500">(current)</span>}
                        </span>
                        <span className="text-[11px] text-slate-400">{fmtDate(h.due_date)}</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <span className="text-xs font-bold text-slate-700">R{parseFloat(String(h.amount)).toLocaleString()}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_PILL[h.status] || 'bg-gray-100 text-gray-600'}`}>
                          {h.status === 'project_completed' ? 'Project Done' : h.status.charAt(0).toUpperCase() + h.status.slice(1)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <p className="text-center text-xs text-slate-400">Need help? Reply to the email you received or contact {invoice.businessName || 'the business'} directly.</p>
        </div>
      </div>
    );
  }

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSubmitCommitment = async (overrideType?: string, overrideDate?: string) => {
    const effectiveType = overrideType ?? commitmentType;
    let finalCommittedDate = overrideDate ?? committedDate;

    if (effectiveType === 'pay_on_due_date' && !finalCommittedDate) {
      finalCommittedDate = invoice.dueDate;
    }

    if (effectiveType === 'already_paid' && !paidDate) {
      setErrorModal({ show: true, message: 'Please select the date you made the payment.' });
      return;
    }

    if (!finalCommittedDate && effectiveType !== 'payment_plan' && effectiveType !== 'already_paid' && effectiveType !== 'project_completion') {
      setErrorModal({ show: true, message: 'Please select a payment date' });
      return;
    }

    if (effectiveType === 'payment_plan') {
      if (paymentDates.length !== installments || paymentDates.some(date => !date)) {
        setErrorModal({ show: true, message: `Please select dates for all ${installments} payments` });
        return;
      }
    }

    setIsSubmitting(true);

    try {
      let type: CommitmentType = 'deposit';
      if (effectiveType === 'payment_plan') type = 'payment_plan';
      else if (effectiveType === 'extension') type = 'extension';
      else if (effectiveType === 'already_paid') type = 'already_paid';
      else if (effectiveType === 'project_completion') type = 'project_completion';

      let details: Record<string, any> = {};
      if (type === 'payment_plan' && installments && paymentDates) {
        details = {
          installments,
          installmentAmount: Math.round(invoice.amount / installments),
          paymentSchedule: paymentDates.map((date, i) => ({
            installment: i + 1,
            amount: Math.round(invoice.amount / installments),
            dueDate: date,
            status: 'pending',
          })),
        };
      } else if (type === 'extension') {
        const extDate = new Date();
        extDate.setDate(extDate.getDate() + extensionDays);
        const computedExt = extDate.toISOString().split('T')[0];
        const cappedNewDue = computedExt > invoice.dueDate ? invoice.dueDate : computedExt;
        finalCommittedDate = finalCommittedDate || cappedNewDue;
        details = { extensionDays, newDueDate: finalCommittedDate };
      } else if (type === 'deposit') {
        const depPct = negotiationOptions.allow_deposit ? depositPercentage : 100;
        const depositAmt = Math.round(invoice.amount * depPct / 100);
        const balanceAmt = invoice.amount - depositAmt;
        details = {
          depositPercentage: depPct,
          depositAmount: depositAmt,
          balanceAmount: balanceAmt,
          balance_after_completion: negotiationOptions.balance_after_completion,
          followup_days: negotiationOptions.followup_days,
          committedDate: finalCommittedDate,
        };
      } else if (type === 'already_paid') {
        details = { paymentDate: paidDate, paymentProof: 'Pending verification' };
      } else if (type === 'project_completion') {
        details = { committedAt: new Date().toISOString(), followup_days: negotiationOptions.followup_days };
      }

      const fmtMsg = (d: string) => new Date(d + (d.includes('T') ? '' : 'T00:00:00')).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' });
      const message = effectiveType === 'payment_plan' && details.paymentSchedule
        ? `${installments} instalments of R${details.installmentAmount?.toLocaleString()} each. Dates: ${details.paymentSchedule.map((p: any) => fmtMsg(p.dueDate)).join(' · ')}`
        : effectiveType === 'extension'
        ? extensionReason || (details.newDueDate ? `New payment date: ${fmtMsg(details.newDueDate)}` : null)
        : effectiveType === 'already_paid' && details.paymentDate
        ? `Payment claimed on ${fmtMsg(details.paymentDate)} — pending verification`
        : effectiveType === 'project_completion'
        ? null
        : finalCommittedDate
        ? `Committed to pay R${invoice.amount.toLocaleString()} on ${fmtMsg(finalCommittedDate)}`
        : null;

      await commitmentServiceApi.publicCreate({
        user_id: invoiceData.user_id,
        invoice_id: invoiceData.invoice_id,
        invoice_number: invoice.number,
        client_id: invoiceData.client_id,
        client_name: invoice.clientName,
        type,
        amount: invoice.amount,
        details,
        message: message ?? undefined,
      });

      supabase.functions.invoke('send-commitment-confirmation', {
        body: {
          invoiceId: invoiceData.invoice_id,
          clientId: invoiceData.client_id,
          recipientName: invoice.clientName,
          invoiceNumber: invoice.number,
          amount: invoice.amount,
          dueDate: invoice.dueDate,
          commitmentType: type,
          commitmentDetails: message,
          commitmentDetailsData: details,
          businessName: invoice.businessName,
          clientScore: clientScore,
          clientLevel: invoiceData.client_level || 'New',
          hasHistory: invoiceData.has_history ?? false,
          ownerEmail: invoice.businessEmail || undefined,
        },
      }).catch(console.error);

      const dates = type === 'payment_plan'
        ? paymentDates
        : type === 'project_completion'
        ? []
        : [finalCommittedDate].filter(Boolean) as string[];
      setSuccessData({ commitmentType: effectiveType, dates });
    } catch (error) {
      console.error('Error creating commitment:', error);
      setErrorModal({ show: true, message: 'Failed to record commitment. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getReminders = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const fmt = (dt: Date) => dt.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });

    // Smart timing: never show past dates as future reminders
    if (d <= today) {
      // Due date is today or already passed — follow up immediately
      const followUp = new Date(today);
      followUp.setDate(followUp.getDate() + 1);
      return { first: 'Today', second: fmt(followUp) };
    }

    const before = new Date(d);
    before.setDate(before.getDate() - 1);

    if (before <= today) {
      // 1 day before is today or past — show "Today" instead of a past date
      return { first: 'Today', second: fmt(d) };
    }

    return { first: fmt(before), second: fmt(d) };
  };

  if (successData) {
    const firstDate = successData.dates[0];
    const isAlreadyPaid = successData.commitmentType === 'already_paid';
    const isProjectCompletion = successData.commitmentType === 'project_completion';
    const isDeposit = successData.commitmentType === 'deposit';
    const reminders = firstDate && !isAlreadyPaid && !isProjectCompletion ? getReminders(firstDate) : null;
    const isPaymentPlan = successData.commitmentType === 'payment_plan';

    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex flex-col items-center justify-center p-5">
        <div className="w-full max-w-sm space-y-5">
          <div className="text-center">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isProjectCompletion ? 'bg-indigo-100' : 'bg-green-100'}`}>
              {isProjectCompletion ? (
                <Briefcase className="w-9 h-9 text-indigo-600" />
              ) : (
                <CheckCircle2 className="w-9 h-9 text-green-600" />
              )}
            </div>
            <h1 className="text-2xl font-serif font-bold text-green-900">Confirmed!</h1>
            <p className="text-sm text-green-700 mt-1">
              {isAlreadyPaid
                ? 'Payment confirmation received'
                : isProjectCompletion
                ? 'You committed to pay after project completion'
                : `Commitment recorded for ${invoice.businessName}`}
            </p>
          </div>

          {isDeposit && negotiationOptions.balance_after_completion && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-4 py-2.5 bg-teal-50 border-b border-teal-200">
                <p className="text-xs font-bold text-teal-600 uppercase tracking-wide">💳 Payment Summary</p>
              </div>
              <div className="divide-y divide-gray-100">
                <div className="flex items-center justify-between px-4 py-3">
                  <p className="text-sm text-gray-700">Deposit ({depositPercentage}%)</p>
                  <p className="text-sm font-semibold text-teal-700">
                    {new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(invoice.amount * depositPercentage / 100)}
                  </p>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <p className="text-sm text-gray-700">Balance (after project completion)</p>
                  <p className="text-sm font-semibold text-indigo-700">
                    {new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(invoice.amount * (100 - depositPercentage) / 100)}
                  </p>
                </div>
                <div className="flex items-start gap-3 px-4 py-3 bg-indigo-50">
                  <span className="text-indigo-500 mt-0.5">ℹ</span>
                  <p className="text-xs text-indigo-700 leading-relaxed">
                    Balance due within {negotiationOptions.followup_days} day{negotiationOptions.followup_days !== 1 ? 's' : ''} of project completion. You'll be notified when the project is marked done.
                  </p>
                </div>
              </div>
            </div>
          )}

          {isProjectCompletion && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-4 py-2.5 bg-indigo-50 border-b border-indigo-200">
                <p className="text-xs font-bold text-indigo-500 uppercase tracking-wide">📋 What Happens Next</p>
              </div>
              <div className="divide-y divide-gray-100">
                <div className="flex items-center gap-3 px-4 py-3">
                  <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center flex-shrink-0">1</span>
                  <p className="text-sm text-gray-700">The business completes your project</p>
                </div>
                <div className="flex items-center gap-3 px-4 py-3">
                  <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center flex-shrink-0">2</span>
                  <p className="text-sm text-gray-700">You'll receive a follow-up to confirm payment</p>
                </div>
                <div className="flex items-center gap-3 px-4 py-3">
                  <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center flex-shrink-0">3</span>
                  <p className="text-sm text-gray-700">Pay within {negotiationOptions.followup_days} day{negotiationOptions.followup_days !== 1 ? 's' : ''} of project completion</p>
                </div>
                <div className="flex items-start gap-3 px-4 py-3 bg-amber-50">
                  <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-500 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">!</span>
                  <p className="text-xs text-amber-700 leading-relaxed">
                    Late payment after project completion may affect your reliability score.
                  </p>
                </div>
              </div>
            </div>
          )}

          {reminders && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">📅 Reminder Schedule</p>
              </div>
              <div className="divide-y divide-gray-100">
                <div className="flex items-center gap-3 px-4 py-3">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center flex-shrink-0">1</span>
                  <div>
                    <p className="text-xs text-gray-400">1st Reminder</p>
                    <p className="text-sm font-semibold text-gray-800">{reminders.first}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 px-4 py-3">
                  <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center flex-shrink-0">2</span>
                  <div>
                    <p className="text-xs text-gray-400">2nd Reminder</p>
                    <p className="text-sm font-semibold text-gray-800">{reminders.second}</p>
                  </div>
                </div>
                {isPaymentPlan && successData.dates.length > 1 && (
                  <div className="px-4 py-2 bg-indigo-50">
                    <p className="text-xs text-indigo-600">Same reminder pattern applies to all {successData.dates.length} installments</p>
                  </div>
                )}
                <div className="flex items-start gap-3 px-4 py-3 bg-red-50">
                  <span className="w-6 h-6 rounded-full bg-red-100 text-red-500 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">!</span>
                  <p className="text-xs text-red-700 leading-relaxed">
                    Failure to pay — we will follow up continuously until payment is cleared.
                  </p>
                </div>
              </div>
            </div>
          )}

          {isAlreadyPaid && (
            <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm text-center">
              <p className="text-sm text-gray-600">We'll verify and confirm receipt shortly. Thank you!</p>
            </div>
          )}

          <div className="text-center pt-1">
            <p className="text-xs text-gray-400 mb-3">Want invoicing like this for your business?</p>
            <a
              href="/"
              className="flex items-center justify-center gap-2 w-full px-6 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold text-sm shadow-md hover:shadow-lg transition-all hover:from-blue-700 hover:to-indigo-700"
            >
              Get NextOffice →
            </a>
          </div>
        </div>
      </div>
    );
  }

  const reliabilityLabel = clientScore >= 90 ? 'Excellent Client' : clientScore >= 75 ? 'Reliable Client' : clientScore >= 60 ? 'Good Standing' : clientScore >= 40 ? 'At Risk' : 'Unreliable';
  const reliabilityColor = clientScore >= 90 ? 'text-emerald-700 bg-emerald-100' : clientScore >= 75 ? 'text-green-700 bg-green-100' : clientScore >= 60 ? 'text-amber-700 bg-amber-100' : clientScore >= 40 ? 'text-orange-700 bg-orange-100' : 'text-red-700 bg-red-100';
  const scoreDotColor = isNewClient ? 'bg-gray-400' : clientScore >= 90 ? 'bg-emerald-500' : clientScore >= 75 ? 'bg-green-500' : clientScore >= 60 ? 'bg-amber-500' : clientScore >= 40 ? 'bg-orange-500' : 'bg-red-500';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="max-w-4xl mx-auto py-3 px-3 md:py-8 md:px-6">
        <NOCard className="shadow-xl border-0">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-3 md:px-8 md:py-5 rounded-t-xl">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-blue-200 text-[11px] font-medium uppercase tracking-wide hidden md:block">{invoice.businessName || 'Invoice'}</p>
                <h1 className="text-base md:text-xl font-serif font-bold text-center md:text-left">Invoice {invoice.number}</h1>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const items = invoice.lineItems.length > 0
                      ? invoice.lineItems.map((li: any) => ({ description: li.description, quantity: li.quantity, rate: li.rate, amount: li.quantity * li.rate }))
                      : [{ description: 'Services', quantity: 1, rate: invoice.amount, amount: invoice.amount }];
                    const subtotal = items.reduce((s: number, i: any) => s + i.amount, 0);
                    previewInvoicePDF({
                      invoiceNumber: invoice.number,
                      invoiceDate: new Date().toLocaleDateString(),
                      dueDate: invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : '',
                      status: 'sent',
                      businessName: invoice.businessName,
                      businessEmail: invoice.businessEmail,
                      businessAddress: invoice.businessAddress,
                      businessPhone: invoice.businessPhone,
                      clientName: invoice.clientName,
                      items,
                      subtotal,
                      total: subtotal,
                      balance: subtotal,
                      notes: invoice.notes,
                    });
                  }}
                  disabled={generating}
                  className="px-3 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                  title="View Invoice PDF"
                >
                  <Eye size={16} />
                  View
                </button>
                <button
                  onClick={() => {
                    const items = invoice.lineItems.length > 0
                      ? invoice.lineItems.map((li: any) => ({ description: li.description, quantity: li.quantity, rate: li.rate, amount: li.quantity * li.rate }))
                      : [{ description: 'Services', quantity: 1, rate: invoice.amount, amount: invoice.amount }];
                    const subtotal = items.reduce((s: number, i: any) => s + i.amount, 0);
                    downloadInvoicePDF({
                      invoiceNumber: invoice.number,
                      invoiceDate: new Date().toLocaleDateString(),
                      dueDate: invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : '',
                      status: 'sent',
                      businessName: invoice.businessName,
                      businessEmail: invoice.businessEmail,
                      businessAddress: invoice.businessAddress,
                      businessPhone: invoice.businessPhone,
                      clientName: invoice.clientName,
                      items,
                      subtotal,
                      total: subtotal,
                      balance: subtotal,
                      notes: invoice.notes,
                    });
                  }}
                  disabled={generating}
                  className="px-3 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                  title="Download Invoice PDF"
                >
                  <Download size={16} />
                  PDF
                </button>
              </div>
            </div>
          </div>

          {/* Two-column on desktop */}
          <div className="md:grid md:grid-cols-2 md:divide-x md:divide-gray-100">

            {/* LEFT: Invoice Info */}
            <div className="p-4 md:p-6 space-y-4">
              {/* Invoice Summary */}
              <div>
                <div className="flex items-end justify-between mb-1">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Amount Due</p>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Due Date</p>
                </div>
                <div className="flex items-center justify-between bg-blue-50 rounded-xl px-4 py-3 border border-blue-100">
                  <p className="text-2xl font-bold text-blue-900">R{invoice.amount.toLocaleString()}</p>
                  <p className="text-base font-semibold text-blue-800">{new Date(invoice.dueDate).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Client & business */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Billed to</span>
                  <span className="font-medium text-gray-700">{invoice.clientName}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">From</span>
                  <span className="font-medium text-gray-700">{invoice.businessName}</span>
                </div>
              </div>

              {/* Reliability Score */}
              <div className="flex items-center justify-between px-3 py-2.5 bg-gray-50 rounded-lg border border-gray-100">
                <div className="flex items-center gap-2.5">
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${scoreDotColor}`} />
                  <div>
                    <p className="text-[10px] text-gray-400 leading-none mb-1">Reliability Score</p>
                    <div className="flex items-center gap-1.5">
                      {isNewClient ? (
                        <span className="px-1.5 py-0.5 rounded text-xs font-semibold text-gray-600 bg-gray-100">New</span>
                      ) : (
                        <>
                          <span className="text-base font-bold text-gray-900">{clientScore}</span>
                          <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${reliabilityColor}`}>{reliabilityLabel}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right text-xs space-y-0.5">
                  <p className="text-green-600 font-medium">Pay on time <strong>+6</strong></p>
                  <p className="text-red-500 font-medium">Miss payment <strong>-6</strong></p>
                </div>
              </div>

              {/* Banking Details (shown here on desktop, inline on mobile) */}
              {showBankingDetails && (
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <h3 className="font-semibold text-sm text-green-900 mb-3 flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4" />
                    Banking Details
                  </h3>
                  <div className="space-y-1 text-xs">
                    {invoice.bankingDetails.bank && (
                    <div className="flex justify-between items-center py-2 border-b border-green-200">
                      <span className="text-green-700 font-medium">Bank:</span>
                      <div className="flex items-center gap-2">
                        <span className="text-green-900 font-semibold">{invoice.bankingDetails.bank}</span>
                        <button onClick={() => copyToClipboard(invoice.bankingDetails.bank, 'bank')} className="p-1 hover:bg-green-100 rounded transition-colors">
                          {copiedField === 'bank' ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5 text-green-600" />}
                        </button>
                      </div>
                    </div>
                    )}
                    {invoice.bankingDetails.account && (
                    <div className="flex justify-between items-center py-2 border-b border-green-200">
                      <span className="text-green-700 font-medium">Account No.:</span>
                      <div className="flex items-center gap-2">
                        <span className="text-green-900 font-semibold font-mono">{invoice.bankingDetails.account}</span>
                        <button onClick={() => copyToClipboard(invoice.bankingDetails.account, 'account')} className="p-1 hover:bg-green-100 rounded transition-colors">
                          {copiedField === 'account' ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5 text-green-600" />}
                        </button>
                      </div>
                    </div>
                    )}
                    {invoice.bankingDetails.branch && (
                    <div className="flex justify-between items-center py-2 border-b border-green-200">
                      <span className="text-green-700 font-medium">Branch Code:</span>
                      <div className="flex items-center gap-2">
                        <span className="text-green-900 font-semibold font-mono">{invoice.bankingDetails.branch}</span>
                        <button onClick={() => copyToClipboard(invoice.bankingDetails.branch, 'branch')} className="p-1 hover:bg-green-100 rounded transition-colors">
                          {copiedField === 'branch' ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5 text-green-600" />}
                        </button>
                      </div>
                    </div>
                    )}
                    {invoice.bankingDetails.type && (
                    <div className="flex justify-between items-center py-2 border-b border-green-200">
                      <span className="text-green-700 font-medium">Account Type:</span>
                      <div className="flex items-center gap-2">
                        <span className="text-green-900 font-semibold">{invoice.bankingDetails.type}</span>
                        <button onClick={() => copyToClipboard(invoice.bankingDetails.type, 'type')} className="p-1 hover:bg-green-100 rounded transition-colors">
                          {copiedField === 'type' ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5 text-green-600" />}
                        </button>
                      </div>
                    </div>
                    )}
                    <div className="flex justify-between items-center py-2">
                      <span className="text-green-700 font-medium">Reference:</span>
                      <div className="flex items-center gap-2">
                        <span className="text-green-900 font-semibold font-mono">{invoice.number}</span>
                        <button onClick={() => copyToClipboard(invoice.number, 'reference')} className="p-1 hover:bg-green-100 rounded transition-colors" title="Copy reference">
                          {copiedField === 'reference' ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5 text-green-600" />}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 p-2.5 bg-green-100 rounded-md border border-green-300">
                    <p className="text-[11px] text-green-800 font-medium">
                      ⚠️ Use <strong>{invoice.number}</strong> as your payment reference.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT: Actions */}
            <div className="p-4 md:p-6 space-y-3 border-t border-gray-100 md:border-t-0">
              {/* Primary Action - PAY NOW */}
              <button
                onClick={() => setShowBankingDetails(!showBankingDetails)}
                className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 active:scale-[0.98] text-white rounded-xl text-sm font-semibold shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2"
              >
                <DollarSign className="w-4 h-4" />
                {showBankingDetails ? 'Hide Banking Details' : 'Pay Now — View Banking Details'}
              </button>

              {/* Pay on Due Date */}
              <button
                onClick={() => handleSubmitCommitment('pay_on_due_date', invoice.dueDate)}
                className="w-full px-4 py-2.5 border border-blue-200 hover:border-blue-400 hover:bg-blue-50 active:scale-[0.98] text-blue-700 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2"
              >
                <Bell className="w-4 h-4" />
                I'll Pay on Due Date ({new Date(invoice.dueDate).toLocaleDateString()})
              </button>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
                <div className="relative flex justify-center text-xs"><span className="px-3 bg-white text-gray-400">Need more flexibility?</span></div>
              </div>

              {/* Secondary Options */}
              <div className="space-y-2">
              <div className="space-y-2">

                {/* Deposit + Balance After Completion */}
                {negotiationOptions.allow_deposit && (
                  <NOCard className={`transition-all cursor-pointer ${commitmentType === 'deposit' ? 'border-teal-500 shadow-md ring-1 ring-teal-200' : 'border border-gray-200 hover:border-teal-300 hover:shadow-sm'}`}>
                    <button
                      onClick={() => {
                        setCommitmentType(commitmentType === 'deposit' ? '' : 'deposit');
                        setDepositPercentage(negotiationOptions.deposit_min_percentage);
                      }}
                      className="w-full px-3 py-2.5 text-left flex items-center gap-2.5 active:bg-gray-50 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-teal-50 flex items-center justify-center flex-shrink-0">
                        <DollarSign className="w-4 h-4 text-teal-600" />
                      </div>
                      <div className="flex-grow min-w-0">
                        <h3 className="text-sm font-medium text-gray-900">
                          Pay Deposit {negotiationOptions.balance_after_completion ? '+ Balance After Completion' : 'Now'}
                        </h3>
                        <p className="text-xs text-gray-500">
                          {negotiationOptions.deposit_min_percentage}%–{negotiationOptions.deposit_max_percentage}% upfront
                          {negotiationOptions.balance_after_completion ? ', balance due after project is done' : ''}
                        </p>
                      </div>
                      <ChevronRight className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${commitmentType === 'deposit' ? 'rotate-90' : ''}`} />
                    </button>

                    {commitmentType === 'deposit' && (
                      <div className="px-3 pb-3 space-y-3 border-t border-gray-100 pt-3">
                        {/* Percentage picker */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-medium text-gray-700">Deposit Amount</label>
                            <span className="text-xs font-bold text-teal-700">{depositPercentage}% — {new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(invoice.amount * depositPercentage / 100)}</span>
                          </div>
                          <input
                            type="range"
                            min={negotiationOptions.deposit_min_percentage}
                            max={negotiationOptions.deposit_max_percentage}
                            step={5}
                            value={depositPercentage}
                            onChange={(e) => setDepositPercentage(Number(e.target.value))}
                            className="w-full accent-teal-600"
                          />
                          <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                            <span>{negotiationOptions.deposit_min_percentage}%</span>
                            <span>{negotiationOptions.deposit_max_percentage}%</span>
                          </div>
                        </div>

                        {negotiationOptions.balance_after_completion && (
                          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-2.5 text-xs text-indigo-800 space-y-0.5">
                            <p className="font-semibold">Balance: {new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(invoice.amount * (100 - depositPercentage) / 100)}</p>
                            <p>Balance will be due once the project is marked as completed. Payment expected within {negotiationOptions.followup_days} day{negotiationOptions.followup_days !== 1 ? 's' : ''}.</p>
                          </div>
                        )}

                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-xs font-medium text-gray-700">Deposit Payment Date</label>
                            <span className="text-[10px] text-amber-600 font-medium">On or before {new Date(invoice.dueDate + 'T00:00:00').toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                          </div>
                          <input
                            type="date"
                            value={committedDate}
                            onChange={(e) => setCommittedDate(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                            max={invoice.dueDate}
                            className="w-full px-3 py-2 rounded-lg border-2 border-border bg-background outline-none focus:border-teal-500 transition-colors text-sm"
                          />
                          <p className="text-[11px] text-gray-400 mt-1">Deposit must be paid on or before the invoice due date</p>
                        </div>

                        <button
                          onClick={() => handleSubmitCommitment('deposit')}
                          disabled={isSubmitting || !committedDate}
                          className="w-full px-3 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 active:scale-[0.98] transition-all disabled:opacity-50"
                        >
                          {isSubmitting ? 'Submitting...' : `Confirm ${depositPercentage}% Deposit`}
                        </button>
                      </div>
                    )}
                  </NOCard>
                )}

                {/* Choose Date */}
                <NOCard className={`transition-all cursor-pointer ${commitmentType === 'full_payment' ? 'border-blue-500 shadow-md ring-1 ring-blue-200' : 'border border-gray-200 hover:border-blue-300 hover:shadow-sm'}`}>
                  <button 
                    onClick={() => setCommitmentType(commitmentType === 'full_payment' ? '' : 'full_payment')}
                    className="w-full px-3 py-2.5 text-left flex items-center gap-2.5 active:bg-gray-50 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-grow min-w-0">
                      <h3 className="text-sm font-medium text-gray-900">Choose Your Date</h3>
                      <p className="text-xs text-gray-500">Pick a date that works for you</p>
                    </div>
                    <ChevronRight className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${commitmentType === 'full_payment' ? 'rotate-90' : ''}`} />
                  </button>
                  
                  {commitmentType === 'full_payment' && (
                    <div className="px-3 pb-3 space-y-3 border-t border-gray-100 pt-3">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-medium text-gray-700">Payment Date</label>
                          <span className="text-[10px] text-amber-600 font-medium">On or before {new Date(invoice.dueDate + 'T00:00:00').toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        </div>
                        <input
                          type="date"
                          value={committedDate}
                          onChange={(e) => setCommittedDate(e.target.value)}
                          min={new Date().toISOString().split('T')[0]}
                          max={invoice.dueDate}
                          className="w-full px-3 py-2 rounded-lg border-2 border-border bg-background outline-none focus:border-primary transition-colors"
                        />
                        <p className="text-[11px] text-gray-400 mt-1">Must be on or before the invoice due date. Need more time? Use <strong>Request Extension</strong>.</p>
                      </div>
                      <button
                        onClick={() => handleSubmitCommitment()}
                        disabled={isSubmitting}
                        className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50"
                      >
                        {isSubmitting ? 'Submitting...' : 'Confirm Date'}
                      </button>
                    </div>
                  )}
                </NOCard>

                {/* Payment Plan */}
                {negotiationOptions.allow_payment_plans && (
                  <NOCard className={`transition-all cursor-pointer ${commitmentType === 'payment_plan' ? 'border-purple-500 shadow-md ring-1 ring-purple-200' : 'border border-gray-200 hover:border-purple-300 hover:shadow-sm'}`}>
                    <button 
                      onClick={() => setCommitmentType(commitmentType === 'payment_plan' ? '' : 'payment_plan')}
                      className="w-full px-3 py-2.5 text-left flex items-center gap-2.5 active:bg-gray-50 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center flex-shrink-0">
                        <CreditCard className="w-4 h-4 text-purple-600" />
                      </div>
                      <div className="flex-grow min-w-0">
                        <h3 className="text-sm font-medium text-gray-900">Payment Plan</h3>
                        <p className="text-xs text-gray-500">Split into manageable payments</p>
                      </div>
                      <ChevronRight className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${commitmentType === 'payment_plan' ? 'rotate-90' : ''}`} />
                    </button>
                  
                  {commitmentType === 'payment_plan' && (
                    <div className="px-3 pb-3 space-y-3 border-t border-gray-100 pt-3">
                      <div>
                        <label className="text-xs font-medium mb-1.5 block text-gray-700">Payments (Max: {negotiationOptions.max_payment_plan_installments})</label>
                        <div className="flex gap-1.5">
                          {Array.from({ length: negotiationOptions.max_payment_plan_installments - 1 }, (_, i) => i + 2).map(num => (
                            <button
                              key={num}
                              onClick={() => {
                                setInstallments(num);
                                setPaymentDates([]);
                              }}
                              className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                                installments === num ? 'bg-purple-600 text-white' : 'border border-gray-200 hover:bg-purple-50'
                              }`}
                            >
                              {num}
                            </button>
                          ))}
                        </div>
                      </div>
                                            {installments > 0 && (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-medium text-gray-700">Payment Dates</label>
                            <span className="text-[10px] text-amber-600 font-medium">All before {new Date(invoice.dueDate + 'T00:00:00').toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                          </div>
                          {Array.from({ length: installments }).map((_, i) => (
                            <div key={i}>
                              <label className="text-[10px] text-gray-400 mb-0.5 block">Instalment {i + 1}</label>
                              <input
                                type="date"
                                value={paymentDates[i] || ''}
                                onChange={(e) => {
                                  const newDates = [...paymentDates];
                                  newDates[i] = e.target.value;
                                  setPaymentDates(newDates);
                                }}
                                min={i === 0 ? new Date().toISOString().split('T')[0] : (paymentDates[i - 1] || new Date().toISOString().split('T')[0])}
                                max={invoice.dueDate}
                                className="w-full px-3 py-2 rounded-lg border-2 border-border bg-background outline-none focus:border-primary transition-colors"
                              />
                            </div>
                          ))}
                          <p className="text-[11px] text-gray-400">All instalments must fall on or before the invoice due date</p>
                        </div>
                      )}
                      
                      <button
                        onClick={() => handleSubmitCommitment()}
                        disabled={isSubmitting}
                        className="w-full px-3 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 active:scale-[0.98] transition-all disabled:opacity-50"
                      >
                        {isSubmitting ? 'Submitting...' : 'Confirm Payment Plan'}
                      </button>
                    </div>
                  )}
                </NOCard>
                )}

                {/* Extension */}
                {negotiationOptions.allow_extensions && (
                <NOCard className={`transition-all cursor-pointer ${commitmentType === 'extension' ? 'border-orange-500 shadow-md ring-1 ring-orange-200' : 'border border-gray-200 hover:border-orange-300 hover:shadow-sm'}`}>
                  <button 
                    onClick={() => setCommitmentType(commitmentType === 'extension' ? '' : 'extension')}
                    className="w-full px-3 py-2.5 text-left flex items-center gap-2.5 active:bg-gray-50 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center flex-shrink-0">
                      <Clock className="w-4 h-4 text-orange-600" />
                    </div>
                    <div className="flex-grow min-w-0">
                      <h3 className="text-sm font-medium text-gray-900">Request Extension</h3>
                      <p className="text-xs text-gray-500">Need more time? No problem</p>
                    </div>
                    <ChevronRight className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${commitmentType === 'extension' ? 'rotate-90' : ''}`} />
                  </button>
                                    {commitmentType === 'extension' && (
                    <div className="px-3 pb-3 space-y-3 border-t border-gray-100 pt-3">
                      <div>
                        {(() => {
                          const todayMs = new Date().setHours(0,0,0,0);
                          const dueMs = new Date(invoice.dueDate + 'T00:00:00').setHours(0,0,0,0);
                          const maxDaysAllowed = Math.max(0, Math.floor((dueMs - todayMs) / 86400000));
                          const availableDays = [7, 14, negotiationOptions.max_extension_days]
                            .filter((d, idx, arr) => d <= negotiationOptions.max_extension_days && d <= maxDaysAllowed && arr.indexOf(d) === idx);
                          const activeExt = Math.min(extensionDays, maxDaysAllowed);
                          const extTarget = new Date();
                          extTarget.setDate(extTarget.getDate() + activeExt);
                          const extTargetStr = extTarget.toISOString().split('T')[0];
                          const cappedTarget = extTargetStr > invoice.dueDate ? invoice.dueDate : extTargetStr;
                          const cappedFormatted = new Date(cappedTarget + 'T00:00:00').toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
                          return (
                            <>
                              <div className="flex items-center justify-between mb-1.5">
                                <label className="text-xs font-medium text-gray-700">Extension Days (Max: {Math.min(negotiationOptions.max_extension_days, maxDaysAllowed)})</label>
                                <span className="text-[10px] text-amber-600 font-medium">Cannot exceed {new Date(invoice.dueDate + 'T00:00:00').toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                              </div>
                              {availableDays.length === 0 ? (
                                <p className="text-xs text-red-500">No extension available — invoice due date has been reached.</p>
                              ) : (
                                <div className="flex gap-1.5">
                                  {availableDays.map(days => {
                                    const d = new Date();
                                    d.setDate(d.getDate() + days);
                                    const ds = d.toISOString().split('T')[0];
                                    const capped = ds > invoice.dueDate ? invoice.dueDate : ds;
                                    return (
                                      <button
                                        key={days}
                                        onClick={() => { setExtensionDays(days); setCommittedDate(capped); }}
                                        className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                                          extensionDays === days ? 'bg-orange-600 text-white' : 'border border-gray-200 hover:bg-orange-50'
                                        }`}
                                      >
                                        {days}d
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                              {availableDays.length > 0 && (
                                <p className="text-xs text-gray-600 mt-2">
                                  New payment date: <strong className="text-orange-700">{cappedFormatted}</strong>
                                </p>
                              )}
                            </>
                          );
                        })()}
                      </div>
                      
                      <div>
                        <label className="text-xs font-medium mb-1.5 block text-gray-700">Reason (Optional)</label>
                        <textarea
                          value={extensionReason}
                          onChange={(e) => setExtensionReason(e.target.value)}
                          placeholder="Brief reason for extension..."
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-background outline-none focus:border-orange-400 transition-colors text-sm"
                          rows={2}
                        />
                      </div>
                      
                      <button
                        onClick={() => handleSubmitCommitment()}
                        disabled={isSubmitting}
                        className="w-full px-3 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 active:scale-[0.98] transition-all disabled:opacity-50"
                      >
                        {isSubmitting ? 'Submitting...' : 'Request Extension'}
                      </button>
                    </div>
                  )}
                  </NOCard>
                )}

                {/* Already Paid */}
                <NOCard className={`transition-all ${commitmentType === 'already_paid' ? 'border-green-500 shadow-md ring-1 ring-green-200' : 'border border-gray-200 hover:border-green-300 hover:shadow-sm'}`}>
                  <button
                    onClick={() => setCommitmentType(commitmentType === 'already_paid' ? '' : 'already_paid')}
                    className="w-full px-3 py-2.5 text-left flex items-center gap-2.5 active:bg-gray-50 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="flex-grow min-w-0">
                      <h3 className="text-sm font-medium text-gray-900">Already Paid?</h3>
                      <p className="text-xs text-gray-500">Tap to confirm your payment</p>
                    </div>
                    <ChevronRight className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${commitmentType === 'already_paid' ? 'rotate-90' : ''}`} />
                  </button>

                  {commitmentType === 'already_paid' && (
                    <div className="px-3 pb-3 pt-1 space-y-3 border-t border-gray-100">
                      <div>
                        <label className="text-xs font-medium mb-1.5 block text-gray-700">When did you pay?</label>
                        <input
                          type="date"
                          value={paidDate}
                          max={new Date().toISOString().split('T')[0]}
                          onChange={e => setPaidDate(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-background outline-none focus:border-green-400 transition-colors text-sm"
                        />
                        <p className="text-[11px] text-gray-400 mt-1">Only today or past dates are allowed</p>
                      </div>
                      <button
                        onClick={() => handleSubmitCommitment('already_paid')}
                        disabled={isSubmitting || !paidDate}
                        className="w-full px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 active:scale-[0.98] transition-all disabled:opacity-50"
                      >
                        {isSubmitting ? 'Submitting...' : 'Confirm Payment'}
                      </button>
                    </div>
                  )}
                </NOCard>

                {/* Pay After Project Completion — only shown when owner enabled it */}
                {negotiationOptions.allow_project_completion && (
                  <NOCard className={`transition-all cursor-pointer ${commitmentType === 'project_completion' ? 'border-indigo-500 shadow-md ring-1 ring-indigo-200' : 'border border-gray-200 hover:border-indigo-300 hover:shadow-sm'}`}>
                    <button
                      onClick={() => setCommitmentType(commitmentType === 'project_completion' ? '' : 'project_completion')}
                      className="w-full px-3 py-2.5 text-left flex items-center gap-2.5 active:bg-gray-50 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center flex-shrink-0">
                        <Briefcase className="w-4 h-4 text-indigo-600" />
                      </div>
                      <div className="flex-grow min-w-0">
                        <h3 className="text-sm font-medium text-gray-900">Pay After Project Completion</h3>
                        <p className="text-xs text-gray-500">I'll pay once the work is done</p>
                      </div>
                      <ChevronRight className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${commitmentType === 'project_completion' ? 'rotate-90' : ''}`} />
                    </button>

                    {commitmentType === 'project_completion' && (
                      <div className="px-3 pb-3 pt-1 space-y-3 border-t border-gray-100">
                        <div className="bg-indigo-50 rounded-lg p-2.5 text-xs text-indigo-700 space-y-1">
                          <p className="font-semibold">How it works:</p>
                          <p>1. You commit to pay once the project is delivered</p>
                          <p>2. The business marks the project as completed</p>
                          <p>3. You'll receive a follow-up within {negotiationOptions.followup_days} day{negotiationOptions.followup_days !== 1 ? 's' : ''} to confirm payment</p>
                        </div>
                        <button
                          onClick={() => handleSubmitCommitment('project_completion')}
                          disabled={isSubmitting}
                          className="w-full px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-50"
                        >
                          {isSubmitting ? 'Submitting...' : 'Commit to Pay on Completion'}
                        </button>
                      </div>
                    )}
                  </NOCard>
                )}
              </div>
              </div>

              {/* Trust Message */}
              <p className="text-center text-xs text-gray-400 pt-1">Maintaining a great payment relationship</p>
            </div>

          </div>
        </NOCard>

        {/* Footer - Powered by NextOffice */}
        <div className="mt-4 mb-3 text-center">
          <p className="text-[11px] text-gray-400 mb-1.5">Love this experience?</p>
          <a
            href="https://nextoffice.app"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-4 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-md font-medium hover:from-blue-700 hover:to-indigo-700 transition-all text-xs"
          >
            Get NextOffice →
          </a>
          <p className="text-[10px] text-gray-300 mt-2">
            Powered by NextOffice
          </p>
        </div>
      </div>

      {/* Error Modal */}
      {errorModal.show && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <NOCard className="w-full max-w-md shadow-2xl">
            <div className="p-6">
              <h3 className="font-serif text-xl font-bold mb-4 text-red-600">Oops!</h3>
              <p className="text-sm text-muted-foreground mb-6">
                {errorModal.message}
              </p>
              <button
                onClick={() => setErrorModal({ show: false, message: '' })}
                className="w-full px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors font-semibold"
              >
                OK
              </button>
            </div>
          </NOCard>
        </div>
      )}

    </div>
  );
};

export default ClientCommitmentPage;
