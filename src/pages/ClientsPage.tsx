import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Edit, Trash2, X, Save, User, Mail, Phone, MapPin, Briefcase, Eye } from 'lucide-react';
import { NOCard } from '@/components/nextoffice/shared';
import { useClients, useInvoices } from '@/hooks';
import { useCommitments } from '@/hooks/useCommitments';
import { Client, ClientFormData, FilterTab } from '@/types';
import { getClientColorClasses, validateEmail, validateRequired } from '@/utils/styles';
import { LoadingSpinner, SectionLoading, OverlayLoading } from '@/components/ui/LoadingStates';
import { computeAndRateClient } from '@/utils/scoring';

const filters: FilterTab[] = ['all', 'active', 'recurring'];

const ClientsPage: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterTab>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState<ClientFormData>({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postalCode: '',
    clientType: 'individual',
    relationshipType: 'once_off',
  });
  const [errorModal, setErrorModal] = useState<{ show: boolean; message: string }>({ show: false, message: '' });
  const [fieldErrors, setFieldErrors] = useState<{ name?: boolean; email?: boolean }>({});
  const [deleteModal, setDeleteModal] = useState<{ show: boolean; clientId: string; clientName: string }>({ show: false, clientId: '', clientName: '' });

  const { 
    clients, 
    loading, 
    error, 
    createClient, 
    updateClient, 
    deleteClient 
  } = useClients();
  const { invoices } = useInvoices();
  const { commitments } = useCommitments();

  const filteredClients = clients.filter(client => {
    const matchesSearch = search === '' || 
      client.name.toLowerCase().includes(search.toLowerCase()) ||
      client.email.toLowerCase().includes(search.toLowerCase()) ||
      client.phone.toLowerCase().includes(search.toLowerCase());
    
    const matchesFilter = filter === 'all' || 
      (filter === 'active' && client.status === 'active') ||
      (filter === 'recurring' && client.relationshipType === 'recurring');
    
    return matchesSearch && matchesFilter;
  });

  const handleAddClient = async () => {
    const errors: { name?: boolean; email?: boolean } = {};
    if (!validateRequired(formData.name)) errors.name = true;
    if (!validateRequired(formData.email)) errors.email = true;
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setErrorModal({ show: true, message: 'Client name and email address are required to send invoices and automated emails.' });
      return;
    }
    if (!validateEmail(formData.email)) {
      setFieldErrors({ email: true });
      setErrorModal({ show: true, message: 'Please enter a valid email address (e.g. client@example.com).' });
      return;
    }
    setFieldErrors({});
    const newClient = await createClient(formData);
    if (newClient) {
      setFormData({ name: '', email: '', phone: '', address: '', city: '', postalCode: '', clientType: 'individual', relationshipType: 'once_off' });
      setShowAddModal(false);
    }
  };

  const handleEditClient = (client: Client) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      email: client.email,
      phone: client.phone,
      address: client.address,
      city: client.city,
      postalCode: client.postalCode,
      clientType: client.clientType || 'individual',
      relationshipType: client.relationshipType || 'once_off',
    });
  };

  const handleUpdateClient = async () => {
    if (!editingClient) return;
    const errors: { name?: boolean; email?: boolean } = {};
    if (!validateRequired(formData.name)) errors.name = true;
    if (!validateRequired(formData.email)) errors.email = true;
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setErrorModal({ show: true, message: 'Client name and email address are required to send invoices and automated emails.' });
      return;
    }
    if (!validateEmail(formData.email)) {
      setFieldErrors({ email: true });
      setErrorModal({ show: true, message: 'Please enter a valid email address (e.g. client@example.com).' });
      return;
    }
    setFieldErrors({});
    const updatedClient = await updateClient(editingClient.id, formData);
    if (updatedClient) {
      setEditingClient(null);
      setFormData({ name: '', email: '', phone: '', address: '', city: '', postalCode: '', clientType: 'individual', relationshipType: 'once_off' });
    }
  };

  const handleDeleteClient = (clientId: string, clientName: string) => {
    setDeleteModal({ show: true, clientId, clientName });
  };

  const confirmDelete = async () => {
    const result = await deleteClient(deleteModal.clientId);
    setDeleteModal({ show: false, clientId: '', clientName: '' });
    if (!result.success) {
      setErrorModal({ show: true, message: result.error || 'Failed to delete client.' });
    }
  };

  const handleCancel = () => {
    setEditingClient(null);
    setShowAddModal(false);
    setFieldErrors({});
    setFormData({ name: '', email: '', phone: '', address: '', city: '', postalCode: '', clientType: 'individual', relationshipType: 'once_off' });
  };

  if (loading && clients.length === 0) {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="font-serif text-lg sm:text-2xl">Clients</h2>
        <div className="h-9 w-32 bg-muted animate-pulse rounded-md" />
      </div>
      <SectionLoading message="Loading clients..." height="h-64" />
    </div>
  );
}

