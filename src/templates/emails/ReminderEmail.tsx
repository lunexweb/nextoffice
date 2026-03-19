interface ReminderEmailProps {
  clientName: string;
  invoiceNumber: string;
  amount: number;
  dueDate: string;
  daysUntilDue: number;
  commitmentLink: string;
  businessName: string;
  businessEmail: string;
}

export const generateReminderEmailHTML = (props: ReminderEmailProps): string => {
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
            <td style="background-color: #f59e0b; padding: 40px 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                ${props.businessName}
              </h1>
            </td>
          </tr>

          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #1f2937; font-size: 24px; font-weight: 600;">
                Friendly Reminder
              </h2>
              
              <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Hi ${props.clientName},
              </p>
              
              <p style="margin: 0 0 30px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                ${props.daysUntilDue <= 0
                  ? 'This is a friendly reminder that your invoice is <strong>due today</strong>.'
                  : `This is a friendly reminder that your invoice is due in <strong>${props.daysUntilDue} day${props.daysUntilDue !== 1 ? 's' : ''}</strong>.`}
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef3c7; border-radius: 8px; padding: 24px; margin-bottom: 30px; border-left: 4px solid #f59e0b;">
                <tr>
                  <td>
                    <table width="100%" cellpadding="8" cellspacing="0">
                      <tr>
                        <td style="color: #92400e; font-size: 14px;">Invoice Number:</td>
                        <td align="right" style="color: #78350f; font-size: 14px; font-weight: 600;">${props.invoiceNumber}</td>
                      </tr>
                      <tr>
                        <td style="color: #92400e; font-size: 14px;">Amount Due:</td>
                        <td align="right" style="color: #78350f; font-size: 18px; font-weight: bold;">R${props.amount.toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td style="color: #92400e; font-size: 14px;">Due Date:</td>
                        <td align="right" style="color: #78350f; font-size: 14px; font-weight: 600;">${props.dueDate}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                <tr>
                  <td align="center">
                    <a href="${props.commitmentLink}" style="display: inline-block; background-color: #10b981; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 16px 48px; border-radius: 8px; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.3);">
                      Review & Make Payment
                    </a>
                  </td>
                </tr>
              </table>

              <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 4px; margin-bottom: 30px;">
                <p style="margin: 0 0 8px; color: #1e40af; font-size: 14px; font-weight: 600;">
                  Need more time?
                </p>
                <p style="margin: 0; color: #1e40af; font-size: 14px; line-height: 1.6;">
                  No problem! Click the link above to request a payment plan or choose a new date that works better for you.
                </p>
              </div>

              <p style="margin: 0 0 10px; color: #4b5563; font-size: 14px; line-height: 1.6;">
                We appreciate your business and look forward to continuing our partnership.
              </p>
              
              <p style="margin: 0; color: #4b5563; font-size: 14px; line-height: 1.6;">
                Best regards,<br>
                <strong>${props.businessName}</strong>
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
