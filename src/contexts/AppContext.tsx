import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

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
  const [notificationsLoaded, setNotificationsLoaded] = useState(false);

  const generateNotifications = useCallback(async () => {
    try {
      const { data: invoices } = await supabase
        .from('invoices')
        .select('id, number, amount, status, due_date, client_id, clients(name)')
        .in('status', ['sent', 'overdue'])
        .order('due_date', { ascending: true });

      if (!invoices || invoices.length === 0) {
        setNotifications([]);
        return;
      }

      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const generated: Notification[] = [];

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

  // Generate notifications when authenticated
  useEffect(() => {
    if (auth.isAuthenticated && !notificationsLoaded) {
      generateNotifications();
      setNotificationsLoaded(true);
    }
    if (!auth.isAuthenticated) {
      setNotificationsLoaded(false);
    }
  }, [auth.isAuthenticated, notificationsLoaded, generateNotifications]);

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
