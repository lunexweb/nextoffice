import { 
  Client, 
  Invoice, 
  DashboardStats,
  LedgerEntry,
  IntelligenceAlert,
  BusinessProfile,
  CommunicationLog,
  CommunicationAnalytics,
  Commitment
} from '@/types';

// Mock Clients
export const mockClients: Client[] = [
  { 
    id: '1', 
    name: 'Mzansi Media', 
    email: 'info@mzansi.co.za', 
    phone: '011 234 5678', 
    address: '123 Main St', 
    city: 'Johannesburg', 
    postalCode: '2001', 
    clientType: 'business',
    relationshipType: 'recurring',
    score: 88, 
    level: 'Regular', 
    status: 'active', 
    color: 'green', 
    slug: 'mzansi-media' 
  },
  { 
    id: '2', 
    name: 'Pixel & Mortar', 
    email: 'hello@pixelandmortar.co.za', 
    phone: '021 345 6789', 
    address: '456 Oak Ave', 
    city: 'Cape Town', 
    postalCode: '8001', 
    clientType: 'business',
    relationshipType: 'recurring',
    score: 74, 
    level: 'Regular', 
    status: 'active', 
    color: 'amber', 
    slug: 'pixel-and-mortar' 
  },
  { 
    id: '3', 
    name: 'Tech Solutions SA', 
    email: 'admin@techsolutions.co.za', 
    phone: '012 456 7890', 
    address: '789 Tech Blvd', 
    city: 'Pretoria', 
    postalCode: '0001', 
    clientType: 'business',
    relationshipType: 'once_off',
    score: 45, 
    level: 'New', 
    status: 'active', 
    color: 'red', 
    slug: 'tech-solutions-sa' 
  }
];

// Mock Invoices
export const mockInvoices: Invoice[] = [
  {
    id: '1',
    number: 'INV-001',
    clientId: '1',
    clientName: 'Mzansi Media',
    amount: 15000,
    status: 'overdue',
    dueDate: '2026-03-10',
    createdAt: '2026-03-01',
    lineItems: [
      { description: 'Monthly Service Fee', quantity: 1, rate: 15000 },
    ],
    bankingDetails: {
      bank: 'FNB Business',
      account: '62784531290',
      branch: '250655',
      type: 'Business Cheque',
    },
    isRecurring: true,
    recurringDay: 1,
    viewCount: 3,
    vatEnabled: false,
    vatPercentage: 0,
    vatAmount: 0,
  },
  {
    id: '2',
    number: 'INV-002',
    clientId: '2',
    clientName: 'Pixel & Mortar',
    amount: 8500,
    status: 'sent',
    dueDate: '2026-03-25',
    createdAt: '2026-03-15',
    lineItems: [
      { description: 'Website Maintenance', quantity: 1, rate: 8500 },
    ],
    bankingDetails: {
      bank: 'FNB Business',
      account: '62784531290',
      branch: '250655',
      type: 'Business Cheque',
    },
    isRecurring: true,
    recurringDay: 15,
    viewCount: 1,
    vatEnabled: false,
    vatPercentage: 0,
    vatAmount: 0,
  },
  {
    id: '3',
    number: 'INV-003',
    clientId: '3',
    clientName: 'Tech Solutions SA',
    amount: 25000,
    status: 'paid',
    dueDate: '2026-03-05',
    createdAt: '2026-02-28',
    lineItems: [
      { description: 'Software Development', quantity: 1, rate: 25000 },
    ],
    bankingDetails: {
      bank: 'FNB Business',
      account: '62784531290',
      branch: '250655',
      type: 'Business Cheque',
    },
    isRecurring: false,
    viewCount: 0,
    vatEnabled: false,
    vatPercentage: 0,
    vatAmount: 0,
  }
];

// Mock Dashboard Stats
export const mockDashboardStats: DashboardStats = {
  totalClients: 3,
  activeInvoices: 2,
  overdueAmount: 15000,
  monthlyRevenue: 48500,
  totalCollected: 25000,
};

