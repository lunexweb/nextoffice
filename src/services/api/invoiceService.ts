import { supabase } from '@/lib/supabase';
import type { Invoice, InvoiceFormData } from '@/types';

const INV_SELECT = `*, clients(id, name)`;

const mapInvoice = (row: any): Invoice => ({
  id: row.id,
  number: row.number,
  clientId: row.client_id,
  clientName: row.clients?.name || '',
  amount: parseFloat(row.amount) || 0,
  status: row.status,
  dueDate: row.due_date,
  createdAt: row.created_at,
  paidDate: row.paid_date || undefined,
  lineItems: row.line_items || [],
  bankingDetails: row.banking_details || { bank: '', account: '', branch: '', type: '' },
  isRecurring: row.is_recurring || false,
  recurringDay: row.recurring_day || undefined,
  viewCount: row.view_count || 0,
  lastViewedAt: row.last_viewed_at || undefined,
  vatEnabled: row.vat_enabled || false,
  vatPercentage: parseFloat(row.vat_percentage) || 0,
  vatAmount: parseFloat(row.vat_amount) || 0,
});

export const invoiceService = {
  async getAll(): Promise<Invoice[]> {
    const { data, error } = await supabase
      .from('invoices')
      .select(INV_SELECT)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(mapInvoice);
  },

  async getByClientId(clientId: string): Promise<Invoice[]> {
    const { data, error } = await supabase
      .from('invoices')
      .select(INV_SELECT)
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(mapInvoice);
  },

  async getByNumber(invoiceNumber: string): Promise<Invoice | null> {
    const { data, error } = await supabase
      .from('invoices')
      .select(INV_SELECT)
      .eq('number', invoiceNumber)
      .single();
    if (error) return null;
    return data ? mapInvoice(data) : null;
  },

  async getNextNumber(prefix: string): Promise<string> {
    const { data } = await supabase
      .from('invoices')
      .select('number')
      .ilike('number', `${prefix}-%`)
      .order('created_at', { ascending: false })
      .limit(1);
    if (!data || data.length === 0) return `${prefix}-001`;
    const last = data[0].number;
    const lastNum = parseInt(last.split('-').pop() || '0', 10);
    return `${prefix}-${String(lastNum + 1).padStart(3, '0')}`;
  },

  async create(
    formData: InvoiceFormData,
    invoiceNumber: string,
    bankingDetails: any
  ): Promise<Invoice> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const subtotal = formData.lineItems.reduce(
      (sum, item) => sum + item.quantity * item.rate, 0
    );
    const vatEnabled = formData.vatEnabled || false;
    const vatPct = formData.vatPercentage || 0;
    const vatAmount = vatEnabled ? Math.round(subtotal * (vatPct / 100)) : 0;
    const total = subtotal + vatAmount;

    const { data: inserted, error } = await supabase
      .from('invoices')
      .insert([{
        user_id: user.id,
        client_id: formData.clientId,
        number: invoiceNumber,
        amount: total,
        status: 'sent',
        due_date: formData.dueDate,
        notes: formData.notes || null,
        is_recurring: formData.isRecurring || false,
        recurring_day: formData.recurringDay || null,
        line_items: formData.lineItems,
        banking_details: bankingDetails,
        negotiation_options: formData.negotiationOptions || null,
        vat_enabled: vatEnabled,
        vat_percentage: vatPct,
        vat_amount: vatAmount,
      }])
      .select('*')
      .single();
    if (error) throw error;

    // Re-fetch with client join (PostgREST doesn't support joins in INSERT select)
    const { data, error: fetchError } = await supabase
      .from('invoices')
      .select(INV_SELECT)
      .eq('id', inserted.id)
      .single();
    if (fetchError) throw fetchError;
    return mapInvoice(data);
  },

  async updateStatus(id: string, status: string, paidDate?: string): Promise<Invoice> {
    const updateData: Record<string, any> = { status };
    if (paidDate) updateData.paid_date = paidDate;
    const { data, error } = await supabase
      .from('invoices')
      .update(updateData)
      .eq('id', id)
      .select(INV_SELECT)
      .single();
    if (error) throw error;
    return mapInvoice(data);
  },

  async update(id: string, formData: InvoiceFormData): Promise<Invoice> {
    const subtotal = formData.lineItems.reduce(
      (sum, item) => sum + item.quantity * item.rate, 0
    );
    const vatEnabled = formData.vatEnabled || false;
    const vatPct = formData.vatPercentage || 0;
    const vatAmount = vatEnabled ? Math.round(subtotal * (vatPct / 100)) : 0;
    const total = subtotal + vatAmount;
    const { data, error } = await supabase
      .from('invoices')
      .update({
        client_id: formData.clientId,
        amount: total,
        due_date: formData.dueDate,
        notes: formData.notes || null,
        is_recurring: formData.isRecurring || false,
        recurring_day: formData.recurringDay || null,
        line_items: formData.lineItems,
        negotiation_options: formData.negotiationOptions || null,
        vat_enabled: vatEnabled,
        vat_percentage: vatPct,
        vat_amount: vatAmount,
      })
      .eq('id', id)
      .select(INV_SELECT)
      .single();
    if (error) throw error;
    return mapInvoice(data);
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('invoices').delete().eq('id', id);
    if (error) throw error;
  },
};
