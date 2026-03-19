import React, { useState } from 'react';
import { Plus, Trash2, Clock, CheckCircle, Download, Eye, Search, Copy, Check, MessageCircle, Mail, Share2, Repeat, Briefcase, Pencil, MoreHorizontal } from 'lucide-react';
import { EngagementIndicator } from '@/components/nextoffice/shared';
import { NOCard } from '@/components/nextoffice/shared';
import { useInvoices, useClients, usePDF, useCommitments, useBusinessProfile } from '@/hooks';
import { InvoiceFormData, NegotiationOptions } from '@/types';
import { formatCurrency, formatDate } from '@/utils/styles';
import { SectionLoading } from '@/components/ui/LoadingStates';
import { communicationService } from '@/services/api/communicationService';
import { supabase } from '@/lib/supabase';
import { InvoiceNegotiationOptions } from '@/components/nextoffice/InvoiceNegotiationOptions';

const InvoicesPage: React.FC = () => {
  const [view, setView] = useState<'list' | 'create'>('list');
  const [filterTab, setFilterTab] = useState<'All' | 'Outstanding' | 'Overdue' | 'Paid' | 'Recurring'>('All');
  const [sent, setSent] = useState(false);
  const [createdInvoiceNumber, setCreatedInvoiceNumber] = useState('');
  const [markingAsPaidId, setMarkingAsPaidId] = useState<string | null>(null);
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [deletingInvoiceId, setDeletingInvoiceId] = useState<string | null>(null);
  const [editingPaymentDateId, setEditingPaymentDateId] = useState<string | null>(null);
  const [errorModal, setErrorModal] = useState<{ show: boolean; message: string }>({ show: false, message: '' });
  const [copiedLink, setCopiedLink] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingShare, setPendingShare] = useState<'whatsapp' | 'email' | null>(null);
  const [createdInvoiceId, setCreatedInvoiceId] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [shareMenuInvoiceId, setShareMenuInvoiceId] = useState<string | null>(null);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [moreMenuInvoiceId, setMoreMenuInvoiceId] = useState<string | null>(null);
  const { commitments, markInstallmentPaid } = useCommitments();
  const [installmentPayDates, setInstallmentPayDates] = useState<Record<number, string>>({});
  
  const [formData, setFormData] = useState<InvoiceFormData>({
    clientId: '',
    lineItems: [{ description: '', quantity: 1, rate: 0 }],
    dueDate: '',
    notes: '',
    isRecurring: false,
    recurringDay: 1,
  });

  const [negotiationOptions, setNegotiationOptions] = useState<NegotiationOptions>({
    allow_deposit: false,
    deposit_min_percentage: 50,
    deposit_max_percentage: 70,
    balance_after_completion: false,
    allow_payment_plans: false,
    max_payment_plan_installments: 3,
    allow_extensions: false,
    max_extension_days: 14,
    allow_project_completion: false,
    followup_days: 3,
    final_deadline: '',
  });

  const [vatEnabled, setVatEnabled] = useState(false);
  const [vatPercentage, setVatPercentage] = useState(15);

  const { invoices, loading, error, createInvoice, updateInvoice, deleteInvoice, updateInvoiceStatus } = useInvoices();
  const { clients, loading: clientsLoading } = useClients();
  const { generating, downloadInvoicePDF, previewInvoicePDF } = usePDF();
  const { businessProfile } = useBusinessProfile();
  const [searchTerm, setSearchTerm] = useState('');

  const handleEditRecurring = (inv: typeof invoices[0]) => {
    setFormData({
      clientId: inv.clientId,
      lineItems: inv.lineItems.length > 0 ? [...inv.lineItems] : [{ description: '', quantity: 1, rate: 0 }],
      dueDate: '',
      notes: '',
      isRecurring: true,
      recurringDay: inv.recurringDay || 1,
    });
    setNegotiationOptions({
      allow_deposit: false,
      deposit_min_percentage: 50,
      deposit_max_percentage: 70,
      balance_after_completion: false,
      allow_payment_plans: false,
      max_payment_plan_installments: 3,
      allow_extensions: false,
      max_extension_days: 14,
      allow_project_completion: false,
      followup_days: 3,
      final_deadline: '',
    });
    setSent(false);
    setView('create');
  };


  const handleEditInvoice = (inv: typeof invoices[0]) => {
    setEditingInvoiceId(inv.id);
    setFormData({
      clientId: inv.clientId,
      lineItems: inv.lineItems.length > 0 ? [...inv.lineItems] : [{ description: '', quantity: 1, rate: 0 }],
      dueDate: inv.dueDate,
      notes: '',
      isRecurring: inv.isRecurring || false,
      recurringDay: inv.recurringDay || 1,
    });
    setSent(false);
    setView('create');
  };

  const handleSaveEdit = async () => {
    if (!editingInvoiceId || !formData.clientId) return;
    if (!formData.lineItems.some(i => i.description && i.rate > 0)) {
      setErrorModal({ show: true, message: 'Please add at least one line item with a description and amount' });
      return;
    }
    setIsSaving(true);
    try {
      const updated = await updateInvoice(editingInvoiceId, { ...formData, negotiationOptions });
      if (updated) {
        setEditingInvoiceId(null);
        setView('list');
        setFormData({ clientId: '', lineItems: [{ description: '', quantity: 1, rate: 0 }], dueDate: '', notes: '', isRecurring: false, recurringDay: 1 });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const filteredInvoices = invoices.filter(inv => {
    // Filter by tab
    let matchesTab = true;
    if (filterTab === 'Outstanding') matchesTab = inv.status === 'sent' || inv.status === 'overdue' || inv.status === 'project_completed';
    else if (filterTab === 'Overdue') matchesTab = inv.status === 'overdue';
    else if (filterTab === 'Paid') matchesTab = inv.status === 'paid';
    else if (filterTab === 'Recurring') matchesTab = inv.isRecurring === true;
    
    // Filter by search term
    const matchesSearch = searchTerm === '' || 
      inv.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.amount.toString().includes(searchTerm);
    
    return matchesTab && matchesSearch;
  });

  const subtotal = formData.lineItems.reduce((s, i) => s + i.quantity * i.rate, 0);
  const vat = vatEnabled ? Math.round(subtotal * (vatPercentage / 100)) : 0;
  const total = subtotal + vat;

  const handleSendInvoice = async (shareTarget: 'save' | 'whatsapp' | 'email') => {
    if (!formData.clientId) {
      setErrorModal({ show: true, message: 'Please select a client' });
      return;
    }
    if (!formData.lineItems.some(i => i.description && i.rate > 0)) {
      setErrorModal({ show: true, message: 'Please add at least one line item with a description and amount' });
      return;
    }

    setIsSaving(true);
    try {
      const newInvoice = await createInvoice({ ...formData, negotiationOptions });
      if (newInvoice) {
        setCreatedInvoiceNumber(newInvoice.number);
        setCreatedInvoiceId(newInvoice.id);
        setPendingShare(shareTarget === 'save' ? null : shareTarget);
        setSent(true);
        setEmailSent(false);

        if (shareTarget !== 'save') {
          communicationService.create({
            invoice_id: newInvoice.id,
            client_id: formData.clientId,
            type: 'initial_invoice',
            status: 'sent',
            subject: `Invoice ${newInvoice.number}`,
            body: `Sent via ${shareTarget === 'email' ? 'Email' : 'WhatsApp'}`,
          }).catch(console.error);
        }
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteInvoice = async (id: string) => {
    setDeletingInvoiceId(id);
  };

  const confirmDelete = async () => {
    if (deletingInvoiceId) {
      await deleteInvoice(deletingInvoiceId);
      setDeletingInvoiceId(null);
    }
  };

  const handleMarkAsPaid = async (id: string) => {
    setMarkingAsPaidId(id);
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setInstallmentPayDates({});
  };

  // Find payment_plan commitment for the invoice being marked
  const paymentPlanCommitment = markingAsPaidId
    ? commitments.find(c => c.invoiceId === markingAsPaidId && c.type === 'payment_plan' && c.details.paymentSchedule?.length)
    : null;
  const installmentSchedule = paymentPlanCommitment?.details.paymentSchedule || [];

  const confirmInstallmentPaid = async (installmentIndex: number) => {
    if (!paymentPlanCommitment || !markingAsPaidId) return;
    const date = installmentPayDates[installmentIndex] || new Date().toISOString().split('T')[0];
    await markInstallmentPaid(paymentPlanCommitment.id, installmentIndex, date);

    // After marking, check if ALL installments are now paid
    const schedule = paymentPlanCommitment.details.paymentSchedule || [];
    const allPaidAfterThis = schedule.every((p: any, i: number) =>
      i === installmentIndex ? true : p.status === 'paid'
    );

    if (allPaidAfterThis) {
      // All installments paid — mark the full invoice as paid
      const invoice = invoices.find(i => i.id === markingAsPaidId);
      await updateInvoiceStatus(markingAsPaidId, 'paid', date);
      if (invoice) {
        const clientEmail = clients.find(c => c.id === invoice.clientId)?.email;
        if (clientEmail) {
          supabase.functions.invoke('send-payment-received', {
            body: {
              invoiceId: invoice.id,
              clientId: invoice.clientId,
              recipientEmail: clientEmail,
              recipientName: invoice.clientName,
              invoiceNumber: invoice.number,
              amount: invoice.amount,
              paymentDate: date,
              businessName: businessProfile?.businessName,
            },
          }).catch(console.error);
        }
      }
      setMarkingAsPaidId(null);
    }
  };

  const confirmMarkAsPaid = async () => {
    if (markingAsPaidId) {
      const invoice = invoices.find(i => i.id === markingAsPaidId);
      await updateInvoiceStatus(markingAsPaidId, 'paid', paymentDate);
      if (invoice) {
        communicationService.create({
          invoice_id: invoice.id,
          client_id: invoice.clientId,
          type: 'payment_received',
          status: 'sent',
          subject: `Payment received for ${invoice.number}`,
          body: `Invoice marked as paid on ${paymentDate}`,
        }).catch(console.error);

        const clientEmail = clients.find(c => c.id === invoice.clientId)?.email;
        if (clientEmail) {
          supabase.functions.invoke('send-payment-received', {
            body: {
              invoiceId: invoice.id,
              clientId: invoice.clientId,
              recipientEmail: clientEmail,
              recipientName: invoice.clientName,
              invoiceNumber: invoice.number,
              amount: invoice.amount,
              paymentDate,
              businessName: businessProfile?.businessName,
            },
          }).catch(console.error);
        }
      }
      setMarkingAsPaidId(null);
    }
  };

  const handleEditPaymentDate = (id: string, currentDate: string) => {
    setEditingPaymentDateId(id);
    setPaymentDate(currentDate);
  };

  const confirmEditPaymentDate = async () => {
    if (editingPaymentDateId) {
      await updateInvoiceStatus(editingPaymentDateId, 'paid', paymentDate);
      setEditingPaymentDateId(null);
    }
  };

  const handleMarkProjectCompleted = async (id: string) => {
    await updateInvoiceStatus(id, 'project_completed');
    const invoice = invoices.find(i => i.id === id);
    if (invoice) {
      const clientEmail = clients.find(c => c.id === invoice.clientId)?.email;
      if (clientEmail) {
        supabase.functions.invoke('send-project-completed', {
          body: {
            invoiceId: invoice.id,
            clientId: invoice.clientId,
            recipientEmail: clientEmail,
            recipientName: invoice.clientName,
            invoiceNumber: invoice.number,
            amount: invoice.amount,
            dueDate: invoice.dueDate,
            businessName: businessProfile?.businessName,
          },
        }).catch(console.error);
      }
      communicationService.create({
        invoice_id: invoice.id,
        client_id: invoice.clientId,
        type: 'project_completed',
        status: 'sent',
        subject: `Project completed for ${invoice.number}`,
        body: `Project marked as completed — payment now due`,
      }).catch(console.error);
    }
  };

  const updateLineItem = (index: number, field: 'description' | 'quantity' | 'rate', value: string | number) => {
    const items = [...formData.lineItems];
    items[index] = { ...items[index], [field]: value };
    setFormData({ ...formData, lineItems: items });
  };

  const addLineItem = () => {
    setFormData({
      ...formData,
      lineItems: [...formData.lineItems, { description: '', quantity: 1, rate: 0 }]
    });
  };

  if (loading && invoices.length === 0) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-serif text-lg sm:text-2xl">Invoices</h2>
          <div className="h-9 w-32 bg-muted animate-pulse rounded-md" />
        </div>
        <SectionLoading message="Loading invoices..." height="h-64" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-red-500 text-center">
          <p className="font-medium">Error loading invoices</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (view === 'create') {
    if (sent) {
      const clientName = clients.find(c => c.id === formData.clientId)?.name || 'the client';
      const invoiceLink = `${window.location.origin}/invoice/${createdInvoiceNumber}/commitment`;
      const whatsappText = encodeURIComponent(`Hi ${clientName}, please find your invoice ${createdInvoiceNumber} here: ${invoiceLink}`);

    return (
      <div className="p-8 flex flex-col items-center py-16 max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="font-serif text-2xl font-bold mb-1">Invoice Created!</h2>
          <p className="text-muted-foreground mb-6 text-center">
            {createdInvoiceNumber} is ready. Share the link below with {clientName}.
          </p>

          {/* Shareable link */}
          <div className="w-full bg-muted rounded-lg px-4 py-3 flex items-center gap-3 mb-4 border border-border">
            <span className="flex-1 text-sm font-mono text-foreground truncate">{invoiceLink}</span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(invoiceLink);
                setCopiedLink(true);
                setTimeout(() => setCopiedLink(false), 2000);
              }}
              className="flex-shrink-0 p-1.5 rounded-md hover:bg-accent transition-colors"
              title="Copy link"
            >
              {copiedLink ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
            </button>
          </div>

          {/* Share buttons */}
          {pendingShare && (
            <p className="text-sm text-primary font-medium mb-2 text-center animate-pulse">
              ↓ Tap the highlighted button to send
            </p>
          )}
          <div className="w-full grid grid-cols-2 gap-3 mb-6">
            <a
              href={`https://wa.me/?text=${whatsappText}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center justify-center gap-2 px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold text-sm transition-colors ${
                pendingShare === 'whatsapp' ? 'ring-4 ring-green-300 scale-105 shadow-lg' : ''
              }`}
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp
            </a>
            <button
              disabled={sendingEmail || emailSent}
              onClick={async () => {
                setSendingEmail(true);
                try {
                  const client = clients.find(c => c.id === formData.clientId);
                  await supabase.functions.invoke('send-invoice', {
                    body: {
                      invoiceId: createdInvoiceId,
                      recipientEmail: client?.email,
                      recipientName: client?.name || clientName,
                      invoiceNumber: createdInvoiceNumber,
                      amount: total,
                      dueDate: formData.dueDate,
                      businessName: businessProfile?.businessName,
                    },
                  });
                  setEmailSent(true);
                  communicationService.create({
                    invoice_id: createdInvoiceId,
                    client_id: formData.clientId,
                    type: 'initial_invoice',
                    status: 'sent',
                    subject: `Invoice ${createdInvoiceNumber}`,
                    body: 'Sent via Email',
                  }).catch(console.error);
                } catch (err) {
                  console.error('Failed to send email:', err);
                  setErrorModal({ show: true, message: 'Failed to send email. Please try again.' });
                } finally {
                  setSendingEmail(false);
                }
              }}
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold text-sm transition-colors ${
                emailSent
                  ? 'bg-green-500 text-white cursor-default'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              } ${
                pendingShare === 'email' && !emailSent ? 'ring-4 ring-blue-300 scale-105 shadow-lg' : ''
              }`}
            >
              {sendingEmail ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Sending...</>
              ) : emailSent ? (
                <><CheckCircle className="w-4 h-4" /> Sent!</>
              ) : (
                <><Mail className="w-4 h-4" /> Email</>
              )}
            </button>
          </div>

          <button
            onClick={() => {
              setSent(false);
              setView('list');
              setFormData({
                clientId: '',
                lineItems: [{ description: '', quantity: 1, rate: 0 }],
                dueDate: '',
                notes: '',
                isRecurring: false,
                recurringDay: 1,
              });
            }}
            className="text-sm text-muted-foreground hover:underline transition-colors"
          >
            ← Back to Invoices
          </button>
        </div>
      );
    }

    const selectedClient = clients.find(c => c.id === formData.clientId);
    const nextInvoiceNumber = `INV-${String(invoices.length + 1).padStart(3, '0')}`;

    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => { setView('list'); setEditingInvoiceId(null); setFormData({ clientId: '', lineItems: [{ description: '', quantity: 1, rate: 0 }], dueDate: '', notes: '', isRecurring: false, recurringDay: 1 }); }} className="text-primary hover:underline text-sm">← Back</button>
            <h2 className="font-serif text-lg sm:text-2xl">{editingInvoiceId ? 'Edit Invoice' : 'Create Invoice'}</h2>
          </div>
          {editingInvoiceId ? (
            <button
              onClick={handleSaveEdit}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          ) : (
            <button
              onClick={() => handleSendInvoice('save')}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save & Send'}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">
          <div className="xl:col-span-3 space-y-6">
          <NOCard className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase">Invoice Number</label>
                <input 
                  value={editingInvoiceId ? invoices.find(i => i.id === editingInvoiceId)?.number || '' : `INV-${String(invoices.length + 1).padStart(3, '0')}`} 
                  disabled 
                  className="w-full p-3 rounded-md border border-border bg-muted/50 font-mono mt-1" 
                />
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase">Client</label>
                {clientsLoading ? (
                  <div className="w-full p-3 rounded-md border border-border bg-muted/50 mt-1">
                    <div className="animate-pulse h-4 w-32 bg-muted rounded"></div>
                  </div>
                ) : (
                  <select 
                    value={formData.clientId} 
                    onChange={e => setFormData({ ...formData, clientId: e.target.value })} 
                    className="w-full p-3 rounded-md border border-border bg-no-surface-raised mt-1 outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="" disabled>Choose a Client</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                )}
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase">Due Date</label>
                <input 
                  type="date" 
                  value={formData.dueDate} 
                  onChange={e => setFormData({ ...formData, dueDate: e.target.value })} 
                  className="w-full p-3 rounded-md border border-border bg-no-surface-raised mt-1 outline-none focus:ring-2 focus:ring-primary" 
                />
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase">Recurring</label>
                <div className="flex items-center gap-2 mt-3">
                  <input 
                    type="checkbox" 
                    checked={formData.isRecurring} 
                    onChange={e => setFormData({ ...formData, isRecurring: e.target.checked })}
                    className="rounded border-border"
                  />
                  <span className="text-sm">Monthly recurring invoice</span>
                </div>
              </div>
            </div>
          </NOCard>

          <NOCard className="p-4 sm:p-6">
            <h4 className="font-serif font-bold mb-4 text-sm sm:text-base">Line Items</h4>
            <div className="space-y-3">
              {formData.lineItems.map((item, i) => (
                <div key={i} className="space-y-2 sm:space-y-0 sm:grid sm:grid-cols-12 sm:gap-2 sm:items-center border-b border-border pb-3 sm:border-0 sm:pb-0">
                  <input 
                    value={item.description} 
                    onChange={e => updateLineItem(i, 'description', e.target.value)} 
                    className="w-full sm:col-span-6 p-2 rounded border border-border bg-no-surface-raised outline-none focus:ring-2 focus:ring-primary text-sm" 
                    placeholder="Description"
                  />
                  <div className="grid grid-cols-3 gap-2 sm:contents">
                    <input 
                      type="number" 
                      value={item.quantity} 
                      onChange={e => updateLineItem(i, 'quantity', Number(e.target.value))} 
                      onFocus={e => e.target.select()}
                      onWheel={e => e.currentTarget.blur()}
                      className="p-2 rounded border border-border bg-no-surface-raised outline-none text-sm text-center sm:col-span-2" 
                      placeholder="Qty"
                    />
                    <input 
                      type="number" 
                      step="any"
                      value={item.rate} 
                      onChange={e => updateLineItem(i, 'rate', parseFloat(e.target.value) || 0)} 
                      onFocus={e => e.target.select()}
                      onWheel={e => e.currentTarget.blur()}
                      className="p-2 rounded border border-border bg-no-surface-raised outline-none text-sm font-mono sm:col-span-2" 
                      placeholder="Rate"
                    />
                    <span className="flex items-center justify-end font-mono text-sm sm:col-span-2 sm:text-right">
                      {formatCurrency(item.quantity * item.rate)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <button 
              onClick={addLineItem} 
              className="mt-3 text-primary hover:underline text-sm font-medium"
            >
              + Add Line Item
            </button>
            <div className="mt-4 pt-4 border-t border-border space-y-3 text-right text-sm">
              <p>Subtotal: <span className="font-mono">{formatCurrency(subtotal)}</span></p>
              
              {/* VAT Controls */}
              <div className="flex items-center justify-end gap-4 text-left">
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    checked={vatEnabled} 
                    onChange={e => setVatEnabled(e.target.checked)}
                    className="rounded border-border"
                  />
                  <label className="text-xs font-medium text-muted-foreground">VAT</label>
                </div>
                {vatEnabled && (
                  <div className="flex items-center gap-2">
                    <input 
                      type="number" 
                      min={0} 
                      max={100} 
                      step={0.1}
                      value={vatPercentage} 
                      onChange={e => setVatPercentage(parseFloat(e.target.value) || 0)}
                      className="w-16 p-1 rounded border border-border bg-no-surface-raised outline-none focus:ring-2 focus:ring-primary text-sm text-center" 
                    />
                    <span className="text-xs text-muted-foreground">%</span>
                  </div>
                )}
              </div>

              {vatEnabled && (
                <p>VAT {vatPercentage}%: <span className="font-mono">{formatCurrency(vat)}</span></p>
              )}
              <p className="text-lg font-bold">TOTAL: <span className="font-mono">{formatCurrency(total)}</span></p>
            </div>
          </NOCard>

          <NOCard className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-5 bg-primary rounded-full" />
              <h4 className="font-serif font-bold">Banking Details</h4>
            </div>
            {businessProfile?.bankingDetails?.bank ? (
              <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Bank</p>
                  <p className="text-sm font-medium capitalize">{businessProfile.bankingDetails.bank}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Account Number</p>
                  <p className="text-sm font-medium font-mono">{businessProfile.bankingDetails.account}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Branch Code</p>
                  <p className="text-sm font-medium font-mono">{businessProfile.bankingDetails.branch}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Payment Reference</p>
                  <p className="text-sm font-medium font-mono text-primary">{nextInvoiceNumber}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
                <span className="text-amber-500 text-lg">⚠</span>
                <p className="text-sm text-amber-800">No banking details set — add them in <span className="font-semibold">Settings → Payment Settings</span></p>
              </div>
            )}
          </NOCard>

          <NOCard className="p-6">
            <h4 className="font-serif font-bold mb-2">Notes</h4>
            <textarea 
              className="w-full p-3 rounded-md border border-border bg-no-surface-raised outline-none focus:ring-2 focus:ring-primary" 
              rows={3}
              placeholder="Add any notes for the client..."
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
            />
          </NOCard>

          <InvoiceNegotiationOptions
            options={negotiationOptions}
            onChange={setNegotiationOptions}
          />

          {(negotiationOptions.allow_deposit || negotiationOptions.allow_payment_plans || negotiationOptions.allow_extensions) && (
            <NOCard className="p-6 bg-blue-50 border-blue-200">
              <h4 className="font-serif font-bold mb-3 text-blue-900">📋 Your Payment Settings</h4>
              <div className="text-sm space-y-2">
                {negotiationOptions.allow_deposit && (
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                    <span className="text-blue-800">
                      Deposits: {negotiationOptions.deposit_min_percentage}–{negotiationOptions.deposit_max_percentage}%
                      {negotiationOptions.balance_after_completion ? ' + Balance after project completion' : ''}
                    </span>
                  </div>
                )}
                {negotiationOptions.allow_payment_plans && (
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                    <span className="text-blue-800">
                      Payment Plans: Up to {negotiationOptions.max_payment_plan_installments} installments
                    </span>
                  </div>
                )}
                {negotiationOptions.allow_extensions && (
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                    <span className="text-blue-800">
                      Extensions: Up to {negotiationOptions.max_extension_days} days
                    </span>
                  </div>
                )}
                {negotiationOptions.allow_project_completion && (
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-indigo-600 rounded-full"></span>
                    <span className="text-blue-800">
                      Pay After Project Completion — follow-up after {negotiationOptions.followup_days} day{negotiationOptions.followup_days !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}
                {negotiationOptions.final_deadline && (
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-red-600 rounded-full"></span>
                    <span className="text-red-800">
                      Final Deadline: {new Date(negotiationOptions.final_deadline).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
              <p className="text-xs text-blue-700 mt-3 italic">
                💡 Client will only see buttons, not these specific terms
              </p>
            </NOCard>
          )}
          </div>

          {/* Preview Panel */}
          <div className="xl:col-span-2">
            <div className="sticky top-8">
              <NOCard className="p-4 bg-background border-2 border-border">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Client View Preview</p>
                  {(negotiationOptions.allow_deposit || negotiationOptions.allow_payment_plans || negotiationOptions.allow_extensions) && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                      ✓ Payment Options Enabled
                    </span>
                  )}
                </div>
                <div className="bg-white text-[#0D1117] rounded-lg p-6 space-y-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  {/* Header */}
                  <div className="text-center border-b border-[#DDE2EA] pb-4 mb-4">
                    <h3 style={{ fontFamily: "'Playfair Display', serif" }} className="text-xl font-bold">{businessProfile?.businessName || 'Your Business'}</h3>
                    <p className="text-sm text-[#52606D] mb-1">{[businessProfile?.address, businessProfile?.city].filter(Boolean).join(', ') || ''}</p>
                    <p className="text-xs text-[#52606D]">{businessProfile?.vatSettings?.registrationNumber ? `VAT: ${businessProfile.vatSettings.registrationNumber} | ` : ''}EMAIL: {businessProfile?.email || ''}</p>
                    <div className="w-8 h-0.5 bg-[#C49A2A] mx-auto mt-3" />
                  </div>

                  {/* Invoice Details */}
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-[10px] font-bold text-[#52606D] uppercase">Invoice</p>
                      <p className="font-mono text-sm">#{nextInvoiceNumber}</p>
                    </div>
                    <p className="font-mono text-xl font-bold text-[#C49A2A]">R{total.toLocaleString()}</p>
                  </div>

                  {/* Bill To */}
                  <div className="bg-[#F8F9FB] rounded p-3 mb-4">
                    <p className="text-xs font-bold text-[#52606D] uppercase mb-2">BILL TO:</p>
                    <div className="text-sm text-[#0D1117]">
                      <p className="font-bold">{selectedClient?.name || 'Client Name'}</p>
                      <p>{selectedClient?.address || 'Address'}, {selectedClient?.city || 'City'}, {selectedClient?.postalCode || 'Code'}</p>
                    </div>
                  </div>

                  {/* Line Items */}
                  <div className="space-y-1 text-xs">
                    {formData.lineItems.filter(i => i.description).map((item, i) => (
                      <div key={i} className="flex justify-between">
                        <span>{item.description}</span>
                        <span>R{(item.quantity * item.rate).toLocaleString()}</span>
                      </div>
                    ))}
                    <div className="border-t border-[#DDE2EA] pt-1 mt-2">
                      <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span className="font-mono">R{subtotal.toLocaleString()}</span>
                      </div>
                      {vatEnabled && (
                        <div className="flex justify-between mt-1">
                          <span>VAT {vatPercentage}%</span>
                          <span className="font-mono">R{vat.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex justify-between mt-1 font-bold">
                        <span>TOTAL</span>
                        <span className="font-mono">R{total.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Banking Details */}
                  {businessProfile?.bankingDetails?.bank && (
                  <div className="bg-[#F8F9FB] border border-[#DDE2EA] rounded-lg p-3 text-xs">
                    <div className="flex items-center gap-1.5 mb-2.5">
                      <div className="w-0.5 h-3.5 bg-[#C49A2A] rounded-full" />
                      <p className="font-bold text-[#0D1117] uppercase tracking-wide text-[10px]">Banking Details</p>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                      <div>
                        <p className="text-[9px] uppercase tracking-wider text-[#8A9BB0] font-semibold">Bank</p>
                        <p className="font-medium text-[#0D1117] capitalize">{businessProfile.bankingDetails.bank}</p>
                      </div>
                      <div>
                        <p className="text-[9px] uppercase tracking-wider text-[#8A9BB0] font-semibold">Account No.</p>
                        <p className="font-medium text-[#0D1117] font-mono">{businessProfile.bankingDetails.account}</p>
                      </div>
                      <div>
                        <p className="text-[9px] uppercase tracking-wider text-[#8A9BB0] font-semibold">Branch Code</p>
                        <p className="font-medium text-[#0D1117] font-mono">{businessProfile.bankingDetails.branch}</p>
                      </div>
                      <div>
                        <p className="text-[9px] uppercase tracking-wider text-[#8A9BB0] font-semibold">Reference</p>
                        <p className="font-bold text-[#C49A2A] font-mono">{nextInvoiceNumber}</p>
                      </div>
                    </div>
                  </div>
                  )}

                  {/* Action Buttons */}
                  <div className="space-y-2">
                    <button className="w-full py-2 rounded bg-[#C49A2A] text-white text-sm font-medium">
                      Pay Now — R{total.toLocaleString()}
                    </button>
                    {(negotiationOptions.allow_deposit || negotiationOptions.allow_payment_plans || negotiationOptions.allow_extensions) ? (
                      <>
                        <button className="w-full py-2 rounded border border-[#C49A2A] text-[#C49A2A] text-sm font-medium">
                          Choose Payment Arrangement
                        </button>
                        <p className="text-[10px] text-center text-[#52606D] italic">
                          Opens commitment portal with your approved options
                        </p>
                      </>
                    ) : (
                      <button className="w-full py-2 rounded border border-[#C49A2A] text-[#C49A2A] text-sm font-medium">
                        Contact for Payment Options
                      </button>
                    )}
                    <button className="w-full py-2 rounded border border-slate-300 text-slate-600 text-sm font-medium">
                      I Have Paid
                    </button>
                  </div>

                  {/* NextOffice promo */}
                  <div className="mt-4 pt-3 border-t border-[#DDE2EA] text-center">
                    <p className="text-[10px] text-[#8A9BB0] mb-1.5">Need to invoice your own clients?</p>
                    <a
                      href="https://nextoffice.app"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block px-4 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-md font-medium hover:from-blue-700 hover:to-indigo-700 transition-all text-[11px]"
                    >
                      Try NextOffice Free →
                    </a>
                    <p className="text-[9px] text-[#B0BAC9] mt-1">Powered by NextOffice</p>
                  </div>
                </div>
              </NOCard>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-lg sm:text-2xl font-bold">Invoices</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {invoices.length} invoice{invoices.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setView('create')}
          className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-all text-sm flex items-center gap-2 shadow-sm"
        >
          <Plus size={16} />
          New Invoice
        </button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {[
          {
            label: 'Outstanding',
            value: formatCurrency(invoices.filter(i => i.status === 'sent' || i.status === 'overdue' || i.status === 'project_completed').reduce((s, i) => s + i.amount, 0)),
            color: 'text-amber-600', bg: 'bg-amber-50 border-amber-100 dark:bg-amber-950/30 dark:border-amber-900',
          },
          {
            label: 'Overdue',
            value: `${invoices.filter(i => i.status === 'overdue').length} invoice${invoices.filter(i => i.status === 'overdue').length !== 1 ? 's' : ''}`,
            color: 'text-red-600', bg: 'bg-red-50 border-red-100 dark:bg-red-950/30 dark:border-red-900',
          },
          {
            label: 'Paid This Month',
            value: formatCurrency(invoices.filter(i => i.status === 'paid' && i.paidDate && new Date(i.paidDate).getMonth() === new Date().getMonth() && new Date(i.paidDate).getFullYear() === new Date().getFullYear()).reduce((s, i) => s + i.amount, 0)),
            color: 'text-green-600', bg: 'bg-green-50 border-green-100 dark:bg-green-950/30 dark:border-green-900',
          },
          {
            label: 'Total Invoices',
            value: `${invoices.length}`,
            color: 'text-primary', bg: 'bg-primary/5 border-primary/10',
          },
        ].map(stat => (
          <div key={stat.label} className={`rounded-xl border p-3 sm:p-4 ${stat.bg}`}>
            <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wide">{stat.label}</p>
            <p className={`text-sm sm:text-lg font-bold mt-0.5 sm:mt-1 ${stat.color} truncate`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={15} />
          <input
            type="text"
            placeholder="Search invoices..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          />
        </div>
        <div className="flex gap-1 bg-muted/60 rounded-lg p-1 border border-border overflow-x-auto flex-nowrap">
          {(['All', 'Outstanding', 'Overdue', 'Paid', 'Recurring'] as const).map(t => {
            const overdueCount = invoices.filter(i => i.status === 'overdue').length;
            return (
              <button
                key={t}
                onClick={() => setFilterTab(t)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  filterTab === t
                    ? 'bg-background text-foreground shadow-sm border border-border'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t}
                {t === 'Overdue' && overdueCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-red-500 text-white font-bold leading-none">
                    {overdueCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile: Invoice Cards */}
      <div className="md:hidden space-y-2">
        {filteredInvoices.length === 0 ? (
          <div className="py-12 text-center">
            <p className="font-semibold text-foreground text-sm">No invoices found</p>
            <p className="text-xs text-muted-foreground mt-1">Try a different filter or search</p>
          </div>
        ) : (
          filteredInvoices.map((inv) => {
            const statusCfg: Record<string, { label: string; dot: string; pill: string }> = {
              paid:              { label: 'Paid',         dot: 'bg-green-500',  pill: 'bg-green-50 text-green-700 border-green-200' },
              sent:              { label: 'Sent',         dot: 'bg-amber-400',  pill: 'bg-amber-50 text-amber-700 border-amber-200' },
              overdue:           { label: 'Overdue',      dot: 'bg-red-500',    pill: 'bg-red-50 text-red-700 border-red-200' },
              project_completed: { label: 'Project Done', dot: 'bg-indigo-500', pill: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
            };
            const sc = statusCfg[inv.status] ?? { label: inv.status, dot: 'bg-gray-400', pill: 'bg-gray-50 text-gray-600 border-gray-200' };
            const daysOverdue = inv.status === 'overdue' ? Math.floor((Date.now() - new Date(inv.dueDate).getTime()) / 86400000) : 0;
            const invoiceCommitment = commitments.filter(c => c.invoiceNumber === inv.number).sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime())[0];
            const commitmentCfg: Record<string, string> = { pending: 'bg-amber-50 text-amber-700 border-amber-200', approved: 'bg-green-50 text-green-700 border-green-200', completed: 'bg-green-50 text-green-700 border-green-200', declined: 'bg-red-50 text-red-600 border-red-200' };
            const getPDFData = () => {
              const client = clients.find(c => c.id === inv.clientId);
              return { invoiceNumber: inv.number, invoiceDate: formatDate(inv.createdAt || new Date().toISOString()), dueDate: formatDate(inv.dueDate), status: inv.status, businessName: businessProfile?.businessName || '', businessEmail: businessProfile?.email || '', businessAddress: [businessProfile?.address, businessProfile?.city].filter(Boolean).join(', '), businessPhone: businessProfile?.phone || '', clientName: inv.clientName, clientEmail: client?.email, clientAddress: client?.address, items: inv.lineItems?.length > 0 ? inv.lineItems.map(item => ({ description: item.description, quantity: item.quantity, rate: item.rate, amount: item.quantity * item.rate })) : [{ description: 'Service', quantity: 1, rate: inv.amount, amount: inv.amount }], subtotal: inv.amount, total: inv.amount, amountPaid: inv.status === 'paid' ? inv.amount : 0, balance: inv.status === 'paid' ? 0 : inv.amount };
            };

            return (
              <NOCard key={inv.id} className="p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold">{inv.number}</span>
                    {inv.isRecurring && <span className="px-1 py-0.5 rounded text-[9px] font-bold bg-violet-100 text-violet-700">REC</span>}
                    <EngagementIndicator
                      engagement={{ viewCount: inv.viewCount || 0, lastViewedAt: inv.lastViewedAt }}
                      size="sm"
                      showCount={true}
                      showLastViewed={false}
                    />
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${sc.pill}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                    {sc.label}
                  </span>
                </div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium truncate mr-2">{inv.clientName}</span>
                  <span className="text-sm font-bold font-mono flex-shrink-0">{formatCurrency(inv.amount)}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                  <span>Due {formatDate(inv.dueDate)}{daysOverdue > 0 ? ` · ${daysOverdue}d overdue` : ''}</span>
                  {invoiceCommitment && (
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold border ${commitmentCfg[invoiceCommitment.status] || 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                      {invoiceCommitment.status.charAt(0).toUpperCase() + invoiceCommitment.status.slice(1)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 pt-2 border-t border-border">
                  <button onClick={() => previewInvoicePDF(getPDFData())} disabled={generating} className="p-1.5 rounded text-muted-foreground hover:text-blue-600 transition-colors" title="Preview"><Eye size={14} /></button>
                  <button onClick={() => downloadInvoicePDF(getPDFData())} disabled={generating} className="p-1.5 rounded text-muted-foreground hover:text-primary transition-colors" title="Download"><Download size={14} /></button>
                  <button onClick={() => { const link = `${window.location.origin}/invoice/${inv.number}/commitment`; navigator.clipboard.writeText(link); }} className="p-1.5 rounded text-muted-foreground hover:text-foreground transition-colors" title="Copy Link"><Copy size={14} /></button>
                  {inv.status !== 'paid' && <button onClick={() => handleMarkAsPaid(inv.id)} className="ml-auto px-2 py-1 rounded text-[10px] font-semibold bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors">Mark Paid</button>}
                  {inv.status !== 'paid' && <button onClick={() => handleEditInvoice(inv)} className="p-1.5 rounded text-muted-foreground hover:text-amber-600 transition-colors" title="Edit"><Pencil size={14} /></button>}
                  <button onClick={() => handleDeleteInvoice(inv.id)} className="p-1.5 rounded text-muted-foreground hover:text-red-500 transition-colors" title="Delete"><Trash2 size={14} /></button>
                </div>
              </NOCard>
            );
          })
        )}
      </div>

      {/* Desktop: Modern Table */}
      <div className="rounded-xl border border-border overflow-x-auto bg-background shadow-sm hidden md:block">
        {/* Header Row */}
        <div className="grid items-center bg-muted/50 border-b border-border px-2 py-2.5" style={{ gridTemplateColumns: '2fr 2fr 1.2fr 1.2fr 1.2fr 1fr 150px', minWidth: '900px' }}>
          {['Invoice', 'Client', 'Amount', 'Due Date', 'Status', 'Commitment', 'Actions'].map(h => (
            <div key={h} className="px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{h}</div>
          ))}
        </div>

        {/* Rows */}
        {filteredInvoices.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-12 h-12 rounded-full bg-muted mx-auto flex items-center justify-center mb-3">
              <Search size={20} className="text-muted-foreground" />
            </div>
            <p className="font-semibold text-foreground">No invoices found</p>
            <p className="text-sm text-muted-foreground mt-1">Try a different filter or search term</p>
          </div>
        ) : (
          filteredInvoices.map((inv) => {
            const invoiceCommitment = commitments
              .filter(c => c.invoiceNumber === inv.number)
              .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime())[0];

            const statusCfg: Record<string, { label: string; dot: string; pill: string; bar: string }> = {
              paid:              { label: 'Paid',         dot: 'bg-green-500',  pill: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-400 dark:border-green-800',  bar: 'bg-green-500' },
              sent:              { label: 'Sent',         dot: 'bg-amber-400',  pill: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800',  bar: 'bg-amber-400' },
              overdue:           { label: 'Overdue',      dot: 'bg-red-500',    pill: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800',              bar: 'bg-red-500' },
              project_completed: { label: 'Project Done', dot: 'bg-indigo-500', pill: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-800', bar: 'bg-indigo-500' },
            };
            const sc = statusCfg[inv.status] ?? { label: inv.status, dot: 'bg-gray-400', pill: 'bg-gray-50 text-gray-600 border-gray-200', bar: 'bg-gray-300' };

            const commitmentCfg: Record<string, string> = {
              pending:   'bg-amber-50 text-amber-700 border-amber-200',
              approved:  'bg-green-50 text-green-700 border-green-200',
              completed: 'bg-green-50 text-green-700 border-green-200',
              declined:  'bg-red-50 text-red-600 border-red-200',
              cancelled: 'bg-gray-50 text-gray-500 border-gray-200',
            };

            const daysOverdue = inv.status === 'overdue'
              ? Math.floor((Date.now() - new Date(inv.dueDate).getTime()) / 86400000)
              : 0;

            const avatarColors = ['bg-violet-100 text-violet-700', 'bg-blue-100 text-blue-700', 'bg-emerald-100 text-emerald-700', 'bg-orange-100 text-orange-700', 'bg-pink-100 text-pink-700'];
            const avatarColor = avatarColors[inv.clientName.charCodeAt(0) % avatarColors.length];
            const initials = inv.clientName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);

            const getPDFData = () => {
              const client = clients.find(c => c.id === inv.clientId);
              return {
                invoiceNumber: inv.number,
                invoiceDate: formatDate(inv.createdAt || new Date().toISOString()),
                dueDate: formatDate(inv.dueDate),
                status: inv.status,
                businessName: businessProfile?.businessName || '',
                businessEmail: businessProfile?.email || '',
                businessAddress: [businessProfile?.address, businessProfile?.city].filter(Boolean).join(', '),
                businessPhone: businessProfile?.phone || '',
                clientName: inv.clientName,
                clientEmail: client?.email,
                clientAddress: client?.address,
                items: inv.lineItems?.length > 0
                  ? inv.lineItems.map(item => ({ description: item.description, quantity: item.quantity, rate: item.rate, amount: item.quantity * item.rate }))
                  : [{ description: 'Service', quantity: 1, rate: inv.amount, amount: inv.amount }],
                subtotal: inv.amount,
                total: inv.amount,
                amountPaid: inv.status === 'paid' ? inv.amount : 0,
                balance: inv.status === 'paid' ? 0 : inv.amount,
              };
            };

            return (
              <div
                key={inv.id}
                className="grid items-center border-b border-border last:border-0 hover:bg-muted/30 transition-colors group relative"
                style={{ gridTemplateColumns: '2fr 2fr 1.2fr 1.2fr 1.2fr 1fr 150px', minWidth: '900px' }}
              >
                {/* Left status bar */}
                <div className={`absolute left-0 top-0 bottom-0 w-0.5 ${sc.bar}`} />

                {/* Invoice Number */}
                <div className="px-5 py-3.5 flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-foreground">{inv.number}</span>
                    {inv.isRecurring && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-violet-100 text-violet-700 flex items-center gap-0.5">
                        <Repeat size={9} /> REC
                      </span>
                    )}
                    <EngagementIndicator
                      engagement={{ viewCount: inv.viewCount || 0, lastViewedAt: inv.lastViewedAt }}
                      size="sm"
                      showCount={true}
                      showLastViewed={false}
                    />
                  </div>
                  {inv.status === 'overdue' && daysOverdue > 0 && (
                    <span className="text-[11px] text-red-600 font-semibold">{daysOverdue}d overdue</span>
                  )}
                  {inv.isRecurring && inv.createdAt && (
                    <span className="text-[11px] text-muted-foreground">Sent {formatDate(inv.createdAt)}</span>
                  )}
                </div>

                {/* Client */}
                <div className="px-3 py-3.5 flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${avatarColor}`}>
                    {initials}
                  </div>
                  <span className="text-sm font-medium text-foreground truncate">{inv.clientName}</span>
                </div>

                {/* Amount */}
                <div className="px-3 py-3.5">
                  <span className="text-sm font-bold font-mono">{formatCurrency(inv.amount)}</span>
                </div>

                {/* Due Date */}
                <div className="px-3 py-3.5">
                  <span className={`text-sm ${inv.status === 'overdue' ? 'text-red-600 font-semibold' : 'text-muted-foreground'}`}>
                    {formatDate(inv.dueDate)}
                  </span>
                </div>

                {/* Status */}
                <div className="px-3 py-3.5 flex flex-col gap-0.5">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border w-fit ${sc.pill}`}>
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${sc.dot}`} />
                    {sc.label}
                  </span>
                  {inv.status === 'paid' && inv.paidDate && (
                    <button
                      onClick={() => handleEditPaymentDate(inv.id, inv.paidDate || new Date().toISOString().split('T')[0])}
                      className="text-[11px] text-muted-foreground hover:text-primary transition-colors text-left"
                      title="Click to edit payment date"
                    >
                      {formatDate(inv.paidDate)}
                    </button>
                  )}
                </div>

                {/* Commitment */}
                <div className="px-3 py-3.5">
                  {invoiceCommitment ? (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${commitmentCfg[invoiceCommitment.status] || 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                      {invoiceCommitment.status.charAt(0).toUpperCase() + invoiceCommitment.status.slice(1)}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </div>

                {/* Actions */}
                <div className="px-3 py-3.5 flex items-center gap-1">
                  <button
                    onClick={() => previewInvoicePDF(getPDFData())}
                    disabled={generating}
                    className="p-1 rounded text-muted-foreground hover:text-blue-600 hover:bg-blue-50 transition-colors"
                    title="Preview PDF"
                  >
                    <Eye size={15} />
                  </button>
                  <button
                    onClick={() => downloadInvoicePDF(getPDFData())}
                    disabled={generating}
                    className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                    title="Download PDF"
                  >
                    <Download size={15} />
                  </button>
                  {/* Share */}
                  <div className="relative">
                    <button
                      onClick={() => { setShareMenuInvoiceId(shareMenuInvoiceId === inv.id ? null : inv.id); setMoreMenuInvoiceId(null); }}
                      className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                      title="Share invoice"
                    >
                      <Share2 size={15} />
                    </button>
                    {shareMenuInvoiceId === inv.id && (
                      <div className="absolute right-0 top-full mt-1 w-44 bg-popover border border-border rounded-xl shadow-xl z-50 overflow-hidden">
                        <button
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium text-green-700 hover:bg-green-50 transition-colors"
                          onClick={() => {
                            const link = `${window.location.origin}/invoice/${inv.number}/commitment`;
                            const text = encodeURIComponent(`Hi ${inv.clientName}, please find your invoice ${inv.number} here: ${link}`);
                            const w = window.open('about:blank', '_blank');
                            if (w) w.location.href = `https://wa.me/?text=${text}`;
                            setShareMenuInvoiceId(null);
                            communicationService.create({ invoice_id: inv.id, client_id: inv.clientId, type: 'reminder', status: 'sent', subject: `Invoice ${inv.number} re-shared`, body: `Re-shared via WhatsApp` }).catch(console.error);
                          }}
                        >
                          <MessageCircle size={13} /> WhatsApp
                        </button>
                        <button
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium text-blue-700 hover:bg-blue-50 transition-colors"
                          onClick={() => {
                            const link = `${window.location.origin}/invoice/${inv.number}/commitment`;
                            const subject = encodeURIComponent(`Invoice ${inv.number}`);
                            const body = encodeURIComponent(`Hi ${inv.clientName},\n\nPlease find your invoice ${inv.number} at the link below:\n\n${link}`);
                            const w = window.open('about:blank', '_blank');
                            if (w) w.location.href = `https://mail.google.com/mail/?view=cm&su=${subject}&body=${body}`;
                            setShareMenuInvoiceId(null);
                            communicationService.create({ invoice_id: inv.id, client_id: inv.clientId, type: 'reminder', status: 'sent', subject: `Invoice ${inv.number} re-shared`, body: `Re-shared via Gmail` }).catch(console.error);
                          }}
                        >
                          <Mail size={13} /> Gmail
                        </button>
                        <button
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors border-t border-border"
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/invoice/${inv.number}/commitment`);
                            setShareMenuInvoiceId(null);
                          }}
                        >
                          <Copy size={13} /> Copy Link
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="w-px h-4 bg-border mx-0.5" />

                  {/* More actions dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => { setMoreMenuInvoiceId(moreMenuInvoiceId === inv.id ? null : inv.id); setShareMenuInvoiceId(null); }}
                      className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                      title="More actions"
                    >
                      <MoreHorizontal size={15} />
                    </button>
                    {moreMenuInvoiceId === inv.id && (
                      <div className="absolute right-0 top-full mt-1 w-48 bg-popover border border-border rounded-xl shadow-xl z-50 overflow-hidden">
                        {inv.status !== 'paid' && (
                          <button
                            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium text-amber-700 hover:bg-amber-50 transition-colors"
                            onClick={() => { handleEditInvoice(inv); setMoreMenuInvoiceId(null); }}
                          >
                            <Pencil size={13} /> Edit Invoice
                          </button>
                        )}
                        {inv.status !== 'paid' && (
                          <button
                            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium text-green-700 hover:bg-green-50 transition-colors"
                            onClick={() => { handleMarkAsPaid(inv.id); setMoreMenuInvoiceId(null); }}
                          >
                            <CheckCircle size={13} /> Mark as Paid
                          </button>
                        )}
                        {inv.status === 'sent' && (
                          <button
                            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium text-indigo-700 hover:bg-indigo-50 transition-colors"
                            onClick={() => { handleMarkProjectCompleted(inv.id); setMoreMenuInvoiceId(null); }}
                          >
                            <Briefcase size={13} /> Project Completed
                          </button>
                        )}
                        {inv.isRecurring && (
                          <button
                            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium text-violet-700 hover:bg-violet-50 transition-colors"
                            onClick={() => { handleEditRecurring(inv); setMoreMenuInvoiceId(null); }}
                          >
                            <Repeat size={13} /> Resend Recurring
                          </button>
                        )}
                        <button
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors border-t border-border"
                          onClick={() => { handleDeleteInvoice(inv.id); setMoreMenuInvoiceId(null); }}
                        >
                          <Trash2 size={13} /> Delete Invoice
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Mark as Paid Modal */}
      {markingAsPaidId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <NOCard className="w-full max-w-md shadow-2xl">
            <div className="p-6">
              {paymentPlanCommitment && installmentSchedule.length > 0 ? (
                <>
                  <h3 className="font-serif text-xl font-bold mb-1">Payment Plan — Confirm Instalments</h3>
                  <p className="text-sm text-muted-foreground mb-5">
                    Mark each instalment as paid individually. The invoice will be marked fully paid once all instalments are confirmed.
                  </p>

                  <div className="space-y-3 mb-6">
                    {installmentSchedule.map((inst: any, idx: number) => {
                      const isPaid = inst.status === 'paid';
                      return (
                        <div key={idx} className={`rounded-lg border-2 p-3 transition-colors ${isPaid ? 'border-green-200 bg-green-50' : 'border-border bg-background'}`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {isPaid
                                ? <CheckCircle className="w-4 h-4 text-green-600" />
                                : <Clock className="w-4 h-4 text-amber-500" />
                              }
                              <span className="text-sm font-bold">Instalment {inst.installment}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-foreground">R{parseFloat(inst.amount).toLocaleString()}</span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isPaid ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                {isPaid ? 'Paid' : 'Pending'}
                              </span>
                            </div>
                          </div>

                          <p className="text-xs text-muted-foreground mb-2">
                            Due: {new Date(inst.dueDate + (inst.dueDate.includes('T') ? '' : 'T00:00:00')).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
                            {isPaid && inst.paid_date && <> · Paid: {new Date(inst.paid_date + (inst.paid_date.includes('T') ? '' : 'T00:00:00')).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}</>}
                          </p>

                          {!isPaid && (
                            <div className="flex items-center gap-2">
                              <input
                                type="date"
                                value={installmentPayDates[idx] || new Date().toISOString().split('T')[0]}
                                onChange={(e) => setInstallmentPayDates(prev => ({ ...prev, [idx]: e.target.value }))}
                                max={new Date().toISOString().split('T')[0]}
                                className="flex-1 px-2 py-1.5 text-xs rounded-md border border-border bg-background outline-none focus:border-primary transition-colors"
                              />
                              <button
                                onClick={() => confirmInstallmentPaid(idx)}
                                className="px-3 py-1.5 text-xs font-bold rounded-md bg-green-600 text-white hover:bg-green-700 transition-colors"
                              >
                                Confirm Paid
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Progress bar */}
                  {(() => {
                    const paidCount = installmentSchedule.filter((p: any) => p.status === 'paid').length;
                    const totalCount = installmentSchedule.length;
                    const pct = Math.round((paidCount / totalCount) * 100);
                    return (
                      <div className="mb-5">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-muted-foreground">{paidCount} of {totalCount} instalments paid</span>
                          <span className="font-bold text-foreground">{pct}%</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })()}

                  <button
                    onClick={() => setMarkingAsPaidId(null)}
                    className="w-full px-4 py-2 rounded-md border border-border text-muted-foreground hover:bg-accent transition-colors"
                  >
                    Close
                  </button>
                </>
              ) : (
                <>
                  <h3 className="font-serif text-xl font-bold mb-4">Mark Invoice as Paid</h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    Record the payment date for this invoice. This will stop all follow-ups.
                  </p>
                  
                  <div className="mb-6">
                    <label className="text-sm font-semibold mb-2 block">Payment Date</label>
                    <input
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 rounded-lg border-2 border-border bg-background outline-none focus:border-primary transition-colors"
                      autoFocus
                    />
                    <p className="text-xs text-muted-foreground mt-1">Cannot select future dates</p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setMarkingAsPaidId(null)}
                      className="flex-1 px-4 py-2 rounded-md border border-border text-muted-foreground hover:bg-accent transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={confirmMarkAsPaid}
                      className="flex-1 px-4 py-2 rounded-md bg-green-600 text-white hover:bg-green-700 transition-colors font-semibold"
                    >
                      Mark as Paid
                    </button>
                  </div>
                </>
              )}
            </div>
          </NOCard>
        </div>
      )}

      {/* Edit Payment Date Modal */}
      {editingPaymentDateId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <NOCard className="w-full max-w-md shadow-2xl">
            <div className="p-6">
              <h3 className="font-serif text-xl font-bold mb-4">Update Payment Date</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Change the payment date for this invoice.
              </p>
              
              <div className="mb-6">
                <label className="text-sm font-semibold mb-2 block">Payment Date</label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 rounded-lg border-2 border-border bg-background outline-none focus:border-primary transition-colors"
                  autoFocus
                />
                <p className="text-xs text-muted-foreground mt-1">Cannot select future dates</p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setEditingPaymentDateId(null)}
                  className="flex-1 px-4 py-2 rounded-md border border-border text-muted-foreground hover:bg-accent transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmEditPaymentDate}
                  className="flex-1 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-colors font-semibold"
                >
                  Update Date
                </button>
              </div>
            </div>
          </NOCard>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingInvoiceId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <NOCard className="w-full max-w-md shadow-2xl">
            <div className="p-6">
              <h3 className="font-serif text-xl font-bold mb-4">Delete Invoice</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Are you sure you want to delete this invoice? This action cannot be undone.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setDeletingInvoiceId(null)}
                  className="flex-1 px-4 py-2 rounded-md border border-border text-muted-foreground hover:bg-accent transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors font-semibold"
                >
                  Delete
                </button>
              </div>
            </div>
          </NOCard>
        </div>
      )}

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

export default InvoicesPage;
