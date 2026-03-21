# Resend Integration Guide

## Overview
This document outlines the complete Resend email integration for Trailbill.com, including email templates, service layer, and implementation details.

## Current Status: Mock Mode ✅

The email system is currently running in **mock mode**, which means:
- ✅ All email templates are ready
- ✅ Email service layer is functional
- ✅ Emails are logged to console instead of actually sending
- ✅ Perfect for testing and development
- ⏳ Ready to connect to Resend API when you're ready

---

## File Structure

```
src/
├── templates/
│   └── emails/
│       ├── InitialInvoiceEmail.tsx       # New invoice notification
│       ├── ReminderEmail.tsx             # Payment reminder (before due)
│       ├── FollowUpEmail.tsx             # Follow-up (after overdue)
│       ├── PaymentReceivedEmail.tsx      # Payment confirmation
│       ├── CommitmentConfirmationEmail.tsx # Commitment confirmation
│       ├── WelcomeEmail.tsx              # User welcome/onboarding
│       └── index.ts                      # Template exports
│
├── services/
│   └── emailService.ts                   # Email service layer (mock mode)
│
└── hooks/
    └── useEmailService.ts                # React hook for email operations
```

---

## Email Templates

### 1. Initial Invoice Email
**When to use:** When sending a new invoice to a client  
**Features:**
- Professional header with business branding
- Invoice details (number, amount, due date)
- Large "View Invoice & Choose Payment Option" CTA button
- Highlights flexible payment options
- Calming blue color scheme

**Props:**
```typescript
{
  clientName: string;
  invoiceNumber: string;
  amount: number;
  dueDate: string;
  commitmentLink: string;
  businessName: string;
  businessEmail: string;
}
```

### 2. Reminder Email
**When to use:** X days before invoice due date  
**Features:**
- Friendly, non-threatening tone
- Amber/yellow color scheme (warning, not urgent)
- Days until due prominently displayed
- Option to request payment plan or extension
- "Need more time?" section

**Props:**
```typescript
{
  clientName: string;
  invoiceNumber: string;
  amount: number;
  dueDate: string;
  daysUntilDue: number;
  commitmentLink: string;
  businessName: string;
  businessEmail: string;
}
```

### 3. Follow-Up Email
**When to use:** After invoice becomes overdue  
**Features:**
- Professional but firm tone
- Purple/indigo color scheme
- Days overdue clearly shown
- "We're here to help" section
- Emphasizes finding a solution together
- Optional business phone number

**Props:**
```typescript
{
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
```

### 4. Payment Received Email
**When to use:** After payment is confirmed  
**Features:**
- Celebratory tone with checkmark icon
- Green color scheme (success)
- Payment details confirmation
- Thank you message
- Builds positive relationship

**Props:**
```typescript
{
  clientName: string;
  invoiceNumber: string;
  amount: number;
  paymentDate: string;
  businessName: string;
  businessEmail: string;
}
```

### 5. Commitment Confirmation Email
**When to use:** After client makes a payment commitment  
**Features:**
- Confirms the commitment type (deposit, payment plan, extension)
- Shows commitment details
- "What happens next" section
- Appropriate emoji based on commitment type
- Blue color scheme

**Props:**
```typescript
{
  clientName: string;
  invoiceNumber: string;
  amount: number;
  commitmentType: 'deposit' | 'payment_plan' | 'extension' | 'pay_now';
  commitmentDetails: string;
  businessName: string;
  businessEmail: string;
}
```

### 6. Welcome Email
**When to use:** When creating a new user account  
**Features:**
- Welcome message with login credentials
- Temporary password (monospace font, highlighted)
- Security notice to change password
- "What you can do" feature list
- Login CTA button

**Props:**
```typescript
{
  userName: string;
  userEmail: string;
  temporaryPassword: string;
  loginUrl: string;
  businessName: string;
  businessEmail: string;
}
```

---

## Email Service API

### Usage Example

```typescript
import { emailService } from '@/services/emailService';

// Send initial invoice
const result = await emailService.sendInitialInvoice({
  to: 'client@example.com',
  clientName: 'John Doe',
  invoiceNumber: 'INV-001',
  amount: 15000,
  dueDate: 'March 25, 2026',
  commitmentLink: 'https://yourapp.com/invoice/INV-001/commitment',
  businessName: 'Your Business',
  businessEmail: 'hello@yourbusiness.com',
});

console.log(result);
// { success: true, emailId: 'email_xxx', message: 'Mock email sent to client@example.com' }
```

### Available Methods

