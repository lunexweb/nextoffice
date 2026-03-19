import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const payload = await req.json();
    const { type, data } = payload;

    if (!type || !data?.email_id) {
      return new Response(JSON.stringify({ error: 'Invalid webhook payload' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const emailId = data.email_id;
    const now = new Date().toISOString();

    let updateData: Record<string, any> = {};

    switch (type) {
      case 'email.sent':
        updateData = { status: 'sent' };
        break;
      case 'email.delivered':
        updateData = { status: 'delivered', delivered_at: now };
        break;
      case 'email.opened':
        updateData = {
          status: 'opened',
          opened_at: now,
        };
        // Increment opens count
        const { data: existing } = await supabaseAdmin
          .from('communication_logs')
          .select('opens')
          .eq('email_id', emailId)
          .single();
        if (existing) {
          updateData.opens = (existing.opens ?? 0) + 1;
        }
        break;
      case 'email.clicked':
        const { data: clickLog } = await supabaseAdmin
          .from('communication_logs')
          .select('clicks')
          .eq('email_id', emailId)
          .single();
        if (clickLog) {
          updateData = { clicks: (clickLog.clicks ?? 0) + 1 };
        }
        break;
      case 'email.bounced':
        updateData = { status: 'bounced' };
        break;
      case 'email.complained':
        updateData = { status: 'bounced' };
        break;
      default:
        return new Response(JSON.stringify({ message: 'Event type not handled' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
    }

    if (Object.keys(updateData).length > 0) {
      const { error } = await supabaseAdmin
        .from('communication_logs')
        .update(updateData)
        .eq('email_id', emailId);

      if (error) {
        console.error('Failed to update communication log:', error);
        return new Response(JSON.stringify({ error: error.message }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        });
      }
    }

    return new Response(JSON.stringify({ success: true, type, emailId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
