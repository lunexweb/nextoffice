import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { ResendClient } from '../_shared/resend.ts';

interface WelcomeEmailRequest {
  recipientEmail: string;
  userName: string;
  temporaryPassword: string;
  loginUrl: string;
  businessName: string;
  businessEmail: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: req.headers.get('Authorization')! } },
      }
    );

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) throw new Error('RESEND_API_KEY not configured');

    const resend = new ResendClient(resendApiKey);
    const requestData: WelcomeEmailRequest = await req.json();
    const { recipientEmail, userName, temporaryPassword, loginUrl, businessName, businessEmail } = requestData;

    const { data: { user } } = await supabaseClient.auth.getUser();

    const fromEmail = Deno.env.get('FROM_EMAIL') ?? 'invoices@trailbill.com';
    const siteUrl = Deno.env.get('SITE_URL') ?? loginUrl;
    const subject = `Welcome to Trailbill.com — Your Account is Ready, ${userName}!`;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${subject}</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <div style="font-size: 48px; margin-bottom: 10px;">🎉</div>
            <h1 style="color: white; margin: 0; font-size: 26px;">Welcome to Trailbill.com!</h1>
            <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 15px;">Your account has been created</p>
          </div>

          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; margin-bottom: 20px;">Hi ${userName},</p>

            <p style="font-size: 16px; margin-bottom: 20px;">
              Your Trailbill.com account has been set up and is ready to use. Here are your login details:
            </p>

            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #e9ecef;"><strong>Email:</strong></td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #e9ecef; text-align: right;">${recipientEmail}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0;"><strong>Temporary Password:</strong></td>
                  <td style="padding: 10px 0; text-align: right;">
                    <code style="background: #f1f5f9; padding: 4px 10px; border-radius: 4px; font-size: 16px; letter-spacing: 2px; color: #334155;">${temporaryPassword}</code>
                  </td>
                </tr>
              </table>
            </div>

            <div style="background: #fff7ed; padding: 15px 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #fed7aa;">
              <strong style="color: #c2410c;">🔒 Security Notice</strong>
              <p style="margin: 8px 0 0; font-size: 14px; color: #374151;">
                Please change your password immediately after your first login. Never share your credentials with anyone.
              </p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${siteUrl}"
                 style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                Login to Trailbill.com
              </a>
            </div>

            <div style="background: #f0f9ff; padding: 15px 20px; border-radius: 8px; margin: 20px 0;">
              <strong style="color: #0369a1;">What you can do with Trailbill.com:</strong>
              <ul style="margin: 10px 0 0; padding-left: 20px; font-size: 14px; color: #374151;">
                <li style="margin-bottom: 6px;">📄 Create and send professional invoices</li>
                <li style="margin-bottom: 6px;">👥 Manage your clients</li>
                <li style="margin-bottom: 6px;">📊 Track payments and commitments</li>
                <li style="margin-bottom: 6px;">📧 Automate reminders and follow-ups</li>
              </ul>
            </div>

            <p style="font-size: 14px; color: #6c757d; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef;">
              If you have any questions or need help getting started, please contact <strong>${businessName}</strong> directly at <a href="mailto:${businessEmail}" style="color: #667eea;">${businessEmail}</a>.
            </p>

            <p style="font-size: 14px; color: #6c757d; margin-top: 10px;">
              Best regards,<br>
              <strong>${businessName} via Trailbill.com</strong><br>
              <a href="mailto:${businessEmail}" style="color: #667eea;">${businessEmail}</a>
            </p>
          </div>
        </body>
      </html>
    `;

    const result = await resend.sendEmail({
      from: `${businessName} <${fromEmail}>`,
      to: recipientEmail,
      subject,
      html: emailHtml,
    });

    const { error: logError } = await supabaseClient
      .from('communication_logs')
      .insert({
        user_id: user?.id,
        type: 'welcome',
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
    console.error('Error sending welcome email:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    );
  }
});
