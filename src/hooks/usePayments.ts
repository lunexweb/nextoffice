import { useState, useEffect, useCallback } from 'react';
import type { Payment, PaymentType } from '@/types';
import { paymentService } from '@/services/api/paymentService';

export const usePayments = (invoiceIds: string[]) => {
  const [payments, setPayments] = useState<Record<string, Payment[]>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (invoiceIds.length === 0) return;
    const load = async () => {
      try {
        setLoading(true);
        const map = await paymentService.getByInvoiceIds(invoiceIds);
        setPayments(map);
      } catch (err) {
        console.error('Failed to load payments:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [invoiceIds.join(',')]);

  const recordPayment = useCallback(async (params: {
    invoiceId: string;
    type: PaymentType;
    expectedAmount: number;
    actualAmount: number;
    paymentDate: string;
    notes?: string;
  }): Promise<Payment | null> => {
    try {
      const payment = await paymentService.create(params);
      setPayments(prev => ({
        ...prev,
        [params.invoiceId]: [...(prev[params.invoiceId] || []), payment],
      }));
      return payment;
    } catch (err) {
      console.error('Failed to record payment:', err);
      return null;
    }
  }, []);

  const getInvoicePayments = useCallback((invoiceId: string): Payment[] => {
    return payments[invoiceId] || [];
  }, [payments]);

  return { payments, loading, recordPayment, getInvoicePayments };
};
