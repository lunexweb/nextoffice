import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { ResendClient } from '../_shared/resend.ts';

interface PaymentReceivedRequest {
  invoiceId?: string;
  clientId?: string;
  recipientEmail: string;
  recipientName: string;
  invoiceNumber: string;
  amount: number;
  paymentDate: string;
  businessName?: string;
  clientScore?: number;   // ignored — now computed server-side
  hasHistory?: boolean;
  scoreGain?: number;     // ignored — now computed server-side
  userId?: string;
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
    if (!resendApiKey) throw new Error('RESEND_API_KEY not configured');

    const resend = new ResendClient(resendApiKey);
    const requestData: PaymentReceivedRequest = await req.json();
    const { recipientEmail, recipientName, invoiceNumber, amount, paymentDate } = requestData;

    // Service-role client for DB lookups (not dependent on user auth)
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    // Resolve client_id from invoice if not passed
    let clientId = requestData.clientId;
    let invoiceUserId = requestData.userId;
    if ((!clientId || !invoiceUserId) && requestData.invoiceId) {
      const { data: inv } = await serviceClient
        .from('invoices')
        .select('client_id, user_id')
        .eq('id', requestData.invoiceId)
        .single();
      if (inv) {
        if (!clientId) clientId = inv.client_id;
        if (!invoiceUserId) invoiceUserId = inv.user_id;
      }
    }
    if ((!clientId || !invoiceUserId) && invoiceNumber) {
      const { data: inv } = await serviceClient
        .from('invoices')
        .select('client_id, user_id')
        .eq('number', invoiceNumber)
        .single();
      if (inv) {
        if (!clientId) clientId = inv.client_id;
        if (!invoiceUserId) invoiceUserId = inv.user_id;
      }
    }

    // Compute score SERVER-SIDE via RPC (always fresh, tied to client_id)
    // IMPORTANT: By the time this function runs, the invoice is ALREADY marked
    // as 'paid' in the DB. So the RPC returns the POST-payment score.
    let newScore = 60;
    let hasHistory = false;
    if (clientId) {
      const { data: scoreData } = await serviceClient.rpc('get_client_score', { p_client_id: clientId });
      if (scoreData) {
        newScore = scoreData.score ?? 60;
      }
      const { count } = await serviceClient
        .from('invoices')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', clientId);
      hasHistory = (count ?? 0) > 1;
    }

    // Determine what this specific payment contributed to the score
    // so we can compute the previous score accurately
    let scoreGain = 6; // default fallback
    if (requestData.invoiceId) {
      const { data: inv } = await serviceClient
        .from('invoices')
        .select('due_date, paid_date')
        .eq('id', requestData.invoiceId)
        .single();
      const { data: cm } = await serviceClient
        .from('commitments')
        .select('id, status, type')
        .eq('invoice_id', requestData.invoiceId)
        .order('requested_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (inv) {
        if (cm) {
          if (cm.status === 'approved') scoreGain = 8;
          else if (cm.status === 'completed') scoreGain = 6;
          else scoreGain = 3;
        } else {
          const pd = inv.paid_date ? new Date(inv.paid_date + (String(inv.paid_date).includes('T') ? '' : 'T00:00:00')) : null;
          const dd = new Date(inv.due_date + (String(inv.due_date).includes('T') ? '' : 'T00:00:00'));
          scoreGain = (pd && pd <= dd) ? 10 : -4;
        }
      }
    }

    // Previous score = new score minus what this payment contributed
    const clientScore = Math.max(0, Math.min(100, newScore - scoreGain));
    const oldLevel = getLevelLabel(clientScore);
    const newLevel = getLevelLabel(newScore);
    const newLevelColor = getLevelColor(newScore);
    const leveledUp = newLevel !== oldLevel;

    // Resolve business name
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

