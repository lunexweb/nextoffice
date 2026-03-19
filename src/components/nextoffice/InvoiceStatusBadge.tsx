import React from 'react';

interface InvoiceStatusBadgeProps {
  status: 'paid' | 'sent' | 'overdue' | 'due' | 'draft';
  size?: 'sm' | 'md';
}

export const InvoiceStatusBadge: React.FC<InvoiceStatusBadgeProps> = ({ status, size = 'md' }) => {
  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1';
  
  const statusConfig = {
    paid: { label: 'Paid', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
    sent: { label: 'Sent', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    overdue: { label: 'Overdue', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
    due: { label: 'Due', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
    draft: { label: 'Draft', className: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400' },
  };

  const config = statusConfig[status] || statusConfig.draft;

  return (
    <span className={`inline-flex items-center rounded-full font-medium ${sizeClasses} ${config.className}`}>
      {config.label}
    </span>
  );
};
