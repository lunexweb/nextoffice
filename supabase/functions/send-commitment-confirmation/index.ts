import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { ResendClient } from '../_shared/resend.ts';

interface PaymentScheduleItem {
  installment: number;
  amount: number;
  dueDate: string;
  status: string;
}

interface CommitmentDetailsData {
  committedDate?: string;
  depositPercentage?: number;
  depositAmount?: number;
  balanceAmount?: number;
  balance_after_completion?: boolean;
  newDueDate?: string;
  extensionDays?: number;
  installments?: number;
  installmentAmount?: number;
  paymentSchedule?: PaymentScheduleItem[];
  paymentDate?: string;
  followup_days?: number;
}

interface CommitmentConfirmationRequest {
  invoiceId?: string;
  clientId?: string;
  recipientEmail?: string;
  recipientName: string;
  invoiceNumber: string;
  amount: number;
  dueDate?: string;
  commitmentType: 'deposit' | 'payment_plan' | 'extension' | 'pay_now' | 'already_paid' | 'project_completion' | 'pay_on_due_date';
  commitmentDetails: string;
  commitmentDetailsData?: CommitmentDetailsData;
  businessName?: string;
  clientScore?: number;
  clientLevel?: string;
  hasHistory?: boolean;
  ownerEmail?: string;
}

const commitmentConfig: Record<string, { title: string; accentColor: string; headerBg: string; nextSteps: string }> = {
  deposit: {
    title: 'Deposit Commitment Confirmed',
    accentColor: '#10b981',
    headerBg: '#064e3b',
    nextSteps: 'Your deposit commitment has been recorded. You\'ll receive a reminder before your payment date. Please ensure the deposit is transferred on the date you\'ve committed to.',
  },
  payment_plan: {
    title: 'Payment Plan Confirmed',
    accentColor: '#3b82f6',
    headerBg: '#1e3a5f',
    nextSteps: 'Your payment plan has been recorded. You\'ll receive individual reminders before each instalment is due. Please ensure each payment is made on the agreed dates.',
  },
  extension: {
    title: 'Extension Request Confirmed',
    accentColor: '#f59e0b',
    headerBg: '#451a03',
    nextSteps: 'Your new payment date has been recorded. You\'ll receive a reminder as your updated due date approaches. Please ensure payment is made by the new agreed date.',
  },
  already_paid: {
    title: 'Payment Submission Received',
    accentColor: '#6366f1',
    headerBg: '#1e1b4b',
    nextSteps: 'We\'ve received your payment notification. Our team will verify the payment and confirm receipt shortly. Thank you for your prompt attention.',
  },
  project_completion: {
    title: 'Project Completion Commitment',
    accentColor: '#8b5cf6',
    headerBg: '#2e1065',
    nextSteps: 'Your commitment has been recorded. Payment will be expected upon project completion. You\'ll be contacted when the project is ready for handover.',
  },
  pay_now: {
    title: 'Full Payment Commitment',
    accentColor: '#10b981',
    headerBg: '#064e3b',
    nextSteps: 'Thank you for committing to full payment. Please proceed with the transfer using the banking details on the invoice. Contact the business directly once payment is made.',
  },
  pay_on_due_date: {
    title: 'Payment Commitment Confirmed',
    accentColor: '#0ea5e9',
    headerBg: '#0c4a6e',
    nextSteps: 'Your commitment to pay on the due date has been recorded. You\'ll receive a reminder as the due date approaches. Please ensure payment is made on the agreed date.',
  },
};

