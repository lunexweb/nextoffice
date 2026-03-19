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
import { Users, UserPlus, Clock, CheckCircle, XCircle, Pause, RefreshCw, Trash2, LogOut } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';

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
      const [{ data: profilesData }, { data: requestsData }] = await Promise.all([
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
        <TabsList className="w-full sm:w-auto grid grid-cols-2 sm:inline-flex">
          <TabsTrigger value="users" className="text-xs sm:text-sm">Users</TabsTrigger>
          <TabsTrigger value="requests" className="text-xs sm:text-sm">Access Requests</TabsTrigger>
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
      </Tabs>

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
