import { supabase } from '@/lib/supabase';

export interface EmailLog {
  id: string;
  to: string;
  subject: string;
  html: string;
  sentAt: string;
  status: 'pending' | 'sent' | 'failed';
  type: 'initial_invoice' | 'reminder' | 'followup' | 'payment_received' | 'commitment_confirmation' | 'welcome';
}

class EmailService {
  private logs: EmailLog[] = [];

  async sendInitialInvoice(params: {
    to: string;
    invoiceId?: string;
    clientName: string;
    invoiceNumber: string;
    amount: number;
    dueDate: string;
    commitmentLink?: string;
    businessName: string;
    businessEmail: string;
  }): Promise<{ success: boolean; emailId: string; message: string }> {
    return this.invoke('send-invoice', {
      invoiceId: params.invoiceId,
      recipientEmail: params.to,
      recipientName: params.clientName,
      invoiceNumber: params.invoiceNumber,
      amount: params.amount,
      dueDate: params.dueDate,
    }, 'initial_invoice', params.to);
  }

  async sendReminder(params: {
    to: string;
    invoiceId?: string;
    clientName: string;
    invoiceNumber: string;
    amount: number;
    dueDate: string;
    daysUntilDue: number;
    commitmentLink?: string;
    businessName: string;
    businessEmail: string;
  }): Promise<{ success: boolean; emailId: string; message: string }> {
    return this.invoke('send-reminder', {
      invoiceId: params.invoiceId,
      recipientEmail: params.to,
      recipientName: params.clientName,
      invoiceNumber: params.invoiceNumber,
      amount: params.amount,
      dueDate: params.dueDate,
    }, 'reminder', params.to);
  }

  async sendFollowUp(params: {
    to: string;
    invoiceId?: string;
    clientName: string;
    invoiceNumber: string;
    amount: number;
    dueDate: string;
    daysOverdue: number;
    commitmentLink?: string;
    businessName: string;
    businessEmail: string;
    businessPhone?: string;
  }): Promise<{ success: boolean; emailId: string; message: string }> {
    return this.invoke('send-reminder', {
      invoiceId: params.invoiceId,
      recipientEmail: params.to,
      recipientName: params.clientName,
      invoiceNumber: params.invoiceNumber,
      amount: params.amount,
      dueDate: params.dueDate,
      daysOverdue: params.daysOverdue,
    }, 'followup', params.to);
  }

  async sendPaymentReceived(params: {
    to: string;
    invoiceId?: string;
    clientName: string;
    invoiceNumber: string;
    amount: number;
    paymentDate: string;
    businessName: string;
    businessEmail: string;
  }): Promise<{ success: boolean; emailId: string; message: string }> {
    return this.invoke('send-payment-received', {
      invoiceId: params.invoiceId,
      recipientEmail: params.to,
      recipientName: params.clientName,
      invoiceNumber: params.invoiceNumber,
      amount: params.amount,
      paymentDate: params.paymentDate,
    }, 'payment_received', params.to);
  }

  async sendCommitmentConfirmation(params: {
    to: string;
    invoiceId?: string;
    clientName: string;
    invoiceNumber: string;
    amount: number;
    commitmentType: 'deposit' | 'payment_plan' | 'extension' | 'pay_now';
    commitmentDetails: string;
    businessName: string;
    businessEmail: string;
  }): Promise<{ success: boolean; emailId: string; message: string }> {
    return this.invoke('send-commitment-confirmation', {
      invoiceId: params.invoiceId,
      recipientEmail: params.to,
      recipientName: params.clientName,
      invoiceNumber: params.invoiceNumber,
      amount: params.amount,
      commitmentType: params.commitmentType,
      commitmentDetails: params.commitmentDetails,
    }, 'commitment_confirmation', params.to);
  }

  async sendWelcomeEmail(params: {
    to: string;
    userName: string;
    userEmail: string;
    temporaryPassword: string;
    loginUrl: string;
    businessName: string;
    businessEmail: string;
  }): Promise<{ success: boolean; emailId: string; message: string }> {
    return this.invoke('send-welcome', {
      recipientEmail: params.to,
      userName: params.userName,
      temporaryPassword: params.temporaryPassword,
      loginUrl: params.loginUrl,
      businessName: params.businessName,
      businessEmail: params.businessEmail,
    }, 'welcome', params.to);
  }

  private async invoke(
    functionName: string,
    body: Record<string, any>,
    type: EmailLog['type'],
    to: string,
  ): Promise<{ success: boolean; emailId: string; message: string }> {
    const tempId = `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    try {
      const { data, error } = await supabase.functions.invoke(functionName, { body });
      if (error) throw error;
      const emailId = data?.emailId || tempId;
      this.logs.push({ id: emailId, to, subject: '', html: '', sentAt: new Date().toISOString(), status: 'sent', type });
      return { success: true, emailId, message: `Email sent to ${to}` };
    } catch (err) {
      this.logs.push({ id: tempId, to, subject: '', html: '', sentAt: new Date().toISOString(), status: 'failed', type });
      return { success: false, emailId: tempId, message: err instanceof Error ? err.message : 'Failed to send email' };
    }
  }

  getEmailLogs(): EmailLog[] {
    return [...this.logs].sort((a, b) =>
      new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()
    );
  }

  getEmailById(id: string): EmailLog | undefined {
    return this.logs.find(log => log.id === id);
  }

  clearLogs(): void {
    this.logs = [];
  }

  isMockMode(): boolean {
    return false;
  }
}

export const emailService = new EmailService();
