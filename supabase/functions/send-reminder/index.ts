import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { ResendClient } from '../_shared/resend.ts';

interface ReminderEmailRequest {
  invoiceId: string;
  recipientEmail: string;
  recipientName: string;
  invoiceNumber: string;
  amount: number;
  dueDate: string;
  daysOverdue?: number;
  businessName?: string;
  clientScore?: number;
  hasHistory?: boolean;
  isOwnerNotification?: boolean;
  clientName?: string;
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY not configured');
    }

    // Service-role client for reliable DB lookups
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    const resend = new ResendClient(resendApiKey);
    const requestData: ReminderEmailRequest = await req.json();

    const { invoiceNumber, recipientEmail, recipientName, amount, dueDate, daysOverdue, isOwnerNotification, clientName } = requestData;

    // Resolve client_id and user_id from invoice
    let clientId: string | undefined;
    let invoiceUserId: string | undefined;
    if (requestData.invoiceId) {
      const { data: inv } = await serviceClient
        .from('invoices')
        .select('client_id, user_id')
        .eq('id', requestData.invoiceId)
        .single();
      if (inv) {
        clientId = inv.client_id;
        invoiceUserId = inv.user_id;
      }
    }

    // Compute score SERVER-SIDE via RPC (always fresh, tied to client_id)
    let clientScore = 60;
    let hasHistory = false;
    if (clientId) {
      const { data: scoreData } = await serviceClient.rpc('get_client_score', { p_client_id: clientId });
      if (scoreData) clientScore = scoreData.score ?? 60;
      const { count } = await serviceClient
        .from('invoices')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', clientId);
      hasHistory = (count ?? 0) > 1;
    }
    const missScore = Math.max(0, clientScore - 10);
    const currentLevel = getLevelLabel(clientScore);
    const missLevel = getLevelLabel(missScore);
    const missLevelColor = getLevelColor(missScore);
    const levelsDown = missLevel !== currentLevel;

    // Resolve business name
    let businessName = requestData.businessName;
    let logoUrl = '';
    if (!businessName && invoiceUserId) {
      const { data: profile } = await serviceClient
        .from('profiles')
        .select('business_name, logo_url')
        .eq('id', invoiceUserId)
        .single();
      businessName = profile?.business_name || 'Your Business';
      if (profile?.logo_url) logoUrl = profile.logo_url;
    }
    if (!businessName) businessName = 'Your Business';

    const isOverdue = daysOverdue && daysOverdue > 0;
    const accentColor = isOverdue ? '#ef4444' : '#f59e0b';
    const headerBg = isOverdue ? '#450a0a' : '#451a03';
    const fromEmail = Deno.env.get('FROM_EMAIL') ?? 'invoices@trailbill.com';
    const siteUrl = Deno.env.get('SITE_URL') ?? 'https://trailbill.com';
    const landingPageUrl = Deno.env.get('LANDING_PAGE_URL') ?? 'https://trailbill.com';
    const formattedDue = new Date(dueDate + (dueDate.includes('T') ? '' : 'T00:00:00')).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' });
    const formattedAmount = `R${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const displayClient = clientName || recipientName;
    const dashboardUrl = `${siteUrl}/app/invoices`;

    // ── Owner notification email (different from client-facing email) ─────────
    if (isOwnerNotification) {
      const ownerSubject = isOverdue
        ? `Follow-up sent to ${displayClient} — Invoice ${invoiceNumber}`
        : `Reminder sent to ${displayClient} — Invoice ${invoiceNumber}`;
      const actionLabel = isOverdue ? 'Follow-Up Sent' : 'Reminder Sent';
      const accentOwner = isOverdue ? '#ef4444' : '#f59e0b';
      const headerOwner = isOverdue ? '#1c0a0a' : '#1c1003';

      const ownerHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${ownerSubject}</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <tr>
            <td style="background-color:${headerOwner};padding:28px 40px;text-align:center;">
              <p style="margin:0 0 4px;color:rgba(255,255,255,0.5);font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:600;">Automation Alert · ${businessName}</p>
              <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">${actionLabel}</h1>
            </td>
          </tr>
          <tr><td style="background-color:${accentOwner};height:4px;font-size:0;line-height:0;">&nbsp;</td></tr>
          <tr>
            <td style="padding:32px 40px 24px;">
              <p style="margin:0 0 20px;color:#475569;font-size:15px;line-height:1.7;">
                An automated <strong style="color:#1e293b;">${isOverdue ? 'follow-up' : 'payment reminder'}</strong> was sent to <strong style="color:#1e293b;">${displayClient}</strong> for the invoice below.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border-radius:10px;overflow:hidden;margin-bottom:28px;border:1px solid #e2e8f0;">
                <tr>
                  <td colspan="2" style="background-color:${accentOwner}18;padding:12px 16px;border-bottom:1px solid #e2e8f0;">
                    <p style="margin:0;color:${accentOwner};font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;">Invoice Details</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:11px 16px;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:14px;width:45%;">Client</td>
                  <td style="padding:11px 16px;border-bottom:1px solid #f1f5f9;text-align:right;font-size:14px;font-weight:600;color:#1e293b;">${displayClient}</td>
                </tr>
                <tr>
                  <td style="padding:11px 16px;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:14px;">Invoice</td>
                  <td style="padding:11px 16px;border-bottom:1px solid #f1f5f9;text-align:right;font-size:14px;font-weight:600;color:#1e293b;">${invoiceNumber}</td>
                </tr>
                <tr>
                  <td style="padding:11px 16px;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:14px;">Amount</td>
                  <td style="padding:11px 16px;border-bottom:1px solid #f1f5f9;text-align:right;font-size:18px;font-weight:700;color:${accentOwner};">${formattedAmount}</td>
                </tr>
                <tr>
                  <td style="padding:11px 16px;color:#64748b;font-size:14px;">${isOverdue ? 'Days Overdue' : 'Due Date'}</td>
                  <td style="padding:11px 16px;text-align:right;font-size:14px;font-weight:600;color:${accentOwner};">${isOverdue ? `${daysOverdue} day${(daysOverdue ?? 0) !== 1 ? 's' : ''}` : formattedDue}</td>
                </tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td align="center">
                    <a href="${dashboardUrl}" style="display:inline-block;background-color:#0f172a;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:14px 40px;border-radius:8px;">View in Dashboard</a>
                  </td>
                </tr>
              </table>
              <p style="margin:0;color:#94a3b8;font-size:12px;text-align:center;">This is an automated notification from your Trailbill.com account.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

      const ownerResult = await resend.sendEmail({
        from: `${businessName} via Trailbill.com <${fromEmail}>`,
        to: recipientEmail,
        subject: ownerSubject,
        html: ownerHtml,
      });

      return new Response(
        JSON.stringify({ success: true, emailId: ownerResult.id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
      );
    }

    // ── Client-facing email (unchanged below) ─────────────────────────────────
    const subject = isOverdue
      ? `Payment Overdue — Invoice ${invoiceNumber} Requires Attention`
      : `Friendly Reminder — Invoice ${invoiceNumber} Due Soon`;
    const commitmentLink = `${siteUrl}/invoice/${invoiceNumber}/commitment`;

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

          <!-- Header -->
          <tr>
            <td style="background-color:${headerBg};padding:32px 40px;text-align:center;">
              ${logoUrl ? `<img src="${logoUrl}" alt="${businessName}" style="max-height:48px;max-width:160px;margin-bottom:8px;" />` : ''}
              <p style="margin:0 0 4px;color:rgba(255,255,255,0.6);font-size:12px;letter-spacing:2px;text-transform:uppercase;font-weight:600;">${isOverdue ? 'Overdue Notice' : 'Payment Reminder'}</p>
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">${isOverdue ? 'Payment Overdue' : 'Friendly Reminder'}</h1>
            </td>
          </tr>
          <tr><td style="background-color:${accentColor};height:4px;font-size:0;line-height:0;">&nbsp;</td></tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px 20px;">
              <p style="margin:0 0 6px;color:#94a3b8;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Hello,</p>
              <p style="margin:0 0 24px;color:#1e293b;font-size:20px;font-weight:700;">${recipientName}</p>
              <p style="margin:0 0 28px;color:#475569;font-size:15px;line-height:1.7;">
                ${isOverdue
                  ? `This is a notice that Invoice <strong style="color:#1e293b;">${invoiceNumber}</strong> from <strong style="color:#1e293b;">${businessName}</strong> is now <strong style="color:#ef4444;">${daysOverdue} day${(daysOverdue ?? 0) > 1 ? 's' : ''} overdue</strong>. Please arrange payment as soon as possible.`
                  : `This is a friendly reminder that Invoice <strong style="color:#1e293b;">${invoiceNumber}</strong> from <strong style="color:#1e293b;">${businessName}</strong> is due soon. Please ensure payment is made on time.`
                }
              </p>

              <!-- Invoice card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border-radius:10px;overflow:hidden;margin-bottom:28px;border:1px solid #e2e8f0;">
                <tr>
                  <td colspan="2" style="background-color:${accentColor}14;padding:14px 16px;border-bottom:1px solid #e2e8f0;">
                    <p style="margin:0;color:${accentColor};font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;">Invoice Summary</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:14px;width:45%;">Invoice Number</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;text-align:right;font-size:14px;font-weight:600;color:#1e293b;">${invoiceNumber}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:14px;">Amount Due</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;text-align:right;font-size:20px;font-weight:700;color:${accentColor};">${formattedAmount}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;color:#64748b;font-size:14px;">${isOverdue ? 'Was Due' : 'Due Date'}</td>
                  <td style="padding:12px 16px;text-align:right;font-size:14px;font-weight:600;color:${isOverdue ? accentColor : '#1e293b'};">${formattedDue}</td>
                </tr>
              </table>

              <!-- CTA button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td align="center">
                    <a href="${commitmentLink}" style="display:inline-block;background-color:${accentColor};color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:16px 48px;border-radius:8px;">
                      ${isOverdue ? 'Resolve Payment Now' : 'View Invoice &amp; Payment Options'}
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Score downgrade warning (overdue only, clients with history) -->
              ${isOverdue && hasHistory ? `
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fef2f2;border-radius:10px;overflow:hidden;margin-bottom:28px;border:1px solid #fecaca;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0 0 10px;color:#dc2626;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;">&#9888; Reliability Score at Risk</p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="44%" style="text-align:center;background-color:#fff1f2;border-radius:8px;padding:8px 4px;">
                          <p style="margin:0 0 2px;color:#94a3b8;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Current Score</p>
                          <p style="margin:0;color:#1e293b;font-size:28px;font-weight:800;line-height:1;">${clientScore}<span style="font-size:13px;font-weight:500;color:#94a3b8;">/100</span></p>
                          <p style="margin:4px 0 0;color:${getLevelColor(clientScore)};font-size:11px;font-weight:700;">${currentLevel}</p>
                        </td>
                        <td width="12%" style="text-align:center;">
                          <p style="margin:0;color:#ef4444;font-size:22px;font-weight:700;">&#8594;</p>
                          <p style="margin:2px 0 0;color:#dc2626;font-size:11px;font-weight:700;">-10</p>
                        </td>
                        <td width="44%" style="text-align:center;">
                          <p style="margin:0 0 2px;color:#dc2626;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">If Unpaid</p>
                          <p style="margin:0;color:#7f1d1d;font-size:28px;font-weight:800;line-height:1;">${missScore}<span style="font-size:13px;font-weight:500;color:#f87171;">/100</span></p>
                          <p style="margin:4px 0 0;color:${missLevelColor};font-size:11px;font-weight:700;">${missLevel}${levelsDown ? ' <span style="display:inline-block;margin-left:4px;padding:1px 6px;background-color:#fee2e2;color:#991b1b;font-size:9px;font-weight:700;border-radius:10px;">LEVEL DOWN &#8595;</span>' : ''}</p>
                        </td>
                      </tr>
                    </table>
                    <p style="margin:12px 0 0;color:#b91c1c;font-size:12px;line-height:1.6;">Paying now will protect your reliability score and standing with <strong>${businessName}</strong>. Act before this affects your payment reputation.</p>
                  </td>
                </tr>
              </table>` : ''}

              <!-- Note -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:${accentColor}0d;border-left:4px solid ${accentColor};border-radius:0 8px 8px 0;margin-bottom:28px;">
                <tr>
                  <td style="padding:14px 18px;">
                    <p style="margin:0;color:#374151;font-size:13px;line-height:1.7;">
                      ${isOverdue
                        ? `If you have already made this payment, please disregard this notice. Otherwise, please use the button above to arrange payment or contact <strong>${businessName}</strong> directly.`
                        : `If you need to discuss payment arrangements or have any questions, please contact <strong>${businessName}</strong> directly.`
                      }
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 6px;color:#64748b;font-size:14px;">Kind regards,</p>
              <p style="margin:0;color:#1e293b;font-size:15px;font-weight:700;">${businessName}</p>
            </td>
          </tr>

          <!-- Divider -->
          <tr><td style="padding:0 40px;"><div style="border-top:1px solid #e2e8f0;"></div></td></tr>

          <!-- Trailbill.com footer -->
          <tr>
            <td style="padding:28px 40px;text-align:center;background-color:#f8fafc;">
              <p style="margin:0 0 14px;color:#94a3b8;font-size:12px;">Powered by</p>
              <a href="${landingPageUrl}" target="_blank" style="display:inline-block;text-decoration:none;">
                <table cellpadding="0" cellspacing="0" style="display:inline-table;">
                  <tr><td style="background-color:#0f172a;padding:10px 24px;border-radius:8px;">
                    <span style="color:#ffffff;font-size:14px;font-weight:700;letter-spacing:-0.3px;">Trailbill<span style="color:#64748b;font-size:10px;font-weight:400;">.com</span></span>
                  </td></tr>
                </table>
              </a>
              <p style="margin:14px 0 0;color:#cbd5e1;font-size:11px;">Smart invoicing &amp; payment commitments for modern businesses</p>
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

    const { error: logError } = await serviceClient
      .from('communication_logs')
      .insert({
        invoice_id: requestData.invoiceId || null,
        user_id: invoiceUserId || null,
        type: isOverdue ? 'followup' : 'reminder',
        status: 'sent',
        subject,
        recipient_email: recipientEmail,
        email_id: result.id,
        sent_at: new Date().toISOString(),
      });

    if (logError) {
      console.error('Failed to log communication:', logError);
    }

    return new Response(
      JSON.stringify({ success: true, emailId: result.id }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error sending reminder email:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
