import { useState, useEffect } from 'react';
import { Commitment } from '@/types';
import { commitmentServiceApi } from '@/services/api/commitmentService';
import { supabase } from '@/lib/supabase';

export const useCommitments = () => {
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const data = await commitmentServiceApi.getAll();
      setCommitments(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load commitments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();

    const channel = supabase
      .channel('commitments-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'commitments' }, () => {
        load();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const updateStatus = async (id: string, status: Commitment['status']): Promise<boolean> => {
    try {
      const updated = await commitmentServiceApi.updateStatus(id, status);
      setCommitments(prev => prev.map(c => c.id === id ? updated : c));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update commitment');
      return false;
    }
  };

  const markInstallmentPaid = async (commitmentId: string, installmentIndex: number, paidDate: string): Promise<boolean> => {
    try {
      const updated = await commitmentServiceApi.markInstallmentPaid(commitmentId, installmentIndex, paidDate);
      setCommitments(prev => prev.map(c => c.id === commitmentId ? updated : c));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark installment paid');
      return false;
    }
  };

  return { commitments, loading, error, updateStatus, markInstallmentPaid, refetch: load };
};