if (error) {
  return (
    <div className="p-8 flex items-center justify-center">
      <div className="text-red-500 text-center">
        <p className="font-medium">Error loading clients</p>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    </div>
  );
}

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search clients by name, email, or phone..."
            className="w-full pl-10 pr-4 py-3 rounded-md border border-border bg-no-surface-raised outline-none focus:ring-2 focus:ring-primary transition-all" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {filters.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors capitalize ${filter === f ? 'bg-primary text-primary-foreground' : 'border border-border text-muted-foreground hover:bg-accent'}`}>
              {f.replace('_', ' ')}
            </button>
          ))}
          <button onClick={() => setShowAddModal(true)} className="px-4 py-2 rounded-md bg-primary text-primary-foreground font-medium hover:opacity-90 transition-all text-sm flex items-center gap-2">
            <Plus size={16} />
            Add New Client
          </button>
        </div>
      </div>

      {filteredClients.length === 0 ? (
        <NOCard className="p-12 text-center">
          <div className="flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <User size={32} className="text-muted-foreground" />
            </div>
            <h3 className="font-serif text-xl font-bold mb-2">
              {search || filter !== 'all' ? 'No clients found' : 'No clients yet'}
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              {search || filter !== 'all' 
                ? 'Try adjusting your search or filters' 
                : 'Get started by adding your first client'}
            </p>
            {!search && filter === 'all' && (
              <button
                onClick={() => setShowAddModal(true)}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
              >
                <Plus size={16} />
                Add Your First Client
              </button>
            )}
          </div>
        </NOCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.map((c, index) => {
          const clientInvoices = invoices.filter(inv => inv.clientId === c.id);
          const clientCommits = commitments.filter(cm => cm.clientId === c.id);
          const rated = computeAndRateClient(clientInvoices, clientCommits, c.relationshipType === 'recurring');
          const score = rated.score;
          const label = { short: rated.label, long: rated.longLabel };

          const totalViews = clientInvoices.reduce((sum, inv) => sum + (inv.viewCount || 0), 0);
          const initials = c.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
          const avatarBg = rated.isNew ? 'bg-blue-100 text-blue-700' : score >= 75 ? 'bg-green-100 text-green-700' : score >= 60 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700';
          const accentBar = rated.isNew ? 'bg-blue-400' : score >= 75 ? 'bg-green-500' : score >= 60 ? 'bg-amber-500' : 'bg-red-500';
          const scoreBg = rated.isNew ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' : score >= 75 ? 'bg-green-50 text-green-700 ring-1 ring-green-200' : score >= 60 ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' : 'bg-red-50 text-red-700 ring-1 ring-red-200';

          return (
            <div key={c.id} style={{ animationDelay: `${index * 50}ms` }} className="animate-fade-in h-full">
              <NOCard className="flex flex-col overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 group h-full">
                {/* Color accent top bar */}
                <div className={`h-1.5 w-full ${accentBar}`} />

                <div className="p-4 sm:p-6 flex flex-col flex-1">
                  {/* Header */}
                  <div className="flex items-center gap-3 mb-5 min-h-[48px]">
                    {/* Avatar */}
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-base flex-shrink-0 ${avatarBg}`}>
                      {initials}
                    </div>
                    {/* Name + level */}
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <h3 className="font-serif font-bold text-base text-foreground leading-tight truncate">{c.name}</h3>
                      <p className={`text-xs font-semibold uppercase tracking-wide mt-0.5 truncate ${getClientColorClasses(c.color).text}`}>{label.long}</p>
                    </div>
                    {/* Score badge */}
                    <span className={`text-xs font-bold px-2 py-1 rounded-lg flex-shrink-0 whitespace-nowrap ${scoreBg}`}>
                      {label.short}
                    </span>
                  </div>

                  {/* Score bar */}
                  <div className="mb-5">
                    <div className="flex justify-between text-[11px] text-muted-foreground mb-1.5">
                      <span>Payment Score</span>
                      <span>{clientInvoices.length > 0 ? `${score}/100` : 'No invoices yet'}</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${accentBar}`}
                        style={{ width: `${clientInvoices.length > 0 ? score : 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Invoice views */}
                  {clientInvoices.length > 0 && (
                    <div className="flex items-center gap-1.5 mb-3 text-xs">
                      <Eye size={12} className={totalViews > 0 ? 'text-blue-500' : 'text-muted-foreground/50'} />
                      <span className={totalViews > 0 ? 'text-blue-600 font-medium' : 'text-muted-foreground'}>
                        {totalViews} view{totalViews !== 1 ? 's' : ''} across {clientInvoices.length} invoice{clientInvoices.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  )}

                  {/* Contact info */}
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail size={12} className="text-muted-foreground flex-shrink-0" />
                      <span className="text-foreground text-xs truncate">{c.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Phone size={12} className="text-muted-foreground flex-shrink-0" />
                      <span className="text-foreground text-xs truncate">{c.phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin size={12} className="text-muted-foreground flex-shrink-0" />
                      <span className="text-foreground text-xs truncate">{c.address}, {c.city}, {c.postalCode}</span>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between mt-5 pt-4 border-t border-border">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      <span className="text-xs font-medium text-muted-foreground capitalize">{c.status}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEditClient(c)}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                        title="Edit"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteClient(c.id, c.name)}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                      <button
                        onClick={() => navigate(`/app/clients/${c.slug}`)}
                        className="ml-1 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
                      >
                        Open
                      </button>
                    </div>
                  </div>
                </div>
              </NOCard>
            </div>
          );
        })}
        </div>
      )}

      {(showAddModal || editingClient) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4">
          <NOCard className="w-full max-w-md max-h-[90vh] flex flex-col animate-slide-up relative shadow-2xl overflow-hidden">
            {(loading && (showAddModal || editingClient)) && <OverlayLoading message="Processing..." />}

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="font-serif text-base font-bold">
                {editingClient ? 'Edit Client' : 'Add New Client'}
              </h3>
              <button onClick={handleCancel} className="p-1.5 hover:bg-muted rounded-md transition-colors">
                <X size={16} className="text-muted-foreground" />
              </button>
            </div>

            {/* Form */}
            <div className="px-5 py-4 space-y-3 overflow-y-auto flex-1">
              {/* Client Type Toggle */}
              <div className="flex rounded-lg border-2 border-border overflow-hidden">
                <button
                  onClick={() => setFormData({ ...formData, clientType: 'individual' })}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold transition-colors ${
                    formData.clientType === 'individual'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent'
                  }`}
                >
                  <User size={14} />
                  Individual
                </button>
                <button
                  onClick={() => setFormData({ ...formData, clientType: 'business' })}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold transition-colors ${
                    formData.clientType === 'business'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent'
                  }`}
                >
                  <Briefcase size={14} />
                  Business
                </button>
              </div>

              {/* Relationship Type Toggle */}
              <div>
                <label className="text-xs font-semibold mb-1.5 block text-muted-foreground uppercase tracking-wide">Billing Relationship</label>
                <div className="flex rounded-lg border-2 border-border overflow-hidden">
                  <button
                    onClick={() => setFormData({ ...formData, relationshipType: 'once_off' })}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold transition-colors ${
                      formData.relationshipType === 'once_off' || !formData.relationshipType
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent'
                    }`}
                  >
                    Once-off
                  </button>
                  <button
                    onClick={() => setFormData({ ...formData, relationshipType: 'recurring' })}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold transition-colors ${
                      formData.relationshipType === 'recurring'
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent'
                    }`}
                  >
                    Recurring
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {formData.relationshipType === 'recurring'
                    ? 'Recurring clients start at a higher trust score (70)'
                    : 'Once-off clients start at the standard score (60)'}
                </p>
              </div>

              {/* Name */}
              <div>
                <label className="text-xs font-semibold mb-1 block text-muted-foreground uppercase tracking-wide">
                  {formData.clientType === 'business' ? 'Business Name' : 'Full Name'} <span className="text-red-500">*</span>
                </label>
                <input
                  value={formData.name}
                  onChange={e => { setFormData({ ...formData, name: e.target.value }); setFieldErrors(fe => ({ ...fe, name: false })); }}
                  className={`w-full px-3 py-2 rounded-lg border bg-background outline-none focus:ring-2 text-sm transition-colors ${
                    fieldErrors.name ? 'border-red-400 focus:ring-red-400' : 'border-border focus:ring-primary'
                  }`}
                  placeholder={formData.clientType === 'business' ? 'Company Pty Ltd' : 'John Doe'}
                  autoFocus
                />
                {fieldErrors.name && <p className="text-xs text-red-500 mt-1">Name is required</p>}
              </div>

              {/* Email */}
              <div>
                <label className="text-xs font-semibold mb-1 block text-muted-foreground uppercase tracking-wide">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => { setFormData({ ...formData, email: e.target.value }); setFieldErrors(fe => ({ ...fe, email: false })); }}
                  className={`w-full px-3 py-2 rounded-lg border bg-background outline-none focus:ring-2 text-sm transition-colors ${
                    fieldErrors.email ? 'border-red-400 focus:ring-red-400' : 'border-border focus:ring-primary'
                  }`}
                  placeholder="client@example.com"
                />
                {fieldErrors.email && <p className="text-xs text-red-500 mt-1">A valid email is required for automated emails to work</p>}
              </div>

              {/* Phone */}
              <div>
                <label className="text-xs font-semibold mb-1 block text-muted-foreground uppercase tracking-wide">Phone</label>
                <input
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary text-sm transition-colors"
                  placeholder="011 234 5678"
                />
              </div>

              {/* Address */}
              <div>
                <label className="text-xs font-semibold mb-1 block text-muted-foreground uppercase tracking-wide">Address</label>
                <input
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary text-sm transition-colors"
                  placeholder="123 Main Street"
                />
              </div>

              {/* City & Postal Code */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold mb-1 block text-muted-foreground uppercase tracking-wide">City</label>
                  <input
                    value={formData.city}
                    onChange={e => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary text-sm transition-colors"
                    placeholder="Johannesburg"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold mb-1 block text-muted-foreground uppercase tracking-wide">Postal Code</label>
                  <input
                    value={formData.postalCode}
                    onChange={e => setFormData({ ...formData, postalCode: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary text-sm transition-colors"
                    placeholder="0001"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-2 px-5 py-4 border-t border-border bg-muted/30">
              <button
                onClick={handleCancel}
                className="flex-1 px-4 py-2 rounded-lg border border-border text-foreground hover:bg-accent transition-colors font-semibold text-sm"
              >
                Cancel
              </button>
              <button
                onClick={editingClient ? handleUpdateClient : handleAddClient}
                disabled={loading}
                className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
              >
                {loading ? (
                  <><LoadingSpinner size="sm" />{editingClient ? 'Updating...' : 'Adding...'}</>
                ) : (
                  <><Save size={14} />{editingClient ? 'Update Client' : 'Add Client'}</>
                )}
              </button>
            </div>
          </NOCard>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.show && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="w-full max-w-md animate-slide-up">
            <NOCard className="overflow-hidden shadow-2xl">
              {/* Header */}
              <div className="bg-red-50 dark:bg-red-950/30 p-6 border-b border-red-200 dark:border-red-900">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
                    <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <h3 className="font-serif text-xl font-bold text-red-900 dark:text-red-100">Delete Client</h3>
                    <p className="text-sm text-red-700 dark:text-red-300">This action cannot be undone</p>
                  </div>
                </div>
              </div>
              
              {/* Body */}
              <div className="p-4 sm:p-6">
                <p className="text-foreground mb-2">
                  Are you sure you want to delete <span className="font-bold">{deleteModal.clientName}</span>?
                </p>
                <p className="text-sm text-muted-foreground">
                  All associated invoices and data will be permanently removed.
                </p>
              </div>
              
              {/* Footer */}
              <div className="flex gap-3 p-6 bg-muted/30 border-t border-border">
                <button
                  onClick={() => setDeleteModal({ show: false, clientId: '', clientName: '' })}
                  className="flex-1 px-4 py-2.5 rounded-lg border-2 border-border bg-background text-foreground hover:bg-accent transition-colors font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors font-semibold shadow-lg"
                >
                  Delete Client
                </button>
              </div>
            </NOCard>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {errorModal.show && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="w-full max-w-md animate-slide-up">
            <NOCard className="overflow-hidden shadow-2xl">
              {/* Header */}
              <div className="bg-red-50 dark:bg-red-950/30 p-6 border-b border-red-200 dark:border-red-900">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
                    <X className="w-6 h-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <h3 className="font-serif text-xl font-bold text-red-900 dark:text-red-100">Error</h3>
                    <p className="text-sm text-red-700 dark:text-red-300">Something went wrong</p>
                  </div>
                </div>
              </div>
              
              {/* Body */}
              <div className="p-4 sm:p-6">
                <p className="text-foreground">
                  {errorModal.message}
                </p>
              </div>
              
              {/* Footer */}
              <div className="p-4 sm:p-6 bg-muted/30 border-t border-border">
                <button
                  onClick={() => setErrorModal({ show: false, message: '' })}
                  className="w-full px-4 py-2.5 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors font-semibold shadow-lg"
                >
                  Got it
                </button>
              </div>
            </NOCard>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientsPage;
