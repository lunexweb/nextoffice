import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { ResendClient } from '../_shared/resend.ts';

interface InvoiceEmailRequest {
  invoiceId: string;
  clientId?: string;
  recipientEmail: string;
  recipientName: string;
  invoiceNumber: string;
  amount: number;
  dueDate: string;
  businessName?: string;
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
    const requestData: InvoiceEmailRequest = await req.json();

    const { invoiceNumber, recipientEmail, recipientName, amount, dueDate } = requestData;

    // Resolve client_id and user_id from invoice
    let clientId = requestData.clientId;
    let invoiceUserId: string | undefined;
    if (requestData.invoiceId) {
      const { data: inv } = await serviceClient
        .from('invoices')
        .select('client_id, user_id')
        .eq('id', requestData.invoiceId)
        .single();
      if (inv) {
        if (!clientId) clientId = inv.client_id;
        invoiceUserId = inv.user_id;
      }
    }

    // Compute client score server-side
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

    const currentLevel = getLevelLabel(clientScore);
    const currentColor = getLevelColor(clientScore);
    const honorScore = Math.min(100, clientScore + 10);
    const missScore = Math.max(0, clientScore - 4);
    const honorLevel = getLevelLabel(honorScore);
    const missLevel = getLevelLabel(missScore);
    const honorColor = getLevelColor(honorScore);
    const missColor = getLevelColor(missScore);
    const honorLevelUp = honorLevel !== currentLevel;
    const missLevelDown = missLevel !== currentLevel;
    const honorTag = honorLevelUp ? '<span style="display:inline-block;margin-left:4px;padding:1px 6px;background-color:#d1fae5;color:#065f46;font-size:9px;font-weight:700;border-radius:20px;">LEVEL UP ↑</span>' : '';
    const missTag = missLevelDown ? '<span style="display:inline-block;margin-left:4px;padding:1px 6px;background-color:#fee2e2;color:#991b1b;font-size:9px;font-weight:700;border-radius:20px;">LEVEL DOWN ↓</span>' : '';

    let businessName = requestData.businessName;
    if (!businessName && invoiceUserId) {
      const { data: profile } = await serviceClient
        .from('profiles')
        .select('business_name')
        .eq('id', invoiceUserId)
        .single();
      businessName = profile?.business_name || 'Your Business';
    }
    if (!businessName) businessName = 'Your Business';

