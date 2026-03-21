import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Users, FileText, Settings, LogOut, ChevronLeft, ChevronRight, Bell, X, MessageSquare, TrendingUp, Handshake } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useApp } from '@/contexts/AppContext';
import { useBusinessProfile } from '@/hooks';
import { ThemeToggle } from '@/components/nextoffice/shared';

const navItems = [
  { id: 'home', icon: Home, label: 'Home', path: '/app' },
  { id: 'clients', icon: Users, label: 'Clients', path: '/app/clients' },
  { id: 'invoices', icon: FileText, label: 'Invoices', path: '/app/invoices' },
  { id: 'commitments', icon: Handshake, label: 'Commitments', path: '/app/commitments' },
  { id: 'communications', icon: MessageSquare, label: 'Communications', path: '/app/communications' },
  { id: 'reliability', icon: TrendingUp, label: 'Reliability', path: '/app/reliability' },
  { id: 'settings', icon: Settings, label: 'Settings', path: '/app/settings' },
];

const mobileNavItems = [
  { id: 'home', icon: Home, label: 'Home', path: '/app' },
  { id: 'clients', icon: Users, label: 'Clients', path: '/app/clients' },
  { id: 'invoices', icon: FileText, label: 'Invoices', path: '/app/invoices' },
  { id: 'commitments', icon: Handshake, label: 'Commits', path: '/app/commitments' },
  { id: 'settings', icon: Settings, label: 'Settings', path: '/app/settings' },
];

const AppLayout: React.FC = () => {
  const { isDark, toggle } = useTheme();
  const { signOut, notifications, dismissNotification } = useApp();
  const { businessProfile } = useBusinessProfile();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 768);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const currentLabel = navItems.find(n =>
    n.path === '/app' ? location.pathname === '/app' : location.pathname.startsWith(n.path)
  )?.label || 'Home';

  const handleSignOut = () => {
    signOut();
    navigate('/');
  };

  const sidebarWidth = collapsed ? 64 : 240;

  return (
    <div className="h-screen overflow-hidden bg-background text-foreground transition-colors duration-200">
      {/* Sidebar - desktop only */}
      <motion.aside
        animate={{ width: sidebarWidth }}
        transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
        className="h-screen fixed left-0 top-0 z-50 border-r border-border bg-card hidden md:flex flex-col transition-colors duration-200"
      >
        <div className="p-4 flex items-center gap-3 overflow-hidden h-16 border-b border-border">
          <div className="min-w-[32px] h-8 w-8 rounded bg-primary flex items-center justify-center text-primary-foreground font-serif font-bold text-sm flex-shrink-0">T</div>
          {!collapsed && <span className="font-serif font-bold text-xl whitespace-nowrap">Trailbill<span className="font-sans font-medium text-xs text-primary/70 ml-[1px]">.com</span></span>}
        </div>

        <nav className="flex-1 p-2 space-y-1 mt-4 overflow-hidden">
          {navItems.map(item => {
            const active = item.path === '/app' ? location.pathname === '/app' : location.pathname.startsWith(item.path);
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                title={collapsed ? item.label : undefined}
                className={`w-full flex items-center gap-3 p-3 rounded-md transition-all duration-200 ${
                  active
                    ? 'bg-primary/10 text-primary border-l-[3px] border-l-primary'
                    : 'hover:bg-accent text-muted-foreground border-l-[3px] border-l-transparent'
                }`}
              >
                <item.icon size={20} className="flex-shrink-0" />
                {!collapsed && <span className="font-medium whitespace-nowrap">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        <div className="p-2 border-t border-border">
          <button onClick={handleSignOut}
            className="w-full flex items-center gap-3 p-3 rounded-md text-destructive hover:bg-destructive/5 transition-colors duration-200">
            <LogOut size={20} className="flex-shrink-0" />
            {!collapsed && <span className="font-medium">Sign Out</span>}
          </button>
          <button onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center p-2 text-muted-foreground mt-2 hover:text-foreground transition-colors">
            {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>
      </motion.aside>

      {/* Main area */}
      <div
        className="h-screen flex flex-col overflow-hidden transition-all duration-300"
        style={{ marginLeft: isMobile ? 0 : sidebarWidth }}
      >
        {/* Top Bar */}
        <header className="h-14 md:h-16 border-b border-border bg-card px-4 md:px-8 flex items-center justify-between z-40 flex-shrink-0 transition-colors duration-200">
          <h2 className="font-serif text-base md:text-xl capitalize">{currentLabel}</h2>
          <div className="flex items-center gap-3 md:gap-6">
            <ThemeToggle isDark={isDark} toggle={toggle} />
            <div className="relative">
              <button onClick={() => setNotifOpen(!notifOpen)} className="relative p-1.5 hover:text-foreground text-muted-foreground transition-colors">
                <Bell size={18} />
                {notifications.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-[10px] font-bold text-white leading-none">{notifications.length}</span>
                  </span>
                )}
              </button>
            </div>
            <div className="relative flex items-center gap-2">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold">{businessProfile?.ownerName || 'User'}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  {businessProfile?.businessName || 'Business'}
                </p>
              </div>
              <button
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold"
              >
                {businessProfile?.ownerName?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U'}
              </button>
              {/* Profile dropdown */}
              {profileMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setProfileMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-48 bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden">
                    <div className="px-3 py-2 border-b border-border sm:hidden">
                      <p className="text-sm font-bold truncate">{businessProfile?.ownerName || 'User'}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider truncate">
                        {businessProfile?.businessName || 'Business'}
                      </p>
                    </div>
                    <button
                      onClick={() => { setProfileMenuOpen(false); handleSignOut(); }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-destructive hover:bg-destructive/5 transition-colors"
                    >
                      <LogOut size={16} />
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Notification Panel Overlay */}
        <AnimatePresence>
          {notifOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/30 z-50"
                onClick={() => setNotifOpen(false)}
              />
              {/* Panel */}
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="fixed top-0 right-0 w-full sm:w-96 h-full sm:h-auto sm:max-h-[80vh] sm:top-4 sm:right-4 sm:rounded-xl bg-card border border-border shadow-2xl z-50 flex flex-col overflow-hidden"
              >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <Bell size={16} className="text-primary" />
                    <h3 className="font-serif font-bold text-sm">Notifications</h3>
                    {notifications.length > 0 && (
                      <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                        {notifications.length}
                      </span>
                    )}
                  </div>
                  <button onClick={() => setNotifOpen(false)} className="p-1 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
                    <X size={18} />
                  </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                      <Bell size={32} className="text-muted-foreground/30 mb-3" />
                      <p className="text-sm font-medium text-muted-foreground">All caught up</p>
                      <p className="text-xs text-muted-foreground/60 mt-1">No overdue or upcoming invoices</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {notifications.map(n => (
                        <div key={n.id} className="px-4 py-3 hover:bg-accent/50 transition-colors">
                          <div className="flex justify-between items-start gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold leading-tight">{n.title}</p>
                              <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{n.desc}</p>
                              <p className="text-[10px] text-muted-foreground/50 mt-1">{n.time}</p>
                            </div>
                            <button
                              onClick={() => dismissNotification(n.id)}
                              className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground flex-shrink-0"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Content */}
        <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border flex items-center justify-around h-14 md:hidden">
        {mobileNavItems.map(item => {
          const active = item.path === '/app' ? location.pathname === '/app' : location.pathname.startsWith(item.path);
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors ${
                active ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <item.icon size={18} />
              <span className="text-[10px] font-medium leading-none">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default AppLayout;
