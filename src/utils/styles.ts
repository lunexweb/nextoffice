import { ClientColor } from '@/types';

export const getClientColorClasses = (color: ClientColor) => {
  const colorMap = {
    green: {
      text: 'text-no-green',
      bg: 'bg-no-green-bg',
      border: 'border-no-green',
      bgLight: 'bg-no-green-bg',
    },
    amber: {
      text: 'text-no-amber',
      bg: 'bg-no-amber-bg',
      border: 'border-no-amber',
      bgLight: 'bg-no-amber-bg',
    },
    red: {
      text: 'text-no-red',
      bg: 'bg-no-red-bg',
      border: 'border-no-red',
      bgLight: 'bg-no-red-bg',
    },
    blue: {
      text: 'text-no-blue',
      bg: 'bg-no-blue-bg',
      border: 'border-no-blue',
      bgLight: 'bg-no-blue-bg',
    },
    muted: {
      text: 'text-muted-foreground',
      bg: 'bg-muted',
      border: 'border-border',
      bgLight: 'bg-muted',
    },
  };

  return colorMap[color] || colorMap.muted;
};

export const getStatusColorClasses = (color: ClientColor) => {
  const colorMap = {
    green: 'bg-no-green-bg text-no-green',
    amber: 'bg-no-amber-bg text-no-amber',
    red: 'bg-no-red-bg text-no-red',
    blue: 'bg-no-blue-bg text-no-blue',
    muted: 'bg-muted text-muted-foreground',
  };

  return colorMap[color] || colorMap.muted;
};

export const getScoreBarColor = (color: ClientColor) => {
  const colorMap = {
    green: 'hsl(var(--no-green))',
    amber: 'hsl(var(--no-amber))',
    red: 'hsl(var(--no-red))',
    blue: 'hsl(var(--no-blue))',
    muted: 'hsl(var(--muted-foreground))',
  };

  return colorMap[color] || colorMap.muted;
};

export const getBorderColor = (color: ClientColor) => {
  const colorMap = {
    green: 'hsl(var(--no-green))',
    amber: 'hsl(var(--no-amber))',
    red: 'hsl(var(--no-red))',
    blue: 'hsl(var(--no-blue))',
    muted: 'hsl(var(--border))',
  };

  return colorMap[color] || colorMap.muted;
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatCurrencyShort = (amount: number): string => {
  return `R${amount.toLocaleString('en-ZA')}`;
};

export const formatDate = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

export const formatDateShort = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short',
  });
};

export const formatDateTime = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleString('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const getInvoiceStatusText = (status: string): string => {
  const statusMap: Record<string, string> = {
    paid: 'Paid ✓',
    committed: 'Committed',
    overdue: 'Overdue',
    sent: 'Sent',
    opened: 'Opened',
    quote_pending: 'Quote Pending',
    cancelled: 'Cancelled',
  };

  return statusMap[status] || status;
};

export const getQuoteStatusText = (status: string): string => {
  const statusMap: Record<string, string> = {
    accepted: 'Accepted ✓',
    sent: 'Sent',
    pending: 'Pending',
    expired: 'Expired',
    declined: 'Declined',
  };

  return statusMap[status] || status;
};

export const getClientLevel = (score: number): string => {
  if (score === 0) return 'New';
  if (score <= 50) return 'High Risk';
  if (score <= 70) return 'Average Client';
  if (score <= 85) return 'Reliable Client';
  return 'Trusted Client';
};

export const getClientColor = (score: number, status: string): ClientColor => {
  if (score === 0) {
    if (status.includes('Quote')) return 'blue';
    return 'muted';
  }
  if (score <= 50) return 'red';
  if (score <= 75) return 'amber';
  return 'green';
};

export const generateInvoiceNumber = (lastNumber: number): string => {
  return `INV-LW-${String(lastNumber + 1).padStart(3, '0')}`;
};

export const generateQuoteNumber = (lastNumber: number): string => {
  return `QT-LW-${String(lastNumber + 1).padStart(3, '0')}`;
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^[\d\s\-\+\(\)]+$/;
  return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
};

export const validateRequired = (value: string): boolean => {
  return value.trim().length > 0;
};

export const calculateVAT = (amount: number, rate: number = 0.15): number => {
  return Math.round(amount * rate);
};

export const calculateTotal = (subtotal: number, vatRate: number = 0.15): number => {
  const vat = calculateVAT(subtotal, vatRate);
  return subtotal + vat;
};

export const calculateLineItemTotal = (quantity: number, rate: number): number => {
  return quantity * rate;
};

export const slugify = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

export const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const isPdfFile = (file: File): boolean => {
  return file.type === 'application/pdf';
};

export const isValidFileSize = (file: File, maxSizeMB: number = 10): boolean => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
};
