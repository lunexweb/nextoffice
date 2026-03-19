interface PaymentReceivedEmailProps {
  clientName: string;
  invoiceNumber: string;
  amount: number;
  paymentDate: string;
  businessName: string;
  businessEmail: string;
}

export const generatePaymentReceivedEmailHTML = (props: PaymentReceivedEmailProps): string => {
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
            <td style="background-color: #10b981; padding: 40px 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                ${props.businessName}
              </h1>
            </td>
          </tr>

          <tr>
            <td style="padding: 40px; text-align: center;">
              <div style="margin-bottom: 30px;">
                <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin: 0 auto;">
                  <circle cx="40" cy="40" r="40" fill="#d1fae5"/>
                  <path d="M25 40L35 50L55 30" stroke="#10b981" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>

              <h2 style="margin: 0 0 20px; color: #1f2937; font-size: 28px; font-weight: 600;">
                Payment Received!
              </h2>
              
              <p style="margin: 0 0 30px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Thank you, ${props.clientName}! We've received your payment.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ecfdf5; border-radius: 8px; padding: 24px; margin-bottom: 30px; border: 2px solid #10b981;">
                <tr>
                  <td>
                    <table width="100%" cellpadding="8" cellspacing="0">
                      <tr>
                        <td style="color: #065f46; font-size: 14px;">Invoice Number:</td>
                        <td align="right" style="color: #064e3b; font-size: 14px; font-weight: 600;">${props.invoiceNumber}</td>
                      </tr>
                      <tr>
                        <td style="color: #065f46; font-size: 14px;">Amount Paid:</td>
                        <td align="right" style="color: #064e3b; font-size: 18px; font-weight: bold;">R${props.amount.toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td style="color: #065f46; font-size: 14px;">Payment Date:</td>
                        <td align="right" style="color: #064e3b; font-size: 14px; font-weight: 600;">${props.paymentDate}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 4px; margin-bottom: 30px; text-align: left;">
                <p style="margin: 0 0 8px; color: #1e40af; font-size: 14px; font-weight: 600;">
                  ✓ Payment Confirmed
                </p>
                <p style="margin: 0; color: #1e40af; font-size: 14px; line-height: 1.6;">
                  Your payment has been successfully processed and applied to your account. A receipt has been generated for your records.
                </p>
              </div>

              <p style="margin: 0 0 10px; color: #4b5563; font-size: 14px; line-height: 1.6;">
                We truly appreciate your business and prompt payment. It's clients like you that make our work rewarding.
              </p>
              
              <p style="margin: 0; color: #4b5563; font-size: 14px; line-height: 1.6;">
                Looking forward to working with you again!
              </p>
              
              <p style="margin: 30px 0 0; color: #4b5563; font-size: 14px; line-height: 1.6;">
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
