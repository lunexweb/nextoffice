import { useState, useEffect } from 'react';
import { Invoice, InvoiceFormData } from '@/types';
import { invoiceService } from '@/services/api/invoiceService';
import { profileService } from '@/services/api/profileService';
import { supabase } from '@/lib/supabase';

export const useInvoices = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadInvoices = async () => {
      try {
        setLoading(true);
        const data = await invoiceService.getAll();
        setInvoices(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load invoices');
      } finally {
        setLoading(false);
      }
    };
    loadInvoices();
  }, []);

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const channel = supabase
        .channel('invoices-view-count')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'invoices',
            filter: `user_id=eq.${user.id}`,
          },
          (payload: any) => {
            setInvoices(prev => prev.map(inv =>
              inv.id === payload.new.id
                ? { ...inv, viewCount: payload.new.view_count || 0, lastViewedAt: payload.new.last_viewed_at || undefined }
                : inv
            ));
          }
        )
        .subscribe();

      cleanup = () => { supabase.removeChannel(channel); };
    };

    setupRealtime();
    return () => { cleanup?.(); };
  }, []);

  const createInvoice = async (data: InvoiceFormData): Promise<Invoice | null> => {
    try {
      setLoading(true);
      setError(null);
      const profile = await profileService.get();
      const prefix = profile?.businessName ? 'INV' : 'INV';
      const invoiceNumber = await invoiceService.getNextNumber(prefix);
      const banking = profile?.bankingDetails || { bank: '', account: '', branch: '', type: '' };
      const newInvoice = await invoiceService.create(data, invoiceNumber, banking);
      setInvoices(prev => [newInvoice, ...prev]);
      return newInvoice;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create invoice');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateInvoice = async (id: string, data: InvoiceFormData): Promise<Invoice | null> => {
    try {
      setLoading(true);
      setError(null);
      const updated = await invoiceService.update(id, data);
      setInvoices(prev => prev.map(inv => inv.id === id ? updated : inv));
      return updated;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update invoice');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const deleteInvoice = async (id: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      await invoiceService.delete(id);
      setInvoices(prev => prev.filter(inv => inv.id !== id));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete invoice');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updateInvoiceStatus = async (id: string, status: Invoice['status'], paidDate?: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      const updated = await invoiceService.updateStatus(id, status, paidDate);
      setInvoices(prev => prev.map(inv => inv.id === id ? updated : inv));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update invoice status');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { invoices, loading, error, createInvoice, updateInvoice, deleteInvoice, updateInvoiceStatus };
};