    const fromEmail = Deno.env.get('FROM_EMAIL') ?? 'invoices@trailbill.com';
    const siteUrl = Deno.env.get('SITE_URL') ?? 'https://trailbill.com';
    const landingPageUrl = Deno.env.get('LANDING_PAGE_URL') ?? 'https://trailbill.com';
    const commitmentLink = `${siteUrl}/invoice/${invoiceNumber}/commitment`;
    const emailSubject = `New Invoice ${invoiceNumber} — R${amount.toLocaleString('en-ZA')} Due`;
    const formattedDue = new Date(dueDate + (dueDate.includes('T') ? '' : 'T00:00:00')).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' });
    const formattedAmount = `R${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const emailHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${emailSubject}</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background-color:#1e293b;padding:32px 40px;text-align:center;">
              <p style="margin:0 0 4px;color:rgba(255,255,255,0.6);font-size:12px;letter-spacing:2px;text-transform:uppercase;font-weight:600;">Invoice</p>
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">${businessName}</h1>
            </td>
          </tr>
          <!-- Accent stripe -->
          <tr><td style="background-color:#4f46e5;height:4px;font-size:0;line-height:0;">&nbsp;</td></tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px 20px;">
              <p style="margin:0 0 6px;color:#94a3b8;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Hello,</p>
              <p style="margin:0 0 24px;color:#1e293b;font-size:20px;font-weight:700;">${recipientName}</p>
              <p style="margin:0 0 28px;color:#475569;font-size:15px;line-height:1.7;">
                You have a new invoice from <strong style="color:#1e293b;">${businessName}</strong>. Please review the details below and choose a payment option that works for you.
              </p>

              <!-- Invoice details card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border-radius:10px;overflow:hidden;margin-bottom:28px;border:1px solid #e2e8f0;">
                <tr>
                  <td colspan="2" style="background-color:#4f46e514;padding:14px 16px;border-bottom:1px solid #e2e8f0;">
                    <p style="margin:0;color:#4f46e5;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;">Invoice Details</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:14px;width:45%;">Invoice Number</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;text-align:right;font-size:14px;font-weight:600;color:#1e293b;">${invoiceNumber}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:14px;">Amount Due</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;text-align:right;font-size:20px;font-weight:700;color:#4f46e5;">${formattedAmount}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;color:#64748b;font-size:14px;">Due Date</td>
                  <td style="padding:12px 16px;text-align:right;font-size:14px;font-weight:600;color:#1e293b;">${formattedDue}</td>
                </tr>
              </table>

              <!-- Score Psychology Section -->
              ${hasHistory ? `
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border-radius:10px;margin-bottom:28px;border:1px solid #e2e8f0;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0 0 2px;color:${currentColor};font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;">Your Payment Reliability Score</p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="vertical-align:middle;">
                          <p style="margin:0;color:${currentColor};font-size:18px;font-weight:800;">${currentLevel}</p>
                        </td>
                        <td style="vertical-align:middle;text-align:right;">
                          <span style="display:inline-block;background-color:${currentColor};color:#ffffff;font-size:15px;font-weight:800;padding:4px 12px;border-radius:20px;">${clientScore}<span style="font-size:10px;font-weight:500;opacity:0.85;">/100</span></span>
                        </td>
                      </tr>
                    </table>
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;">
                      <tr>
                        <td width="48%" style="vertical-align:top;">
                          <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;">
                            <tr><td style="padding:10px 12px;">
                              <p style="margin:0 0 2px;color:#15803d;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">✅ Pay On Time</p>
                              <p style="margin:0 0 4px;color:#166534;font-size:20px;font-weight:800;line-height:1;">${honorScore}<span style="font-size:12px;font-weight:500;color:#4ade80;">/100</span> <span style="font-size:12px;color:#15803d;font-weight:600;">+10</span></p>
                              <p style="margin:0;color:${honorColor};font-size:11px;font-weight:700;">${honorLevel}${honorTag}</p>
                            </td></tr>
                          </table>
                        </td>
                        <td width="4%">&nbsp;</td>
                        <td width="48%" style="vertical-align:top;">
                          <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fef2f2;border:1px solid #fecaca;border-radius:8px;">
                            <tr><td style="padding:10px 12px;">
                              <p style="margin:0 0 2px;color:#dc2626;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">❌ If Late</p>
                              <p style="margin:0 0 4px;color:#7f1d1d;font-size:20px;font-weight:800;line-height:1;">${missScore}<span style="font-size:12px;font-weight:500;color:#f87171;">/100</span> <span style="font-size:12px;color:#dc2626;font-weight:600;">-4</span></p>
                              <p style="margin:0;color:${missColor};font-size:11px;font-weight:700;">${missLevel}${missTag}</p>
                            </td></tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    <p style="margin:12px 0 0;color:#475569;font-size:12px;line-height:1.6;">Your reliability score is tracked by <strong>${businessName}</strong>. Paying on time builds trust and unlocks better terms.</p>
                  </td>
                </tr>
              </table>` : `
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f9ff;border-radius:10px;margin-bottom:28px;border:1px solid #bae6fd;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0 0 4px;color:#0ea5e9;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;">New Client</p>
                    <p style="margin:0 0 8px;color:#0369a1;font-size:15px;font-weight:700;">Welcome! Your reliability score starts here.</p>
                    <p style="margin:0;color:#0c4a6e;font-size:13px;line-height:1.6;">Pay this invoice on time to earn <strong style="color:#15803d;">+10 points</strong> and start building your payment reputation with <strong>${businessName}</strong>.</p>
                  </td>
                </tr>
              </table>`}

              <!-- CTA button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td align="center">
                    <a href="${commitmentLink}" style="display:inline-block;background-color:#4f46e5;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:16px 48px;border-radius:8px;">
                      View Invoice &amp; Choose Payment Option
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Info box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#eff6ff;border-left:4px solid #3b82f6;border-radius:0 8px 8px 0;margin-bottom:28px;">
                <tr>
                  <td style="padding:14px 18px;">
                    <p style="margin:0 0 6px;color:#1d4ed8;font-size:13px;font-weight:700;">Flexible Payment Options Available</p>
                    <p style="margin:0;color:#1e40af;font-size:13px;line-height:1.7;">Pay now, choose a payment date, request a plan, or make other arrangements — all through the secure link above.</p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 28px;color:#64748b;font-size:14px;line-height:1.7;">If you have any questions, please contact <strong>${businessName}</strong> directly.</p>
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
      subject: emailSubject,
      html: emailHtml,
    });

    const { error: logError } = await serviceClient
      .from('communication_logs')
      .insert({
        invoice_id: requestData.invoiceId || null,
        user_id: invoiceUserId || null,
        type: 'initial_invoice',
        status: 'sent',
        subject: emailSubject,
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
    console.error('Error sending invoice email:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
