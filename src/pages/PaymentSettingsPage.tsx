import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { 
  CreditCard, 
  Save,
  FileText,
  Percent,
  Calendar,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { NOCard } from '@/components/nextoffice/shared';

const PRESET_BANKS = ['absa','fnb','nedbank','standard-bank','capitec','investec','african-bank','tymebank','discovery'];

interface PaymentSettingsData {
  bankName: string;
  customBankName: string;
  accountNumber: string;
  accountHolder: string;
  branchCode: string;
  accountType: string;
  swiftCode: string;
  vatNumber: string;
  vatEnabled: boolean;
  vatPercentage: number;
  invoicePrefix: string;
  invoiceStartNumber: number;
  quotePrefix: string;
  quoteStartNumber: number;
  defaultDueDays: number;
  paymentTerms: string;
  currency: string;
  latePaymentInterest: number;
  latePaymentEnabled: boolean;
  depositEnabled: boolean;
  defaultDepositPercentage: number;
}

const PaymentSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('banking');
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [saveError, setSaveError] = useState('');

  const [settingsData, setSettingsData] = useState<PaymentSettingsData>({
    bankName: '',
    customBankName: '',
    accountNumber: '',
    accountHolder: '',
    branchCode: '',
    accountType: 'current',
    swiftCode: '',
    vatNumber: '',
    vatEnabled: false,
    vatPercentage: 15,
    invoicePrefix: 'INV',
    invoiceStartNumber: 1001,
    quotePrefix: 'QUO',
    quoteStartNumber: 2001,
    defaultDueDays: 30,
    paymentTerms: '',
    currency: 'ZAR',
    latePaymentInterest: 2,
    latePaymentEnabled: false,
    depositEnabled: false,
    defaultDepositPercentage: 30,
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
          setSettingsData(prev => ({
            ...prev,
            vatNumber: profile.vat_number || '',
            vatEnabled: profile.vat_enabled || false,
            vatPercentage: profile.vat_percentage || 15,
            invoicePrefix: profile.invoice_prefix || 'INV',
            invoiceStartNumber: profile.invoice_start_number || 1001,
            quotePrefix: profile.quote_prefix || 'QUO',
            quoteStartNumber: profile.quote_start_number || 2001,
            defaultDueDays: profile.default_due_days || 30,
            paymentTerms: profile.payment_terms || '',
            currency: profile.currency || 'ZAR',
            latePaymentInterest: profile.late_payment_interest || 2,
            latePaymentEnabled: profile.late_payment_enabled || false,
            depositEnabled: profile.deposit_enabled || false,
            defaultDepositPercentage: profile.default_deposit_percentage || 30,
            bankName: PRESET_BANKS.includes(banking?.bank_name || '') ? (banking?.bank_name || '') : (banking?.bank_name ? 'other' : ''),
            customBankName: PRESET_BANKS.includes(banking?.bank_name || '') ? '' : (banking?.bank_name || ''),
            accountNumber: banking?.account_number || '',
            accountHolder: banking?.account_holder || '',
            branchCode: banking?.branch_code || '',
            accountType: banking?.account_type || 'current',
            swiftCode: banking?.swift_code || '',
          }));
        }
      } finally {
        setLoadingSettings(false);
      }
    };
    load();
  }, []);

  const handleInputChange = (field: keyof PaymentSettingsData, value: string | number | boolean) => {
    setSettingsData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus('idle');
    setSaveError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error: profileError } = await supabase.from('profiles').update({
        vat_number: settingsData.vatNumber,
        vat_enabled: settingsData.vatEnabled,
        vat_percentage: settingsData.vatPercentage,
        invoice_prefix: settingsData.invoicePrefix,
        invoice_start_number: settingsData.invoiceStartNumber,
        quote_prefix: settingsData.quotePrefix,
        quote_start_number: settingsData.quoteStartNumber,
        default_due_days: settingsData.defaultDueDays,
        payment_terms: settingsData.paymentTerms,
        currency: settingsData.currency,
        late_payment_interest: settingsData.latePaymentInterest,
        late_payment_enabled: settingsData.latePaymentEnabled,
        deposit_enabled: settingsData.depositEnabled,
        default_deposit_percentage: settingsData.defaultDepositPercentage,
      }).eq('id', user.id);
      if (profileError) throw profileError;

      if (settingsData.bankName || settingsData.accountNumber) {
        const bankPayload = {
          user_id: user.id,
          bank_name: settingsData.bankName === 'other' ? settingsData.customBankName : settingsData.bankName,
          account_number: settingsData.accountNumber,
          account_holder: settingsData.accountHolder,
          branch_code: settingsData.branchCode,
          account_type: settingsData.accountType,
          swift_code: settingsData.swiftCode,
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
      window.dispatchEvent(new CustomEvent('profileUpdated'));
      setTimeout(() => setSaveStatus('idle'), 4000);
    } catch (err: any) {
      setSaveStatus('error');
      setSaveError(err?.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (loadingSettings) {
    return <div className="p-4 sm:p-6 lg:p-8 text-muted-foreground">Loading settings...</div>;
  }

  const tabs = [
    { id: 'banking', label: 'Banking Details', icon: CreditCard },
    { id: 'numbering', label: 'Document Numbering', icon: FileText },
    { id: 'vat', label: 'VAT & Tax', icon: Percent },
    { id: 'terms', label: 'Payment Terms', icon: Calendar },
  ];

  const renderBankingDetails = () => (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <CreditCard className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-semibold text-blue-900">Banking Information</h4>
            <p className="text-sm text-blue-800">
              These details will appear on all your invoices and quotes. Ensure accuracy for smooth client payments.
            </p>
          </div>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">Bank Name</label>
        <select
          value={settingsData.bankName}
          onChange={(e) => handleInputChange('bankName', e.target.value)}
          className="w-full p-2 border border-border rounded-md bg-background outline-none focus:ring-2 focus:ring-primary"
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
          <option value="other">Other (type your bank)</option>
        </select>
        {settingsData.bankName === 'other' && (
          <input
            value={settingsData.customBankName}
            onChange={(e) => handleInputChange('customBankName', e.target.value)}
            placeholder="Enter your bank name"
            className="w-full mt-2 p-2 border border-border rounded-md bg-background outline-none focus:ring-2 focus:ring-primary"
          />
        )}
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">Account Holder Name</label>
        <input
          value={settingsData.accountHolder}
          onChange={(e) => handleInputChange('accountHolder', e.target.value)}
          placeholder="Your Business Name"
          className="w-full p-2 border border-border rounded-md bg-background outline-none focus:ring-2 focus:ring-primary"
        />
        <p className="text-xs text-muted-foreground mt-1">Name as it appears on your bank account</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Account Number</label>
          <input
            value={settingsData.accountNumber}
            onChange={(e) => handleInputChange('accountNumber', e.target.value)}
            placeholder="1234567890"
            className="w-full p-2 border border-border rounded-md bg-background outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-2 block">Branch Code</label>
          <input
            value={settingsData.branchCode}
            onChange={(e) => handleInputChange('branchCode', e.target.value)}
            placeholder="250655"
            className="w-full p-2 border border-border rounded-md bg-background outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Account Type</label>
          <select
            value={settingsData.accountType}
            onChange={(e) => handleInputChange('accountType', e.target.value)}
            className="w-full p-2 border border-border rounded-md bg-background outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="current">Current/Cheque Account</option>
            <option value="savings">Savings Account</option>
            <option value="transmission">Transmission Account</option>
            <option value="bond">Bond Account</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium mb-2 block">SWIFT Code (Optional)</label>
          <input
            value={settingsData.swiftCode}
            onChange={(e) => handleInputChange('swiftCode', e.target.value)}
            placeholder="FIRNZAJJ"
            className="w-full p-2 border border-border rounded-md bg-background outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">Currency</label>
        <select
          value={settingsData.currency}
          onChange={(e) => handleInputChange('currency', e.target.value)}
          className="w-full p-2 border border-border rounded-md bg-background outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="ZAR">ZAR - South African Rand (R)</option>
          <option value="USD">USD - US Dollar ($)</option>
          <option value="EUR">EUR - Euro (€)</option>
          <option value="GBP">GBP - British Pound (£)</option>
        </select>
      </div>
    </div>
  );

  const renderDocumentNumbering = () => (
    <div className="space-y-6">
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <FileText className="w-5 h-5 text-amber-600 mt-0.5" />
          <div>
            <h4 className="font-semibold text-amber-900">Document Numbering System</h4>
            <p className="text-sm text-amber-800">
              Configure how your invoices and quotes are numbered. Once set, changing these may affect your records.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="font-semibold flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Invoice Numbering
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Invoice Prefix</label>
            <input
              value={settingsData.invoicePrefix}
              onChange={(e) => handleInputChange('invoicePrefix', e.target.value)}
              placeholder="INV"
              className="w-full p-2 border border-border rounded-md bg-background outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-muted-foreground mt-1">e.g., INV, INVOICE, DHS</p>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Starting Number</label>
            <input
              type="number"
              value={settingsData.invoiceStartNumber}
              onChange={(e) => handleInputChange('invoiceStartNumber', parseInt(e.target.value))}
              placeholder="1001"
              className="w-full p-2 border border-border rounded-md bg-background outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-muted-foreground mt-1">Next invoice will be {settingsData.invoicePrefix}-{settingsData.invoiceStartNumber}</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="font-semibold flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Quote Numbering
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Quote Prefix</label>
            <input
              value={settingsData.quotePrefix}
              onChange={(e) => handleInputChange('quotePrefix', e.target.value)}
              placeholder="QUO"
              className="w-full p-2 border border-border rounded-md bg-background outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-muted-foreground mt-1">e.g., QUO, QUOTE, EST</p>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Starting Number</label>
            <input
              type="number"
              value={settingsData.quoteStartNumber}
              onChange={(e) => handleInputChange('quoteStartNumber', parseInt(e.target.value))}
              placeholder="2001"
              className="w-full p-2 border border-border rounded-md bg-background outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-muted-foreground mt-1">Next quote will be {settingsData.quotePrefix}-{settingsData.quoteStartNumber}</p>
          </div>
        </div>
      </div>

      <div className="bg-muted/50 border border-border rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-muted-foreground mt-0.5" />
          <div>
            <h4 className="font-semibold text-sm">Preview</h4>
            <p className="text-sm text-muted-foreground mt-1">
              Your documents will be numbered as: <span className="font-mono font-semibold">{settingsData.invoicePrefix}-{settingsData.invoiceStartNumber}</span>, 
              <span className="font-mono font-semibold ml-1">{settingsData.invoicePrefix}-{settingsData.invoiceStartNumber + 1}</span>, etc.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderVATSettings = () => (
    <div className="space-y-6">
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Percent className="w-5 h-5 text-green-600 mt-0.5" />
          <div>
            <h4 className="font-semibold text-green-900">VAT & Tax Configuration</h4>
            <p className="text-sm text-green-800">
              Configure VAT settings for your invoices. This will automatically calculate tax on all line items.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 border border-border rounded-lg">
          <div>
            <label className="text-base font-semibold">Enable VAT on Invoices</label>
            <p className="text-sm text-muted-foreground">Automatically add VAT to all invoices and quotes</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settingsData.vatEnabled}
              onChange={(e) => handleInputChange('vatEnabled', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>

        {settingsData.vatEnabled && (
          <>
            <div>
              <label className="text-sm font-medium mb-2 block">VAT Registration Number</label>
              <input
                value={settingsData.vatNumber}
                onChange={(e) => handleInputChange('vatNumber', e.target.value)}
                placeholder="4123456789"
                className="w-full p-2 border border-border rounded-md bg-background outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="text-xs text-muted-foreground mt-1">Your official VAT registration number</p>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">VAT Percentage (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={settingsData.vatPercentage}
                onChange={(e) => handleInputChange('vatPercentage', parseFloat(e.target.value))}
                placeholder="15"
                className="w-32 p-2 border border-border rounded-md bg-background outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="text-xs text-muted-foreground mt-1">Standard VAT rate (e.g., 15% for South Africa, 20% for UK)</p>
            </div>

            <div className="bg-muted/50 border border-border rounded-lg p-4">
              <h4 className="font-semibold text-sm mb-2">Example Calculation</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span className="font-mono">R 10,000.00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">VAT ({settingsData.vatPercentage}%):</span>
                  <span className="font-mono">R {(10000 * settingsData.vatPercentage / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-1 font-semibold">
                  <span>Total:</span>
                  <span className="font-mono">R {(10000 * (1 + settingsData.vatPercentage / 100)).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );

  const renderPaymentTerms = () => (
    <div className="space-y-6">
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Calendar className="w-5 h-5 text-purple-600 mt-0.5" />
          <div>
            <h4 className="font-semibold text-purple-900">Payment Terms & Conditions</h4>
            <p className="text-sm text-purple-800">
              Set default payment terms and conditions that will appear on all invoices.
            </p>
          </div>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">Default Payment Due (Days)</label>
        <input
          type="number"
          value={settingsData.defaultDueDays}
          onChange={(e) => handleInputChange('defaultDueDays', parseInt(e.target.value))}
          placeholder="30"
          className="w-full p-2 border border-border rounded-md bg-background outline-none focus:ring-2 focus:ring-primary"
        />
        <p className="text-xs text-muted-foreground mt-1">Number of days from invoice date until payment is due (e.g., 7, 14, 30, 60)</p>
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">Payment Terms Text</label>
        <textarea
          value={settingsData.paymentTerms}
          onChange={(e) => handleInputChange('paymentTerms', e.target.value)}
          placeholder="Enter your standard payment terms..."
          rows={4}
          className="w-full p-2 border border-border rounded-md bg-background outline-none focus:ring-2 focus:ring-primary"
        />
        <p className="text-xs text-muted-foreground mt-1">This text will appear on all invoices and quotes</p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 border border-border rounded-lg">
          <div>
            <label className="text-base font-semibold">Enable Late Payment Interest</label>
            <p className="text-sm text-muted-foreground">Charge interest on overdue invoices</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settingsData.latePaymentEnabled}
              onChange={(e) => handleInputChange('latePaymentEnabled', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>

        {settingsData.latePaymentEnabled && (
          <div>
            <label className="text-sm font-medium mb-2 block">Late Payment Interest Rate (% per month)</label>
            <input
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={settingsData.latePaymentInterest}
              onChange={(e) => handleInputChange('latePaymentInterest', parseFloat(e.target.value))}
              placeholder="2"
              className="w-32 p-2 border border-border rounded-md bg-background outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-muted-foreground mt-1">Interest charged per month on overdue amounts</p>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 border border-border rounded-lg">
          <div>
            <label className="text-base font-semibold">Enable Deposit Payments</label>
            <p className="text-sm text-muted-foreground">Allow clients to pay deposits on invoices</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settingsData.depositEnabled}
              onChange={(e) => handleInputChange('depositEnabled', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>

        {settingsData.depositEnabled && (
          <div>
            <label className="text-sm font-medium mb-2 block">Default Deposit Percentage (%)</label>
            <input
              type="number"
              min={0}
              max={100}
              step={5}
              value={settingsData.defaultDepositPercentage}
              onChange={(e) => handleInputChange('defaultDepositPercentage', parseFloat(e.target.value))}
              placeholder="30"
              className="w-32 p-2 border border-border rounded-md bg-background outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-muted-foreground mt-1">Default deposit amount as percentage of total invoice</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'banking': return renderBankingDetails();
      case 'numbering': return renderDocumentNumbering();
      case 'vat': return renderVATSettings();
      case 'terms': return renderPaymentTerms();
      default: return renderBankingDetails();
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
            <CreditCard className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="font-serif text-lg sm:text-2xl">Payment Settings</h2>
            <p className="text-sm text-muted-foreground">Configure payment terms and banking details</p>
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
          <span className="px-3 py-1 rounded text-sm font-medium border bg-amber-50 text-amber-700 border-amber-200 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Setup Required
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
              <h3 className="font-serif font-bold text-lg">Settings Sections</h3>
              <p className="text-sm text-muted-foreground mt-1">Configure all payment options</p>
            </div>
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isComplete = 
                  tab.id === 'banking' ? (settingsData.bankName && settingsData.accountNumber) :
                  tab.id === 'numbering' ? (settingsData.invoicePrefix) :
                  tab.id === 'vat' ? (settingsData.vatEnabled ? !!settingsData.vatNumber : true) :
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
                  {activeTab === 'banking' && 'Configure your bank account details for client payments'}
                  {activeTab === 'numbering' && 'Set up invoice and quote numbering system'}
                  {activeTab === 'vat' && 'Configure VAT and tax settings for your invoices'}
                  {activeTab === 'terms' && 'Set default payment terms and conditions'}
                </p>
              </div>
              <span className="px-2 py-1 rounded text-xs font-medium bg-muted text-muted-foreground">
                {activeTab === 'banking' && 'Required'}
                {activeTab === 'numbering' && 'Required'}
                {activeTab === 'vat' && 'Optional'}
                {activeTab === 'terms' && 'Recommended'}
              </span>
            </div>

            <div className="min-h-[500px]">
              {renderTabContent()}
            </div>

            <div className="border-t border-border mt-6 pt-6">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {activeTab === 'banking' && 'Banking details appear on all invoices and quotes'}
                  {activeTab === 'numbering' && 'Document numbers are auto-generated based on these settings'}
                  {activeTab === 'vat' && 'VAT is automatically calculated on all line items'}
                  {activeTab === 'terms' && 'Payment terms help set clear expectations with clients'}
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
                        Save Settings
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

export default PaymentSettingsPage;