function formatDate(dateStr: string): string {
  if (!dateStr) return dateStr;
  const d = new Date(dateStr + (dateStr.includes('T') ? '' : 'T00:00:00'));
  return d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatCurrency(amount: number): string {
  return `R${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function buildDetailsRows(
  commitmentType: string,
  data: CommitmentDetailsData | undefined,
  totalAmount: number,
  accentColor: string,
): string {
  if (!data) return '';

  const row = (label: string, value: string, highlight = false) => `
    <tr>
      <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:14px;width:45%;">${label}</td>
      <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;text-align:right;font-size:14px;font-weight:${highlight ? '700' : '600'};color:${highlight ? accentColor : '#1e293b'};">${value}</td>
    </tr>`;

  if (commitmentType === 'deposit') {
    const rows = [
      row('Deposit Amount', formatCurrency(data.depositAmount ?? 0), true),
      row('Deposit Percentage', `${data.depositPercentage ?? 0}%`),
      row('Payment Date', data.committedDate ? formatDate(data.committedDate) : '—', true),
    ];
    if (data.balanceAmount && data.balanceAmount > 0) {
      rows.push(row('Remaining Balance', formatCurrency(data.balanceAmount)));
      if (data.balance_after_completion) {
        rows.push(row('Balance Due', 'Upon project completion'));
      }
    }
    return rows.join('');
  }

  if (commitmentType === 'extension') {
    return [
      row('New Payment Date', data.newDueDate ? formatDate(data.newDueDate) : '—', true),
      row('Extension Period', `${data.extensionDays ?? 0} days`),
    ].join('');
  }

  if (commitmentType === 'already_paid') {
    return row('Payment Date', data.paymentDate ? formatDate(data.paymentDate) : '—', true);
  }

  if (commitmentType === 'payment_plan' && data.paymentSchedule && data.paymentSchedule.length > 0) {
    return data.paymentSchedule.map((item) =>
      row(
        `Instalment ${item.installment} of ${data.installments ?? data.paymentSchedule!.length}`,
        `${formatCurrency(item.amount)} — ${formatDate(item.dueDate)}`,
        item.installment === 1,
      )
    ).join('');
  }

  if (commitmentType === 'project_completion') {
    return row('Payment Due', 'Upon project completion');
  }

  return '';
}

function getLevelLabel(s: number): string {
  if (s >= 85) return 'Excellent Client';
  if (s >= 70) return 'Good Client';
  if (s >= 50) return 'Average Client';
  if (s >= 30) return 'Below Average Client';
  return 'Unreliable Client';
}

function getLevelColor(s: number): string {
  if (s >= 85) return '#10b981';
  if (s >= 70) return '#22c55e';
  if (s >= 50) return '#f59e0b';
  if (s >= 30) return '#f97316';
  return '#ef4444';
}

function buildScoreBadge(score: number, hasHistory: boolean, businessName: string): string {
  const biz = businessName || 'this business';

  let color: string; let bg: string; let border: string;
  let clientType: string; let description: string;

  if (!hasHistory) {
    color = '#0ea5e9'; bg = '#f0f9ff'; border = '#bae6fd';
    clientType = 'New Client';
    description = `Welcome! This is the start of your relationship with <strong>${biz}</strong>. We look forward to working with you.`;
  } else if (score >= 85) {
    color = '#10b981'; bg = '#f0fdf4'; border = '#bbf7d0';
    clientType = 'Excellent Client';
    description = `Your payment history with <strong>${biz}</strong> is outstanding. Thank you for your consistent reliability.`;
  } else if (score >= 70) {
    color = '#22c55e'; bg = '#f0fdf4'; border = '#bbf7d0';
    clientType = 'Good Client';
    description = `You have a solid payment track record with <strong>${biz}</strong>. We appreciate your dependability.`;
  } else if (score >= 50) {
    color = '#f59e0b'; bg = '#fffbeb'; border = '#fde68a';
    clientType = 'Average Client';
    description = `Honouring this commitment will strengthen your standing and payment reputation with <strong>${biz}</strong>.`;
  } else if (score >= 30) {
    color = '#f97316'; bg = '#fff7ed'; border = '#fed7aa';
    clientType = 'Below Average Client';
    description = `Your payment history with <strong>${biz}</strong> needs attention. Honouring this commitment will help improve your standing.`;
  } else {
    color = '#ef4444'; bg = '#fef2f2'; border = '#fecaca';
    clientType = 'Unreliable Client';
    description = `Your payment history with <strong>${biz}</strong> needs improvement. Honouring this commitment is an important step in the right direction.`;
  }

  const honorScore = Math.min(100, score + 6);
  const missScore = Math.max(0, score - 10);
  const honorLevel = getLevelLabel(honorScore);
  const missLevel = getLevelLabel(missScore);
  const honorColor = getLevelColor(honorScore);
  const missColor = getLevelColor(missScore);
  const honorLevelUp = honorLevel !== getLevelLabel(score);
  const missLevelDown = missLevel !== getLevelLabel(score);

  const honorTag = honorLevelUp
    ? `<span style="display:inline-block;margin-left:6px;padding:1px 7px;background-color:#d1fae5;color:#065f46;font-size:10px;font-weight:700;border-radius:20px;vertical-align:middle;">LEVEL UP ↑</span>`
    : '';
  const missTag = missLevelDown
    ? `<span style="display:inline-block;margin-left:6px;padding:1px 7px;background-color:#fee2e2;color:#991b1b;font-size:10px;font-weight:700;border-radius:20px;vertical-align:middle;">LEVEL DOWN ↓</span>`
    : '';

  const scenariosHtml = `
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;">
    <tr>
      <td width="48%" style="vertical-align:top;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;">
          <tr>
            <td style="padding:10px 12px;">
              <p style="margin:0 0 2px;color:#15803d;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">✅ If You Honour</p>
              <p style="margin:0 0 4px;color:#166534;font-size:20px;font-weight:800;line-height:1;">${honorScore}<span style="font-size:12px;font-weight:500;color:#4ade80;">/100</span> <span style="font-size:12px;color:#15803d;font-weight:600;">+6</span></p>
              <p style="margin:0;color:${honorColor};font-size:11px;font-weight:700;">${honorLevel}${honorTag}</p>
            </td>
          </tr>
        </table>
      </td>
      <td width="4%">&nbsp;</td>
      <td width="48%" style="vertical-align:top;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fef2f2;border:1px solid #fecaca;border-radius:8px;">
          <tr>
            <td style="padding:10px 12px;">
              <p style="margin:0 0 2px;color:#dc2626;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">❌ If You Miss</p>
              <p style="margin:0 0 4px;color:#7f1d1d;font-size:20px;font-weight:800;line-height:1;">${missScore}<span style="font-size:12px;font-weight:500;color:#f87171;">/100</span> <span style="font-size:12px;color:#dc2626;font-weight:600;">-10</span></p>
              <p style="margin:0;color:${missColor};font-size:11px;font-weight:700;">${missLevel}${missTag}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>`;

  return `
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:${bg};border-radius:10px;margin-bottom:28px;border:1px solid ${border};">
    <tr>
      <td style="padding:16px 20px;">
        <p style="margin:0 0 2px;color:${color};font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;">Payment Reliability Status</p>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="vertical-align:middle;">
              <p style="margin:0;color:${color};font-size:20px;font-weight:800;">${clientType}</p>
            </td>
            <td style="vertical-align:middle;text-align:right;">
              ${hasHistory ? `<span style="display:inline-block;background-color:${color};color:#ffffff;font-size:15px;font-weight:800;padding:4px 12px;border-radius:20px;">${score}<span style="font-size:10px;font-weight:500;opacity:0.85;">/100</span></span>` : ''}
            </td>
          </tr>
        </table>
        <p style="margin:10px 0 0;color:#374151;font-size:13px;line-height:1.6;">${description}</p>
        ${hasHistory ? scenariosHtml : ''}
      </td>
    </tr>
  </table>`;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + (dateStr.includes('T') ? '' : 'T00:00:00'));
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function buildReminderSection(
  commitmentType: string,
  data: CommitmentDetailsData | undefined,
  accentColor: string,
): string {
  if (!data) return '';
  if (commitmentType === 'already_paid' || commitmentType === 'project_completion') return '';

  const today = new Date().toISOString().split('T')[0];
  const reminderRows: string[] = [];

  const addReminder = (label: string, dateStr: string) => {
    if (!dateStr) return;
    if (dateStr < today) return;
    const isToday = dateStr === today;
    const display = formatDate(dateStr);
    reminderRows.push(`
      <tr>
        <td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:14px;">${label}</td>
        <td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;text-align:right;font-size:13px;font-weight:600;color:#1e293b;">${display}${isToday ? ' <span style="color:#f59e0b;font-weight:500;font-size:12px;">(today)</span>' : ''}</td>
      </tr>`);
  };

  if (commitmentType === 'deposit' && data.committedDate) {
    addReminder('First reminder', addDays(data.committedDate, -3));
    addReminder('Final reminder', addDays(data.committedDate, -1));
    addReminder('Payment due', data.committedDate);
  } else if (commitmentType === 'extension' && data.newDueDate) {
    addReminder('First reminder', addDays(data.newDueDate, -3));
    addReminder('Final reminder', addDays(data.newDueDate, -1));
    addReminder('Payment due', data.newDueDate);
  } else if (commitmentType === 'payment_plan' && data.paymentSchedule) {
    data.paymentSchedule.forEach((item) => {
      addReminder(`Instalment ${item.installment} reminder`, addDays(item.dueDate, -2));
      addReminder(`Instalment ${item.installment} due`, item.dueDate);
    });
  }

  if (reminderRows.length === 0) {
    return `
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border-radius:10px;overflow:hidden;margin-bottom:28px;border:1px solid #e2e8f0;">
    <tr>
      <td style="padding:14px 16px;">
        <p style="margin:0 0 4px;color:#475569;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;">📅 Reminders</p>
        <p style="margin:0;color:#64748b;font-size:13px;line-height:1.6;">Your payment date is today or has already passed. If payment is not confirmed, automated follow-up emails will be sent until the balance is cleared.</p>
      </td>
    </tr>
  </table>`;
  }

  return `
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border-radius:10px;overflow:hidden;margin-bottom:28px;border:1px solid #e2e8f0;">
    <tr>
      <td colspan="2" style="background-color:#f1f5f9;padding:14px 16px;border-bottom:1px solid #e2e8f0;">
        <p style="margin:0;color:#475569;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;">📅 Scheduled Reminders</p>
      </td>
    </tr>
    ${reminderRows.join('')}
    <tr>
      <td colspan="2" style="padding:12px 16px;">
        <p style="margin:0;color:#94a3b8;font-size:12px;">Reminder emails will be sent automatically to this address before each payment date.</p>
      </td>
    </tr>
  </table>`;
}

function buildConsequencesSection(
  commitmentType: string,
  data: CommitmentDetailsData | undefined,
  dueDate: string | undefined,
  businessName: string,
): string {
  if (commitmentType === 'already_paid') return '';

  let paymentDeadline = '—';
  if (commitmentType === 'deposit' && data?.committedDate) paymentDeadline = formatDate(data.committedDate);
  else if (commitmentType === 'extension' && data?.newDueDate) paymentDeadline = formatDate(data.newDueDate);
  else if (commitmentType === 'payment_plan' && data?.paymentSchedule?.length) {
    paymentDeadline = formatDate(data.paymentSchedule[data.paymentSchedule.length - 1].dueDate);
  } else if (commitmentType === 'project_completion') paymentDeadline = 'upon project completion';
  else if (dueDate) paymentDeadline = formatDate(dueDate);

  return `
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fff7ed;border-left:4px solid #f97316;border-radius:0 8px 8px 0;margin-bottom:28px;">
    <tr>
      <td style="padding:16px 20px;">
        <p style="margin:0 0 8px;color:#c2410c;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">If Payment Is Not Received</p>
        <ul style="margin:0;padding-left:18px;color:#7c2d12;font-size:13px;line-height:2;">
          <li>Automated follow-up emails will be sent after <strong>${paymentDeadline}</strong></li>
          <li>Your payment reliability score will be negatively affected</li>
          <li>The business owner will be notified to follow up directly</li>
          <li>Outstanding balances may incur late payment interest</li>
        </ul>
        <p style="margin:10px 0 0;color:#9a3412;font-size:12px;">To avoid this, please honour your commitment or contact <strong>${businessName}</strong> as soon as possible if circumstances change.</p>
      </td>
    </tr>
  </table>`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) throw new Error('RESEND_API_KEY not configured');

    const resend = new ResendClient(resendApiKey);
    const requestData: CommitmentConfirmationRequest = await req.json();
    const { recipientName, invoiceNumber, amount, commitmentType, commitmentDetailsData, dueDate } = requestData;

    // Resolve client_id from invoice if not passed
    let clientId = requestData.clientId;
    if (!clientId && requestData.invoiceId) {
      const { data: inv } = await supabaseAdmin
        .from('invoices')
        .select('client_id')
        .eq('id', requestData.invoiceId)
        .single();
      if (inv) clientId = inv.client_id;
    }

    // Compute score SERVER-SIDE via RPC (always fresh, tied to client_id)
    let clientScore = 60;
    let hasHistory = false;
    if (clientId) {
      const { data: scoreData } = await supabaseAdmin.rpc('get_client_score', { p_client_id: clientId });
      if (scoreData) {
        clientScore = scoreData.score ?? 60;
      }
      const { count } = await supabaseAdmin
        .from('invoices')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', clientId);
      hasHistory = (count ?? 0) > 1;
    }

    let recipientEmail = requestData.recipientEmail ?? '';
    if (!recipientEmail && clientId) {
      const { data: clientRow } = await supabaseAdmin
        .from('clients')
        .select('email')
        .eq('id', clientId)
        .single();
      recipientEmail = clientRow?.email ?? '';
    }
    if (!recipientEmail) throw new Error('No recipient email available');

    const config = commitmentConfig[commitmentType] ?? {
      title: 'Commitment Confirmed',
      accentColor: '#3b82f6',
      headerBg: '#1e3a5f',
      nextSteps: 'Your commitment has been recorded. Our team will follow up shortly.',
    };

    const fromEmail = Deno.env.get('FROM_EMAIL') ?? 'invoices@trailbill.com';

    let businessName = requestData.businessName;
    if (!businessName && requestData.invoiceId) {
      const { data: inv } = await supabaseAdmin
        .from('invoices')
        .select('user_id')
        .eq('id', requestData.invoiceId)
        .single();
      if (inv?.user_id) {
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('business_name')
          .eq('id', inv.user_id)
          .single();
        businessName = profile?.business_name || 'Your Business';
      }
    }
    if (!businessName) businessName = 'Your Business';
    const landingPageUrl = Deno.env.get('LANDING_PAGE_URL') ?? 'https://trailbill.com';
    const subject = `${config.title} — Invoice ${invoiceNumber}`;

    const detailRows = buildDetailsRows(commitmentType, commitmentDetailsData, amount, config.accentColor);
    const scoreBadge = buildScoreBadge(clientScore, hasHistory, businessName);
    const reminderSection = buildReminderSection(commitmentType, commitmentDetailsData, config.accentColor);
    const consequencesSection = buildConsequencesSection(commitmentType, commitmentDetailsData, dueDate, businessName);

    const emailHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header bar -->
          <tr>
            <td style="background-color:${config.headerBg};padding:32px 40px;text-align:center;">
              <p style="margin:0 0 4px;color:rgba(255,255,255,0.6);font-size:12px;letter-spacing:2px;text-transform:uppercase;font-weight:600;">Payment Commitment</p>
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">${config.title}</h1>
            </td>
          </tr>

          <!-- Accent stripe -->
          <tr>
            <td style="background-color:${config.accentColor};height:4px;font-size:0;line-height:0;">&nbsp;</td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px 20px;">
              <p style="margin:0 0 6px;color:#94a3b8;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Hello,</p>
              <p style="margin:0 0 24px;color:#1e293b;font-size:20px;font-weight:700;">${recipientName}</p>
              <!-- Score badge at top -->
              ${scoreBadge}

              <p style="margin:0 0 28px;color:#475569;font-size:15px;line-height:1.7;">
                We've received and recorded your payment commitment for Invoice <strong style="color:#1e293b;">${invoiceNumber}</strong> from <strong style="color:#1e293b;">${businessName}</strong>. The details of your commitment are summarised below.
              </p>

              <!-- Summary card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border-radius:10px;overflow:hidden;margin-bottom:28px;border:1px solid #e2e8f0;">
                <!-- Card header -->
                <tr>
                  <td colspan="2" style="background-color:${config.accentColor}14;padding:14px 16px;border-bottom:1px solid #e2e8f0;">
                    <p style="margin:0;color:${config.accentColor};font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;">Commitment Summary</p>
                  </td>
                </tr>
                <!-- Invoice ref row -->
                <tr>
                  <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:14px;width:45%;">Invoice Number</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;text-align:right;font-size:14px;font-weight:600;color:#1e293b;">${invoiceNumber}</td>
                </tr>
                <!-- Total amount row -->
                <tr>
                  <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:14px;">Invoice Total</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;text-align:right;font-size:18px;font-weight:700;color:${config.accentColor};">${formatCurrency(amount)}</td>
                </tr>
                <!-- Commitment type row -->
                <tr>
                  <td style="padding:12px 16px;border-bottom:${detailRows ? '1px solid #f1f5f9' : 'none'};color:#64748b;font-size:14px;">Commitment Type</td>
                  <td style="padding:12px 16px;border-bottom:${detailRows ? '1px solid #f1f5f9' : 'none'};text-align:right;font-size:14px;font-weight:600;color:#1e293b;">${config.title.replace(' Confirmed', '').replace(' Received', '').replace(' Commitment', '')}</td>
                </tr>
                <!-- Dynamic date/detail rows -->
                ${detailRows}
              </table>

              <!-- Reminder schedule -->
              ${reminderSection}

              <!-- Consequences -->
              ${consequencesSection}

              <!-- What happens next -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:${config.accentColor}0d;border-left:4px solid ${config.accentColor};border-radius:0 8px 8px 0;margin-bottom:28px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0 0 6px;color:${config.accentColor};font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">What happens next?</p>
                    <p style="margin:0;color:#374151;font-size:14px;line-height:1.7;">${config.nextSteps}</p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 32px;color:#64748b;font-size:14px;line-height:1.7;">
                If you have any questions or need to make changes to this commitment, please contact <strong>${businessName}</strong> directly${requestData.ownerEmail ? ` at <a href="mailto:${requestData.ownerEmail}" style="color:#4f46e5;">${requestData.ownerEmail}</a>` : ''}.
              </p>

              <p style="margin:0 0 6px;color:#64748b;font-size:14px;">Kind regards,</p>
              <p style="margin:0;color:#1e293b;font-size:15px;font-weight:700;">${businessName}</p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 40px;">
              <div style="border-top:1px solid #e2e8f0;"></div>
            </td>
          </tr>

          <!-- Trailbill.com footer -->
          <tr>
            <td style="padding:28px 40px;text-align:center;background-color:#f8fafc;">
              <p style="margin:0 0 14px;color:#94a3b8;font-size:12px;">Powered by</p>
              <a href="${landingPageUrl}" target="_blank" style="display:inline-block;text-decoration:none;">
                <table cellpadding="0" cellspacing="0" style="display:inline-table;">
                  <tr>
                    <td style="background-color:#0f172a;padding:10px 24px;border-radius:8px;">
                      <span style="color:#ffffff;font-size:14px;font-weight:700;letter-spacing:-0.3px;">Trailbill<span style="color:#64748b;font-size:10px;font-weight:400;">.com</span></span>
                    </td>
                  </tr>
                </table>
              </a>
              <p style="margin:14px 0 0;color:#cbd5e1;font-size:11px;">Smart invoicing &amp; payment commitments for modern businesses</p>
              <p style="margin:8px 0 0;color:#cbd5e1;font-size:11px;">
                <a href="${landingPageUrl}" target="_blank" style="color:#3b82f6;text-decoration:none;">${landingPageUrl}</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const result = await resend.sendEmail({
      from: `${businessName} <${fromEmail}>`,
      to: recipientEmail,
      subject,
      html: emailHtml,
    });

    const { error: logError } = await supabaseAdmin
      .from('communication_logs')
      .insert({
        invoice_id: requestData.invoiceId || null,
        type: 'commitment_confirmation',
        status: 'sent',
        subject,
        recipient_email: recipientEmail,
        email_id: result.id,
        sent_at: new Date().toISOString(),
      });

    if (logError) {
      console.error('Failed to log communication:', logError);
    }

    // Send owner notification if ownerEmail is provided and differs from client email
    const ownerEmail = requestData.ownerEmail;
    if (ownerEmail && ownerEmail !== recipientEmail) {
      const typeLabels: Record<string, string> = {
        deposit: 'Deposit',
        payment_plan: 'Payment Plan',
        extension: 'Extension Request',
        already_paid: 'Payment Claimed',
        project_completion: 'On Project Completion',
        pay_now: 'Full Payment',
        pay_on_due_date: 'Full Payment',
      };
      const typeLabel = typeLabels[commitmentType] ?? commitmentType;
      const ownerSubject = `${recipientName} submitted a ${typeLabel.toLowerCase()} commitment — ${invoiceNumber}`;

      // Build concise detail lines for owner
      const data = commitmentDetailsData;
      let detailLines = '';
      if (commitmentType === 'deposit' && data) {
        detailLines = `<tr><td style="padding:8px 16px;color:#64748b;font-size:13px;border-bottom:1px solid #f1f5f9;">Deposit</td><td style="padding:8px 16px;text-align:right;font-size:13px;font-weight:600;color:#1e293b;border-bottom:1px solid #f1f5f9;">R${(data.depositAmount ?? 0).toLocaleString()} (${data.depositPercentage ?? 0}%)</td></tr>`;
        if (data.committedDate) detailLines += `<tr><td style="padding:8px 16px;color:#64748b;font-size:13px;border-bottom:1px solid #f1f5f9;">Pay by</td><td style="padding:8px 16px;text-align:right;font-size:13px;font-weight:700;color:#0f172a;border-bottom:1px solid #f1f5f9;">${formatDate(data.committedDate)}</td></tr>`;
        if (data.balanceAmount && data.balanceAmount > 0) detailLines += `<tr><td style="padding:8px 16px;color:#64748b;font-size:13px;">Balance</td><td style="padding:8px 16px;text-align:right;font-size:13px;font-weight:600;color:#1e293b;">R${data.balanceAmount.toLocaleString()}${data.balance_after_completion ? ' on completion' : ''}</td></tr>`;
      } else if (commitmentType === 'extension' && data) {
        if (data.newDueDate) detailLines = `<tr><td style="padding:8px 16px;color:#64748b;font-size:13px;">New payment date</td><td style="padding:8px 16px;text-align:right;font-size:13px;font-weight:700;color:#0f172a;">${formatDate(data.newDueDate)} (+${data.extensionDays} days)</td></tr>`;
      } else if (commitmentType === 'payment_plan' && data?.paymentSchedule) {
        detailLines = data.paymentSchedule.map(p =>
          `<tr><td style="padding:8px 16px;color:#64748b;font-size:13px;border-bottom:1px solid #f1f5f9;">Instalment ${p.installment}</td><td style="padding:8px 16px;text-align:right;font-size:13px;font-weight:600;color:#1e293b;border-bottom:1px solid #f1f5f9;">${formatDate(p.dueDate)} — ${formatCurrency(p.amount)}</td></tr>`
        ).join('');
      } else if (commitmentType === 'already_paid' && data?.paymentDate) {
        detailLines = `<tr><td style="padding:8px 16px;color:#64748b;font-size:13px;">Claimed payment date</td><td style="padding:8px 16px;text-align:right;font-size:13px;font-weight:700;color:#0f172a;">${formatDate(data.paymentDate)}</td></tr>`;
      }

      const siteUrl = Deno.env.get('SITE_URL') ?? 'https://app.trailbill.com';
      const dashboardUrl = `${siteUrl}/commitments`;

      const ownerEmailHtml = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${ownerSubject}</title></head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:40px 16px;"><tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

      <tr><td style="background-color:#0f172a;padding:28px 40px;">
        <p style="margin:0 0 2px;color:rgba(255,255,255,0.5);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;">Client Action Required</p>
        <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">New Commitment Received</h1>
      </td></tr>
      <tr><td style="background-color:${config.accentColor};height:3px;font-size:0;line-height:0;">&nbsp;</td></tr>

      <tr><td style="padding:32px 40px 24px;">
        <p style="margin:0 0 4px;color:#94a3b8;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Client</p>
        <p style="margin:0 0 20px;color:#0f172a;font-size:22px;font-weight:800;">${recipientName}</p>

        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border-radius:10px;overflow:hidden;margin-bottom:24px;border:1px solid #e2e8f0;">
          <tr><td colspan="2" style="background-color:${config.accentColor}14;padding:12px 16px;border-bottom:1px solid #e2e8f0;">
            <p style="margin:0;color:${config.accentColor};font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;">${typeLabel}</p>
          </td></tr>
          <tr><td style="padding:8px 16px;color:#64748b;font-size:13px;border-bottom:1px solid #f1f5f9;">Invoice</td><td style="padding:8px 16px;text-align:right;font-size:13px;font-weight:600;color:#1e293b;border-bottom:1px solid #f1f5f9;">${invoiceNumber}</td></tr>
          <tr><td style="padding:8px 16px;color:#64748b;font-size:13px;border-bottom:${detailLines ? '1px solid #f1f5f9' : 'none'};">Invoice Amount</td><td style="padding:8px 16px;text-align:right;font-size:15px;font-weight:700;color:${config.accentColor};border-bottom:${detailLines ? '1px solid #f1f5f9' : 'none'};">R${amount.toLocaleString()}</td></tr>
          ${detailLines}
        </table>

        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;"><tr><td align="center">
          <a href="${dashboardUrl}" style="display:inline-block;background-color:${config.accentColor};color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:14px 40px;border-radius:8px;">Review in Dashboard →</a>
        </td></tr></table>

        <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.6;">This is an automated notification from ${businessName}. Log in to approve or decline this commitment.</p>
      </td></tr>

      <tr><td style="padding:20px 40px;text-align:center;background-color:#f8fafc;border-top:1px solid #e2e8f0;">
        <span style="color:#cbd5e1;font-size:12px;font-weight:700;">Trailbill<span style="color:#64748b;font-size:10px;font-weight:400;">.com</span></span>
        <p style="margin:6px 0 0;color:#cbd5e1;font-size:11px;">Smart invoicing &amp; payment commitments</p>
      </td></tr>

    </table>
  </td></tr></table>
</body></html>`;

      await resend.sendEmail({
        from: `${businessName} Notifications <${fromEmail}>`,
        to: ownerEmail,
        subject: ownerSubject,
        html: ownerEmailHtml,
      }).catch(err => console.error('Owner notification failed:', err));
    }

    return new Response(
      JSON.stringify({ success: true, emailId: result.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    );
  } catch (error) {
    console.error('Error sending commitment confirmation:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    );
  }
});
