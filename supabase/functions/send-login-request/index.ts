import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { username, platform, requestId } = await req.json();

    if (!username || typeof username !== 'string' || !username.trim()) {
      return new Response(
        JSON.stringify({ success: false, error: 'Username is required.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    let chatId = Deno.env.get('ADMIN_TELEGRAM_CHAT_ID') || '1092499824';
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (supabaseUrl && supabaseServiceKey) {
      try {
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
        const { data: cfg } = await supabaseAdmin
          .from('system_config')
          .select('value')
          .eq('key', 'admin_telegram_chat_id')
          .maybeSingle();

        if (cfg?.value) {
          chatId = String(cfg.value);
        }
      } catch {
        // use default chatId
      }
    }

    if (!botToken) {
      console.error('TELEGRAM_BOT_TOKEN secret is missing in Supabase Edge Function environment.');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'TELEGRAM_BOT_TOKEN secret is missing in Supabase Edge Function environment.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const cleanUsername = username.trim();
    const cleanPlatform = platform || 'WEB';
    const cleanRequestId = requestId || `REQ-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const nowStr = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

    let userRole = 'SUPERVISOR';
    let userSite = 'S001';

    // 1. Verify User ID exists in app_users table & Check Duplicate Pending Requests
    if (supabaseUrl && supabaseServiceKey) {
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

      const { data: userRecord } = await supabaseAdmin
        .from('app_users')
        .select('id, username, name, role, assigned_site_id')
        .ilike('username', cleanUsername)
        .maybeSingle();

      if (userRecord) {
        if (userRecord.role) {
          userRole = String(userRecord.role).toUpperCase();
        }
        if (userRecord.assigned_site_id) {
          userSite = userRecord.assigned_site_id;
        }
      } else {
        userRole = cleanUsername.toLowerCase() === 'admin' ? 'ADMIN (REQUESTED)' : 'SUPERVISOR (REQUESTED)';
        userSite = 'N/A';
      }

      // Check if user already has a PENDING request
      const { data: existingPending } = await supabaseAdmin
        .from('login_requests')
        .select('request_id, status')
        .ilike('requested_user_id', cleanUsername)
        .eq('status', 'PENDING')
        .maybeSingle();

      if (existingPending) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Request already pending.',
            requestId: existingPending.request_id,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }

      // Store login request in Supabase DB
      await supabaseAdmin.from('login_requests').upsert(
        {
          request_id: cleanRequestId,
          requested_user_id: userRecord?.username || cleanUsername,
          platform: cleanPlatform,
          request_type: 'Login Access Request',
          status: 'PENDING',
          requested_at: new Date().toISOString(),
        },
        { onConflict: 'request_id' }
      );

      // Insert audit log
      await supabaseAdmin.from('audit_logs').insert({
        action: 'LOGIN_REQUEST',
        actor_id: userRecord?.username || cleanUsername,
        target_id: userRecord?.username || cleanUsername,
        details: { requestId: cleanRequestId, platform: cleanPlatform },
      });
    }

    const safeUsername = escapeHtml(cleanUsername);
    const safePlatform = escapeHtml(cleanPlatform);
    const safeRequestId = escapeHtml(cleanRequestId);
    const safeRole = escapeHtml(userRole);
    const safeSite = escapeHtml(userSite);

    // Format safe Telegram message in HTML parse_mode per Section 5 spec
    const messageText = `🔔 <b>UNIVERSAL ATTENDANCE</b>

<b>LOGIN ACCESS REQUEST</b>

<b>User ID:</b> <code>${safeUsername}</code>
<b>Role:</b> ${safeRole}
<b>Assigned Site:</b> ${safeSite}
<b>Platform:</b> ${safePlatform}
<b>Date & Time:</b> ${escapeHtml(nowStr)}
<b>Request ID:</b> <code>${safeRequestId}</code>
<b>Status:</b> Pending

🌐 <b>Website:</b>
https://universal-attendance.vercel.app`;

    const inlineKeyboard = {
      inline_keyboard: [
        [
          { text: '✅ APPROVE', callback_data: `approve:${cleanRequestId}` },
          { text: '❌ REJECT', callback_data: `reject:${cleanRequestId}` },
        ],
      ],
    };

    const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const tgResponse = await fetch(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: messageText,
        parse_mode: 'HTML',
        reply_markup: inlineKeyboard,
      }),
    });

    const tgData = await tgResponse.json();

    if (!tgResponse.ok || !tgData.ok) {
      console.error('Telegram API error response:', {
        status: tgResponse.status,
        error_code: tgData.error_code,
        description: tgData.description,
      });

      let userErrorMsg = `Telegram API error (${tgData.error_code || tgResponse.status}): ${tgData.description || 'Failed to send message.'}`;

      if (tgData.description && (tgData.description.includes('chat not found') || tgData.description.includes('bot was blocked'))) {
        userErrorMsg = 'Admin Telegram Bot Notice: Please open @UniversalAttendanceAdminBot in Telegram and tap START to receive login requests.';
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: userErrorMsg,
          telegramStatus: tgResponse.status,
          telegramErrorCode: tgData.error_code,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Request sent to Admin successfully. Waiting for approval.',
        telegramMessageId: tgData.result?.message_id,
        requestId: cleanRequestId,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (err) {
    console.error('Edge function runtime error:', err);
    return new Response(
      JSON.stringify({
        success: false,
        error: `Edge Function internal error: ${err instanceof Error ? err.message : String(err)}`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
