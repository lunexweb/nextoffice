import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Settings, 
  User, 
  CreditCard, 
  Bell, 
  Shield, 
  Globe, 
  Palette,
  Database,
  HelpCircle,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Building,
  MessageSquare,
  Trash2
} from 'lucide-react';
import { NOCard } from '@/components/nextoffice/shared';
import { supabase } from '@/lib/supabase';

interface SettingSection {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<React.SVGAttributes<SVGElement>>;
  badge?: string;
  status?: 'complete' | 'incomplete' | 'coming-soon';
  path?: string;
}

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Record<string, any> | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      if (data) setProfile(data);
      else setProfile({ email: user.email || '', business_name: '', created_at: user.created_at });
    };
    load();
  }, []);

  const handleDeleteAccount = async () => {
    if (deleteInput !== 'DELETE') return;
    setDeleting(true);
    try {
      await supabase.rpc('delete_user');
      await supabase.auth.signOut();
      navigate('/');
    } catch {
      setDeleting(false);
    }
  };

  // Dynamic completion
  const profileFields = ['first_name', 'last_name', 'phone', 'business_name', 'business_type', 'address', 'city'];
  const profileFilled = profile ? profileFields.filter(f => !!profile[f]).length : 0;
  const profilePct = profile ? Math.round((profileFilled / profileFields.length) * 100) : 0;

  const paymentFields = ['bank_name', 'account_number', 'account_holder', 'branch_code'];
  const paymentFilled = profile ? paymentFields.filter(f => !!profile[f]).length : 0;
  const paymentPct = profile ? Math.round((paymentFilled / paymentFields.length) * 100) : 0;

  const settingSections: SettingSection[] = [
    {
      id: 'profile',
      title: 'User Profile',
      description: 'Manage your personal and business information',
      icon: User,
      status: profilePct >= 100 ? 'complete' : 'incomplete',
      badge: profilePct >= 100 ? 'Complete' : 'Setup Required',
      path: '/app/settings/profile'
    },
    {
      id: 'payment',
      title: 'Payment Settings',
      description: 'Configure payment terms and banking details',
      icon: CreditCard,
      status: paymentPct >= 100 ? 'complete' : 'incomplete',
      badge: paymentPct >= 100 ? 'Complete' : 'Setup Required',
      path: '/app/settings/payment'
    },
    {
      id: 'communications',
      title: 'Communications',
      description: 'View email tracking and communication history',
      icon: MessageSquare,
      badge: 'Active',
      path: '/app/communications'
    },
    {
      id: 'reminders',
      title: 'Reminder Engine',
      description: 'Manage automated payment reminders',
      icon: Bell,
      badge: 'Active',
      path: '/app/settings/reminders'
    },
    {
      id: 'security',
      title: 'Security',
      description: 'Password, authentication and privacy settings',
      icon: Shield,
      status: 'coming-soon',
      badge: 'Coming Soon'
    },
    {
      id: 'integrations',
      title: 'Integrations',
      description: 'Connect with third-party services',
      icon: Globe,
      status: 'coming-soon',
      badge: 'Coming Soon'
    },
    {
      id: 'appearance',
      title: 'Appearance',
      description: 'Customize themes and display preferences',
      icon: Palette,
      status: 'coming-soon',
      badge: 'Coming Soon'
    },
    {
      id: 'data',
      title: 'Data & Storage',
      description: 'Export data and manage storage',
      icon: Database,
      status: 'coming-soon',
      badge: 'Coming Soon'
    },
    {
      id: 'help',
      title: 'Help & Support',
      description: 'Get help and contact support',
      icon: HelpCircle
    }
  ];

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'complete':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'incomplete':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'coming-soon':
        return 'bg-muted text-muted-foreground border-border';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'complete':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'incomplete':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const handleSectionClick = (section: SettingSection) => {
    if (section.path) {
      navigate(section.path);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Settings className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="font-serif text-lg sm:text-2xl">Settings</h2>
          <p className="text-sm text-muted-foreground">Manage your account and preferences</p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6">
        <NOCard className="p-4 sm:p-6 border-l-4 border-l-primary">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-muted-foreground">Profile Completion</p>
              <p className="text-xl sm:text-2xl font-bold">{profilePct}%</p>
              <p className="text-xs text-muted-foreground mt-1">Complete your profile</p>
            </div>
            <div className="p-3 bg-primary/10 rounded-full">
              <User className="w-6 h-6 text-primary" />
            </div>
          </div>
        </NOCard>

        <NOCard className="p-4 sm:p-6 border-l-4 border-l-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-muted-foreground">Payment Setup</p>
              <p className="text-xl sm:text-2xl font-bold">{paymentPct}%</p>
              <p className="text-xs text-muted-foreground mt-1">Configure payment terms</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <CreditCard className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </NOCard>

        <NOCard className="p-4 sm:p-6 border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-muted-foreground">Account Status</p>
              <p className="text-xl sm:text-2xl font-bold">Active</p>
              <p className="text-xs text-muted-foreground mt-1">All systems operational</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Shield className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </NOCard>
      </div>

      {/* Settings Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6">
        {settingSections.map((section) => {
          const Icon = section.icon;
          const isClickable = !!section.path;
          
          return (
            <div 
              key={section.id}
              className={isClickable ? 'cursor-pointer' : ''}
              onClick={() => isClickable && handleSectionClick(section)}
            >
              <NOCard className={`p-4 sm:p-6 ${isClickable ? 'hover:shadow-lg hover:border-primary/50' : 'opacity-75'} transition-all duration-200`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="p-2 bg-muted rounded-lg">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{section.title}</h3>
                        {section.status && getStatusIcon(section.status)}
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{section.description}</p>
                      {section.badge && (
                        <span className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(section.status)}`}>
                          {section.badge}
                        </span>
                      )}
                    </div>
                  </div>
                  {isClickable && <ChevronRight className="w-5 h-5 text-muted-foreground mt-1" />}
                </div>
              </NOCard>
            </div>
          );
        })}
      </div>

      {/* Account Info */}
      <NOCard className="p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Building className="w-5 h-5" />
          <h3 className="font-serif font-bold text-sm sm:text-lg">Account Information</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">Your current account details and status</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Business Name</p>
              <p className="font-medium">{profile?.business_name || '—'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Email</p>
              <p className="font-medium">{profile?.email || '—'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Account Type</p>
              <p className="font-medium">Business Owner</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Member Since</p>
              <p className="font-medium">
                {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-ZA', { year: 'numeric', month: 'long' }) : '—'}
              </p>
            </div>
          </div>
        </div>
      </NOCard>

      {/* Danger Zone */}
      <NOCard className="p-4 sm:p-6 border-red-200 dark:border-red-900">
        <div className="flex items-center gap-2 mb-2">
          <Trash2 className="w-5 h-5 text-red-500" />
          <h3 className="font-serif font-bold text-lg text-red-600">Danger Zone</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Permanently delete your account and all associated data. This cannot be undone.
        </p>

        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 rounded-lg bg-red-50 text-red-600 border border-red-200 text-sm font-medium hover:bg-red-100 transition-colors"
          >
            Delete My Account
          </button>
        ) : (
          <div className="space-y-3 max-w-md">
            <p className="text-sm font-medium text-red-600">
              Type <strong>DELETE</strong> to confirm. All your clients, invoices, and data will be permanently removed.
            </p>
            <input
              type="text"
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value)}
              placeholder="Type DELETE to confirm"
              className="w-full px-3 py-2 border border-red-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setShowDeleteConfirm(false); setDeleteInput(''); }}
                className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteInput !== 'DELETE' || deleting}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {deleting ? 'Deleting...' : 'Permanently Delete Account'}
              </button>
            </div>
          </div>
        )}
      </NOCard>
    </div>
  );
};

export default SettingsPage;
