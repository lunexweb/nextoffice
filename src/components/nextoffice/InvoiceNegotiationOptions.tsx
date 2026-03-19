import React from 'react';
import { NOCard } from '@/components/nextoffice/shared';
import { NegotiationOptions } from '@/types';

interface InvoiceNegotiationOptionsProps {
  options: NegotiationOptions;
  onChange: (options: NegotiationOptions) => void;
  dueDate?: string;
}

export const InvoiceNegotiationOptions: React.FC<InvoiceNegotiationOptionsProps> = ({
  options,
  onChange,
  dueDate,
}) => {
  const updateOption = <K extends keyof NegotiationOptions>(
    key: K,
    value: NegotiationOptions[K]
  ) => {
    onChange({ ...options, [key]: value });
  };

  return (
    <NOCard className="p-6">
      <h4 className="font-serif font-bold mb-2">Client Payment Options</h4>
      <p className="text-sm text-muted-foreground mb-4">
        Control what payment arrangements clients can choose for this invoice
      </p>
      
      <div className="space-y-6">
        {/* Allow Deposit Payments */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-semibold">Allow Deposit Payments</label>
              <p className="text-xs text-muted-foreground">Let clients pay a percentage upfront</p>
            </div>
            <input
              type="checkbox"
              checked={options.allow_deposit}
              onChange={(e) => updateOption('allow_deposit', e.target.checked)}
              className="rounded border-border w-4 h-4"
            />
          </div>

          {options.allow_deposit && (
            <div className="ml-6 pl-4 border-l-2 border-border space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase">Min %</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={options.deposit_min_percentage}
                    onChange={(e) => updateOption('deposit_min_percentage', Number(e.target.value))}
                    className="w-full p-2 rounded-md border border-border bg-no-surface-raised mt-1 outline-none focus:ring-2 focus:ring-primary text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase">Max %</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={options.deposit_max_percentage}
                    onChange={(e) => updateOption('deposit_max_percentage', Number(e.target.value))}
                    className="w-full p-2 rounded-md border border-border bg-no-surface-raised mt-1 outline-none focus:ring-2 focus:ring-primary text-sm"
                  />
                </div>
              </div>

              {/* Balance after project completion */}
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <div>
                  <label className="text-xs font-semibold">Balance After Project Completion</label>
                  <p className="text-xs text-muted-foreground">Client pays the remaining balance once the project is delivered</p>
                </div>
                <input
                  type="checkbox"
                  checked={options.balance_after_completion ?? false}
                  onChange={(e) => updateOption('balance_after_completion', e.target.checked)}
                  className="rounded border-border w-4 h-4"
                />
              </div>

              {options.balance_after_completion && (
                <>
                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <div>
                      <label className="text-xs font-semibold">Follow up after (days)</label>
                      <p className="text-xs text-muted-foreground">Days after project completion before follow-up starts</p>
                    </div>
                    <input
                      type="number"
                      min={1}
                      max={14}
                      value={options.followup_days ?? 3}
                      onChange={(e) => updateOption('followup_days', Number(e.target.value))}
                      className="w-20 p-2 rounded-md border border-border bg-no-surface-raised outline-none focus:ring-2 focus:ring-primary text-sm text-center"
                    />
                  </div>
                  <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 text-xs text-indigo-800">
                    <strong>How it works:</strong> Client pays the deposit upfront. Once you mark the project as complete, they commit to paying the remaining balance. Follow-up begins after {options.followup_days ?? 3} day{(options.followup_days ?? 3) !== 1 ? 's' : ''}.
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Allow Payment Plans */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-semibold">Allow Payment Plans</label>
              <p className="text-xs text-muted-foreground">Let clients split into installments</p>
            </div>
            <input
              type="checkbox"
              checked={options.allow_payment_plans}
              onChange={(e) => updateOption('allow_payment_plans', e.target.checked)}
              className="rounded border-border w-4 h-4"
            />
          </div>

          {options.allow_payment_plans && (
            <div className="ml-6 pl-4 border-l-2 border-border">
              <label className="text-xs font-bold text-muted-foreground uppercase">Max Installments</label>
              <input
                type="number"
                min={2}
                max={12}
                value={options.max_payment_plan_installments}
                onChange={(e) => updateOption('max_payment_plan_installments', Number(e.target.value))}
                className="w-full p-2 rounded-md border border-border bg-no-surface-raised mt-1 outline-none focus:ring-2 focus:ring-primary text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Clients can split into 2-{options.max_payment_plan_installments} parts
              </p>
            </div>
          )}
        </div>

        {/* Allow Extensions */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-semibold">Allow Extensions</label>
              <p className="text-xs text-muted-foreground">Let clients request more time</p>
            </div>
            <input
              type="checkbox"
              checked={options.allow_extensions}
              onChange={(e) => updateOption('allow_extensions', e.target.checked)}
              className="rounded border-border w-4 h-4"
            />
          </div>

          {options.allow_extensions && (
            <div className="ml-6 pl-4 border-l-2 border-border">
              <label className="text-xs font-bold text-muted-foreground uppercase">Max Extension (days)</label>
              <input
                type="number"
                min={1}
                max={90}
                value={options.max_extension_days}
                onChange={(e) => updateOption('max_extension_days', Number(e.target.value))}
                className="w-full p-2 rounded-md border border-border bg-no-surface-raised mt-1 outline-none focus:ring-2 focus:ring-primary text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Up to {options.max_extension_days} days extension
              </p>
            </div>
          )}
        </div>

        {/* Allow Pay After Project Completion */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-semibold">Allow Pay After Project Completion</label>
              <p className="text-xs text-muted-foreground">Client commits to pay once the project is delivered</p>
            </div>
            <input
              type="checkbox"
              checked={options.allow_project_completion ?? false}
              onChange={(e) => updateOption('allow_project_completion', e.target.checked)}
              className="rounded border-border w-4 h-4"
            />
          </div>

          {options.allow_project_completion && (
            <div className="ml-6 pl-4 border-l-2 border-border space-y-3">
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase">Start follow-up after (days)</label>
                <p className="text-xs text-muted-foreground mb-1">Days after project is marked complete before follow-up begins</p>
                <div className="flex gap-2">
                  {[1, 2, 3, 5, 7].map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => updateOption('followup_days', d)}
                      className={`flex-1 px-2 py-1.5 rounded-md text-xs font-semibold border transition-colors ${
                        (options.followup_days ?? 3) === d
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'border-border text-muted-foreground hover:bg-accent'
                      }`}
                    >
                      {d}d
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Follow-up starts {options.followup_days ?? 3} day{(options.followup_days ?? 3) !== 1 ? 's' : ''} after project completion
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Final Deadline */}
        <div className="pt-4 border-t border-border">
          <label className="text-sm font-semibold">Final Deadline</label>
          <p className="text-xs text-muted-foreground mb-2">
            Absolute last date - no extensions beyond this
            {dueDate && <span className="text-amber-600 font-medium"> (must be on or after due date)</span>}
          </p>
          <input
            type="date"
            value={options.final_deadline}
            min={dueDate || undefined}
            onChange={(e) => {
              const val = e.target.value;
              if (dueDate && val && val < dueDate) return;
              updateOption('final_deadline', val);
            }}
            className="w-full max-w-xs p-2 rounded-md border border-border bg-no-surface-raised outline-none focus:ring-2 focus:ring-primary text-sm"
          />
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>💡 Pro Tip:</strong> Giving clients choice increases commitment. They're more
            likely to honor a date they chose themselves.
          </p>
        </div>
      </div>
    </NOCard>
  );
};

export default InvoiceNegotiationOptions;