    const fromEmail = Deno.env.get('FROM_EMAIL') ?? 'invoices@nextoffice.app';
    const siteUrl = Deno.env.get('SITE_URL') ?? 'https://nextoffice.app';
    const landingPageUrl = Deno.env.get('LANDING_PAGE_URL') ?? 'https://nextoffice.app';
    const portalLink = `${siteUrl}/invoice/${invoiceNumber}/commitment`;
    const subject = `Payment Confirmed — Invoice ${invoiceNumber}`;
    const formattedDate = new Date(paymentDate + (paymentDate.includes('T') ? '' : 'T00:00:00')).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' });
    const formattedAmount = `R${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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
            <td style="background-color:#064e3b;padding:32px 40px;text-align:center;">
              <p style="margin:0 0 4px;color:rgba(255,255,255,0.6);font-size:12px;letter-spacing:2px;text-transform:uppercase;font-weight:600;">Payment Confirmation</p>
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">Payment Received</h1>
            </td>
          </tr>
          <tr><td style="background-color:#10b981;height:4px;font-size:0;line-height:0;">&nbsp;</td></tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px 20px;">
              <p style="margin:0 0 6px;color:#94a3b8;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Hello,</p>
              <p style="margin:0 0 24px;color:#1e293b;font-size:20px;font-weight:700;">${recipientName}</p>
              <p style="margin:0 0 28px;color:#475569;font-size:15px;line-height:1.7;">
                Your payment for Invoice <strong style="color:#1e293b;">${invoiceNumber}</strong> from <strong style="color:#1e293b;">${businessName}</strong> has been received and confirmed. Thank you — your account is now settled.
              </p>

              <!-- Payment details card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border-radius:10px;overflow:hidden;margin-bottom:28px;border:1px solid #e2e8f0;">
                <tr>
                  <td colspan="2" style="background-color:#10b98114;padding:14px 16px;border-bottom:1px solid #e2e8f0;">
                    <p style="margin:0;color:#10b981;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;">Payment Summary</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:14px;width:45%;">Invoice Number</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;text-align:right;font-size:14px;font-weight:600;color:#1e293b;">${invoiceNumber}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:14px;">Amount Paid</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;text-align:right;font-size:20px;font-weight:700;color:#10b981;">${formattedAmount}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;color:#64748b;font-size:14px;">Payment Date</td>
                  <td style="padding:12px 16px;text-align:right;font-size:14px;font-weight:600;color:#1e293b;">${formattedDate}</td>
                </tr>
              </table>

              <!-- Score upgrade badge (only for clients with history) -->
              ${hasHistory && scoreGain > 0 ? `
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0fdf4;border-radius:10px;overflow:hidden;margin-bottom:28px;border:1px solid #bbf7d0;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0 0 10px;color:#15803d;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;">&#127942; Payment Reliability Update</p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="44%" style="text-align:center;">
                          <p style="margin:0 0 2px;color:#94a3b8;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Previous Score</p>
                          <p style="margin:0;color:#64748b;font-size:28px;font-weight:800;line-height:1;">${clientScore}<span style="font-size:13px;font-weight:500;color:#94a3b8;">/100</span></p>
                          <p style="margin:4px 0 0;color:${getLevelColor(clientScore)};font-size:11px;font-weight:700;">${oldLevel}</p>
                        </td>
                        <td width="12%" style="text-align:center;">
                          <p style="margin:0;color:#10b981;font-size:22px;font-weight:700;">&#8594;</p>
                          <p style="margin:2px 0 0;color:#15803d;font-size:11px;font-weight:700;">+${scoreGain}</p>
                        </td>
                        <td width="44%" style="text-align:center;background-color:#dcfce7;border-radius:8px;padding:8px 4px;">
                          <p style="margin:0 0 2px;color:#15803d;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">New Score</p>
                          <p style="margin:0;color:#166534;font-size:28px;font-weight:800;line-height:1;">${newScore}<span style="font-size:13px;font-weight:500;color:#4ade80;">/100</span></p>
                          <p style="margin:4px 0 0;color:${newLevelColor};font-size:11px;font-weight:700;">${newLevel}${leveledUp ? ' <span style="display:inline-block;margin-left:4px;padding:1px 6px;background-color:#bbf7d0;color:#065f46;font-size:9px;font-weight:700;border-radius:10px;">LEVEL UP &#8593;</span>' : ''}</p>
                        </td>
                      </tr>
                    </table>
                    <p style="margin:12px 0 0;color:#15803d;font-size:12px;line-height:1.6;">Honouring your payment commitment has improved your reliability score with <strong>${businessName}</strong>. Thank you for being a valued client.</p>
                  </td>
                </tr>
              </table>` : hasHistory && scoreGain <= 0 ? `
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fffbeb;border-radius:10px;overflow:hidden;margin-bottom:28px;border:1px solid #fde68a;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0 0 8px;color:#d97706;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;">Payment Reliability Score</p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="text-align:center;">
                          <p style="margin:0;color:#92400e;font-size:28px;font-weight:800;line-height:1;">${newScore}<span style="font-size:13px;font-weight:500;color:#d97706;">/100</span></p>
                          <p style="margin:4px 0 0;color:${newLevelColor};font-size:11px;font-weight:700;">${newLevel}</p>
                        </td>
                      </tr>
                    </table>
                    <p style="margin:12px 0 0;color:#92400e;font-size:12px;line-height:1.6;">Thank you for your payment. <strong>Tip:</strong> Paying before the due date earns up to <strong style="color:#15803d;">+10 points</strong> and builds your reputation with <strong>${businessName}</strong>.</p>
                  </td>
                </tr>
              </table>` : ''}

              <!-- Success notice -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0fdf4;border-left:4px solid #10b981;border-radius:0 8px 8px 0;margin-bottom:28px;">
                <tr>
                  <td style="padding:14px 18px;">
                    <p style="margin:0 0 4px;color:#065f46;font-size:13px;font-weight:700;">Account Fully Settled</p>
                    <p style="margin:0;color:#047857;font-size:13px;line-height:1.7;">This payment has been recorded and your invoice is now marked as paid. Please keep this email as your payment confirmation.</p>
                  </td>
                </tr>
              </table>

              <!-- View Portal CTA -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr><td align="center">
                  <a href="${portalLink}" target="_blank" style="display:inline-block;background-color:#0f172a;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:14px 36px;border-radius:8px;letter-spacing:0.2px;">View Payment History &amp; Score →</a>
                </td></tr>
              </table>

              <p style="margin:0 0 28px;color:#64748b;font-size:14px;line-height:1.7;">If you have any questions about this payment, please contact <strong>${businessName}</strong> directly.</p>
              <p style="margin:0 0 6px;color:#64748b;font-size:14px;">Kind regards,</p>
              <p style="margin:0;color:#1e293b;font-size:15px;font-weight:700;">${businessName}</p>
            </td>
          </tr>

          <!-- Divider -->
          <tr><td style="padding:0 40px;"><div style="border-top:1px solid #e2e8f0;"></div></td></tr>

          <!-- NextOffice footer -->
          <tr>
            <td style="padding:28px 40px;text-align:center;background-color:#f8fafc;">
              <p style="margin:0 0 14px;color:#94a3b8;font-size:12px;">Powered by</p>
              <a href="${landingPageUrl}" target="_blank" style="display:inline-block;text-decoration:none;">
                <table cellpadding="0" cellspacing="0" style="display:inline-table;">
                  <tr><td style="background-color:#0f172a;padding:10px 24px;border-radius:8px;">
                    <span style="color:#ffffff;font-size:14px;font-weight:700;letter-spacing:-0.3px;">Next<span style="color:#3b82f6;">Office</span></span>
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
        type: 'payment_received',
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
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    );
  } catch (error) {
    console.error('Error sending payment received email:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    );
  }
});
