import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { ResendClient } from '../_shared/resend.ts';

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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  if (!resendApiKey) {
    return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }

  const resend = new ResendClient(resendApiKey);
  const fromEmail = Deno.env.get('FROM_EMAIL') ?? 'invoices@trailbill.com';
  const siteUrl = Deno.env.get('SITE_URL') ?? '';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];

  const reminderWindow = new Date(today);
  reminderWindow.setDate(reminderWindow.getDate() + 7);
  const reminderWindowStr = reminderWindow.toISOString().split('T')[0];

  let remindersSent = 0;
  let followUpsSent = 0;
  const errors: string[] = [];

  try {
    // ── 1. Fetch all users with automation enabled ──────────────────────────
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('reminder_settings')
      .select('user_id, automation_enabled, send_on_weekends, max_reminders_per_invoice, stop_after_days')
      .eq('automation_enabled', true);

    if (settingsError) throw settingsError;
    if (!settings || settings.length === 0) {
      return new Response(JSON.stringify({ message: 'No users with automation enabled' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const dayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday

    for (const setting of settings) {
      // Skip weekends if configured
      if (!setting.send_on_weekends && (dayOfWeek === 0 || dayOfWeek === 6)) {
        continue;
      }

      const stopAfterDays = setting.stop_after_days ?? 60;
      const maxReminders = setting.max_reminders_per_invoice ?? 3;
      const userId = setting.user_id;

      // ── 2. Get user's profile (for business name / email) ────────────────
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('business_name, email')
        .eq('id', userId)
        .single();

      const businessName = profile?.business_name ?? 'Your Business';
      const businessEmail = profile?.email ?? fromEmail;

      // ── 3. Fetch active invoices for this user ───────────────────────────
      const { data: invoices, error: invoicesError } = await supabaseAdmin
        .from('invoices')
        .select('id, number, amount, due_date, status, client_id')
        .eq('user_id', userId)
        .in('status', ['sent', 'overdue'])
        .gte('due_date', new Date(today.getTime() - stopAfterDays * 86400000).toISOString().split('T')[0]);

      if (invoicesError) {
        errors.push(`Failed to fetch invoices for user ${userId}: ${invoicesError.message}`);
        continue;
      }

      if (!invoices || invoices.length === 0) continue;

      for (const invoice of invoices) {
        const dueDate = new Date(invoice.due_date);
        dueDate.setHours(0, 0, 0, 0);
        const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / 86400000);
        const isOverdue = daysUntilDue < 0;
        const daysOverdue = isOverdue ? Math.abs(daysUntilDue) : 0;

        // ── 4. Get client details ─────────────────────────────────────────
        const { data: client } = await supabaseAdmin
          .from('clients')
          .select('name, email')
          .eq('id', invoice.client_id)
          .single();

        if (!client?.email) continue;

        // ── 4b. Fetch client score via RPC ──────────────────────────────
        let clientScore = 60;
        let hasHistory = false;
        try {
          const { data: scoreData } = await supabaseAdmin.rpc('get_client_score', { p_client_id: invoice.client_id });
          if (scoreData) clientScore = scoreData.score ?? 60;
          const { count } = await supabaseAdmin
            .from('invoices')
            .select('id', { count: 'exact', head: true })
            .eq('client_id', invoice.client_id);
          hasHistory = (count ?? 0) > 1;
        } catch (_) { /* score fetch failed, use defaults */ }

        // ── 5. Check today's communication logs to avoid duplicates ────────
        const todayStart = new Date(today).toISOString();
        const { data: todayLogs } = await supabaseAdmin
          .from('communication_logs')
          .select('type, sent_at')
          .eq('invoice_id', invoice.id)
          .in('type', ['reminder', 'followup'])
          .gte('sent_at', todayStart);

        const reminderSentToday = todayLogs?.some(l => l.type === 'reminder');
        const followUpSentToday = todayLogs?.some(l => l.type === 'followup');

        // Count total follow-ups sent (for score drop logic)
        const { data: followUpLogs } = await supabaseAdmin
          .from('communication_logs')
          .select('id')
          .eq('invoice_id', invoice.id)
          .eq('type', 'followup');
        const totalFollowUpsSent = followUpLogs?.length ?? 0;

        // Check total reminders sent (to respect max_reminders_per_invoice)
        const { data: allLogs } = await supabaseAdmin
          .from('communication_logs')
          .select('id')
          .eq('invoice_id', invoice.id)
          .in('type', ['reminder', 'followup']);

        const totalSent = allLogs?.length ?? 0;
        if (totalSent >= maxReminders) continue;

        const commitmentLink = `${siteUrl}/invoice/${invoice.number}/commitment`;

        // ── 6. Send reminders ──────────────────────────────────────────────
        // 1st reminder: 1 day before due date
        // 2nd reminder: on the due date
        const shouldSendReminder = !isOverdue && !reminderSentToday && (daysUntilDue === 1 || daysUntilDue === 0);
        if (shouldSendReminder) {
          const subject = daysUntilDue === 1
            ? `⚠️ Invoice ${invoice.number} Due Tomorrow`
            : `� Invoice ${invoice.number} Due Today`;

          const emailHtml = buildReminderHtml({
            recipientName: client.name,
            invoiceNumber: invoice.number,
            amount: invoice.amount,
            dueDate: invoice.due_date,
            daysUntilDue,
            commitmentLink,
            businessName,
            clientScore,
            hasHistory,
          });

          try {
            const result = await resend.sendEmail({
              from: `${businessName} <${fromEmail}>`,
              to: client.email,
              subject,
              html: emailHtml,
            });

            await supabaseAdmin.from('communication_logs').insert({
              user_id: userId,
              invoice_id: invoice.id,
              client_id: invoice.client_id,
              type: 'reminder',
              status: 'sent',
              subject,
              recipient_email: client.email,
              email_id: result.id,
              sent_at: new Date().toISOString(),
            });

            // ── Notify owner ──
            await sendOwnerNotification(resend, fromEmail, businessName, businessEmail, {
              type: 'reminder',
              clientName: client.name,
              invoiceNumber: invoice.number,
              amount: invoice.amount,
              dueDate: invoice.due_date,
              daysUntilDue,
              daysOverdue: 0,
              dashboardUrl: `${siteUrl}/app/invoices`,
            });

            remindersSent++;
          } catch (e) {
            errors.push(`Reminder failed for invoice ${invoice.number}: ${e.message}`);
          }
        }

        // ── 7. Send follow-ups (invoice overdue) ──────────────────────────
        // 1st follow-up: 1 day after due date
        // 2nd follow-up onwards: every 2 days (day 3, 5, 7, 9…)
        const isFollowUpDay = daysOverdue === 1 || (daysOverdue >= 3 && (daysOverdue - 1) % 2 === 0);
        if (isOverdue && isFollowUpDay && !followUpSentToday) {
          const followUpNumber = daysOverdue === 1 ? 1 : Math.floor((daysOverdue - 1) / 2) + 1;
          const scoreDropping = followUpNumber >= 2;
          const subject = daysOverdue === 1
            ? `⚠️ Invoice ${invoice.number} — 1 Day Overdue`
            : `🚨 Invoice ${invoice.number} is ${daysOverdue} Day${daysOverdue !== 1 ? 's' : ''} Overdue`;

          const emailHtml = buildFollowUpHtml({
            recipientName: client.name,
            invoiceNumber: invoice.number,
            amount: invoice.amount,
            dueDate: invoice.due_date,
            daysOverdue,
            commitmentLink,
            businessName,
            clientScore,
            hasHistory,
            followUpNumber,
          });

          try {
            const result = await resend.sendEmail({
              from: `${businessName} <${fromEmail}>`,
              to: client.email,
              subject,
              html: emailHtml,
            });

            await supabaseAdmin.from('communication_logs').insert({
              user_id: userId,
              invoice_id: invoice.id,
              client_id: invoice.client_id,
              type: 'followup',
              status: 'sent',
              subject,
              recipient_email: client.email,
              email_id: result.id,
              sent_at: new Date().toISOString(),
            });

            // ── Notify owner ──
            await sendOwnerNotification(resend, fromEmail, businessName, businessEmail, {
              type: 'followup',
              clientName: client.name,
              invoiceNumber: invoice.number,
              amount: invoice.amount,
              dueDate: invoice.due_date,
              daysUntilDue: 0,
              daysOverdue,
              followUpNumber,
              scoreDropping,
              dashboardUrl: `${siteUrl}/app/invoices`,
            });

            followUpsSent++;
          } catch (e) {
            errors.push(`Follow-up failed for invoice ${invoice.number}: ${e.message}`);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        remindersSent,
        followUpsSent,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    );
  } catch (error) {
    console.error('process-reminders fatal error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    );
  }
});

// ── Email HTML builders ────────────────────────────────────────────────────

function buildReminderHtml(p: {
  recipientName: string;
  invoiceNumber: string;
  amount: number;
  dueDate: string;
  daysUntilDue: number;
  commitmentLink: string;
  businessName: string;
  clientScore: number;
  hasHistory: boolean;
}): string {
  const currentLevel = getLevelLabel(p.clientScore);
  const currentColor = getLevelColor(p.clientScore);
  const honorScore = Math.min(100, p.clientScore + 10);
  const missScore = Math.max(0, p.clientScore - 4);
  const honorLevel = getLevelLabel(honorScore);
  const missLevel = getLevelLabel(missScore);
  const honorColor = getLevelColor(honorScore);
  const missColor = getLevelColor(missScore);
  const honorUp = honorLevel !== currentLevel;
  const missDown = missLevel !== currentLevel;
  const honorTag = honorUp ? ' <span style="background:#d1fae5;color:#065f46;font-size:9px;font-weight:700;padding:1px 5px;border-radius:10px;">UP ↑</span>' : '';
  const missTag = missDown ? ' <span style="background:#fee2e2;color:#991b1b;font-size:9px;font-weight:700;padding:1px 5px;border-radius:10px;">DOWN ↓</span>' : '';

  const scoreSection = p.hasHistory ? `
      <div style="background: white; padding: 16px 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0;">
        <p style="margin:0 0 4px;color:${currentColor};font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Your Payment Score: ${p.clientScore}/100 — ${currentLevel}</p>
        <table style="width:100%;border-collapse:collapse;margin-top:10px;">
          <tr>
            <td style="width:48%;vertical-align:top;">
              <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:8px 10px;">
                <p style="margin:0;color:#15803d;font-size:10px;font-weight:700;">✅ PAY ON TIME</p>
                <p style="margin:2px 0 0;color:#166534;font-size:18px;font-weight:800;">${honorScore}/100 <span style="font-size:11px;color:#15803d;">+10</span></p>
                <p style="margin:2px 0 0;color:${honorColor};font-size:10px;font-weight:700;">${honorLevel}${honorTag}</p>
              </div>
            </td>
            <td style="width:4%;">&nbsp;</td>
            <td style="width:48%;vertical-align:top;">
              <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:8px 10px;">
                <p style="margin:0;color:#dc2626;font-size:10px;font-weight:700;">❌ IF LATE</p>
                <p style="margin:2px 0 0;color:#7f1d1d;font-size:18px;font-weight:800;">${missScore}/100 <span style="font-size:11px;color:#dc2626;">-4</span></p>
                <p style="margin:2px 0 0;color:${missColor};font-size:10px;font-weight:700;">${missLevel}${missTag}</p>
              </div>
            </td>
          </tr>
        </table>
        <p style="margin:8px 0 0;color:#64748b;font-size:11px;">Paying on time protects your score with <strong>${p.businessName}</strong>.</p>
      </div>` : `
      <div style="background:#f0f9ff;padding:12px 16px;border-radius:8px;margin:16px 0;border:1px solid #bae6fd;">
        <p style="margin:0;color:#0369a1;font-size:13px;">💡 Pay on time to earn <strong style="color:#15803d;">+10 points</strong> toward your reliability score with <strong>${p.businessName}</strong>.</p>
      </div>`;

  return `<!DOCTYPE html>
<html>
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
      <div style="font-size: 40px; margin-bottom: 8px;">🔔</div>
      <h1 style="color: white; margin: 0; font-size: 24px;">Payment Reminder</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0;">${p.daysUntilDue === 1 ? 'Due Tomorrow!' : `Due in ${p.daysUntilDue} Days`}</p>
    </div>
    <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
      <p style="font-size: 16px;">Hi ${p.recipientName},</p>
      <p style="font-size: 16px;">This is a friendly reminder that Invoice <strong>${p.invoiceNumber}</strong> from <strong>${p.businessName}</strong> is due ${p.daysUntilDue === 1 ? 'tomorrow' : `in ${p.daysUntilDue} days`}.</p>
      <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #e9ecef;"><strong>Invoice:</strong></td>
            <td style="padding: 8px 0; border-bottom: 1px solid #e9ecef; text-align: right;">${p.invoiceNumber}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #e9ecef;"><strong>Amount Due:</strong></td>
            <td style="padding: 8px 0; border-bottom: 1px solid #e9ecef; text-align: right; font-size: 20px; color: #f59e0b;"><strong>R${p.amount.toLocaleString('en-ZA')}</strong></td>
          </tr>
          <tr>
            <td style="padding: 8px 0;"><strong>Due Date:</strong></td>
            <td style="padding: 8px 0; text-align: right;">${new Date(p.dueDate).toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
          </tr>
        </table>
      </div>
      ${scoreSection}
      <div style="text-align: center; margin: 30px 0;">
        <a href="${p.commitmentLink}" style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 14px 36px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px;">View Invoice &amp; Payment Options</a>
      </div>
      <p style="font-size: 13px; color: #6c757d; margin-top: 24px; padding-top: 16px; border-top: 1px solid #e9ecef;">
        Need more time? Click the button above to request a payment plan or extension.
      </p>
      <p style="font-size: 13px; color: #6c757d; margin-top: 8px;">Best regards,<br><strong>${p.businessName}</strong></p>
    </div>
  </body>
</html>`;
}

function buildFollowUpHtml(p: {
  recipientName: string;
  invoiceNumber: string;
  amount: number;
  dueDate: string;
  daysOverdue: number;
  commitmentLink: string;
  businessName: string;
  clientScore: number;
  hasHistory: boolean;
  followUpNumber: number;
}): string {
  const scoreDropping = p.followUpNumber >= 2;
  const currentLevel = getLevelLabel(p.clientScore);
  const currentColor = getLevelColor(p.clientScore);
  const penalty = scoreDropping ? 10 : 0;
  const missScore = Math.max(0, p.clientScore - penalty);
  const missLevel = getLevelLabel(missScore);
  const missColor = getLevelColor(missScore);
  const missDown = missLevel !== currentLevel;
  const missTag = missDown ? ' <span style="background:#fee2e2;color:#991b1b;font-size:9px;font-weight:700;padding:1px 5px;border-radius:10px;">LEVEL DOWN ↓</span>' : '';

  // 1st follow-up: gentle warning. 2nd+: score is actively dropping.
  const scoreSection = !scoreDropping && p.hasHistory ? `
      <div style="background:#fff7ed;padding:16px 20px;border-radius:8px;margin:20px 0;border:1px solid #fed7aa;">
        <p style="margin:0 0 6px;color:#c2410c;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Payment Overdue</p>
        <p style="margin:0;color:#9a3412;font-size:13px;">Your score hasn’t been affected yet, but continued non-payment will start reducing your reliability score with <strong>${p.businessName}</strong>.</p>
      </div>` : p.hasHistory && scoreDropping ? `
      <div style="background:#fef2f2;padding:16px 20px;border-radius:8px;margin:20px 0;border:1px solid #fecaca;">
        <p style="margin:0 0 6px;color:#dc2626;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">⚠️ Score Dropping</p>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="width:44%;text-align:center;background:#fff1f2;border-radius:6px;padding:8px 4px;">
              <p style="margin:0;color:#94a3b8;font-size:10px;font-weight:600;">CURRENT</p>
              <p style="margin:2px 0 0;color:#1e293b;font-size:24px;font-weight:800;">${p.clientScore}<span style="font-size:11px;color:#94a3b8;">/100</span></p>
              <p style="margin:2px 0 0;color:${currentColor};font-size:10px;font-weight:700;">${currentLevel}</p>
            </td>
            <td style="width:12%;text-align:center;">
              <p style="margin:0;color:#ef4444;font-size:18px;font-weight:700;">→</p>
              <p style="margin:0;color:#dc2626;font-size:11px;font-weight:700;">-10</p>
            </td>
            <td style="width:44%;text-align:center;">
              <p style="margin:0;color:#dc2626;font-size:10px;font-weight:600;">IF UNPAID</p>
              <p style="margin:2px 0 0;color:#7f1d1d;font-size:24px;font-weight:800;">${missScore}<span style="font-size:11px;color:#f87171;">/100</span></p>
              <p style="margin:2px 0 0;color:${missColor};font-size:10px;font-weight:700;">${missLevel}${missTag}</p>
            </td>
          </tr>
        </table>
        <p style="margin:10px 0 0;color:#b91c1c;font-size:11px;">Resolve this now to protect your reliability score with <strong>${p.businessName}</strong>.</p>
      </div>` : `
      <div style="background:#fef2f2;padding:12px 16px;border-radius:8px;margin:16px 0;border:1px solid #fecaca;">
        <p style="margin:0;color:#b91c1c;font-size:13px;">⚠️ Late payments cost up to <strong>-10 points</strong> on your reliability score with <strong>${p.businessName}</strong>. Resolve now to avoid score impact.</p>
      </div>`;

  return `<!DOCTYPE html>
<html>
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
      <div style="font-size: 40px; margin-bottom: 8px;">⚠️</div>
      <h1 style="color: white; margin: 0; font-size: 24px;">Payment Overdue</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0;">${p.daysOverdue} day${p.daysOverdue !== 1 ? 's' : ''} past due date</p>
    </div>
    <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
      <p style="font-size: 16px;">Hi ${p.recipientName},</p>
      <p style="font-size: 16px;">We noticed that Invoice <strong>${p.invoiceNumber}</strong> from <strong>${p.businessName}</strong> is now <strong>${p.daysOverdue} day${p.daysOverdue !== 1 ? 's' : ''} overdue</strong>. We understand things happen — please get in touch so we can find a solution together.</p>
      <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #e9ecef;"><strong>Invoice:</strong></td>
            <td style="padding: 8px 0; border-bottom: 1px solid #e9ecef; text-align: right;">${p.invoiceNumber}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #e9ecef;"><strong>Amount Due:</strong></td>
            <td style="padding: 8px 0; border-bottom: 1px solid #e9ecef; text-align: right; font-size: 20px; color: #ef4444;"><strong>R${p.amount.toLocaleString('en-ZA')}</strong></td>
          </tr>
          <tr>
            <td style="padding: 8px 0;"><strong>Was Due:</strong></td>
            <td style="padding: 8px 0; text-align: right;">${new Date(p.dueDate).toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
          </tr>
        </table>
      </div>
      ${scoreSection}
      <div style="text-align: center; margin: 30px 0;">
        <a href="${p.commitmentLink}" style="display: inline-block; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 14px 36px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px;">Resolve Now</a>
      </div>
      <p style="font-size: 13px; color: #6c757d; margin-top: 24px; padding-top: 16px; border-top: 1px solid #e9ecef;">
        We're here to help. Click the button above to submit a payment commitment or request an arrangement.
      </p>
      <p style="font-size: 13px; color: #6c757d; margin-top: 8px;">Best regards,<br><strong>${p.businessName}</strong></p>
    </div>
  </body>
</html>`;
}

// ── Owner notification helper ─────────────────────────────────────────────────

interface OwnerNotifData {
  type: 'reminder' | 'followup';
  clientName: string;
  invoiceNumber: string;
  amount: number;
  dueDate: string;
  daysUntilDue: number;
  daysOverdue: number;
  followUpNumber?: number;
  scoreDropping?: boolean;
  dashboardUrl: string;
}

async function sendOwnerNotification(
  resend: any,
  fromEmail: string,
  businessName: string,
  ownerEmail: string,
  data: OwnerNotifData,
): Promise<void> {
  try {
    const formattedAmount = `R${data.amount.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const formattedDue = new Date(data.dueDate + (data.dueDate.includes('T') ? '' : 'T00:00:00')).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' });

    const isFollowUp = data.type === 'followup';
    const headerBg = isFollowUp ? '#7f1d1d' : '#0f172a';
    const accentColor = isFollowUp ? '#ef4444' : '#3b82f6';
    const statusIcon = isFollowUp ? '🚨' : '📧';

    const typeLabel = isFollowUp
      ? `Follow-up #${data.followUpNumber || 1}`
      : data.daysUntilDue === 0 ? 'Due Date Reminder' : 'Payment Reminder';

    const statusLine = isFollowUp
      ? `Invoice is <strong style="color:#ef4444;">${data.daysOverdue} day${data.daysOverdue !== 1 ? 's' : ''} overdue</strong>. ${data.scoreDropping ? 'Client score is now dropping.' : 'Score not yet affected.'}`
      : data.daysUntilDue === 0
        ? 'Invoice is <strong>due today</strong>.'
        : 'Invoice is due <strong>tomorrow</strong>.';

    const ownerSubject = isFollowUp
      ? `${statusIcon} Follow-up #${data.followUpNumber} sent to ${data.clientName} — ${data.invoiceNumber}`
      : `${statusIcon} Reminder sent to ${data.clientName} — ${data.invoiceNumber}`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${ownerSubject}</title></head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:40px 16px;"><tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

      <tr><td style="background-color:${headerBg};padding:24px 40px;">
        <p style="margin:0 0 2px;color:rgba(255,255,255,0.5);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;">Automated Action</p>
        <h1 style="margin:0;color:#ffffff;font-size:18px;font-weight:700;">${statusIcon} ${typeLabel} Sent</h1>
      </td></tr>
      <tr><td style="background-color:${accentColor};height:3px;font-size:0;line-height:0;">&nbsp;</td></tr>

      <tr><td style="padding:28px 40px 20px;">
        <p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.7;">
          Trailbill.com automatically sent a <strong>${typeLabel.toLowerCase()}</strong> to <strong style="color:#0f172a;">${data.clientName}</strong> on your behalf. ${statusLine}
        </p>

        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border-radius:10px;overflow:hidden;margin-bottom:24px;border:1px solid #e2e8f0;">
          <tr><td colspan="2" style="background-color:${accentColor}14;padding:12px 16px;border-bottom:1px solid #e2e8f0;">
            <p style="margin:0;color:${accentColor};font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;">Invoice Summary</p>
          </td></tr>
          <tr><td style="padding:10px 16px;color:#64748b;font-size:13px;border-bottom:1px solid #f1f5f9;">Client</td><td style="padding:10px 16px;text-align:right;font-size:13px;font-weight:600;color:#1e293b;border-bottom:1px solid #f1f5f9;">${data.clientName}</td></tr>
          <tr><td style="padding:10px 16px;color:#64748b;font-size:13px;border-bottom:1px solid #f1f5f9;">Invoice</td><td style="padding:10px 16px;text-align:right;font-size:13px;font-weight:600;color:#1e293b;border-bottom:1px solid #f1f5f9;">${data.invoiceNumber}</td></tr>
          <tr><td style="padding:10px 16px;color:#64748b;font-size:13px;border-bottom:1px solid #f1f5f9;">Amount</td><td style="padding:10px 16px;text-align:right;font-size:15px;font-weight:700;color:${accentColor};border-bottom:1px solid #f1f5f9;">${formattedAmount}</td></tr>
          <tr><td style="padding:10px 16px;color:#64748b;font-size:13px;">Due Date</td><td style="padding:10px 16px;text-align:right;font-size:13px;font-weight:600;color:#1e293b;">${formattedDue}</td></tr>
        </table>

        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;"><tr><td align="center">
          <a href="${data.dashboardUrl}" style="display:inline-block;background-color:${accentColor};color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:14px 40px;border-radius:8px;">View in Dashboard →</a>
        </td></tr></table>

        <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.6;">This is an automated notification. No action required — Trailbill.com is handling your payment follow-ups.</p>
      </td></tr>

      <tr><td style="padding:16px 40px;text-align:center;background-color:#f8fafc;border-top:1px solid #e2e8f0;">
        <span style="color:#cbd5e1;font-size:12px;font-weight:700;">Trailbill<span style="color:#64748b;font-size:10px;font-weight:400;">.com</span></span>
        <p style="margin:4px 0 0;color:#cbd5e1;font-size:11px;">Automated invoicing &amp; payment follow-ups</p>
      </td></tr>

    </table>
  </td></tr></table>
</body></html>`;

    await resend.sendEmail({
      from: `Trailbill.com <${fromEmail}>`,
      to: ownerEmail,
      subject: ownerSubject,
      html,
    });
  } catch (err) {
    console.error('Owner notification failed (non-blocking):', err);
  }
}
