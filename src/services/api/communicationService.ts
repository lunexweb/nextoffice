import { supabase } from '@/lib/supabase';
import type { CommunicationLog, CommunicationAnalytics } from '@/types';

const mapLog = (row: any): CommunicationLog => ({
  id: row.id,
  type: row.type,
  status: row.status,
  invoiceId: row.invoice_id,
  clientId: row.client_id,
  content: {
    subject: row.subject,
    body: row.body || '',
  },
  sentAt: row.sent_at,
  deliveredAt: row.delivered_at || undefined,
  openedAt: row.opened_at || undefined,
  engagement: {
    opens: row.opens || 0,
    clicks: row.clicks || 0,
  },
});

export const communicationService = {
  async getAll(): Promise<CommunicationLog[]> {
    const { data, error } = await supabase
      .from('communication_logs')
      .select('*')
      .order('sent_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(mapLog);
  },

  async getAnalytics(): Promise<CommunicationAnalytics> {
    const { data, error } = await supabase
      .from('communication_logs')
      .select('status');
    if (error) throw error;

    const logs = data || [];
    const total = logs.length;
    const sent = logs.filter(l => l.status !== 'failed' && l.status !== 'bounced').length;
    const delivered = logs.filter(l => ['delivered', 'opened'].includes(l.status)).length;
    const opened = logs.filter(l => l.status === 'opened').length;
    const failed = logs.filter(l => ['failed', 'bounced'].includes(l.status)).length;

    return {
      total,
      sent,
      delivered,
      opened,
      failed,
      openRate: sent > 0 ? Math.round((opened / sent) * 100) : 0,
      deliveryRate: sent > 0 ? Math.round((delivered / sent) * 100) : 0,
    };
  },

  async create(log: {
    invoice_id?: string;
    client_id?: string;
    type: string;
    status: string;
    subject: string;
    body?: string;
  }): Promise<CommunicationLog> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('communication_logs')
      .insert([{ ...log, user_id: user.id, sent_at: new Date().toISOString() }])
      .select()
      .single();
    if (error) throw error;
    return mapLog(data);
  },
};
