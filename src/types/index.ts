export type ClientColor = 'green' | 'amber' | 'red' | 'blue' | 'muted';

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  clientType: 'individual' | 'business';
  relationshipType: 'once_off' | 'recurring';
  score: number;
  level: string;
  status: string;
  color: ClientColor;
  slug: string;
}

export interface LineItem {
  description: string;
  quantity: number;
  rate: number;
}

export interface BankingDetails {
  bank: string;
  account: string;
  branch: string;
  type: string;
}

export interface Invoice {
  id: string;
  number: string;
  clientId: string;
  clientName: string;
  amount: number;
  status: string;
  dueDate: string;
  createdAt: string;
  paidDate?: string;
  lineItems: LineItem[];
  bankingDetails: BankingDetails;
  isRecurring: boolean;
  recurringDay?: number;
  viewCount: number;
  lastViewedAt?: string;
  vatEnabled: boolean;
  vatPercentage: number;
  vatAmount: number;
  negotiationOptions?: NegotiationOptions;
  amountPaid: number;
  payments?: Payment[];
  customField1?: string;
  customField2?: string;
}

export type PaymentType = 'deposit' | 'balance' | 'full' | 'partial';

export interface Payment {
  id: string;
  invoiceId: string;
  type: PaymentType;
  expectedAmount: number;
  actualAmount: number;
  notes?: string;
  paymentDate: string;
  createdAt: string;
}

export interface DashboardStats {
  totalClients: number;
  activeInvoices: number;
  overdueAmount: number;
  monthlyRevenue: number;
  totalCollected: number;
}

export interface LedgerEntry {
  clientName: string;
  documentNumber: string;
  amount: string;
  status: string;
  score: number;
  color: string;
  pattern: string;
  action: string;
}

export interface IntelligenceAlert {
  id: string;
  type: string;
  clientName: string;
  documentNumber: string;
  title: string;
  description: string;
  timestamp: Date;
}

export interface BusinessProfile {
  businessName: string;
  ownerName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  bankingDetails: BankingDetails;
  vatSettings: {
    enabled: boolean;
    percentage: number;
    registrationNumber: string;
  };
  invoicePrefix?: string;
  invoiceStartNumber?: number;
  logoUrl?: string;
}

export interface ClientFormData {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  clientType: 'individual' | 'business';
  relationshipType?: 'once_off' | 'recurring';
}

export type FilterTab = 'all' | 'active' | 'high_risk' | 'overdue' | 'new' | 'recurring';

export interface ApiResponse<T> {
  data: T;
  error?: string;
  message?: string;
}

export interface ClientNote {
  id: string;
  date: string;
  author: string;
  text: string;
}

export interface InvoiceFormData {
  clientId: string;
  lineItems: { description: string; quantity: number; rate: number }[];
  dueDate: string;
  notes?: string;
  isRecurring?: boolean;
  recurringDay?: number;
  negotiationOptions?: NegotiationOptions;
  vatEnabled?: boolean;
  vatPercentage?: number;
  customField1?: string;
  customField2?: string;
}

export interface NegotiationOptions {
  allow_deposit: boolean;
  deposit_min_percentage: number;
  deposit_max_percentage: number;
  balance_after_completion: boolean;
  allow_payment_plans: boolean;
  max_payment_plan_installments: number;
  allow_extensions: boolean;
  max_extension_days: number;
  allow_project_completion: boolean;
  followup_days: number;
  final_deadline: string;
}

export type CommunicationType = 
  | 'reminder' 
  | 'followup' 
  | 'confirmation' 
  | 'initial_invoice' 
  | 'payment_received' 
  | 'commitment_confirmation';

export type CommunicationStatus = 
  | 'sent' 
  | 'delivered' 
  | 'opened' 
  | 'failed' 
  | 'bounced';

export interface CommunicationLog {
  id: string;
  type: CommunicationType;
  status: CommunicationStatus;
  invoiceId: string;
  clientId: string;
  content: {
    subject: string;
    body: string;
  };
  sentAt: string;
  deliveredAt?: string;
  openedAt?: string;
  engagement: {
    opens: number;
    clicks: number;
  };
}

export interface CommunicationAnalytics {
  total: number;
  sent: number;
  delivered: number;
  opened: number;
  failed: number;
  openRate: number;
  deliveryRate: number;
}

export type CommitmentType = 'deposit' | 'payment_plan' | 'extension' | 'already_paid' | 'project_completion' | 'pay_now' | 'pay_on_due_date';
export type CommitmentStatus = 'pending' | 'approved' | 'declined' | 'completed' | 'cancelled';

export interface Commitment {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  clientId: string;
  clientName: string;
  type: CommitmentType;
  status: CommitmentStatus;
  requestedAt: string;
  respondedAt?: string;
  amount: number;
  details: {
    depositPercentage?: number;
    depositAmount?: number;
    balanceAmount?: number;
    balance_after_completion?: boolean;
    followup_days?: number;
    installments?: number;
    installmentAmount?: number;
    extensionDays?: number;
    newDueDate?: string;
    paymentDate?: string;
    paymentProof?: string;
    committedDate?: string;
    committedAt?: string;
    paymentSchedule?: Array<{
      installment: number;
      amount: number;
      dueDate: string;
      status: string;
    }>;
  };
  message?: string;
}
