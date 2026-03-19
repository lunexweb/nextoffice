import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Users, UserPlus, Clock, CheckCircle, XCircle, Pause, RefreshCw, Trash2, LogOut, Search, Plus, Target, Pencil } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';

interface Lead {
  id: string;
  name: string;
  business_name: string | null;
  industry: string | null;
  email: string | null;
  whatsapp: string | null;
  phone: string | null;
  notes: string | null;
  converted: boolean;
  created_at: string;
  updated_at: string;
}

const INDUSTRY_OPTIONS = ['Web/Creative', 'IT Support', 'Consulting', 'Security', 'Construction', 'Accounting', 'Cleaning', 'Recruitment', 'Other'];

function IndustryInlineEditor({ current, onSave, onCancel }: { current: string; onSave: (v: string) => void; onCancel: () => void; }) {
  const isCustom = current !== '' && !INDUSTRY_OPTIONS.slice(0, -1).includes(current);
  const [selected, setSelected] = useState(isCustom ? 'Other' : current);
  const [custom, setCustom] = useState(isCustom ? current : '');

  const commit = (sel: string, cust: string) => {
    const val = sel === 'Other' ? (cust.trim() || 'Other') : sel;
    onSave(val);
  };

  return (
    <div className="flex flex-col gap-1 min-w-[130px]">
      <select
        autoFocus
        value={selected}
        onChange={e => { setSelected(e.target.value); if (e.target.value !== 'Other') commit(e.target.value, ''); }}
        onBlur={() => { if (selected !== 'Other') onCancel(); }}
        onKeyDown={e => { if (e.key === 'Escape') onCancel(); }}
        className="w-full px-1.5 py-1 text-xs border rounded bg-background outline-none focus:ring-1 focus:ring-primary"
      >
        <option value="">—</option>
        {INDUSTRY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      {selected === 'Other' && (
        <input
          autoFocus
          type="text"
          value={custom}
          onChange={e => setCustom(e.target.value)}
          onBlur={() => commit(selected, custom)}
          onKeyDown={e => { if (e.key === 'Enter') commit(selected, custom); if (e.key === 'Escape') onCancel(); }}
          placeholder="Type industry..."
          className="w-full px-1.5 py-1 text-xs border rounded bg-background outline-none focus:ring-1 focus:ring-primary"
        />
      )}
    </div>
  );
}

export default function CEODashboardPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [accessRequests, setAccessRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateUserDialog, setShowCreateUserDialog] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showManageDialog, setShowManageDialog] = useState(false);
  const [showDeleteUserDialog, setShowDeleteUserDialog] = useState(false);
  const [userToDelete, setUserToDelete] = useState<any>(null);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const { toast } = useToast();

  // Leads state
  const [leads, setLeads] = useState<Lead[]>([]);
  const [showAddLeadDialog, setShowAddLeadDialog] = useState(false);
  const [leadSearch, setLeadSearch] = useState('');
  const [leadFilter, setLeadFilter] = useState<'all' | 'converted' | 'open'>('all');
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [newLeadData, setNewLeadData] = useState({
    name: '', business_name: '', industry: '', customIndustry: '', email: '', whatsapp: '', phone: '', notes: '', converted: false,
  });

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/signin';
  };

  const [newUserData, setNewUserData] = useState({
    email: '',
    full_name: '',
    password: '',
    billing_cycle_days: 30,
  });

  const [approvalData, setApprovalData] = useState({
    temporaryPassword: '',
  });

  const [rejectionData, setRejectionData] = useState({
    reason: '',
  });

  const [manageData, setManageData] = useState({
    status: 'active' as 'active' | 'paused' | 'cancelled' | 'pending',
    billing_cycle_days: 30,
    payment_date: '',
    notes: '',
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: profilesData }, { data: requestsData }, { data: leadsData }] = await Promise.all([
        supabase
          .from('profiles')
          .select(`
            id, email, first_name, last_name, created_at,
            user_roles ( role ),
            subscriptions ( id, status, subscription_start_date, subscription_end_date, billing_cycle_days, last_payment_date, next_payment_date, notes )
          `)
          .order('created_at', { ascending: false }),
        supabase
          .from('access_requests')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('leads')
          .select('*')
          .order('created_at', { ascending: false }),
      ]);

      const mapped = (profilesData || []).map((p: any) => ({
        id: p.id,
        email: p.email,
        full_name: [p.first_name, p.last_name].filter(Boolean).join(' ') || p.email,
        created_at: p.created_at,
        role: Array.isArray(p.user_roles) ? p.user_roles[0] : p.user_roles,
        subscription: Array.isArray(p.subscriptions) ? p.subscriptions[0] : p.subscriptions,
      }));

      setUsers(mapped);
      setAccessRequests(requestsData || []);
      setLeads((leadsData || []) as Lead[]);
    } catch {
      toast({ title: 'Error loading data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreateUser = async () => {
    if (!newUserData.email || !newUserData.password) {
      toast({ title: 'Error', description: 'Email and password are required', variant: 'destructive' });
      return;
    }

    try {
      // Save current CEO session before creating new user
      const { data: { session: ceoSession } } = await supabase.auth.getSession();

      // Create the new user
      const { data, error } = await supabase.auth.signUp({
        email: newUserData.email,
        password: newUserData.password,
      });

      if (error) throw error;

      // Update profile name while still signed in as the new user (RLS: auth.uid() = id)
      if (data.user && newUserData.full_name) {
        const nameParts = newUserData.full_name.trim().split(' ');
        await supabase
          .from('profiles')
          .update({
            first_name: nameParts[0] || '',
            last_name: nameParts.slice(1).join(' ') || '',
          })
          .eq('id', data.user.id);
      }

      // Now restore CEO session
      if (ceoSession) {
        await supabase.auth.setSession({
          access_token: ceoSession.access_token,
          refresh_token: ceoSession.refresh_token,
        });
      }

      toast({
        title: 'User created',
        description: `${newUserData.email} added successfully. Use Manage to activate their subscription.`,
      });
      setShowCreateUserDialog(false);
      setNewUserData({ email: '', full_name: '', password: '', billing_cycle_days: 30 });
      await loadData();
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to create user',
        variant: 'destructive',
      });
    }
  };

  const handleApproveRequest = async () => {
    if (!selectedRequest || !approvalData.temporaryPassword) {
      toast({ title: 'Error', description: 'Please provide a temporary password', variant: 'destructive' });
      return;
    }

    const { data: { user: currentUser } } = await supabase.auth.getUser();

    await supabase
      .from('access_requests')
      .update({
        status: 'approved',
        processed_by: currentUser?.id,
        processed_at: new Date().toISOString(),
      })
      .eq('id', selectedRequest.id);

    toast({
      title: 'Request approved',
      description: `Go to Supabase → Auth → Add user for ${selectedRequest.email} to give them access.`,
    });
    setShowApproveDialog(false);
    setSelectedRequest(null);
    setApprovalData({ temporaryPassword: '' });
    await loadData();
  };

  const handleRejectRequest = async () => {
    if (!selectedRequest) {
      toast({ title: 'Error', description: 'No request selected', variant: 'destructive' });
      return;
    }

    const { data: { user: currentUser } } = await supabase.auth.getUser();

    await supabase
      .from('access_requests')
      .update({
        status: 'rejected',
        processed_by: currentUser?.id,
        processed_at: new Date().toISOString(),
        rejection_reason: rejectionData.reason || null,
      })
      .eq('id', selectedRequest.id);

    toast({ title: 'Success', description: `Access request from ${selectedRequest.email} has been rejected.` });
    setShowRejectDialog(false);
    setSelectedRequest(null);
    setRejectionData({ reason: '' });
    await loadData();
  };

  const handleManageSubscription = async () => {
    if (!selectedUser) {
      toast({ title: 'Error', description: 'No user selected', variant: 'destructive' });
      return;
    }

    const updatePayload: Record<string, any> = {
      status: manageData.status,
      billing_cycle_days: manageData.billing_cycle_days,
      notes: manageData.notes,
    };

    if (manageData.payment_date) {
      const paymentDate = new Date(manageData.payment_date);
      const expirationDate = new Date(paymentDate);
      expirationDate.setDate(expirationDate.getDate() + manageData.billing_cycle_days);
      updatePayload.status = 'active';
      updatePayload.last_payment_date = manageData.payment_date;
      updatePayload.next_payment_date = expirationDate.toISOString().split('T')[0];
      updatePayload.subscription_end_date = expirationDate.toISOString().split('T')[0];
      if (!selectedUser.subscription?.subscription_start_date) {
        updatePayload.subscription_start_date = manageData.payment_date;
      }
    }

    const { error } = await supabase
      .from('subscriptions')
      .update(updatePayload)
      .eq('user_id', selectedUser.id);

    if (error) {
      toast({ title: 'Error', description: 'Failed to update subscription', variant: 'destructive' });
      return;
    }

    toast({ title: 'Success', description: `Subscription updated for ${selectedUser.email}` });
    setShowManageDialog(false);
    setSelectedUser(null);
    await loadData();
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      const { error } = await supabase.rpc('delete_user_by_id', { target_user_id: userToDelete.id });
      if (error) throw error;
      toast({ title: 'User deleted', description: `${userToDelete.email} and all their data have been removed.` });
      setShowDeleteUserDialog(false);
      setUserToDelete(null);
      await loadData();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to delete user', variant: 'destructive' });
    }
  };

  // ── Lead CRUD ──
  const handleAddLead = async () => {
    if (!newLeadData.name.trim()) {
      toast({ title: 'Error', description: 'Name is required', variant: 'destructive' });
      return;
    }
    const industryValue = newLeadData.industry === 'Other'
      ? (newLeadData.customIndustry.trim() || 'Other')
      : (newLeadData.industry || null);
    try {
      const { error } = await supabase.from('leads').insert([{
        name: newLeadData.name.trim(),
        business_name: newLeadData.business_name.trim() || null,
        industry: industryValue,
        email: newLeadData.email.trim() || null,
        whatsapp: newLeadData.whatsapp.trim() || null,
        phone: newLeadData.phone.trim() || null,
        notes: newLeadData.notes.trim() || null,
        converted: newLeadData.converted,
      }]);
      if (error) throw error;
      toast({ title: 'Lead added' });
      setShowAddLeadDialog(false);
      setNewLeadData({ name: '', business_name: '', industry: '', customIndustry: '', email: '', whatsapp: '', phone: '', notes: '', converted: false });
      await loadData();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to add lead', variant: 'destructive' });
    }
  };

  const handleUpdateLead = async (id: string, field: string, value: string | boolean) => {
    try {
      const { error } = await supabase.from('leads').update({ [field]: value || null }).eq('id', id);
      if (error) throw error;
      setLeads(prev => prev.map(l => l.id === id ? { ...l, [field]: value || null } : l));
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to update lead', variant: 'destructive' });
    }
  };

  const handleToggleConverted = async (lead: Lead) => {
    const newVal = !lead.converted;
    await handleUpdateLead(lead.id, 'converted', newVal);
    setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, converted: newVal } : l));
    if (newVal) {
      toast({
        title: 'Lead converted!',
        description: `${lead.name} marked as converted.`,
        action: (
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => {
              setNewUserData({
                email: lead.email || '',
                full_name: lead.name,
                password: '',
                billing_cycle_days: 30,
              });
              setShowCreateUserDialog(true);
            }}
          >
            <UserPlus className="h-3 w-3 mr-1" />
            Create User
          </Button>
        ),
      });
    }
  };

  const handleDeleteLead = async (id: string) => {
    try {
      const { error } = await supabase.from('leads').delete().eq('id', id);
      if (error) throw error;
      setLeads(prev => prev.filter(l => l.id !== id));
      toast({ title: 'Lead deleted' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to delete lead', variant: 'destructive' });
    }
  };

  const filteredLeads = leads.filter(lead => {
    const matchesFilter = leadFilter === 'all' || (leadFilter === 'converted' ? lead.converted : !lead.converted);
    const search = leadSearch.toLowerCase();
    const matchesSearch = !search ||
      lead.name.toLowerCase().includes(search) ||
      (lead.business_name || '').toLowerCase().includes(search) ||
      (lead.email || '').toLowerCase().includes(search) ||
      (lead.industry || '').toLowerCase().includes(search);
    return matchesFilter && matchesSearch;
  });

  const openManageDialog = (user: any) => {
    setSelectedUser(user);
    setManageData({
      status: user.subscription?.status || 'pending',
      billing_cycle_days: user.subscription?.billing_cycle_days || 30,
      payment_date: '',
      notes: user.subscription?.notes || '',
    });
    setShowManageDialog(true);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      active: { variant: 'default', icon: CheckCircle, color: 'text-green-600' },
      paused: { variant: 'secondary', icon: Pause, color: 'text-yellow-600' },
      pending: { variant: 'outline', icon: Clock, color: 'text-blue-600' },
      cancelled: { variant: 'destructive', icon: XCircle, color: 'text-red-600' },
    };
    
    const config = variants[status] || variants.pending;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    );
  };

  const filteredUsers = filterStatus === 'all' 
    ? users 
    : users.filter(u => u.subscription?.status === filterStatus);

  const stats = {
    total: users.length,
    active: users.filter(u => u.subscription?.status === 'active').length,
    paused: users.filter(u => u.subscription?.status === 'paused').length,
    pending: users.filter(u => u.subscription?.status === 'pending').length,
    cancelled: users.filter(u => u.subscription?.status === 'cancelled').length,
    pendingRequests: accessRequests.filter(r => r.status === 'pending').length,
    totalLeads: leads.length,
    convertedLeads: leads.filter(l => l.converted).length,
  };

  return (
    <div className="container mx-auto px-3 py-3 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold">CEO Dashboard</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Manage users, subscriptions & access</p>
          {loading && <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">Loading...</p>}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading} className="text-xs sm:text-sm">
            <RefreshCw className={`h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setShowCreateUserDialog(true)} className="text-xs sm:text-sm">
            <UserPlus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5" />
            Add User
          </Button>
          <Button variant="outline" size="sm" onClick={handleSignOut} className="text-xs sm:text-sm text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 border-red-200 dark:border-red-900/40">
            <LogOut className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5" />
            Sign Out
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4">
        {[
          { label: 'Total Users', value: stats.total, icon: Users, color: 'text-muted-foreground' },
          { label: 'Active', value: stats.active, icon: CheckCircle, color: 'text-green-600' },
          { label: 'Paused', value: stats.paused, icon: Pause, color: 'text-yellow-600' },
          { label: 'Pending', value: stats.pending, icon: Clock, color: 'text-blue-600' },
          { label: 'Requests', value: stats.pendingRequests, icon: UserPlus, color: 'text-purple-600' },
        ].map((s, i) => (
          <Card key={i} className={i === 4 ? 'col-span-2 sm:col-span-1' : ''}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 sm:p-4 pb-1 sm:pb-2">
              <CardTitle className="text-[10px] sm:text-sm font-medium">{s.label}</CardTitle>
              <s.icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${s.color}`} />
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0 sm:pt-0">
              <div className="text-xl sm:text-2xl font-bold">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="users" className="space-y-3 sm:space-y-4">
        <TabsList className="w-full sm:w-auto grid grid-cols-3 sm:inline-flex">
          <TabsTrigger value="users" className="text-xs sm:text-sm">Users</TabsTrigger>
          <TabsTrigger value="requests" className="text-xs sm:text-sm">Requests</TabsTrigger>
          <TabsTrigger value="leads" className="text-xs sm:text-sm">Leads ({stats.totalLeads})</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-3 sm:space-y-4">
          <div className="flex gap-2">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-[180px] text-xs sm:text-sm">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardHeader className="p-3 sm:p-6">
              <CardTitle className="text-sm sm:text-lg">User Management</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Manage user subscriptions and access</CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
              <div className="space-y-3">
                {filteredUsers.map((user) => (
                  <div key={user.id} className="p-3 sm:p-4 border rounded-lg space-y-2.5">
                    {/* Top: name, email, status */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm sm:text-base truncate">{user.full_name || 'No name'}</p>
                        <p className="text-xs sm:text-sm text-muted-foreground truncate">{user.email}</p>
                      </div>
                      <div className="flex-shrink-0">
                        {getStatusBadge(user.subscription?.status || 'pending')}
                      </div>
                    </div>
                      
                    {/* Subscription details — 2 cols on mobile, 4 on desktop */}
                    {user.subscription && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 text-xs sm:text-sm">
                        <div>
                          <p className="text-muted-foreground text-[10px] sm:text-xs">Billing</p>
                          <p className="font-medium">{user.subscription.billing_cycle_days}d</p>
                        </div>
                        {user.subscription.last_payment_date && (
                          <div>
                            <p className="text-muted-foreground text-[10px] sm:text-xs">Last Payment</p>
                            <p className="font-medium">
                              {format(new Date(user.subscription.last_payment_date), 'MMM dd, yyyy')}
                            </p>
                          </div>
                        )}
                        {user.subscription.next_payment_date && (
                          <div>
                            <p className="text-muted-foreground text-[10px] sm:text-xs">Next Payment</p>
                            <p className="font-medium">
                              {format(new Date(user.subscription.next_payment_date), 'MMM dd, yyyy')}
                            </p>
                          </div>
                        )}
                        {user.subscription.subscription_end_date && (
                          <div>
                            <p className="text-muted-foreground text-[10px] sm:text-xs">Expires</p>
                            <p className="font-medium">
                              {format(new Date(user.subscription.subscription_end_date), 'MMM dd, yyyy')}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Action buttons — full width on mobile */}
                    <div className="flex gap-2 pt-1">
                      <Button onClick={() => openManageDialog(user)} variant="outline" size="sm" className="flex-1 sm:flex-none text-xs">
                        Manage
                      </Button>
                      <Button
                        onClick={() => { setUserToDelete(user); setShowDeleteUserDialog(true); }}
                        variant="destructive"
                        size="sm"
                        className="text-xs"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requests" className="space-y-3 sm:space-y-4">
          <Card>
            <CardHeader className="p-3 sm:p-6">
              <CardTitle className="text-sm sm:text-lg">Access Requests</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Review and approve user access requests</CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
              <div className="space-y-3">
                {accessRequests.filter(r => r.status === 'pending').map((request) => (
                  <div key={request.id} className="p-3 sm:p-4 border rounded-lg space-y-2.5">
                    <div>
                      <p className="font-semibold text-sm sm:text-base">{request.full_name}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">{request.email}</p>
                      {request.company && (
                        <p className="text-xs text-muted-foreground">{request.company}</p>
                      )}
                    </div>
                      
                    {request.message && (
                      <p className="text-xs sm:text-sm bg-muted/50 p-2 rounded-md">{request.message}</p>
                    )}
                      
                    <p className="text-[10px] sm:text-xs text-muted-foreground">
                      Requested {format(new Date(request.created_at), 'MMM dd, yyyy HH:mm')}
                    </p>
                    
                    <div className="flex gap-2 pt-1">
                      <Button
                        onClick={() => {
                          setSelectedRequest(request);
                          setShowApproveDialog(true);
                        }}
                        variant="default"
                        size="sm"
                        className="flex-1 sm:flex-none text-xs"
                      >
                        <CheckCircle className="h-3.5 w-3.5 mr-1" />
                        Approve
                      </Button>
                      <Button
                        onClick={() => {
                          setSelectedRequest(request);
                          setShowRejectDialog(true);
                        }}
                        variant="destructive"
                        size="sm"
                        className="flex-1 sm:flex-none text-xs"
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Leads Tab ── */}
        <TabsContent value="leads" className="space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search leads..."
                value={leadSearch}
                onChange={e => setLeadSearch(e.target.value)}
                className="pl-9 text-xs sm:text-sm"
              />
            </div>
            <Select value={leadFilter} onValueChange={(v: any) => setLeadFilter(v)}>
              <SelectTrigger className="w-full sm:w-[150px] text-xs sm:text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Leads</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="converted">Converted</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" onClick={() => setShowAddLeadDialog(true)} className="text-xs sm:text-sm">
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Lead
            </Button>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            <Card>
              <CardContent className="p-3 sm:p-4 flex items-center gap-2">
                <Target className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Total Leads</p>
                  <p className="text-lg font-bold">{stats.totalLeads}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 sm:p-4 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Converted</p>
                  <p className="text-lg font-bold">{stats.convertedLeads}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 sm:p-4 flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" />
                <div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Open</p>
                  <p className="text-lg font-bold">{stats.totalLeads - stats.convertedLeads}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="p-3 sm:p-6">
              <CardTitle className="text-sm sm:text-lg">Lead Tracker</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Click any cell to edit inline. Changes save automatically.</CardDescription>
            </CardHeader>
            <CardContent className="p-0 sm:p-0">
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-3 py-2 text-left font-medium text-xs text-muted-foreground w-8">✓</th>
                      <th className="px-3 py-2 text-left font-medium text-xs text-muted-foreground">Name</th>
                      <th className="px-3 py-2 text-left font-medium text-xs text-muted-foreground">Business</th>
                      <th className="px-3 py-2 text-left font-medium text-xs text-muted-foreground">Industry</th>
                      <th className="px-3 py-2 text-left font-medium text-xs text-muted-foreground">Email</th>
                      <th className="px-3 py-2 text-left font-medium text-xs text-muted-foreground">WhatsApp</th>
                      <th className="px-3 py-2 text-left font-medium text-xs text-muted-foreground">Phone</th>
                      <th className="px-3 py-2 text-left font-medium text-xs text-muted-foreground">Notes</th>
                      <th className="px-3 py-2 text-left font-medium text-xs text-muted-foreground w-16"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeads.map(lead => (
                      <tr key={lead.id} className={`border-b hover:bg-muted/30 transition-colors ${lead.converted ? 'bg-green-50/50 dark:bg-green-950/10' : ''}`}>
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={lead.converted}
                            onChange={() => handleToggleConverted(lead)}
                            className="h-4 w-4 rounded border-border cursor-pointer accent-green-600"
                          />
                        </td>
                        {(['name', 'business_name', 'industry', 'email', 'whatsapp', 'phone', 'notes'] as const).map(field => (
                          <td key={field} className="px-3 py-1">
                            {editingCell?.id === lead.id && editingCell.field === field ? (
                              field === 'industry' ? (
                                <IndustryInlineEditor
                                  current={(lead[field] as string) || ''}
                                  onSave={v => { handleUpdateLead(lead.id, field, v); setEditingCell(null); }}
                                  onCancel={() => setEditingCell(null)}
                                />
                              ) : field === 'notes' ? (
                                <textarea
                                  autoFocus
                                  defaultValue={(lead[field] as string) || ''}
                                  onBlur={e => { handleUpdateLead(lead.id, field, e.target.value); setEditingCell(null); }}
                                  onKeyDown={e => { if (e.key === 'Escape') setEditingCell(null); }}
                                  rows={2}
                                  className="w-full px-1.5 py-1 text-xs border rounded bg-background outline-none focus:ring-1 focus:ring-primary resize-none"
                                />
                              ) : (
                                <input
                                  autoFocus
                                  type={field === 'email' ? 'email' : 'text'}
                                  defaultValue={(lead[field] as string) || ''}
                                  onBlur={e => { handleUpdateLead(lead.id, field, e.target.value); setEditingCell(null); }}
                                  onKeyDown={e => { if (e.key === 'Enter') { handleUpdateLead(lead.id, field, (e.target as HTMLInputElement).value); setEditingCell(null); } if (e.key === 'Escape') setEditingCell(null); }}
                                  className="w-full px-1.5 py-1 text-xs border rounded bg-background outline-none focus:ring-1 focus:ring-primary"
                                />
                              )
                            ) : (
                              <div
                                onClick={() => setEditingCell({ id: lead.id, field })}
                                className={`px-1.5 py-1 rounded cursor-pointer hover:bg-muted min-h-[28px] text-xs flex items-center gap-1 group ${lead.converted && field === 'name' ? 'line-through text-muted-foreground' : ''}`}
                              >
                                <span className="flex-1 truncate">{(lead[field] as string) || <span className="text-muted-foreground/40">—</span>}</span>
                                <Pencil className="h-2.5 w-2.5 text-muted-foreground/0 group-hover:text-muted-foreground/50 flex-shrink-0" />
                              </div>
                            )}
                          </td>
                        ))}
                        <td className="px-3 py-2">
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteLead(lead.id)} className="h-7 w-7 p-0 text-muted-foreground hover:text-red-600">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {filteredLeads.length === 0 && (
                      <tr>
                        <td colSpan={9} className="px-3 py-8 text-center text-sm text-muted-foreground">
                          {leadSearch ? 'No leads match your search.' : 'No leads yet. Click "Add Lead" to start tracking.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile card list */}
              <div className="md:hidden space-y-3 p-3">
                {filteredLeads.map(lead => (
                  <div key={lead.id} className={`p-3 border rounded-lg space-y-2 ${lead.converted ? 'bg-green-50/50 dark:bg-green-950/10 border-green-200 dark:border-green-900/40' : ''}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <input
                          type="checkbox"
                          checked={lead.converted}
                          onChange={() => handleToggleConverted(lead)}
                          className="h-4 w-4 rounded border-border cursor-pointer accent-green-600 flex-shrink-0"
                        />
                        <div className="min-w-0">
                          <p className={`font-semibold text-sm truncate ${lead.converted ? 'line-through text-muted-foreground' : ''}`}>{lead.name}</p>
                          {lead.business_name && <p className="text-xs text-muted-foreground truncate">{lead.business_name}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {lead.converted && <Badge variant="default" className="text-[10px] px-1.5 py-0 bg-green-600">Converted</Badge>}
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteLead(lead.id)} className="h-7 w-7 p-0 text-muted-foreground hover:text-red-600">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                      {lead.industry && <div><span className="text-muted-foreground">Industry:</span> {lead.industry}</div>}
                      {lead.email && <div><span className="text-muted-foreground">Email:</span> {lead.email}</div>}
                      {lead.whatsapp && <div><span className="text-muted-foreground">WhatsApp:</span> {lead.whatsapp}</div>}
                      {lead.phone && <div><span className="text-muted-foreground">Phone:</span> {lead.phone}</div>}
                    </div>
                    {lead.notes && <p className="text-xs bg-muted/50 p-2 rounded-md">{lead.notes}</p>}
                    <p className="text-[10px] text-muted-foreground">Added {format(new Date(lead.created_at), 'MMM dd, yyyy')}</p>
                  </div>
                ))}
                {filteredLeads.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-8">
                    {leadSearch ? 'No leads match your search.' : 'No leads yet. Click "Add Lead" to start tracking.'}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Add Lead Dialog ── */}
      <Dialog open={showAddLeadDialog} onOpenChange={setShowAddLeadDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader className="pb-1">
            <DialogTitle>Add New Lead</DialogTitle>
            <DialogDescription>Track a potential customer</DialogDescription>
          </DialogHeader>
          <div className="space-y-2.5">
            <div className="grid grid-cols-2 gap-2.5">
              <div className="col-span-2 sm:col-span-1">
                <Label htmlFor="lead_name" className="text-xs">Name *</Label>
                <Input id="lead_name" value={newLeadData.name} onChange={e => setNewLeadData({ ...newLeadData, name: e.target.value })} placeholder="e.g. Thabo Mokoena" className="h-8 text-sm" />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <Label htmlFor="lead_business" className="text-xs">Business Name</Label>
                <Input id="lead_business" value={newLeadData.business_name} onChange={e => setNewLeadData({ ...newLeadData, business_name: e.target.value })} placeholder="e.g. Mokoena IT" className="h-8 text-sm" />
              </div>
            </div>
            <div>
              <Label htmlFor="lead_industry" className="text-xs">Industry</Label>
              <Select value={newLeadData.industry} onValueChange={v => setNewLeadData({ ...newLeadData, industry: v, customIndustry: '' })}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {INDUSTRY_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
              {newLeadData.industry === 'Other' && (
                <Input
                  className="mt-1.5 h-8 text-sm"
                  placeholder="Type your industry..."
                  value={newLeadData.customIndustry}
                  onChange={e => setNewLeadData({ ...newLeadData, customIndustry: e.target.value })}
                  autoFocus
                />
              )}
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <Label htmlFor="lead_email" className="text-xs">Email</Label>
                <Input id="lead_email" type="email" value={newLeadData.email} onChange={e => setNewLeadData({ ...newLeadData, email: e.target.value })} placeholder="thabo@example.co.za" className="h-8 text-sm" />
              </div>
              <div>
                <Label htmlFor="lead_whatsapp" className="text-xs">WhatsApp</Label>
                <Input id="lead_whatsapp" type="tel" value={newLeadData.whatsapp} onChange={e => setNewLeadData({ ...newLeadData, whatsapp: e.target.value })} placeholder="071 234 5678" className="h-8 text-sm" />
              </div>
            </div>
            <div>
              <Label htmlFor="lead_phone" className="text-xs">Phone</Label>
              <Input id="lead_phone" type="tel" value={newLeadData.phone} onChange={e => setNewLeadData({ ...newLeadData, phone: e.target.value })} placeholder="011 234 5678" className="h-8 text-sm" />
            </div>
            <div>
              <Label htmlFor="lead_notes" className="text-xs">Notes</Label>
              <Textarea id="lead_notes" value={newLeadData.notes} onChange={e => setNewLeadData({ ...newLeadData, notes: e.target.value })} placeholder="Payment challenges, referral source..." rows={2} className="text-sm resize-none" />
            </div>
            <div className="flex items-center gap-2 pt-0.5">
              <input
                type="checkbox"
                id="lead_converted"
                checked={newLeadData.converted}
                onChange={e => setNewLeadData({ ...newLeadData, converted: e.target.checked })}
                className="h-4 w-4 rounded border-border cursor-pointer accent-green-600"
              />
              <Label htmlFor="lead_converted" className="text-sm cursor-pointer font-normal">Already converted?</Label>
            </div>
          </div>
          <DialogFooter className="pt-1">
            <Button variant="outline" size="sm" onClick={() => setShowAddLeadDialog(false)}>Cancel</Button>
            <Button size="sm" onClick={handleAddLead}>Add Lead</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCreateUserDialog} onOpenChange={setShowCreateUserDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>Create a new user account directly</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={newUserData.email}
                onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                placeholder="user@example.com"
              />
            </div>
            <div>
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                value={newUserData.full_name}
                onChange={(e) => setNewUserData({ ...newUserData, full_name: e.target.value })}
                placeholder="John Doe"
              />
            </div>
            <div>
              <Label htmlFor="password">Temporary Password *</Label>
              <Input
                id="password"
                type="password"
                value={newUserData.password}
                onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                placeholder="Enter temporary password"
              />
              <p className="text-xs text-muted-foreground mt-1">User can change this after first login</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateUserDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateUser}>Create User</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Access Request</DialogTitle>
            <DialogDescription>
              Approve access for {selectedRequest?.email}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="temp_password">Temporary Password</Label>
              <Input
                id="temp_password"
                type="password"
                value={approvalData.temporaryPassword}
                onChange={(e) => setApprovalData({ temporaryPassword: e.target.value })}
                placeholder="Enter temporary password"
              />
              <p className="text-xs text-muted-foreground mt-1">
                User will be able to change this password after first login
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleApproveRequest}>Approve</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Access Request</DialogTitle>
            <DialogDescription>
              Reject access for {selectedRequest?.email}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="reason">Reason (optional)</Label>
              <Textarea
                id="reason"
                value={rejectionData.reason}
                onChange={(e) => setRejectionData({ reason: e.target.value })}
                placeholder="Enter reason for rejection"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRejectRequest}>Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteUserDialog} onOpenChange={setShowDeleteUserDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              This will permanently delete <strong>{userToDelete?.email}</strong> and all their data including clients, invoices, and subscriptions. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDeleteUserDialog(false); setUserToDelete(null); }}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteUser}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showManageDialog} onOpenChange={setShowManageDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Subscription</DialogTitle>
            <DialogDescription>
              Manage subscription for {selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={manageData.status} onValueChange={(value: any) => setManageData({ ...manageData, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="billing_cycle_manage">Billing Cycle (days)</Label>
              <Input
                id="billing_cycle_manage"
                type="number"
                value={manageData.billing_cycle_days}
                onChange={(e) => setManageData({ ...manageData, billing_cycle_days: parseInt(e.target.value) })}
              />
            </div>
            
            <div>
              <Label htmlFor="payment_date">Record Payment Date</Label>
              <Input
                id="payment_date"
                type="date"
                value={manageData.payment_date}
                onChange={(e) => setManageData({ ...manageData, payment_date: e.target.value })}
                max={new Date().toISOString().split('T')[0]}
              />
              <p className="text-xs text-muted-foreground mt-1">Cannot select future dates</p>
              {manageData.payment_date && (
                <div className="mt-2 p-3 bg-muted rounded-md">
                  <p className="text-xs font-medium mb-1">Calculated Dates:</p>
                  <p className="text-xs text-muted-foreground">
                    • Expires: {format(
                      new Date(new Date(manageData.payment_date).getTime() + manageData.billing_cycle_days * 24 * 60 * 60 * 1000),
                      'MMM dd, yyyy'
                    )} ({manageData.billing_cycle_days} days from payment)
                  </p>
                  <p className="text-xs text-muted-foreground">
                    • Status will be set to: Active
                  </p>
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Expiration date will be automatically calculated based on billing cycle
              </p>
            </div>
            
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={manageData.notes}
                onChange={(e) => setManageData({ ...manageData, notes: e.target.value })}
                placeholder="Add notes about this subscription"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowManageDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleManageSubscription}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
