import { supabase } from '@/lib/supabase';
import type { Commitment, CommitmentType } from '@/types';
import { invoiceService } from '@/services/api/invoiceService';

interface CreateCommitmentData {
  invoiceNumber: string;
  clientName: string;
  amount: number;
  type: CommitmentType;
  committedDate?: string;
  installments?: number;
  paymentDates?: string[];
  extensionDays?: number;
  extensionReason?: string;
  message?: string;
}

export const commitmentService = {
  createCommitment: async (data: CreateCommitmentData): Promise<Commitment | null> => {
    try {
      const invoice = await invoiceService.getByNumber(data.invoiceNumber);
      if (!invoice) throw new Error('Invoice not found');

      let details: Record<string, any> = {};

      if (data.type === 'payment_plan' && data.installments && data.paymentDates) {
        details = {
          installments: data.installments,
          installmentAmount: Math.round(data.amount / data.installments),
          paymentSchedule: data.paymentDates.map((date, i) => ({
            installment: i + 1,
            amount: Math.round(data.amount / data.installments!),
            dueDate: date,
            status: 'pending',
          })),
        };
      } else if (data.type === 'extension' && data.extensionDays && data.committedDate) {
        details = { extensionDays: data.extensionDays, newDueDate: data.committedDate };
      } else if (data.type === 'deposit' && data.committedDate) {
        details = { depositPercentage: 100, depositAmount: data.amount, committedDate: data.committedDate };
      } else if (data.type === 'already_paid') {
        details = { paymentDate: new Date().toISOString().split('T')[0], paymentProof: 'Pending verification' };
      }

      const { data: row, error } = await supabase
        .from('commitments')
        .insert([{
          user_id: invoice.clientId,
          invoice_id: invoice.id,
          invoice_number: data.invoiceNumber,
          client_id: invoice.clientId,
          client_name: data.clientName,
          type: data.type,
          status: 'pending',
          amount: data.amount,
          details,
          message: data.message || null,
          requested_at: new Date().toISOString(),
        }])
        .select()
        .single();

      if (error) throw error;

      return {
        id: row.id,
        invoiceId: row.invoice_id,
        invoiceNumber: row.invoice_number,
        clientId: row.client_id,
        clientName: row.client_name,
        type: row.type,
        status: row.status,
        amount: parseFloat(row.amount),
        details: row.details,
        message: row.message,
        requestedAt: row.requested_at,
        respondedAt: row.responded_at,
      };
    } catch (err) {
      console.error('Failed to create commitment:', err);
      return null;
    }
  },
};
