import { useState, useEffect } from 'react';
import { DashboardStats, IntelligenceAlert } from '@/types';
import { clientService } from '@/services/api/clientService';
import { invoiceService } from '@/services/api/invoiceService';
import { communicationService } from '@/services/api/communicationService';
import { commitmentServiceApi } from '@/services/api/commitmentService';
import { supabase } from '@/lib/supabase';

interface EnhancedLedgerEntry {
  id: string;
  documentNumber: string;
  amount: number;
  status: string;
  dueDate: string;
  score: number;
  color: string;
  pattern: string;
  action: string;
  client?: { name: string; slug: string };
  engagement: { viewCount: number; lastViewedAt?: string } | null;
}

interface RecentActivity {
  id: string;
  clientName: string;
  clientSlug: string;
  action: string;
  documentNumber: string;
  timestamp: Date;
}

export const useDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats>({ totalClients: 0, activeInvoices: 0, overdueAmount: 0, monthlyRevenue: 0, totalCollected: 0 });
  const [entries, setEntries] = useState<EnhancedLedgerEntry[]>([]);
  const [alerts, setAlerts] = useState<IntelligenceAlert[]>([]);
  const [activities, setActivities] = useState<RecentActivity[]>([]);

  const load = async () => {
    try {
      setLoading(true);
      const [clients, invoices, commLogs, commitments] = await Promise.all([
        clientService.getAll(),
        invoiceService.getAll(),
        communicationService.getAll(),
        commitmentServiceApi.getAll(),
      ]);

      const clientMap = new Map(clients.map(c => [c.id, c]));
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const getEffectiveStatus = (invoice: { status: string; dueDate: string }) => {
        if (!['sent', 'overdue'].includes(invoice.status)) return invoice.status;
        const due = new Date(invoice.dueDate);
        due.setHours(0, 0, 0, 0);
        if (due.getTime() === now.getTime()) return 'due';
        if (due < now) return 'overdue';
        return invoice.status;
      };

      // Stats
      const activeInvoices = invoices.filter(i => ['sent', 'overdue'].includes(i.status));
      const overdueInvoices = invoices.filter(i => getEffectiveStatus(i) === 'overdue');
      const allPaidInvoices = invoices.filter(i => i.status === 'paid');
      const paidThisMonth = allPaidInvoices.filter(i => i.paidDate && new Date(i.paidDate) >= startOfMonth);

      setStats({
        totalClients: clients.length,
        activeInvoices: activeInvoices.length,
        overdueAmount: overdueInvoices.reduce((sum, i) => sum + i.amount, 0),
        monthlyRevenue: paidThisMonth.reduce((sum, i) => sum + i.amount, 0),
        totalCollected: allPaidInvoices.reduce((sum, i) => sum + i.amount, 0),
      });

      // Ledger entries
      const ledger: EnhancedLedgerEntry[] = invoices
        .filter(i => i.status !== 'paid')
        .map(invoice => {
          const client = clientMap.get(invoice.clientId);
          const effectiveStatus = getEffectiveStatus(invoice);
          return {
            id: invoice.id,
            documentNumber: invoice.number,
            amount: invoice.amount,
            status: effectiveStatus,
            dueDate: invoice.dueDate,
            score: client?.score || 0,
            color: client?.color || 'muted',
            pattern: client ? `${client.level} client` : 'Unknown',
            action: effectiveStatus === 'overdue' ? 'Follow Up' : 'View',
            client: client ? { name: client.name, slug: client.slug } : { name: 'Unknown', slug: '' },
            engagement: { viewCount: invoice.viewCount || 0, lastViewedAt: invoice.lastViewedAt },
          };
        });
      setEntries(ledger);

      // Alerts from overdue invoices
      const generatedAlerts: IntelligenceAlert[] = overdueInvoices.map(invoice => ({
        id: invoice.id,
        type: 'overdue',
        clientName: invoice.clientName,
        documentNumber: invoice.number,
        title: 'Payment Overdue',
        description: `Invoice ${invoice.number} is overdue. Follow up with client.`,
        timestamp: new Date(invoice.dueDate),
      }));
      setAlerts(generatedAlerts);

      // Recent activities from communication logs
      const commLogActivities: RecentActivity[] = commLogs.map(log => {
        const invoice = invoices.find(i => i.id === log.invoiceId);
        const client = invoice ? clientMap.get(invoice.clientId) : null;
        return {
          id: log.id,
          clientName: client?.name || 'Unknown',
          clientSlug: client?.slug || '',
          action: log.type,
          documentNumber: invoice?.number || '',
          timestamp: new Date(log.sentAt),
        };
      });

      // Recent activities from commitments
      const commitmentActivities: RecentActivity[] = commitments.map(c => {
        const client = clientMap.get(c.clientId);
        return {
          id: `commitment-${c.id}`,
          clientName: c.clientName,
          clientSlug: client?.slug || '',
          action: `commitment_${c.status}`,
          documentNumber: c.invoiceNumber,
          timestamp: new Date(c.requestedAt),
        };
      });

      const recentActivities = [...commLogActivities, ...commitmentActivities]
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 10);
      setActivities(recentActivities);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const channel = supabase
        .channel('dashboard-invoice-views')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'invoices',
            filter: `user_id=eq.${user.id}`,
          },
          (payload: any) => {
            setEntries(prev => prev.map(entry =>
              entry.id === payload.new.id
                ? { ...entry, engagement: { viewCount: payload.new.view_count || 0, lastViewedAt: payload.new.last_viewed_at || undefined } }
                : entry
            ));
          }
        )
        .subscribe();

      cleanup = () => { supabase.removeChannel(channel); };
    };

    setupRealtime();
    return () => { cleanup?.(); };
  }, []);

  return { stats, entries, alerts, activities, loading, error, refetch: load };
};