```typescript
// 1. Send Initial Invoice
emailService.sendInitialInvoice(params)

// 2. Send Reminder
emailService.sendReminder(params)

// 3. Send Follow-up
emailService.sendFollowUp(params)

// 4. Send Payment Received
emailService.sendPaymentReceived(params)

// 5. Send Commitment Confirmation
emailService.sendCommitmentConfirmation(params)

// 6. Send Welcome Email
emailService.sendWelcomeEmail(params)

// Utility Methods
emailService.getEmailLogs()        // Get all sent emails
emailService.getEmailById(id)      // Get specific email
emailService.clearLogs()           // Clear email logs
emailService.setMockMode(boolean)  // Toggle mock mode
emailService.isMockMode()          // Check if in mock mode
```

---

## React Hook Usage

```typescript
import { useEmailService } from '@/hooks/useEmailService';

function MyComponent() {
  const { 
    sending, 
    logs, 
    sendInitialInvoice,
    sendReminder,
    sendFollowUp,
    isMockMode 
  } = useEmailService();

  const handleSendInvoice = async () => {
    await sendInitialInvoice({
      to: 'client@example.com',
      clientName: 'John Doe',
      // ... other params
    });
  };

  return (
    <div>
      {isMockMode && <Badge>Mock Mode</Badge>}
      <Button onClick={handleSendInvoice} disabled={sending}>
        {sending ? 'Sending...' : 'Send Invoice'}
      </Button>
      <p>Sent {logs.length} emails</p>
    </div>
  );
}
```

---

## Switching to Production (Resend API)

When you're ready to connect to Resend:

### Step 1: Install Resend Package
```bash
npm install resend
```

### Step 2: Set Environment Variables
Create `.env.local`:
```env
VITE_RESEND_API_KEY=re_xxxxxxxxxxxxx
VITE_FROM_EMAIL=noreply@yourdomain.com
VITE_FROM_NAME=Trailbill.com
```

### Step 3: Create Supabase Edge Function

Create `supabase/functions/send-email/index.ts`:
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { Resend } from 'npm:resend@2.0.0'

const resend = new Resend(Deno.env.get('RESEND_API_KEY'))

serve(async (req) => {
  const { to, subject, html } = await req.json()

  const { data, error } = await resend.emails.send({
    from: 'Trailbill.com <noreply@yourdomain.com>',
    to: [to],
    subject: subject,
    html: html,
  })

  if (error) {
    return new Response(JSON.stringify({ error }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ id: data.id }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
```

### Step 4: Update Email Service
In `emailService.ts`, change:
```typescript
private mockMode: boolean = false; // Switch to production mode
```

### Step 5: Deploy Edge Function
```bash
supabase functions deploy send-email
```

---

## Testing in Mock Mode

### Console Output
When emails are sent in mock mode, you'll see:
```
📧 [MOCK EMAIL SENT]
To: client@example.com
Subject: Invoice INV-001 from Your Business
Type: initial_invoice
Email ID: email_1234567890_abc123
---
```

### View Email Logs
```typescript
const logs = emailService.getEmailLogs();
console.log(logs);
// Array of all sent emails with HTML content
```

### Preview Email HTML
```typescript
const email = emailService.getEmailById('email_xxx');
console.log(email.html); // Full HTML of the email
```

---

## Best Practices

### 1. Email Timing
- **Initial Invoice:** Send immediately when invoice is created
- **Reminder:** 3-5 days before due date
- **Follow-up:** 1-3 days after due date
- **Payment Received:** Immediately after payment confirmation

### 2. Personalization
- Always use client's name
- Include specific invoice details
- Reference previous communications if applicable

### 3. Mobile Optimization
- All templates are mobile-responsive
- Large touch targets for buttons (48px minimum)
- Readable font sizes (14px minimum)

### 4. Branding
- Consistent color schemes across all emails
- Business name prominently displayed
- Professional footer with contact info

### 5. Call-to-Action
- One primary CTA per email
- Clear, action-oriented button text
- High-contrast colors for visibility

---

## Troubleshooting

### Emails not appearing in console?
Check that mock mode is enabled:
```typescript
console.log(emailService.isMockMode()); // Should be true
```

### Want to test actual sending?
Use a test email service like [Mailtrap](https://mailtrap.io) before going to production.

### Need to customize templates?
Edit the template files in `src/templates/emails/` - they're just TypeScript functions that return HTML strings.

---

## Next Steps

1. ✅ **Test mock emails** - Use the service in your components
2. ✅ **Add UI buttons** - Create "Send Invoice", "Send Reminder" buttons
3. ⏳ **Set up Resend account** - When ready for production
4. ⏳ **Create edge function** - Deploy to Supabase
5. ⏳ **Switch to production mode** - Disable mock mode
6. ⏳ **Add automation** - Schedule reminders and follow-ups

---

## Support

For questions or issues:
- Check console logs for mock email output
- Review email HTML in browser DevTools
- Test with different data to see template variations
- Refer to Resend documentation: https://resend.com/docs
