import { useState } from 'react';
import { emailService, EmailLog } from '@/services/emailService';
import { useToast } from './use-toast';

export const useEmailService = () => {
  const [sending, setSending] = useState(false);
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const { toast } = useToast();

  const sendInitialInvoice = async (params: {
    to: string;
    clientName: string;
    invoiceNumber: string;
    amount: number;
    dueDate: string;
    commitmentLink: string;
    businessName: string;
    businessEmail: string;
  }) => {
    setSending(true);
    try {
      const result = await emailService.sendInitialInvoice(params);
      
      if (result.success) {
        toast({
          title: 'Invoice Sent',
          description: `Invoice email sent to ${params.to}`,
        });
      } else {
        toast({
          title: 'Failed to Send',
          description: result.message,
          variant: 'destructive',
        });
      }
      
      setLogs(emailService.getEmailLogs());
      return result;
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send invoice email',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setSending(false);
    }
  };

  const sendReminder = async (params: {
    to: string;
    clientName: string;
    invoiceNumber: string;
    amount: number;
    dueDate: string;
    daysUntilDue: number;
    commitmentLink: string;
    businessName: string;
    businessEmail: string;
  }) => {
    setSending(true);
    try {
      const result = await emailService.sendReminder(params);
      
      if (result.success) {
        toast({
          title: 'Reminder Sent',
          description: `Reminder email sent to ${params.to}`,
        });
      } else {
        toast({
          title: 'Failed to Send',
          description: result.message,
          variant: 'destructive',
        });
      }
      
      setLogs(emailService.getEmailLogs());
      return result;
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send reminder email',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setSending(false);
    }
  };

  const sendFollowUp = async (params: {
    to: string;
    clientName: string;
    invoiceNumber: string;
    amount: number;
    dueDate: string;
    daysOverdue: number;
    commitmentLink: string;
    businessName: string;
    businessEmail: string;
    businessPhone?: string;
  }) => {
    setSending(true);
    try {
      const result = await emailService.sendFollowUp(params);
      
      if (result.success) {
        toast({
          title: 'Follow-up Sent',
          description: `Follow-up email sent to ${params.to}`,
        });
      } else {
        toast({
          title: 'Failed to Send',
          description: result.message,
          variant: 'destructive',
        });
      }
      
      setLogs(emailService.getEmailLogs());
      return result;
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send follow-up email',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setSending(false);
    }
  };

  const sendPaymentReceived = async (params: {
    to: string;
    clientName: string;
    invoiceNumber: string;
    amount: number;
    paymentDate: string;
    businessName: string;
    businessEmail: string;
  }) => {
    setSending(true);
    try {
      const result = await emailService.sendPaymentReceived(params);
      
      if (result.success) {
        toast({
          title: 'Confirmation Sent',
          description: `Payment confirmation sent to ${params.to}`,
        });
      } else {
        toast({
          title: 'Failed to Send',
          description: result.message,
          variant: 'destructive',
        });
      }
      
      setLogs(emailService.getEmailLogs());
      return result;
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send payment confirmation',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setSending(false);
    }
  };

  const sendCommitmentConfirmation = async (params: {
    to: string;
    clientName: string;
    invoiceNumber: string;
    amount: number;
    commitmentType: 'deposit' | 'payment_plan' | 'extension' | 'pay_now';
    commitmentDetails: string;
    businessName: string;
    businessEmail: string;
  }) => {
    setSending(true);
    try {
      const result = await emailService.sendCommitmentConfirmation(params);
      
      if (result.success) {
        toast({
          title: 'Confirmation Sent',
          description: `Commitment confirmation sent to ${params.to}`,
        });
      } else {
        toast({
          title: 'Failed to Send',
          description: result.message,
          variant: 'destructive',
        });
      }
      
      setLogs(emailService.getEmailLogs());
      return result;
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send commitment confirmation',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setSending(false);
    }
  };

  const sendWelcomeEmail = async (params: {
    to: string;
    userName: string;
    userEmail: string;
    temporaryPassword: string;
    loginUrl: string;
    businessName: string;
    businessEmail: string;
  }) => {
    setSending(true);
    try {
      const result = await emailService.sendWelcomeEmail(params);
      
      if (result.success) {
        toast({
          title: 'Welcome Email Sent',
          description: `Welcome email sent to ${params.to}`,
        });
      } else {
        toast({
          title: 'Failed to Send',
          description: result.message,
          variant: 'destructive',
        });
      }
      
      setLogs(emailService.getEmailLogs());
      return result;
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send welcome email',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setSending(false);
    }
  };

  const refreshLogs = () => {
    setLogs(emailService.getEmailLogs());
  };

  const clearLogs = () => {
    emailService.clearLogs();
    setLogs([]);
  };

  return {
    sending,
    logs,
    sendInitialInvoice,
    sendReminder,
    sendFollowUp,
    sendPaymentReceived,
    sendCommitmentConfirmation,
    sendWelcomeEmail,
    refreshLogs,
    clearLogs,
    isMockMode: emailService.isMockMode(),
  };
};
