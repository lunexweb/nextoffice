import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { 
  Bell, 
  Save,
  Clock,
  Mail,
  Zap,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Play,
  Pause
} from 'lucide-react';
import { NOCard } from '@/components/nextoffice/shared';

interface ReminderRule {
  id: string;
  name: string;
  enabled: boolean;
  triggerDays: number;
  triggerType: 'before' | 'after' | 'on';
  emailTemplate: string;
}

interface ReminderSettingsData {
  automationEnabled: boolean;
  sendOnWeekends: boolean;
  sendTime: string;
  maxRemindersPerInvoice: number;
  stopAfterDays: number;
  rules: ReminderRule[];
  emailTemplates: {
    initial: string;
    reminder: string;
    overdue: string;
    final: string;
  };
}

const ReminderSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('automation');
  const [_saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [_saveError, setSaveError] = useState('');
  
  const [settingsData, setSettingsData] = useState<ReminderSettingsData>({
    automationEnabled: true,
    sendOnWeekends: false,
    sendTime: '09:00',
    maxRemindersPerInvoice: 3,
    stopAfterDays: 60,
    rules: [
      {
        id: '1',
        name: 'Initial Invoice',
        enabled: true,
        triggerDays: 0,
        triggerType: 'on',
        emailTemplate: 'initial',
      },
      {
        id: '2',
        name: 'First Reminder',
        enabled: true,
        triggerDays: 3,
        triggerType: 'before',
        emailTemplate: 'reminder',
      },
      {
        id: '3',
        name: 'Due Date Reminder',
        enabled: true,
        triggerDays: 0,
        triggerType: 'on',
        emailTemplate: 'reminder',
      },
      {
        id: '4',
        name: 'Overdue Follow-up',
        enabled: true,
        triggerDays: 3,
        triggerType: 'after',
        emailTemplate: 'overdue',
      },
      {
        id: '5',
        name: 'Final Notice',
        enabled: true,
        triggerDays: 14,
        triggerType: 'after',
        emailTemplate: 'final',
      },
    ],
    emailTemplates: {
      initial: `Hi {{client_name}},

Thank you for your business! Please find attached invoice {{invoice_number}} for {{invoice_amount}}.

Payment is due by {{due_date}}.

Banking Details:
{{banking_details}}

If you have any questions, please don't hesitate to reach out.

Best regards,
{{business_name}}`,
      reminder: `Hi {{client_name}},

This is a friendly reminder that invoice {{invoice_number}} for {{invoice_amount}} is due on {{due_date}}.

You can view and pay your invoice here: {{invoice_link}}

Banking Details:
{{banking_details}}

Thank you for your prompt attention to this matter.

Best regards,
{{business_name}}`,
      overdue: `Hi {{client_name}},

We noticed that invoice {{invoice_number}} for {{invoice_amount}} is now overdue (due date: {{due_date}}).

If you've already made payment, please disregard this message. Otherwise, we'd appreciate your prompt attention to settle this invoice.

View invoice: {{invoice_link}}

Banking Details:
{{banking_details}}

If you're experiencing any issues with payment, please contact us to discuss options.

Best regards,
{{business_name}}`,
      final: `Hi {{client_name}},

This is a final notice regarding invoice {{invoice_number}} for {{invoice_amount}}, which has been outstanding since {{due_date}}.

We value our business relationship and would like to resolve this matter promptly. Please contact us at your earliest convenience to discuss payment.

View invoice: {{invoice_link}}

Banking Details:
{{banking_details}}

Thank you for your immediate attention.

Best regards,
{{business_name}}`,
    },
  });

  const handleInputChange = (field: keyof ReminderSettingsData, value: any) => {
    setSettingsData(prev => ({ ...prev, [field]: value }));
  };

  const handleRuleToggle = (ruleId: string) => {
    setSettingsData(prev => ({
      ...prev,
      rules: prev.rules.map(rule => 
        rule.id === ruleId ? { ...rule, enabled: !rule.enabled } : rule
      ),
    }));
  };

  const handleTemplateChange = (templateType: keyof typeof settingsData.emailTemplates, value: string) => {
    setSettingsData(prev => ({
      ...prev,
      emailTemplates: {
        ...prev.emailTemplates,
        [templateType]: value,
      },
    }));
  };

  // Load settings from DB on mount
  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('reminder_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data) {
        setSettingsData(prev => ({
          ...prev,
          automationEnabled: data.automation_enabled ?? prev.automationEnabled,
          sendOnWeekends: data.send_on_weekends ?? prev.sendOnWeekends,
          maxRemindersPerInvoice: data.max_reminders_per_invoice ?? prev.maxRemindersPerInvoice,
          stopAfterDays: data.stop_after_days ?? prev.stopAfterDays,
        }));
      }
    };
    load();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus('idle');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('reminder_settings')
        .upsert({
          user_id: user.id,
          automation_enabled: settingsData.automationEnabled,
          send_on_weekends: settingsData.sendOnWeekends,
          max_reminders_per_invoice: settingsData.maxRemindersPerInvoice,
          stop_after_days: settingsData.stopAfterDays,
        }, { onConflict: 'user_id' });

      if (error) throw error;
      setSaveStatus('success');
      setTimeout(() => navigate('/app/settings'), 800);
    } catch (err: any) {
      setSaveStatus('error');
      setSaveError(err.message || 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    { id: 'automation', label: 'Automation Rules', icon: Zap },
    { id: 'schedule', label: 'Schedule & Timing', icon: Clock },
    { id: 'templates', label: 'Email Templates', icon: Mail },
  ];

  const renderAutomationRules = () => (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Zap className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-semibold text-blue-900">Automated Reminder System</h4>
            <p className="text-sm text-blue-800">
              Set up automatic reminders to be sent at specific times relative to invoice due dates.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-muted/30">
        <div>
          <label className="text-base font-semibold flex items-center gap-2">
            {settingsData.automationEnabled ? (
              <Play className="w-4 h-4 text-green-600" />
            ) : (
              <Pause className="w-4 h-4 text-muted-foreground" />
            )}
            Automation Status
          </label>
          <p className="text-sm text-muted-foreground">
            {settingsData.automationEnabled ? 'Reminders are being sent automatically' : 'Automation is paused'}
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={settingsData.automationEnabled}
            onChange={(e) => handleInputChange('automationEnabled', e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
        </label>
      </div>

      <div>
        <h4 className="font-semibold mb-4 flex items-center gap-2">
          <Bell className="w-4 h-4" />
          Reminder Rules
        </h4>
        <div className="space-y-3">
          {settingsData.rules.map((rule) => (
            <div key={rule.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:border-primary/50 transition-colors">
              <div className="flex items-center gap-4 flex-1">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rule.enabled}
                    onChange={() => handleRuleToggle(rule.id)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
                <div className="flex-1">
                  <h5 className="font-medium">{rule.name}</h5>
                  <p className="text-sm text-muted-foreground">
                    {rule.triggerType === 'on' && `Sent on ${rule.triggerDays === 0 ? 'invoice creation' : 'due date'}`}
                    {rule.triggerType === 'before' && `Sent ${rule.triggerDays} days before due date`}
                    {rule.triggerType === 'after' && `Sent ${rule.triggerDays} days after due date`}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground">
                    {rule.emailTemplate.charAt(0).toUpperCase() + rule.emailTemplate.slice(1)} Template
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
          <div>
            <h4 className="font-semibold text-amber-900 text-sm">Timeline Example</h4>
            <p className="text-sm text-amber-800 mt-2">
              For an invoice due on <strong>March 30</strong>:
            </p>
            <ul className="text-sm text-amber-800 mt-2 space-y-1 ml-4">
              <li>• <strong>March 15</strong> - Initial invoice sent</li>
              <li>• <strong>March 27</strong> - First reminder (3 days before)</li>
              <li>• <strong>March 30</strong> - Due date reminder</li>
              <li>• <strong>April 2</strong> - Overdue follow-up (3 days after)</li>
              <li>• <strong>April 13</strong> - Final notice (14 days after)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );

  const renderScheduleSettings = () => (
    <div className="space-y-6">
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Clock className="w-5 h-5 text-purple-600 mt-0.5" />
          <div>
            <h4 className="font-semibold text-purple-900">Schedule Configuration</h4>
            <p className="text-sm text-purple-800">
              Control when and how often reminders are sent to your clients.
            </p>
          </div>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">Preferred Send Time</label>
        <input
          type="time"
          value={settingsData.sendTime}
          onChange={(e) => handleInputChange('sendTime', e.target.value)}
          className="w-full p-2 border border-border rounded-md bg-background outline-none focus:ring-2 focus:ring-primary"
        />
        <p className="text-xs text-muted-foreground mt-1">All automated reminders will be sent at this time</p>
      </div>

      <div className="flex items-center justify-between p-4 border border-border rounded-lg">
        <div>
          <label className="text-base font-semibold">Send Reminders on Weekends</label>
          <p className="text-sm text-muted-foreground">Allow reminders to be sent on Saturdays and Sundays</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={settingsData.sendOnWeekends}
            onChange={(e) => handleInputChange('sendOnWeekends', e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
        </label>
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">Maximum Reminders Per Invoice</label>
        <input
          type="number"
          min={1}
          max={10}
          value={settingsData.maxRemindersPerInvoice}
          onChange={(e) => handleInputChange('maxRemindersPerInvoice', parseInt(e.target.value))}
          className="w-full p-2 border border-border rounded-md bg-background outline-none focus:ring-2 focus:ring-primary"
        />
        <p className="text-xs text-muted-foreground mt-1">Stop sending reminders after this many attempts</p>
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">Stop Reminders After (Days)</label>
        <input
          type="number"
          min={1}
          max={365}
          value={settingsData.stopAfterDays}
          onChange={(e) => handleInputChange('stopAfterDays', parseInt(e.target.value))}
          className="w-full p-2 border border-border rounded-md bg-background outline-none focus:ring-2 focus:ring-primary"
        />
        <p className="text-xs text-muted-foreground mt-1">Stop sending reminders after this many days past due date</p>
      </div>

      <div className="bg-muted/50 border border-border rounded-lg p-4">
        <h4 className="font-semibold text-sm mb-3">Current Configuration</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Send Time:</span>
            <span className="font-medium">{settingsData.sendTime}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Weekend Sending:</span>
            <span className="font-medium">{settingsData.sendOnWeekends ? 'Enabled' : 'Disabled'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Max Reminders:</span>
            <span className="font-medium">{settingsData.maxRemindersPerInvoice} per invoice</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Stop After:</span>
            <span className="font-medium">{settingsData.stopAfterDays} days overdue</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderEmailTemplates = () => (
    <div className="space-y-6">
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Mail className="w-5 h-5 text-green-600 mt-0.5" />
          <div>
            <h4 className="font-semibold text-green-900">Email Templates</h4>
            <p className="text-sm text-green-800">
              Customize the email messages sent to clients. Use variables like {`{{client_name}}`} and {`{{invoice_number}}`} for personalization.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-muted/50 border border-border rounded-lg p-4">
        <h4 className="font-semibold text-sm mb-2">Available Variables</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
          <code className="bg-background px-2 py-1 rounded">{`{{client_name}}`}</code>
          <code className="bg-background px-2 py-1 rounded">{`{{invoice_number}}`}</code>
          <code className="bg-background px-2 py-1 rounded">{`{{invoice_amount}}`}</code>
          <code className="bg-background px-2 py-1 rounded">{`{{due_date}}`}</code>
          <code className="bg-background px-2 py-1 rounded">{`{{invoice_link}}`}</code>
          <code className="bg-background px-2 py-1 rounded">{`{{banking_details}}`}</code>
          <code className="bg-background px-2 py-1 rounded">{`{{business_name}}`}</code>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <label className="text-sm font-medium mb-2 block flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Initial Invoice Email
          </label>
          <textarea
            value={settingsData.emailTemplates.initial}
            onChange={(e) => handleTemplateChange('initial', e.target.value)}
            rows={8}
            className="w-full p-3 border border-border rounded-md bg-background outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground mt-1">Sent when invoice is first created</p>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Reminder Email
          </label>
          <textarea
            value={settingsData.emailTemplates.reminder}
            onChange={(e) => handleTemplateChange('reminder', e.target.value)}
            rows={8}
            className="w-full p-3 border border-border rounded-md bg-background outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground mt-1">Sent before and on due date</p>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            Overdue Email
          </label>
          <textarea
            value={settingsData.emailTemplates.overdue}
            onChange={(e) => handleTemplateChange('overdue', e.target.value)}
            rows={8}
            className="w-full p-3 border border-border rounded-md bg-background outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground mt-1">Sent after invoice becomes overdue</p>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600" />
            Final Notice Email
          </label>
          <textarea
            value={settingsData.emailTemplates.final}
            onChange={(e) => handleTemplateChange('final', e.target.value)}
            rows={8}
            className="w-full p-3 border border-border rounded-md bg-background outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground mt-1">Sent as final reminder for long-overdue invoices</p>
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'automation': return renderAutomationRules();
      case 'schedule': return renderScheduleSettings();
      case 'templates': return renderEmailTemplates();
      default: return renderAutomationRules();
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
            <Bell className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="font-serif text-lg sm:text-2xl">Reminder Engine</h2>
            <p className="text-sm text-muted-foreground">Manage automated payment reminders</p>
          </div>
        </div>
        <span className={`px-3 py-1 rounded text-sm font-medium border flex items-center gap-1 ${
          settingsData.automationEnabled 
            ? 'bg-green-50 text-green-700 border-green-200' 
            : 'bg-muted text-muted-foreground border-border'
        }`}>
          {settingsData.automationEnabled ? (
            <>
              <CheckCircle2 className="w-3 h-3" />
              Active
            </>
          ) : (
            <>
              <Pause className="w-3 h-3" />
              Paused
            </>
          )}
        </span>
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
              <p className="text-sm text-muted-foreground mt-1">Configure reminder system</p>
            </div>
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isComplete = 
                  tab.id === 'automation' ? settingsData.automationEnabled :
                  tab.id === 'schedule' ? !!settingsData.sendTime :
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
                  {activeTab === 'automation' && 'Configure when reminders are automatically sent'}
                  {activeTab === 'schedule' && 'Set timing and frequency preferences'}
                  {activeTab === 'templates' && 'Customize email content with variables'}
                </p>
              </div>
              <span className="px-2 py-1 rounded text-xs font-medium bg-muted text-muted-foreground">
                {activeTab === 'automation' && 'Core Settings'}
                {activeTab === 'schedule' && 'Recommended'}
                {activeTab === 'templates' && 'Customizable'}
              </span>
            </div>

            <div className="min-h-[500px]">
              {renderTabContent()}
            </div>

            <div className="border-t border-border mt-6 pt-6">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {activeTab === 'automation' && 'Enable/disable individual reminder rules as needed'}
                  {activeTab === 'schedule' && 'Reminders respect your schedule preferences'}
                  {activeTab === 'templates' && 'Templates support dynamic variables for personalization'}
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

export default ReminderSettingsPage;