// Mock Ledger Entries
export const mockLedgerEntries: LedgerEntry[] = [
  {
    clientName: 'Mzansi Media',
    documentNumber: 'INV-001',
    amount: 'R15,000',
    status: 'Overdue',
    score: 88,
    color: 'green',
    pattern: 'Usually pays on time',
    action: 'Follow Up',
  },
  {
    clientName: 'Pixel & Mortar',
    documentNumber: 'INV-002',
    amount: 'R8,500',
    status: 'Sent',
    score: 74,
    color: 'amber',
    pattern: 'Pays within 3-5 days',
    action: 'View',
  },
  {
    clientName: 'Tech Solutions SA',
    documentNumber: 'INV-003',
    amount: 'R25,000',
    status: 'Paid',
    score: 45,
    color: 'red',
    pattern: 'New client - first payment',
    action: 'View',
  },
];

// Mock Intelligence Alerts
export const mockAlerts: IntelligenceAlert[] = [
  {
    id: '1',
    type: 'overdue',
    clientName: 'Mzansi Media',
    documentNumber: 'INV-001',
    title: 'Payment Overdue',
    description: 'Invoice INV-001 is 3 days overdue. Follow up with client.',
    timestamp: new Date('2026-03-13T10:00:00'),
  },
  {
    id: '2',
    type: 'opened',
    clientName: 'Pixel & Mortar',
    documentNumber: 'INV-002',
    title: 'Invoice Opened',
    description: 'Client has opened INV-002. Payment expected soon.',
    timestamp: new Date('2026-03-13T09:30:00'),
  },
];

// Mock Business Profile
export const mockBusinessProfile: BusinessProfile = {
  businessName: 'Digital Harmony Solutions',
  ownerName: 'Kevin Wright',
  email: 'kevin@digitalharmony.co.za',
  phone: '011 234 5678',
  address: '123 Business Ave',
  city: 'Johannesburg',
  postalCode: '2000',
  bankingDetails: {
    bank: 'FNB Business',
    account: '62784531290',
    branch: '250655',
    type: 'Business Cheque',
  },
  vatSettings: {
    enabled: true,
    percentage: 15,
    registrationNumber: '4580293710',
  },
};

export const mockCommunicationLogs: CommunicationLog[] = [
  {
    id: '1',
    type: 'initial_invoice',
    status: 'opened',
    invoiceId: 'INV-001',
    clientId: '1',
    content: {
      subject: 'Invoice INV-001 from Digital Harmony Solutions',
      body: 'Dear Mzansi Media, Please find attached your invoice for R15,000. Payment is due by March 10, 2026.',
    },
    sentAt: '2026-03-01T09:00:00',
    deliveredAt: '2026-03-01T09:01:23',
    openedAt: '2026-03-01T14:32:15',
    engagement: { opens: 3, clicks: 1 },
  },
  {
    id: '2',
    type: 'reminder',
    status: 'delivered',
    invoiceId: 'INV-001',
    clientId: '1',
    content: {
      subject: 'Reminder: Invoice INV-001 Due Soon',
      body: 'This is a friendly reminder that Invoice INV-001 for R15,000 is due in 3 days.',
    },
    sentAt: '2026-03-07T10:00:00',
    deliveredAt: '2026-03-07T10:01:45',
    engagement: { opens: 1, clicks: 0 },
  },
  {
    id: '3',
    type: 'initial_invoice',
    status: 'opened',
    invoiceId: 'INV-002',
    clientId: '2',
    content: {
      subject: 'Invoice INV-002 from Digital Harmony Solutions',
      body: 'Your invoice for R8,500 is ready. Payment due by March 25, 2026.',
    },
    sentAt: '2026-03-15T11:30:00',
    deliveredAt: '2026-03-15T11:31:12',
    openedAt: '2026-03-15T15:20:33',
    engagement: { opens: 2, clicks: 1 },
  },
  {
    id: '4',
    type: 'payment_received',
    status: 'opened',
    invoiceId: 'INV-003',
    clientId: '3',
    content: {
      subject: 'Payment Received - Thank You!',
      body: 'We have received your payment of R25,000 for Invoice INV-003.',
    },
    sentAt: '2026-03-05T16:45:00',
    deliveredAt: '2026-03-05T16:45:34',
    openedAt: '2026-03-05T17:12:08',
    engagement: { opens: 1, clicks: 0 },
  },
  {
    id: '5',
    type: 'followup',
    status: 'failed',
    invoiceId: 'INV-001',
    clientId: '1',
    content: {
      subject: 'Follow-up: Invoice INV-001 Overdue',
      body: 'Invoice INV-001 for R15,000 is now overdue. Please contact us to discuss payment.',
    },
    sentAt: '2026-03-13T09:00:00',
    engagement: { opens: 0, clicks: 0 },
  },
];

