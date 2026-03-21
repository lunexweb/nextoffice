import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface Notification {
  id: string;
  title: string;
  desc: string;
  time: string;
  read: boolean;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AppContextType {
  auth: AuthState;
  signOut: () => Promise<void>;
  notifications: Notification[];
  dismissNotification: (id: string) => void;
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  markAllNotificationsRead: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const defaultNotifications: Notification[] = [];

const DISMISSED_KEY = 'dismissed_notification_ids';

const getDismissedIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
};

const saveDismissedId = (id: string) => {
  try {
    const current = getDismissedIds();
    current.add(id);
    localStorage.setItem(DISMISSED_KEY, JSON.stringify([...current]));
  } catch {}
};

const timeAgo = (dateStr: string) => {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return `${diff} days ago`;
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [auth, setAuth] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });
  const [notifications, setNotifications] = useState<Notification[]>(defaultNotifications);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const generateNotifications = useCallback(async () => {
    try {
      // Fetch invoices, commitments, and recent comms in parallel
      const [invoiceRes, commitmentRes, commsRes] = await Promise.all([
        supabase
          .from('invoices')
          .select('id, number, amount, status, due_date, client_id, clients(name)')
          .in('status', ['sent', 'overdue'])
          .order('due_date', { ascending: true }),
        supabase
          .from('commitments')
          .select('id, commitment_type, status, requested_at, invoice_id, invoices(number), details')
          .eq('status', 'pending')
          .order('requested_at', { ascending: false })
          .limit(20),
        supabase
          .from('communication_logs')
          .select('id, type, status, sent_at, invoice_id, recipient_email, subject, invoices(number, client_id, clients(name))')
          .order('sent_at', { ascending: false })
          .limit(50),
      ]);

      const invoices = invoiceRes.data || [];
      const commitments = commitmentRes.data || [];
      const comms = commsRes.data || [];

      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const generated: Notification[] = [];

      // ── Invoice-based notifications ──
      for (const inv of invoices) {
        const due = new Date(inv.due_date);
        due.setHours(0, 0, 0, 0);
        const clientName = (inv as any).clients?.name || 'Unknown';
        const amt = `R${parseFloat(inv.amount).toLocaleString()}`;

        if (due < now) {
          generated.push({
            id: `overdue-${inv.id}`,
            title: `${inv.number} is overdue`,
            desc: `${clientName} owes ${amt} — was due ${timeAgo(inv.due_date)}`,
            time: timeAgo(inv.due_date),
            read: false,
          });
        } else if (due.getTime() === now.getTime()) {
          generated.push({
            id: `due-today-${inv.id}`,
            title: `${inv.number} is due today`,
            desc: `${clientName} owes ${amt}`,
            time: 'Today',
            read: false,
          });
        } else {
          const daysUntil = Math.ceil((due.getTime() - now.getTime()) / 86400000);
          if (daysUntil <= 3) {
            generated.push({
              id: `due-soon-${inv.id}`,
              title: `${inv.number} due in ${daysUntil} day${daysUntil > 1 ? 's' : ''}`,
              desc: `${clientName} — ${amt}`,
              time: `Due ${due.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}`,
              read: false,
            });
          }
        }
      }

      // ── Pending commitment notifications ──
      const commitLabels: Record<string, string> = {
        full_payment: 'Full Payment',
        payment_plan: 'Payment Plan',
        extension: 'Extension',
        already_paid: 'Already Paid',
        dispute: 'Dispute',
      };
      for (const c of commitments) {
        const invNum = (c as any).invoices?.number || 'Invoice';
        const typeLabel = commitLabels[c.commitment_type] || c.commitment_type;
        generated.push({
          id: `commitment-${c.id}`,
          title: `New commitment: ${typeLabel}`,
          desc: `${invNum} — awaiting your review`,
          time: timeAgo(c.requested_at),
          read: false,
        });
      }

      // ── Communication log notifications (all recent — "Sent Items") ──
      const commTypeLabels: Record<string, string> = {
        initial_invoice: 'Invoice sent',
        invoice: 'Invoice sent',
        reminder: 'Reminder sent',
        followup: 'Follow-up sent',
        project_completed: 'Project completed email sent',
        payment_received: 'Payment confirmation sent',
        commitment_confirmation: 'Commitment confirmation sent',
      };
      for (const log of comms) {
        const invData = (log as any).invoices;
        const invNum = invData?.number || '';
        const clientName = invData?.clients?.name || '';
        const typeLabel = commTypeLabels[log.type] || 'Email sent';
        const statusSuffix = log.status === 'delivered' ? ' ✓' : log.status === 'bounced' ? ' ✗ bounced' : '';

        // Build a rich description: "INV-001 → John Doe (john@email.com)"
        const parts: string[] = [];
        if (invNum) parts.push(invNum);
        if (clientName) parts.push(clientName);
        if (log.recipient_email) parts.push(log.recipient_email);
        const desc = parts.length > 0
          ? (invNum && clientName
            ? `${invNum} → ${clientName}${log.recipient_email ? ` (${log.recipient_email})` : ''}`
            : parts.join(' — '))
          : (log.subject || 'Email');

        generated.push({
          id: `comm-${log.id}`,
          title: `${typeLabel}${statusSuffix}`,
          desc,
          time: timeAgo(log.sent_at),
          read: false,
        });
      }

      const dismissed = getDismissedIds();
      setNotifications(generated.filter(n => !dismissed.has(n.id)));
    } catch {
      // silently fail — notifications are non-critical
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuth({
        user: session?.user ?? null,
        isAuthenticated: !!session,
        isLoading: false,
      });
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuth({
        user: session?.user ?? null,
        isAuthenticated: !!session,
        isLoading: false,
      });
    });

    return () => subscription.unsubscribe();
  }, []);

  // Real-time subscriptions + polling for notifications
  useEffect(() => {
    if (!auth.isAuthenticated) {
      // Clean up when logged out
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }

    // Initial fetch
    generateNotifications();

    // Poll every 30 seconds as a reliable fallback
    pollRef.current = setInterval(generateNotifications, 30_000);

    // Supabase Realtime: listen for changes on key tables
    const channel = supabase
      .channel('notifications-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, () => {
        generateNotifications();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'commitments' }, () => {
        generateNotifications();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'communication_logs' }, () => {
        generateNotifications();
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      supabase.removeChannel(channel);
    };
  }, [auth.isAuthenticated, generateNotifications]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setNotifications(defaultNotifications);
  };

  const dismissNotification = (id: string) => {
    saveDismissedId(id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const addNotification = (notification: Omit<Notification, 'id'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
    };
    setNotifications(prev => [newNotification, ...prev]);
  };

  const markAllNotificationsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  return (
    <AppContext.Provider value={{ 
      auth, 
      signOut, 
      notifications, 
      dismissNotification, 
      addNotification, 
      markAllNotificationsRead 
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};
