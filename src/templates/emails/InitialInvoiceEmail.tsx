import React from 'react';

interface InitialInvoiceEmailProps {
  clientName: string;
  invoiceNumber: string;
  amount: number;
  dueDate: string;
  commitmentLink: string;
  businessName: string;
  businessEmail: string;
}

export const InitialInvoiceEmail: React.FC<InitialInvoiceEmailProps> = ({
  clientName,
  invoiceNumber,
  amount,
  dueDate,
  commitmentLink,
  businessName,
  businessEmail,
}) => {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body style={{ margin: 0, padding: 0, fontFamily: 'Arial, sans-serif', backgroundColor: '#f5f5f5' }}>
        <table width="100%" cellPadding="0" cellSpacing="0" style={{ backgroundColor: '#f5f5f5', padding: '40px 20px' }}>
          <tr>
            <td align="center">
              <table width="600" cellPadding="0" cellSpacing="0" style={{ backgroundColor: '#ffffff', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                
                {/* Header */}
                <tr>
                  <td style={{ backgroundColor: '#4F46E5', padding: '40px 40px 30px', textAlign: 'center' }}>
                    <h1 style={{ margin: 0, color: '#ffffff', fontSize: '28px', fontWeight: 'bold' }}>
                      {businessName}
                    </h1>
                  </td>
                </tr>

                {/* Content */}
                <tr>
                  <td style={{ padding: '40px' }}>
                    <h2 style={{ margin: '0 0 20px', color: '#1f2937', fontSize: '24px', fontWeight: '600' }}>
                      New Invoice
                    </h2>
                    
                    <p style={{ margin: '0 0 20px', color: '#4b5563', fontSize: '16px', lineHeight: '1.6' }}>
                      Hi {clientName},
                    </p>
                    
                    <p style={{ margin: '0 0 30px', color: '#4b5563', fontSize: '16px', lineHeight: '1.6' }}>
                      You have a new invoice from {businessName}. We've made it easy for you to review and handle payment.
                    </p>

                    {/* Invoice Details Box */}
                    <table width="100%" cellPadding="0" cellSpacing="0" style={{ backgroundColor: '#f9fafb', borderRadius: '8px', padding: '24px', marginBottom: '30px' }}>
                      <tr>
                        <td>
                          <table width="100%" cellPadding="8" cellSpacing="0">
                            <tr>
                              <td style={{ color: '#6b7280', fontSize: '14px' }}>Invoice Number:</td>
                              <td align="right" style={{ color: '#1f2937', fontSize: '14px', fontWeight: '600' }}>{invoiceNumber}</td>
                            </tr>
                            <tr>
                              <td style={{ color: '#6b7280', fontSize: '14px' }}>Amount Due:</td>
                              <td align="right" style={{ color: '#1f2937', fontSize: '18px', fontWeight: 'bold' }}>R{amount.toLocaleString()}</td>
                            </tr>
                            <tr>
                              <td style={{ color: '#6b7280', fontSize: '14px' }}>Due Date:</td>
                              <td align="right" style={{ color: '#1f2937', fontSize: '14px', fontWeight: '600' }}>{dueDate}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    {/* CTA Button */}
                    <table width="100%" cellPadding="0" cellSpacing="0" style={{ marginBottom: '30px' }}>
                      <tr>
                        <td align="center">
                          <a href={commitmentLink} style={{
                            display: 'inline-block',
                            backgroundColor: '#10b981',
                            color: '#ffffff',
                            fontSize: '16px',
                            fontWeight: '600',
                            textDecoration: 'none',
                            padding: '16px 48px',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px rgba(16, 185, 129, 0.3)'
                          }}>
                            View Invoice & Choose Payment Option
                          </a>
                        </td>
                      </tr>
                    </table>

                    {/* Benefits */}
                    <div style={{ backgroundColor: '#eff6ff', borderLeft: '4px solid #3b82f6', padding: '16px', borderRadius: '4px', marginBottom: '30px' }}>
                      <p style={{ margin: '0 0 12px', color: '#1e40af', fontSize: '14px', fontWeight: '600' }}>
                        ✓ Flexible Payment Options
                      </p>
                      <ul style={{ margin: 0, paddingLeft: '20px', color: '#1e40af', fontSize: '14px', lineHeight: '1.8' }}>
                        <li>Pay now or choose a date that works for you</li>
                        <li>Request a payment plan if needed</li>
                        <li>Quick and secure process</li>
                      </ul>
                    </div>

                    <p style={{ margin: '0 0 10px', color: '#4b5563', fontSize: '14px', lineHeight: '1.6' }}>
                      If you have any questions, feel free to reply to this email.
                    </p>
                    
                    <p style={{ margin: 0, color: '#4b5563', fontSize: '14px', lineHeight: '1.6' }}>
                      Best regards,<br />
                      <strong>{businessName}</strong>
                    </p>
                  </td>
                </tr>

                {/* Footer */}
                <tr>
                  <td style={{ backgroundColor: '#f9fafb', padding: '30px 40px', borderTop: '1px solid #e5e7eb' }}>
                    <p style={{ margin: '0 0 8px', color: '#6b7280', fontSize: '12px', textAlign: 'center' }}>
                      {businessName}
                    </p>
                    <p style={{ margin: 0, color: '#6b7280', fontSize: '12px', textAlign: 'center' }}>
                      {businessEmail}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  );
};

export const generateInitialInvoiceHTML = (props: InitialInvoiceEmailProps): string => {
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
                ${props.businessName}
              </h1>
            </td>
          </tr>

          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #1f2937; font-size: 24px; font-weight: 600;">
                New Invoice
              </h2>
              
              <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Hi ${props.clientName},
              </p>
              
              <p style="margin: 0 0 30px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                You have a new invoice from ${props.businessName}. We've made it easy for you to review and handle payment.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 8px; padding: 24px; margin-bottom: 30px;">
                <tr>
                  <td>
                    <table width="100%" cellpadding="8" cellspacing="0">
                      <tr>
                        <td style="color: #6b7280; font-size: 14px;">Invoice Number:</td>
                        <td align="right" style="color: #1f2937; font-size: 14px; font-weight: 600;">${props.invoiceNumber}</td>
                      </tr>
                      <tr>
                        <td style="color: #6b7280; font-size: 14px;">Amount Due:</td>
                        <td align="right" style="color: #1f2937; font-size: 18px; font-weight: bold;">R${props.amount.toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td style="color: #6b7280; font-size: 14px;">Due Date:</td>
                        <td align="right" style="color: #1f2937; font-size: 14px; font-weight: 600;">${props.dueDate}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                <tr>
                  <td align="center">
                    <a href="${props.commitmentLink}" style="display: inline-block; background-color: #10b981; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 16px 48px; border-radius: 8px; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.3);">
                      View Invoice & Choose Payment Option
                    </a>
                  </td>
                </tr>
              </table>

              <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 4px; margin-bottom: 30px;">
                <p style="margin: 0 0 12px; color: #1e40af; font-size: 14px; font-weight: 600;">
                  ✓ Flexible Payment Options
                </p>
                <ul style="margin: 0; padding-left: 20px; color: #1e40af; font-size: 14px; line-height: 1.8;">
                  <li>Pay now or choose a date that works for you</li>
                  <li>Request a payment plan if needed</li>
                  <li>Quick and secure process</li>
                </ul>
              </div>

              <p style="margin: 0 0 10px; color: #4b5563; font-size: 14px; line-height: 1.6;">
                If you have any questions, feel free to reply to this email.
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
