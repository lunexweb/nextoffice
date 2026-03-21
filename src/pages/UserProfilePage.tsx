import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { 
  User, 
  Building, 
  MapPin, 
  CreditCard, 
  Settings, 
  Save,
  Upload,
  CheckCircle2,
  AlertCircle,
  Trash2,
  ImageIcon
} from 'lucide-react';
import { NOCard } from '@/components/nextoffice/shared';

interface UserProfileData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  businessName: string;
  businessType: string;
  description: string;
  website: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  branchCode: string;
  accountType: string;
  vatNumber: string;
  vatEnabled: boolean;
  vatPercentage: number;
  invoicePrefix: string;
  defaultDueDays: number;
  paymentTerms: string;
}

const UserProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('personal');
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [saveError, setSaveError] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState('');
  const logoInputRef = useRef<HTMLInputElement>(null);

  const ALLOWED_LOGO_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/svg+xml', 'image/webp', 'image/x-icon', 'image/bmp'];
  const MAX_LOGO_SIZE = 2 * 1024 * 1024; // 2MB

  const [profileData, setProfileData] = useState<UserProfileData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    businessName: '',
    businessType: '',
    description: '',
    website: '',
    address: '',
    city: '',
    province: '',
    postalCode: '',
    country: 'South Africa',
    bankName: '',
    accountNumber: '',
    accountHolder: '',
    branchCode: '',
    accountType: 'current',
    vatNumber: '',
    vatEnabled: false,
    vatPercentage: 15,
    invoicePrefix: 'INV',
    defaultDueDays: 30,
    paymentTerms: '',
  });

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const [{ data: profile }, { data: banking }] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
          supabase.from('banking_details').select('*').eq('user_id', user.id).eq('is_primary', true).maybeSingle(),
        ]);
        if (profile) {
          setLogoUrl(profile.logo_url || null);
          setProfileData(prev => ({
            ...prev,
            firstName: profile.first_name || '',
            lastName: profile.last_name || '',
            email: profile.email || user.email || '',
            phone: profile.phone || '',
            businessName: profile.business_name || '',
            businessType: profile.business_type || '',
            description: profile.description || '',
            website: profile.website || '',
            address: profile.address || '',
            city: profile.city || '',
            province: profile.province || '',
            postalCode: profile.postal_code || '',
            country: profile.country || 'South Africa',
            vatNumber: profile.vat_number || '',
            vatEnabled: profile.vat_enabled || false,
            vatPercentage: profile.vat_percentage || 15,
            invoicePrefix: profile.invoice_prefix || 'INV',
            defaultDueDays: profile.default_due_days || 30,
            paymentTerms: profile.payment_terms || '',
            bankName: banking?.bank_name || '',
            accountNumber: banking?.account_number || '',
            accountHolder: banking?.account_holder || '',
            branchCode: banking?.branch_code || '',
            accountType: banking?.account_type || 'current',
          }));
        }
      } finally {
        setLoadingProfile(false);
      }
    };
    load();
  }, []);

  const handleInputChange = (field: keyof UserProfileData, value: string | number | boolean) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoError('');

    if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
      setLogoError('Invalid file type. Please upload PNG, JPG, GIF, SVG, WebP, ICO, or BMP.');
      return;
    }
    if (file.size > MAX_LOGO_SIZE) {
      setLogoError('File too large. Maximum size is 2 MB.');
      return;
    }

    setLogoUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
      const filePath = `${user.id}/logo.${ext}`;

      // Remove old logo files first
      const { data: existing } = await supabase.storage.from('logos').list(user.id);
      if (existing && existing.length > 0) {
        await supabase.storage.from('logos').remove(existing.map(f => `${user.id}/${f.name}`));
      }

      const { error: uploadError } = await supabase.storage.from('logos').upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('logos').getPublicUrl(filePath);
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      await supabase.from('profiles').update({ logo_url: publicUrl }).eq('id', user.id);
      setLogoUrl(publicUrl);
      window.dispatchEvent(new Event('profileUpdated'));
    } catch (err: any) {
      setLogoError(err?.message || 'Failed to upload logo');
    } finally {
      setLogoUploading(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  const handleLogoDelete = async () => {
    setLogoError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: existing } = await supabase.storage.from('logos').list(user.id);
      if (existing && existing.length > 0) {
        await supabase.storage.from('logos').remove(existing.map(f => `${user.id}/${f.name}`));
      }

      await supabase.from('profiles').update({ logo_url: null }).eq('id', user.id);
      setLogoUrl(null);
      window.dispatchEvent(new Event('profileUpdated'));
    } catch (err: any) {
      setLogoError(err?.message || 'Failed to delete logo');
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus('idle');
    setSaveError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error: profileError } = await supabase.from('profiles').update({
        first_name: profileData.firstName,
        last_name: profileData.lastName,
        phone: profileData.phone,
        business_name: profileData.businessName,
        business_type: profileData.businessType,
        description: profileData.description,
        website: profileData.website,
        address: profileData.address,
        city: profileData.city,
        province: profileData.province,
        postal_code: profileData.postalCode,
        country: profileData.country,
        vat_number: profileData.vatNumber,
        vat_enabled: profileData.vatEnabled,
        vat_percentage: profileData.vatPercentage,
        invoice_prefix: profileData.invoicePrefix,
        default_due_days: profileData.defaultDueDays,
        payment_terms: profileData.paymentTerms,
      }).eq('id', user.id);
      if (profileError) throw profileError;

      if (profileData.bankName || profileData.accountNumber) {
        const bankPayload = {
          user_id: user.id,
          bank_name: profileData.bankName,
          account_number: profileData.accountNumber,
          account_holder: profileData.accountHolder,
          branch_code: profileData.branchCode,
          account_type: profileData.accountType,
          is_primary: true,
        };
        const { data: existing } = await supabase
          .from('banking_details')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();
        let bankError;
        if (existing) {
          ({ error: bankError } = await supabase
            .from('banking_details')
            .update(bankPayload)
            .eq('id', existing.id));
        } else {
          ({ error: bankError } = await supabase
            .from('banking_details')
            .insert(bankPayload));
        }
        if (bankError) throw bankError;
      }

      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 4000);
    } catch (err: any) {
      setSaveStatus('error');
      setSaveError(err?.message || 'Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  };

  if (loadingProfile) {
    return <div className="p-4 sm:p-6 lg:p-8 text-muted-foreground">Loading profile...</div>;
  }

  const tabs = [
    { id: 'personal', label: 'Personal Info', icon: User },
    { id: 'business', label: 'Business Info', icon: Building },
    { id: 'address', label: 'Address', icon: MapPin },
    { id: 'banking', label: 'Banking Details', icon: CreditCard },
    { id: 'settings', label: 'Invoice Settings', icon: Settings },
  ];

  const renderPersonalInfo = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium mb-2 block">First Name</label>
          <input
            value={profileData.firstName}
            onChange={(e) => handleInputChange('firstName', e.target.value)}
            placeholder="John"
            className="w-full p-2 border border-border rounded-md bg-no-surface-raised outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-2 block">Last Name</label>
          <input
            value={profileData.lastName}
            onChange={(e) => handleInputChange('lastName', e.target.value)}
            placeholder="Doe"
            className="w-full p-2 border border-border rounded-md bg-no-surface-raised outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">Email Address</label>
        <input
          type="email"
          value={profileData.email}
          onChange={(e) => handleInputChange('email', e.target.value)}
          placeholder="john@example.com"
          className="w-full p-2 border border-border rounded-md bg-no-surface-raised outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">Phone Number</label>
        <input
          value={profileData.phone}
          onChange={(e) => handleInputChange('phone', e.target.value)}
          placeholder="+27 12 345 6789"
          className="w-full p-2 border border-border rounded-md bg-no-surface-raised outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
    </div>
  );

  const renderBusinessInfo = () => (
    <div className="space-y-6">
      {/* Business Logo Upload */}
      <div className="border border-border rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold">Business Logo</h3>
            <p className="text-xs text-muted-foreground">Appears on invoices, emails and documents · Max 2 MB · PNG, JPG, SVG, WebP, GIF</p>
          </div>
        </div>

        <div className="flex items-center gap-5">
          {logoUrl ? (
            <div className="w-24 h-24 rounded-lg border border-border bg-white flex items-center justify-center overflow-hidden">
              <img src={logoUrl} alt="Business logo" className="max-w-full max-h-full object-contain" />
            </div>
          ) : (
            <div className="w-24 h-24 border-2 border-dashed border-muted-foreground/25 rounded-lg flex flex-col items-center justify-center bg-muted/50 gap-1">
              <ImageIcon className="w-6 h-6 text-muted-foreground/50" />
              <span className="text-[10px] text-muted-foreground">No logo</span>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <input
              ref={logoInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/gif,image/svg+xml,image/webp,image/x-icon,image/bmp"
              onChange={handleLogoUpload}
              className="hidden"
            />
            <button
              onClick={() => logoInputRef.current?.click()}
              disabled={logoUploading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-border hover:bg-accent transition-colors disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              {logoUploading ? 'Uploading…' : logoUrl ? 'Replace Logo' : 'Upload Logo'}
            </button>
            {logoUrl && (
              <button
                onClick={handleLogoDelete}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg text-red-600 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Remove
              </button>
            )}
          </div>
        </div>

        {logoError && (
          <p className="text-xs text-red-600 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            {logoError}
          </p>
        )}
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">Business Name</label>
        <input
          value={profileData.businessName}
          onChange={(e) => handleInputChange('businessName', e.target.value)}
          placeholder="My Business Pty Ltd"
          className="w-full p-2 border border-border rounded-md bg-no-surface-raised outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">Business Type</label>
        <select
          value={profileData.businessType}
          onChange={(e) => handleInputChange('businessType', e.target.value)}
          className="w-full p-2 border border-border rounded-md bg-no-surface-raised outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">Select business type</option>
          <option value="sole-proprietor">Sole Proprietor</option>
          <option value="partnership">Partnership</option>
          <option value="private-company">Private Company (Pty) Ltd</option>
          <option value="public-company">Public Company Ltd</option>
          <option value="close-corporation">Close Corporation (CC)</option>
          <option value="trust">Trust</option>
          <option value="ngo">NGO/NPO</option>
        </select>
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">Business Description</label>
        <textarea
          value={profileData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          placeholder="Describe your business and the services you offer..."
          rows={3}
          className="w-full p-2 border border-border rounded-md bg-no-surface-raised outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">Website</label>
        <input
          value={profileData.website}
          onChange={(e) => handleInputChange('website', e.target.value)}
          placeholder="https://www.mybusiness.com"
          className="w-full p-2 border border-border rounded-md bg-no-surface-raised outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">VAT Number</label>
        <input
          value={profileData.vatNumber}
          onChange={(e) => handleInputChange('vatNumber', e.target.value)}
          placeholder="4123456789"
          disabled={!profileData.vatEnabled}
          className="w-full p-2 border border-border rounded-md bg-no-surface-raised outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 border border-border rounded-lg">
          <div>
            <label className="text-base font-semibold">Include VAT on Invoices</label>
            <p className="text-sm text-muted-foreground">Enable VAT calculation on your invoices</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={profileData.vatEnabled}
              onChange={(e) => handleInputChange('vatEnabled', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>

        {profileData.vatEnabled && (
          <div>
            <label className="text-sm font-medium mb-2 block">VAT Percentage (%)</label>
            <input
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={profileData.vatPercentage}
              onChange={(e) => handleInputChange('vatPercentage', parseFloat(e.target.value))}
              placeholder="15"
              className="w-32 p-2 border border-border rounded-md bg-no-surface-raised outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-muted-foreground mt-1">Standard VAT rate for your country (e.g., 15% for South Africa)</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderAddress = () => (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-2 block">Street Address</label>
        <input
          value={profileData.address}
          onChange={(e) => handleInputChange('address', e.target.value)}
          placeholder="123 Business Street"
          className="w-full p-2 border border-border rounded-md bg-no-surface-raised outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium mb-2 block">City</label>
          <input
            value={profileData.city}
            onChange={(e) => handleInputChange('city', e.target.value)}
            placeholder="Johannesburg"
            className="w-full p-2 border border-border rounded-md bg-no-surface-raised outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-2 block">Province</label>
          <select
            value={profileData.province}
            onChange={(e) => handleInputChange('province', e.target.value)}
            className="w-full p-2 border border-border rounded-md bg-no-surface-raised outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Select province</option>
            <option value="gauteng">Gauteng</option>
            <option value="western-cape">Western Cape</option>
            <option value="kwazulu-natal">KwaZulu-Natal</option>
            <option value="eastern-cape">Eastern Cape</option>
            <option value="free-state">Free State</option>
            <option value="mpumalanga">Mpumalanga</option>
            <option value="limpopo">Limpopo</option>
            <option value="north-west">North West</option>
            <option value="northern-cape">Northern Cape</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Postal Code</label>
          <input
            value={profileData.postalCode}
            onChange={(e) => handleInputChange('postalCode', e.target.value)}
            placeholder="2000"
            className="w-full p-2 border border-border rounded-md bg-no-surface-raised outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-2 block">Country</label>
          <input
            value={profileData.country}
            onChange={(e) => handleInputChange('country', e.target.value)}
            placeholder="South Africa"
            className="w-full p-2 border border-border rounded-md bg-no-surface-raised outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>
    </div>
  );

  const renderBankingDetails = () => (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <CreditCard className="w-5 h-5 text-amber-600 mt-0.5" />
          <div>
            <h4 className="font-semibold text-amber-900">Secure Banking Information</h4>
            <p className="text-sm text-amber-800">
              This information will be displayed on your invoices for clients to make payments. Please ensure all details are accurate.
            </p>
          </div>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">Bank Name</label>
        <select
          value={profileData.bankName}
          onChange={(e) => handleInputChange('bankName', e.target.value)}
          className="w-full p-2 border border-border rounded-md bg-no-surface-raised outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">Select bank</option>
          <option value="absa">ABSA Bank</option>
          <option value="fnb">First National Bank (FNB)</option>
          <option value="nedbank">Nedbank</option>
          <option value="standard-bank">Standard Bank</option>
          <option value="capitec">Capitec Bank</option>
          <option value="investec">Investec</option>
          <option value="african-bank">African Bank</option>
          <option value="tymebank">TymeBank</option>
          <option value="discovery">Discovery Bank</option>
        </select>
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">Account Holder Name</label>
        <input
          value={profileData.accountHolder}
          onChange={(e) => handleInputChange('accountHolder', e.target.value)}
          placeholder="John Doe"
          className="w-full p-2 border border-border rounded-md bg-no-surface-raised outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Account Number</label>
          <input
            value={profileData.accountNumber}
            onChange={(e) => handleInputChange('accountNumber', e.target.value)}
            placeholder="1234567890"
            className="w-full p-2 border border-border rounded-md bg-no-surface-raised outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-2 block">Branch Code</label>
          <input
            value={profileData.branchCode}
            onChange={(e) => handleInputChange('branchCode', e.target.value)}
            placeholder="250655"
            className="w-full p-2 border border-border rounded-md bg-no-surface-raised outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">Account Type</label>
        <select
          value={profileData.accountType}
          onChange={(e) => handleInputChange('accountType', e.target.value)}
          className="w-full p-2 border border-border rounded-md bg-no-surface-raised outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="current">Current/Cheque Account</option>
          <option value="savings">Savings Account</option>
          <option value="transmission">Transmission Account</option>
          <option value="bond">Bond Account</option>
        </select>
      </div>
    </div>
  );

  const renderInvoiceSettings = () => (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-2 block">Invoice Number Prefix</label>
        <input
          value={profileData.invoicePrefix}
          onChange={(e) => handleInputChange('invoicePrefix', e.target.value)}
          placeholder="INV"
          className="w-full p-2 border border-border rounded-md bg-no-surface-raised outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">Default Payment Terms (Days)</label>
        <input
          type="number"
          value={profileData.defaultDueDays}
          onChange={(e) => handleInputChange('defaultDueDays', parseInt(e.target.value))}
          placeholder="30"
          className="w-full p-2 border border-border rounded-md bg-no-surface-raised outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">Payment Terms Text</label>
        <textarea
          value={profileData.paymentTerms}
          onChange={(e) => handleInputChange('paymentTerms', e.target.value)}
          placeholder="Enter your standard payment terms..."
          rows={4}
          className="w-full p-2 border border-border rounded-md bg-no-surface-raised outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'personal': return renderPersonalInfo();
      case 'business': return renderBusinessInfo();
      case 'address': return renderAddress();
      case 'banking': return renderBankingDetails();
      case 'settings': return renderInvoiceSettings();
      default: return renderPersonalInfo();
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/app/settings')}
            className="text-muted-foreground hover:text-foreground"
          >
            ← Back
          </button>
          <div className="p-2 bg-primary/10 rounded-lg">
            <User className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="font-serif text-lg sm:text-2xl">User Profile</h2>
            <p className="text-sm text-muted-foreground">Manage your personal and business information</p>
          </div>
        </div>
        {saveStatus === 'success' ? (
          <span className="px-3 py-1 rounded text-sm font-medium border bg-green-50 text-green-700 border-green-200 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Saved!
          </span>
        ) : saveStatus === 'error' ? (
          <span className="px-3 py-1 rounded text-sm font-medium border bg-red-50 text-red-700 border-red-200 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {saveError}
          </span>
        ) : (
          <span className="px-3 py-1 rounded text-sm font-medium border bg-green-50 text-green-700 border-green-200">
            {profileData.businessName ? 'Complete' : 'Incomplete'}
          </span>
        )}
      </div>

      {/* Mobile: horizontal scrollable tabs */}
      <div className="lg:hidden">
        <div className="flex gap-1 overflow-x-auto pb-2 -mx-1 px-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                  activeTab === tab.id
                    ? 'bg-primary/10 text-primary border border-primary/30'
                    : 'text-muted-foreground border border-border hover:bg-accent'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-8">
        {/* Sidebar with Tabs — desktop only */}
        <div className="hidden lg:block lg:col-span-1">
          <NOCard className="p-0">
            <div className="p-6 border-b border-border">
              <h3 className="font-serif font-bold text-lg">Profile Sections</h3>
              <p className="text-sm text-muted-foreground mt-1">Complete all sections for full functionality</p>
            </div>
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isComplete = 
                  tab.id === 'personal' ? (profileData.firstName && profileData.lastName && profileData.email) :
                  tab.id === 'business' ? (profileData.businessName) :
                  tab.id === 'address' ? (profileData.address && profileData.city) :
                  tab.id === 'banking' ? (profileData.bankName && profileData.accountNumber) :
                  true;
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                      activeTab === tab.id
                        ? 'bg-primary/10 text-primary border-r-2 border-primary'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="flex-1 text-sm font-medium">{tab.label}</span>
                    {isComplete ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30" />
                    )}
                  </button>
                );
              })}
            </nav>
          </NOCard>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          <NOCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-serif font-bold text-lg flex items-center gap-2">
                  {React.createElement(tabs.find(t => t.id === activeTab)!.icon, { className: "w-5 h-5" })}
                  {tabs.find(t => t.id === activeTab)?.label}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {activeTab === 'personal' && 'Manage your personal information and profile picture'}
                  {activeTab === 'business' && 'Set up your business details and branding'}
                  {activeTab === 'address' && 'Configure your business address'}
                  {activeTab === 'banking' && 'Add your banking details for invoice payments'}
                  {activeTab === 'settings' && 'Customize your invoice and quote settings'}
                </p>
              </div>
              <span className="px-2 py-1 rounded text-xs font-medium bg-muted text-muted-foreground">
                {activeTab === 'personal' && 'Required'}
                {activeTab === 'business' && 'Required'}
                {activeTab === 'address' && 'Optional'}
                {activeTab === 'banking' && 'Required'}
                {activeTab === 'settings' && 'Optional'}
              </span>
            </div>

            <div className="min-h-[500px]">
              {renderTabContent()}
            </div>

            <div className="border-t border-border mt-6 pt-6">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {activeTab === 'personal' && 'Your name and email appear on invoices'}
                  {activeTab === 'business' && 'Business logo appears on all documents'}
                  {activeTab === 'address' && 'Address is optional but recommended'}
                  {activeTab === 'banking' && 'Banking details are shown to clients for payments'}
                  {activeTab === 'settings' && 'Customize your document numbering and terms'}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => navigate('/app/settings')}
                    className="px-4 py-2 border border-border rounded-md hover:bg-accent transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors min-w-[120px] flex items-center justify-center gap-2"
                  >
                    {isSaving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Save Profile
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </NOCard>
        </div>
      </div>
    </div>
  );
};

export default UserProfilePage;
