import { supabase } from '@/lib/supabase';
import type { Payment, PaymentType } from '@/types';

const mapPayment = (row: any): Payment => ({
  id: row.id,
  invoiceId: row.invoice_id,
  type: row.type,
  expectedAmount: parseFloat(row.expected_amount) || 0,
  actualAmount: parseFloat(row.actual_amount) || 0,
  notes: row.notes || undefined,
  paymentDate: row.payment_date,
  createdAt: row.created_at,
});

export const paymentService = {
  async getByInvoiceId(invoiceId: string): Promise<Payment[]> {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('invoice_id', invoiceId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data || []).map(mapPayment);
  },

  async getByInvoiceIds(invoiceIds: string[]): Promise<Record<string, Payment[]>> {
    if (invoiceIds.length === 0) return {};
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .in('invoice_id', invoiceIds)
      .order('created_at', { ascending: true });
    if (error) throw error;
    const map: Record<string, Payment[]> = {};
    (data || []).forEach(row => {
      const p = mapPayment(row);
      if (!map[p.invoiceId]) map[p.invoiceId] = [];
      map[p.invoiceId].push(p);
    });
    return map;
  },

  async create(params: {
    invoiceId: string;
    type: PaymentType;
    expectedAmount: number;
    actualAmount: number;
    paymentDate: string;
    notes?: string;
  }): Promise<Payment> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('payments')
      .insert([{
        user_id: user.id,
        invoice_id: params.invoiceId,
        type: params.type,
        expected_amount: params.expectedAmount,
        actual_amount: params.actualAmount,
        payment_date: params.paymentDate,
        notes: params.notes || null,
      }])
      .select('*')
      .single();
    if (error) throw error;

    // Update amount_paid on the invoice
    const { data: payments } = await supabase
      .from('payments')
      .select('actual_amount')
      .eq('invoice_id', params.invoiceId);
    const totalPaid = (payments || []).reduce((s, p) => s + (parseFloat(p.actual_amount) || 0), 0);

    await supabase
      .from('invoices')
      .update({ amount_paid: totalPaid })
      .eq('id', params.invoiceId);

    return mapPayment(data);
  },
};
