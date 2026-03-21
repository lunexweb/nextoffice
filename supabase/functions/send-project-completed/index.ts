import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { ResendClient } from '../_shared/resend.ts';

interface ProjectCompletedRequest {
  invoiceId: string;
  clientId?: string;
  recipientEmail: string;
  recipientName: string;
  invoiceNumber: string;
  amount: number;
  dueDate: string;
  businessName?: string;
  userId?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) throw new Error('RESEND_API_KEY not configured');

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    const resend = new ResendClient(resendApiKey);
    const requestData: ProjectCompletedRequest = await req.json();
    const { recipientEmail, recipientName, invoiceNumber, amount, dueDate } = requestData;

    // Resolve client_id, user_id, and banking details from invoice
    let clientId = requestData.clientId;
    let invoiceUserId = requestData.userId;
    let bankingDetails: { bank_name?: string; account_number?: string; branch_code?: string; account_type?: string } = {};
    if (requestData.invoiceId) {
      const { data: inv } = await serviceClient
        .from('invoices')
        .select('client_id, user_id, banking_details')
        .eq('id', requestData.invoiceId)
        .single();
      if (inv) {
        if (!clientId) clientId = inv.client_id;
        if (!invoiceUserId) invoiceUserId = inv.user_id;
        if (inv.banking_details && Object.keys(inv.banking_details).length > 0) {
          bankingDetails = inv.banking_details;
        }
      }
    }

    // Fall back to banking_details table if invoice snapshot is empty
    if (!bankingDetails.bank_name && invoiceUserId) {
      const { data: bd } = await serviceClient
        .from('banking_details')
        .select('bank_name, account_number, branch_code, account_type')
        .eq('user_id', invoiceUserId)
        .eq('is_primary', true)
        .single();
      if (bd) bankingDetails = bd;
    }

    // Compute score server-side
    let clientScore = 60;
    let hasHistory = false;
    if (clientId) {
      const { data: scoreData } = await serviceClient.rpc('get_client_score', { p_client_id: clientId });
      if (scoreData) {
        clientScore = scoreData.score ?? 60;
      }
      const { count } = await serviceClient
        .from('invoices')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', clientId);
      hasHistory = (count ?? 0) > 1;
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

    const fromEmail = Deno.env.get('FROM_EMAIL') ?? 'invoices@trailbill.com';
    const siteUrl = Deno.env.get('SITE_URL') ?? 'https://trailbill.com';
    const landingPageUrl = Deno.env.get('LANDING_PAGE_URL') ?? 'https://trailbill.com';
    const portalLink = `${siteUrl}/invoice/${invoiceNumber}/commitment`;
    const subject = `Project Completed — Invoice ${invoiceNumber} Now Due`;
    const formattedAmount = `R${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const formattedDue = new Date(dueDate + (dueDate.includes('T') ? '' : 'T00:00:00')).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' });

    const currentLevel = getLevelLabel(clientScore);
    const currentColor = getLevelColor(clientScore);
    const honorScore = Math.min(100, clientScore + 10);
    const missScore = Math.max(0, clientScore - 10);
    const honorLevel = getLevelLabel(honorScore);
    const missLevel = getLevelLabel(missScore);
    const honorColor = getLevelColor(honorScore);
    const missColor = getLevelColor(missScore);
    const honorLevelUp = honorLevel !== currentLevel;
    const missLevelDown = missLevel !== currentLevel;
    const honorTag = honorLevelUp ? '<span style="display:inline-block;margin-left:4px;padding:1px 6px;background-color:#d1fae5;color:#065f46;font-size:9px;font-weight:700;border-radius:20px;">LEVEL UP \u2191</span>' : '';
    const missTag = missLevelDown ? '<span style="display:inline-block;margin-left:4px;padding:1px 6px;background-color:#fee2e2;color:#991b1b;font-size:9px;font-weight:700;border-radius:20px;">LEVEL DOWN \u2193</span>' : '';

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
            <td style="background-color:#312e81;padding:32px 40px;text-align:center;">
              <p style="margin:0 0 4px;color:rgba(255,255,255,0.6);font-size:12px;letter-spacing:2px;text-transform:uppercase;font-weight:600;">Project Update</p>
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">Project Completed 🎉</h1>
            </td>
          </tr>
          <tr><td style="background-color:#6366f1;height:4px;font-size:0;line-height:0;">&nbsp;</td></tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px 20px;">
              <p style="margin:0 0 6px;color:#94a3b8;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Hello,</p>
              <p style="margin:0 0 24px;color:#1e293b;font-size:20px;font-weight:700;">${recipientName}</p>
              <p style="margin:0 0 28px;color:#475569;font-size:15px;line-height:1.7;">
                Great news! <strong style="color:#1e293b;">${businessName}</strong> has marked the project for Invoice <strong style="color:#1e293b;">${invoiceNumber}</strong> as <strong style="color:#4f46e5;">completed</strong>. Payment is now due.
              </p>

              <!-- Invoice details card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border-radius:10px;overflow:hidden;margin-bottom:28px;border:1px solid #e2e8f0;">
                <tr>
                  <td colspan="2" style="background-color:#6366f114;padding:14px 16px;border-bottom:1px solid #e2e8f0;">
                    <p style="margin:0;color:#6366f1;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;">Invoice Details</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;">
                    <p style="margin:0;color:#94a3b8;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Invoice</p>
                    <p style="margin:4px 0 0;color:#1e293b;font-size:15px;font-weight:700;">${invoiceNumber}</p>
                  </td>
                  <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;text-align:right;">
                    <p style="margin:0;color:#94a3b8;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Amount Due</p>
                    <p style="margin:4px 0 0;color:#6366f1;font-size:22px;font-weight:800;">${formattedAmount}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;">
                    <p style="margin:0;color:#94a3b8;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Original Due Date</p>
                    <p style="margin:4px 0 0;color:#1e293b;font-size:14px;font-weight:600;">${formattedDue}</p>
                  </td>
                  <td style="padding:12px 16px;text-align:right;">
                    <p style="margin:0;color:#94a3b8;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Status</p>
                    <p style="margin:4px 0 0;color:#4f46e5;font-size:14px;font-weight:700;">Project Completed</p>
                  </td>
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
                              <p style="margin:0 0 2px;color:#15803d;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">\u2705 Pay Promptly</p>
                              <p style="margin:0 0 4px;color:#166534;font-size:20px;font-weight:800;line-height:1;">${honorScore}<span style="font-size:12px;font-weight:500;color:#4ade80;">/100</span> <span style="font-size:12px;color:#15803d;font-weight:600;">+10</span></p>
                              <p style="margin:0;color:${honorColor};font-size:11px;font-weight:700;">${honorLevel}${honorTag}</p>
                            </td></tr>
                          </table>
                        </td>
                        <td width="4%">&nbsp;</td>
                        <td width="48%" style="vertical-align:top;">
                          <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fef2f2;border:1px solid #fecaca;border-radius:8px;">
                            <tr><td style="padding:10px 12px;">
                              <p style="margin:0 0 2px;color:#dc2626;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">\u274c If Unpaid</p>
                              <p style="margin:0 0 4px;color:#7f1d1d;font-size:20px;font-weight:800;line-height:1;">${missScore}<span style="font-size:12px;font-weight:500;color:#f87171;">/100</span> <span style="font-size:12px;color:#dc2626;font-weight:600;">-10</span></p>
                              <p style="margin:0;color:${missColor};font-size:11px;font-weight:700;">${missLevel}${missTag}</p>
                            </td></tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    <p style="margin:12px 0 0;color:#475569;font-size:12px;line-height:1.6;">The project is complete. Pay promptly to protect your score and standing with <strong>${businessName}</strong>.</p>
                  </td>
                </tr>
              </table>` : `
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f9ff;border-radius:10px;margin-bottom:28px;border:1px solid #bae6fd;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0 0 4px;color:#0ea5e9;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;">New Client</p>
                    <p style="margin:0 0 8px;color:#0369a1;font-size:15px;font-weight:700;">Your reliability score starts here.</p>
                    <p style="margin:0;color:#0c4a6e;font-size:13px;line-height:1.6;">Pay this invoice promptly to earn <strong style="color:#15803d;">+10 points</strong> and start building your payment reputation with <strong>${businessName}</strong>.</p>
                  </td>
                </tr>
              </table>`}

              <!-- Banking Details -->
              ${bankingDetails.bank_name ? `
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border-radius:10px;overflow:hidden;margin-bottom:28px;border:1px solid #e2e8f0;">
                <tr>
                  <td colspan="2" style="background-color:#6366f114;padding:14px 16px;border-bottom:1px solid #e2e8f0;">
                    <p style="margin:0;color:#6366f1;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;">Banking Details — Pay Via EFT</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;">
                    <p style="margin:0;color:#94a3b8;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Bank</p>
                    <p style="margin:4px 0 0;color:#1e293b;font-size:15px;font-weight:700;">${bankingDetails.bank_name}</p>
                  </td>
                  <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;text-align:right;">
                    <p style="margin:0;color:#94a3b8;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Account Type</p>
                    <p style="margin:4px 0 0;color:#1e293b;font-size:15px;font-weight:700;">${bankingDetails.account_type || 'N/A'}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;">
                    <p style="margin:0;color:#94a3b8;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Account Number</p>
                    <p style="margin:4px 0 0;color:#1e293b;font-size:18px;font-weight:800;letter-spacing:1px;">${bankingDetails.account_number || 'N/A'}</p>
                  </td>
                  <td style="padding:12px 16px;text-align:right;">
                    <p style="margin:0;color:#94a3b8;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Branch Code</p>
                    <p style="margin:4px 0 0;color:#1e293b;font-size:15px;font-weight:700;">${bankingDetails.branch_code || 'N/A'}</p>
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="padding:10px 16px;background-color:#eef2ff;border-top:1px solid #e2e8f0;">
                    <p style="margin:0;color:#4338ca;font-size:12px;font-weight:600;">Reference: ${invoiceNumber}</p>
                  </td>
                </tr>
              </table>
              ` : ''}

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr><td align="center">
                  <a href="${portalLink}" target="_blank" style="display:inline-block;background-color:#4f46e5;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:16px 40px;border-radius:8px;letter-spacing:0.2px;">View Invoice →</a>
                </td></tr>
              </table>

              <!-- Info notice -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#eef2ff;border-left:4px solid #6366f1;border-radius:0 8px 8px 0;margin-bottom:28px;">
                <tr>
                  <td style="padding:14px 18px;">
                    <p style="margin:0 0 4px;color:#3730a3;font-size:13px;font-weight:700;">What Happens Next?</p>
                    <p style="margin:0;color:#4338ca;font-size:13px;line-height:1.7;">Click the button above to view your invoice and submit a payment commitment or pay directly. If you need a payment plan or extension, those options are available on the portal.</p>
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

          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px 28px;text-align:center;">
              <p style="margin:0;color:#94a3b8;font-size:11px;">Powered by <a href="${landingPageUrl}" style="color:#6366f1;text-decoration:none;font-weight:600;">Trailbill.com</a></p>
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
        type: 'project_completed',
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
      },
    );
  } catch (error) {
    console.error('send-project-completed error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }
});
