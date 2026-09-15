import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
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

  // Handle health check GET
  if (req.method === 'GET') {
    return new Response(JSON.stringify({ status: 'ok', service: 'telegram-webhook' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  }

  try {
    const body = await req.json();
    console.log('Incoming Telegram webhook payload:', JSON.stringify(body));

    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    const adminChatId = Deno.env.get('ADMIN_TELEGRAM_CHAT_ID') || '1092499824';
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!botToken || !supabaseUrl || !supabaseServiceKey) {
      console.error('Missing required environment secrets in telegram-webhook.');
      return new Response(JSON.stringify({ error: 'Server configuration error.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const callbackQuery = body.callback_query;
    const textMessage = body.message;

    if (!callbackQuery && textMessage && textMessage.chat) {
      const incomingChatId = String(textMessage.chat.id);
      const senderName = textMessage.from?.first_name || 'Admin';

      // Reply with welcome & Chat ID verification
      const welcomeText = `🔔 <b>UNIVERSAL ATTENDANCE ADMIN BOT</b>

👋 Welcome, <b>${escapeHtml(senderName)}</b>!

<b>Admin Telegram Chat ID:</b> <code>${incomingChatId}</code>

✅ Your chat ID is registered. You will receive all <b>Login Access Requests</b> & approval alerts in this chat with <b>[ ✅ APPROVE ]</b> and <b>[ ❌ REJECT ]</b> buttons.`;

      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: incomingChatId,
          text: welcomeText,
          parse_mode: 'HTML',
        }),
      });

      // Save dynamically registered Admin Telegram Chat ID to DB
      await supabaseAdmin.from('system_config').upsert({
        key: 'admin_telegram_chat_id',
        value: incomingChatId,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'key' }).catch(() => {});

      return new Response(JSON.stringify({ ok: true, registeredChatId: incomingChatId }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    if (!callbackQuery) {
      return new Response(JSON.stringify({ ok: true, message: 'No callback query to process.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const callbackId = callbackQuery.id;
    const callbackData = callbackQuery.data || '';
    const fromUser = callbackQuery.from || {};
    const message = callbackQuery.message || {};
    const chatId = String(message.chat?.id || fromUser.id);
    const messageId = message.message_id;

    // Fetch dynamically registered Admin Chat ID from system_config table
    let activeAdminChatId = adminChatId;
    try {
      const { data: cfg } = await supabaseAdmin
        .from('system_config')
        .select('value')
        .eq('key', 'admin_telegram_chat_id')
        .maybeSingle();
      if (cfg?.value) {
        activeAdminChatId = String(cfg.value);
      }
    } catch {
      // fallback to env adminChatId
    }

    // Security check: Verify Admin Telegram identity against active registered chat ID
    if (activeAdminChatId && chatId !== String(activeAdminChatId) && String(fromUser.id) !== String(activeAdminChatId)) {
      console.warn(`Unauthorized callback attempt from Telegram User ID ${fromUser.id} / Chat ID ${chatId} (Expected Admin Chat ID: ${activeAdminChatId})`);
      await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callback_query_id: callbackId,
          text: '❌ Unauthorized: Only the designated Admin can approve login requests.',
          show_alert: true,
        }),
      });
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders, status: 200 });
    }

    const [action, requestId] = callbackData.split(':');

    if (!action || !requestId || (action !== 'approve' && action !== 'reject')) {
      await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: callbackId, text: 'Invalid action format.' }),
      });
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders, status: 200 });
    }

    // 1. Fetch request from Supabase DB
    const { data: requestRecord, error: reqErr } = await supabaseAdmin
      .from('login_requests')
      .select('*')
      .eq('request_id', requestId)
      .single();

    if (reqErr || !requestRecord) {
      console.warn('Request record not found in DB:', requestId);
      await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callback_query_id: callbackId,
          text: `Request ${requestId} not found in database.`,
        }),
      });
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders, status: 200 });
    }

    // 2. Prevent duplicate processing if status is not PENDING
    if (requestRecord.status !== 'PENDING') {
      const statusIcon = requestRecord.status === 'APPROVED' ? '✅' : '❌';
      await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callback_query_id: callbackId,
          text: `${statusIcon} Request is already ${requestRecord.status}.`,
        }),
      });

      // Update message to reflect final status and remove all buttons
      const updatedText = `🔔 <b>UNIVERSAL ATTENDANCE</b>
<b>LOGIN ACCESS REQUEST</b>

<b>User ID:</b>
<code>${escapeHtml(requestRecord.requested_user_id)}</code>

<b>Request Type:</b>
${escapeHtml(requestRecord.request_type || 'Login Access Request')}

<b>Platform:</b>
${escapeHtml(requestRecord.platform || 'ANDROID')}

<b>Request ID:</b>
<code>${escapeHtml(requestRecord.request_id)}</code>

<b>Status:</b>
${statusIcon} <b>${requestRecord.status}</b> by ${escapeHtml(requestRecord.approved_by || requestRecord.rejected_by || 'Admin')}`;

      await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageId,
          text: updatedText,
          parse_mode: 'HTML',
          reply_markup: { inline_keyboard: [] },
        }),
      });

      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders, status: 200 });
    }

    const adminName = fromUser.first_name || fromUser.username || `Admin (${fromUser.id})`;
    const targetUserId = requestRecord.requested_user_id;

    if (action === 'approve') {
      // 3. APPROVE WORKFLOW
      // Generate short-lived single-use approval token
      const rawToken = crypto.randomUUID() + '-' + Math.random().toString(36).substring(2, 10);
      const encoder = new TextEncoder();
      const tokenData = encoder.encode(rawToken);
      const hashBuffer = await crypto.subtle.digest('SHA-256', tokenData);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const tokenHash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

      // Store token hash in login_approval_tokens
      await supabaseAdmin.from('login_approval_tokens').insert({
        request_id: requestId,
        user_id: targetUserId,
        token_hash: tokenHash,
        expires_at: expiresAt,
      });

      // Update request in DB to APPROVED & attach raw_token for Realtime delivery
      await supabaseAdmin
        .from('login_requests')
        .update({
          status: 'APPROVED',
          approved_at: new Date().toISOString(),
          approved_by: adminName,
          raw_token: rawToken,
          updated_at: new Date().toISOString(),
        })
        .eq('request_id', requestId);

      // Activate user in app_users and ensure Supabase Auth link
      const cleanTargetUser = targetUserId.toLowerCase();
      const targetEmail = cleanTargetUser.includes('@') ? cleanTargetUser : `${cleanTargetUser}@universalattendance.com`;

      const { data: existingUser } = await supabaseAdmin
        .from('app_users')
        .select('*')
        .ilike('username', targetUserId)
        .maybeSingle();

      let targetAuthUser: any = null;
      if (existingUser?.auth_user_id) {
        const { data: getAuthData } = await supabaseAdmin.auth.admin.getUserById(existingUser.auth_user_id);
        if (getAuthData?.user) targetAuthUser = getAuthData.user;
      }

      if (!targetAuthUser) {
        const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
        targetAuthUser = listData?.users?.find((u) => u.email?.toLowerCase() === targetEmail.toLowerCase());

        if (!targetAuthUser) {
          const { data: createdAuth } = await supabaseAdmin.auth.admin.createUser({
            email: targetEmail,
            password: crypto.randomUUID(),
            email_confirm: true,
          });
          if (createdAuth?.user) targetAuthUser = createdAuth.user;
        }
      }

      if (existingUser) {
        await supabaseAdmin
          .from('app_users')
          .update({
            status: 'active',
            auth_user_id: targetAuthUser?.id || existingUser.auth_user_id || null,
            email: targetEmail,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingUser.id);
      } else {
        await supabaseAdmin.from('app_users').insert({
          id: `USR_${targetUserId.toUpperCase()}`,
          auth_user_id: targetAuthUser?.id || null,
          username: cleanTargetUser,
          name: `Supervisor ${targetUserId}`,
          role: 'supervisor',
          assigned_site_id: 'S001',
          email: targetEmail,
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }

      // Record in audit_logs
      await supabaseAdmin.from('audit_logs').insert({
        action: 'APPROVAL',
        actor_id: adminName,
        target_id: targetUserId,
        details: { requestId, action: 'APPROVED', siteId: 'S001' },
      });

      // Answer Telegram callback popup (No alert / No URL)
      await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callback_query_id: callbackId,
          text: '✅ Access Approved',
          show_alert: false,
        }),
      });

      // Edit Telegram message text to reflect approved status AND REMOVE ALL INLINE BUTTONS
      const approvedText = `🔔 <b>UNIVERSAL ATTENDANCE</b>
<b>LOGIN ACCESS REQUEST</b>

<b>User ID:</b>
<code>${escapeHtml(targetUserId)}</code>

<b>Platform:</b>
${escapeHtml(requestRecord.platform || 'ANDROID')}

<b>Request ID:</b>
<code>${escapeHtml(requestId)}</code>

<b>Status:</b>
✅ <b>APPROVED</b> by Admin (${escapeHtml(adminName)})`;

      await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageId,
          text: approvedText,
          parse_mode: 'HTML',
          reply_markup: { inline_keyboard: [] },
        }),
      });
    } else if (action === 'reject') {
      // 4. REJECT WORKFLOW
      await supabaseAdmin
        .from('login_requests')
        .update({
          status: 'REJECTED',
          rejected_at: new Date().toISOString(),
          rejected_by: adminName,
          updated_at: new Date().toISOString(),
        })
        .eq('request_id', requestId);

      // Record in audit_logs
      await supabaseAdmin.from('audit_logs').insert({
        action: 'REJECTION',
        actor_id: adminName,
        target_id: targetUserId,
        details: { requestId, action: 'REJECTED' },
      });

      // Answer Telegram callback popup
      await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callback_query_id: callbackId,
          text: `❌ Rejected access for user '${targetUserId}'.`,
        }),
      });

      // Edit Telegram message text and remove buttons
      const rejectedText = `🔔 <b>UNIVERSAL ATTENDANCE</b>
<b>LOGIN ACCESS REQUEST</b>

<b>User ID:</b>
<code>${escapeHtml(targetUserId)}</code>

<b>Platform:</b>
${escapeHtml(requestRecord.platform || 'ANDROID')}

<b>Request ID:</b>
<code>${escapeHtml(requestId)}</code>

<b>Status:</b>
❌ <b>REJECTED</b> by Admin (${escapeHtml(adminName)})`;

      await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageId,
          text: rejectedText,
          parse_mode: 'HTML',
          reply_markup: { inline_keyboard: [] },
        }),
      });
    }

    return new Response(JSON.stringify({ ok: true, action, requestId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (err) {
    console.error('Error in telegram-webhook:', err);
    return new Response(
      JSON.stringify({ error: `Internal webhook error: ${err instanceof Error ? err.message : String(err)}` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