export const mockCommunicationAnalytics: CommunicationAnalytics = {
  total: 5,
  sent: 5,
  delivered: 4,
  opened: 4,
  failed: 1,
  openRate: 80,
  deliveryRate: 80,
};

// Mutable commitments array for demo purposes
let commitments: Commitment[] = [
  {
    id: '1',
    invoiceId: '1',
    invoiceNumber: 'INV-001',
    clientId: '1',
    clientName: 'Mzansi Media',
    type: 'payment_plan',
    status: 'pending',
    requestedAt: '2026-03-15T14:30:00',
    amount: 15000,
    details: {
      installments: 3,
      installmentAmount: 5000,
    },
    message: 'Would like to split this into 3 monthly payments of R5,000 each. First payment can be made immediately.',
  },
  {
    id: '2',
    invoiceId: '2',
    invoiceNumber: 'INV-002',
    clientId: '2',
    clientName: 'Pixel & Mortar',
    type: 'extension',
    status: 'pending',
    requestedAt: '2026-03-16T09:15:00',
    amount: 8500,
    details: {
      extensionDays: 14,
      newDueDate: '2026-04-08',
    },
    message: 'Need 2 more weeks to process payment. Waiting for client payment to clear.',
  },
  {
    id: '3',
    invoiceId: '1',
    invoiceNumber: 'INV-001',
    clientId: '1',
    clientName: 'Mzansi Media',
    type: 'deposit',
    status: 'approved',
    requestedAt: '2026-03-10T11:20:00',
    respondedAt: '2026-03-10T15:45:00',
    amount: 15000,
    details: {
      depositPercentage: 30,
      depositAmount: 4500,
    },
    message: 'Can pay 30% deposit now, rest in 30 days.',
  },
  {
    id: '4',
    invoiceId: '3',
    invoiceNumber: 'INV-003',
    clientId: '3',
    clientName: 'Tech Solutions SA',
    type: 'already_paid',
    status: 'pending',
    requestedAt: '2026-03-16T16:00:00',
    amount: 25000,
    details: {
      paymentDate: '2026-03-15',
      paymentProof: 'POP-20260315-001.pdf',
    },
    message: 'Payment made via EFT on 15 March. Please see attached proof of payment.',
  },
];

// Export getter and setter functions for commitments
export const mockCommitments = commitments;

export const addCommitment = (commitment: Omit<Commitment, 'id'>) => {
  const newCommitment: Commitment = {
    ...commitment,
    id: String(commitments.length + 1),
  };
  commitments.push(newCommitment);
  return newCommitment;
};

export const getCommitments = () => commitments;

export const updateCommitmentStatus = (id: string, status: Commitment['status']) => {
  const commitment = commitments.find(c => c.id === id);
  if (commitment) {
    commitment.status = status;
    commitment.respondedAt = new Date().toISOString();
  }
  return commitment;
};
