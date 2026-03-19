import { supabase } from '@/lib/supabase';
import type { Commitment } from '@/types';

const mapCommitment = (row: any): Commitment => ({
  id: row.id,
  invoiceId: row.invoice_id,
  invoiceNumber: row.invoice_number,
  clientId: row.client_id,
  clientName: row.client_name,
  type: row.type,
  status: row.status,
  amount: parseFloat(row.amount) || 0,
  details: row.details || {},
  message: row.message || undefined,
  requestedAt: row.requested_at,
  respondedAt: row.responded_at || undefined,
});

export const commitmentServiceApi = {
  async getAll(): Promise<Commitment[]> {
    const { data, error } = await supabase
      .from('commitments')
      .select('*')
      .order('requested_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(mapCommitment);
  },

  async updateStatus(id: string, status: Commitment['status']): Promise<Commitment> {
    const { data, error } = await supabase
      .from('commitments')
      .update({ status, responded_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return mapCommitment(data);
  },

  async markInstallmentPaid(
    commitmentId: string,
    installmentIndex: number,
    paidDate: string,
  ): Promise<Commitment> {
    // Fetch current commitment
    const { data: row, error: fetchErr } = await supabase
      .from('commitments')
      .select('*')
      .eq('id', commitmentId)
      .single();
    if (fetchErr) throw fetchErr;

    const details = row.details || {};
    const schedule = [...(details.paymentSchedule || [])];

    if (installmentIndex < 0 || installmentIndex >= schedule.length) {
      throw new Error('Invalid installment index');
    }

    schedule[installmentIndex] = {
      ...schedule[installmentIndex],
      status: 'paid',
      paid_date: paidDate,
    };

    const updatedDetails = { ...details, paymentSchedule: schedule };

    const { data, error } = await supabase
      .from('commitments')
      .update({ details: updatedDetails })
      .eq('id', commitmentId)
      .select()
      .single();
    if (error) throw error;
    return mapCommitment(data);
  },

  async publicCreate(commitment: {
    user_id: string;
    invoice_id: string;
    invoice_number: string;
    client_id: string;
    client_name: string;
    type: string;
    amount: number;
    details: Record<string, any>;
    message?: string;
  }): Promise<boolean> {
    const { error } = await supabase
      .from('commitments')
      .insert([{
        ...commitment,
        status: 'pending',
        requested_at: new Date().toISOString(),
      }]);
    if (error) throw error;
    return true;
  },
};
