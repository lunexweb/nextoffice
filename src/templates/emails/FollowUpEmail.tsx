interface FollowUpEmailProps {
  clientName: string;
  invoiceNumber: string;
  amount: number;
  dueDate: string;
  daysOverdue: number;
  commitmentLink: string;
  businessName: string;
  businessEmail: string;
  businessPhone?: string;
}

export const generateFollowUpEmailHTML = (props: FollowUpEmailProps): string => {
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
            <td style="background-color: #6366f1; padding: 40px 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                ${props.businessName}
              </h1>
            </td>
          </tr>

          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #1f2937; font-size: 24px; font-weight: 600;">
                Payment Follow-Up
              </h2>
              
              <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Hi ${props.clientName},
              </p>
              
              <p style="margin: 0 0 30px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                We noticed that the following invoice is now ${props.daysOverdue} day${props.daysOverdue !== 1 ? 's' : ''} overdue. We understand things can get busy, so we wanted to reach out.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef2f2; border-radius: 8px; padding: 24px; margin-bottom: 30px; border-left: 4px solid #ef4444;">
                <tr>
                  <td>
                    <table width="100%" cellpadding="8" cellspacing="0">
                      <tr>
                        <td style="color: #991b1b; font-size: 14px;">Invoice Number:</td>
                        <td align="right" style="color: #7f1d1d; font-size: 14px; font-weight: 600;">${props.invoiceNumber}</td>
                      </tr>
                      <tr>
                        <td style="color: #991b1b; font-size: 14px;">Amount Due:</td>
                        <td align="right" style="color: #7f1d1d; font-size: 18px; font-weight: bold;">R${props.amount.toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td style="color: #991b1b; font-size: 14px;">Original Due Date:</td>
                        <td align="right" style="color: #7f1d1d; font-size: 14px; font-weight: 600;">${props.dueDate}</td>
                      </tr>
                      <tr>
                        <td style="color: #991b1b; font-size: 14px;">Days Overdue:</td>
                        <td align="right" style="color: #7f1d1d; font-size: 14px; font-weight: 600;">${props.daysOverdue} day${props.daysOverdue !== 1 ? 's' : ''}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                <tr>
                  <td align="center">
                    <a href="${props.commitmentLink}" style="display: inline-block; background-color: #10b981; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 16px 48px; border-radius: 8px; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.3);">
                      Resolve This Invoice Now
                    </a>
                  </td>
                </tr>
              </table>

              <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 4px; margin-bottom: 30px;">
                <p style="margin: 0 0 12px; color: #1e40af; font-size: 14px; font-weight: 600;">
                  We're here to help
                </p>
                <p style="margin: 0; color: #1e40af; font-size: 14px; line-height: 1.6;">
                  If you're experiencing any difficulties with payment, please let us know. We can work together to find a solution that works for both of us - whether that's a payment plan, extension, or other arrangement.
                </p>
              </div>

              <p style="margin: 0 0 10px; color: #4b5563; font-size: 14px; line-height: 1.6;">
                If you've already made this payment, please disregard this message or reply to let us know.
              </p>
              
              <p style="margin: 0 0 20px; color: #4b5563; font-size: 14px; line-height: 1.6;">
                Thank you for your attention to this matter.
              </p>
              
              <p style="margin: 0; color: #4b5563; font-size: 14px; line-height: 1.6;">
                Best regards,<br>
                <strong>${props.businessName}</strong>
                ${props.businessPhone ? `<br>${props.businessPhone}` : ''}
              </p>
            </td>
          </tr>

          <tr>
            <td style="background-color: #f9fafb; padding: 30px 40px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 8px; color: #6b7280; font-size: 12px; text-align: center;">
                ${props.businessName}
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
