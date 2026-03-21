interface WelcomeEmailProps {
  userName: string;
  userEmail: string;
  temporaryPassword: string;
  loginUrl: string;
  businessName: string;
  businessEmail: string;
}

export const generateWelcomeEmailHTML = (props: WelcomeEmailProps): string => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          
          <tr>
            <td style="background-color: #4F46E5; padding: 40px 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                Welcome to Trailbill<span style="font-size:18px;color:#a5b4fc;font-weight:400;">.com</span>
              </h1>
            </td>
          </tr>

          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #1f2937; font-size: 24px; font-weight: 600;">
                Your Account is Ready!
              </h2>
              
              <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Hi ${props.userName},
              </p>
              
              <p style="margin: 0 0 30px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Your Trailbill<span style="font-size:12px;color:#6366f1;">.com</span> account has been created. You can now access the platform and start managing your invoices and client communications.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0f9ff; border-radius: 8px; padding: 24px; margin-bottom: 30px; border-left: 4px solid #3b82f6;">
                <tr>
                  <td>
                    <p style="margin: 0 0 12px; color: #1e40af; font-size: 14px; font-weight: 600;">
                      Your Login Credentials:
                    </p>
                    <table width="100%" cellpadding="8" cellspacing="0">
                      <tr>
                        <td style="color: #1e3a8a; font-size: 14px;">Email:</td>
                        <td style="color: #1e40af; font-size: 14px; font-weight: 600;">${props.userEmail}</td>
                      </tr>
                      <tr>
                        <td style="color: #1e3a8a; font-size: 14px;">Temporary Password:</td>
                        <td style="color: #1e40af; font-size: 14px; font-weight: 600; font-family: monospace; background-color: #dbeafe; padding: 4px 8px; border-radius: 4px;">${props.temporaryPassword}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 4px; margin-bottom: 30px;">
                <p style="margin: 0 0 8px; color: #92400e; font-size: 14px; font-weight: 600;">
                  ⚠️ Important Security Notice
                </p>
                <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;">
                  Please change your password after your first login. This temporary password will expire after 7 days.
                </p>
              </div>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                <tr>
                  <td align="center">
                    <a href="${props.loginUrl}" style="display: inline-block; background-color: #4F46E5; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 16px 48px; border-radius: 8px; box-shadow: 0 4px 6px rgba(79, 70, 229, 0.3);">
                      Login to Your Account
                    </a>
                  </td>
                </tr>
              </table>

              <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 16px; border-radius: 4px; margin-bottom: 30px;">
                <p style="margin: 0 0 8px; color: #065f46; font-size: 14px; font-weight: 600;">
                  ✓ What you can do with Trailbill<span style="font-size:11px;color:#6366f1;">.com</span>:
                </p>
                <ul style="margin: 0; padding-left: 20px; color: #065f46; font-size: 14px; line-height: 1.8;">
                  <li>Send professional invoices with flexible payment options</li>
                  <li>Track client payments and commitments</li>
                  <li>Automate reminders and follow-ups</li>
                  <li>Manage client relationships</li>
                </ul>
              </div>

              <p style="margin: 0 0 10px; color: #4b5563; font-size: 14px; line-height: 1.6;">
                If you have any questions or need assistance getting started, don't hesitate to reach out.
              </p>
              
              <p style="margin: 0; color: #4b5563; font-size: 14px; line-height: 1.6;">
                Welcome aboard!<br>
                <strong>The Trailbill<span style="font-size:11px;color:#6366f1;">.com</span> Team</strong>
              </p>
            </td>
          </tr>

          <tr>
            <td style="background-color: #f9fafb; padding: 30px 40px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 8px; color: #6b7280; font-size: 12px; text-align: center;">
                Trailbill<span style="font-size:10px;color:#94a3b8;">.com</span>
              </p>
              <p style="margin: 0; color: #6b7280; font-size: 12px; text-align: center;">
                ${props.businessEmail}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
};
