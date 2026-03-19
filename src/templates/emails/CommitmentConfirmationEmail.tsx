interface CommitmentConfirmationEmailProps {
  clientName: string;
  invoiceNumber: string;
  amount: number;
  commitmentType: 'deposit' | 'payment_plan' | 'extension' | 'pay_now';
  commitmentDetails: string;
  businessName: string;
  businessEmail: string;
}

export const generateCommitmentConfirmationEmailHTML = (props: CommitmentConfirmationEmailProps): string => {
  const getCommitmentTitle = () => {
    switch (props.commitmentType) {
      case 'deposit': return 'Deposit Commitment Received';
      case 'payment_plan': return 'Payment Plan Confirmed';
      case 'extension': return 'Extension Request Received';
      case 'pay_now': return 'Payment Commitment Confirmed';
      default: return 'Commitment Confirmed';
    }
  };

  const getCommitmentIcon = () => {
    switch (props.commitmentType) {
      case 'deposit': return '💰';
      case 'payment_plan': return '📅';
      case 'extension': return '⏰';
      case 'pay_now': return '✅';
      default: return '📝';
    }
  };

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
              <div style="text-align: center; margin-bottom: 30px; font-size: 48px;">
                ${getCommitmentIcon()}
              </div>

              <h2 style="margin: 0 0 20px; color: #1f2937; font-size: 24px; font-weight: 600; text-align: center;">
                ${getCommitmentTitle()}
              </h2>
              
              <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Hi ${props.clientName},
              </p>
              
              <p style="margin: 0 0 30px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Thank you for your commitment! We've received and confirmed your payment arrangement.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0f9ff; border-radius: 8px; padding: 24px; margin-bottom: 30px; border-left: 4px solid #6366f1;">
                <tr>
                  <td>
                    <table width="100%" cellpadding="8" cellspacing="0">
                      <tr>
                        <td style="color: #1e3a8a; font-size: 14px;">Invoice Number:</td>
                        <td align="right" style="color: #1e40af; font-size: 14px; font-weight: 600;">${props.invoiceNumber}</td>
                      </tr>
                      <tr>
                        <td style="color: #1e3a8a; font-size: 14px;">Amount:</td>
                        <td align="right" style="color: #1e40af; font-size: 18px; font-weight: bold;">R${props.amount.toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td colspan="2" style="padding-top: 12px;">
                          <div style="border-top: 1px solid #bfdbfe; padding-top: 12px;">
                            <p style="margin: 0; color: #1e3a8a; font-size: 14px; font-weight: 600;">Your Commitment:</p>
                            <p style="margin: 8px 0 0; color: #1e40af; font-size: 14px; line-height: 1.6;">
                              ${props.commitmentDetails}
                            </p>
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 16px; border-radius: 4px; margin-bottom: 30px;">
                <p style="margin: 0 0 8px; color: #065f46; font-size: 14px; font-weight: 600;">
                  ✓ What happens next?
                </p>
                <p style="margin: 0; color: #065f46; font-size: 14px; line-height: 1.6;">
                  We'll send you a reminder before your payment is due. If you need to make any changes to this arrangement, please contact us as soon as possible.
                </p>
              </div>

              <p style="margin: 0 0 10px; color: #4b5563; font-size: 14px; line-height: 1.6;">
                We appreciate your proactive communication and commitment to resolving this invoice.
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
