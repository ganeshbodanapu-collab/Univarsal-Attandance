import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function sha256Hex(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const requestId = url.searchParams.get('request');
    const secret = url.searchParams.get('secret');

    if (!requestId || !secret) {
      return new Response(
        '<!DOCTYPE html><html><body style="background:#0f172a;color:#f87171;font-family:sans-serif;padding:40px;text-align:center;"><h2>❌ Invalid Approval Link</h2><p>Missing request parameter or security key.</p></body></html>',
        { headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' }, status: 400 }
      );
    }

    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response('Server configuration error.', { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Fetch request from DB
    const { data: requestRecord, error: reqErr } = await supabaseAdmin
      .from('login_requests')
      .select('*')
      .eq('request_id', requestId)
      .single();

    if (reqErr || !requestRecord) {
      return new Response(
        '<!DOCTYPE html><html><body style="background:#0f172a;color:#f87171;font-family:sans-serif;padding:40px;text-align:center;"><h2>❌ Request Not Found</h2><p>The specified login request was not found.</p></body></html>',
        { headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' }, status: 404 }
      );
    }

    // 2. Validate secret match
    if (requestRecord.approval_secret !== secret) {
      return new Response(
        '<!DOCTYPE html><html><body style="background:#0f172a;color:#f87171;font-family:sans-serif;padding:40px;text-align:center;"><h2>❌ Unauthorized Access</h2><p>Invalid security signature for this approval request.</p></body></html>',
        { headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' }, status: 403 }
      );
    }

    const targetUserId = requestRecord.requested_user_id;
    let rawToken: string;

    if (requestRecord.status === 'PENDING') {
      // 3. Process Approval
      await supabaseAdmin
        .from('login_requests')
        .update({
          status: 'APPROVED',
          approved_at: new Date().toISOString(),
          approved_by: 'Telegram Admin (1-Tap)',
          updated_at: new Date().toISOString(),
        })
        .eq('request_id', requestId);

      // Activate user account
      const { data: existingUser } = await supabaseAdmin
        .from('app_users')
        .select('*')
        .eq('username', targetUserId)
        .single();

      if (existingUser) {
        await supabaseAdmin
          .from('app_users')
          .update({ status: 'active', updated_at: new Date().toISOString() })
          .eq('id', existingUser.id);
      } else {
        await supabaseAdmin.from('app_users').insert({
          id: `USR_${targetUserId.toUpperCase()}`,
          username: targetUserId,
          password_hash: '[SUPABASE_AUTH]',
          name: `Supervisor ${targetUserId}`,
          role: 'supervisor',
          assigned_site_id: 'S001',
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }

      // Record audit log
      await supabaseAdmin.from('audit_logs').insert({
        action: 'APPROVAL',
        actor_id: 'Telegram Admin (1-Tap)',
        target_id: targetUserId,
        details: { requestId, action: 'APPROVED', siteId: 'S001' },
      });

      // Generate 5-minute raw approval token & hash
      rawToken = crypto.randomUUID() + '-' + Math.random().toString(36).substring(2, 10);
      const tokenHash = await sha256Hex(rawToken);
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

      await supabaseAdmin.from('login_approval_tokens').insert({
        request_id: requestId,
        user_id: targetUserId,
        token_hash: tokenHash,
        expires_at: expiresAt,
      });

      // Update Telegram message if botToken & messageId exist
      if (botToken && requestRecord.telegram_message_id && requestRecord.chat_id) {
        const approvedText = `🔔 <b>UNIVERSAL ATTENDANCE</b>\n\n<b>LOGIN ACCESS REQUEST</b>\n\n<b>User ID:</b>\n<code>${escapeHtml(targetUserId)}</code>\n\n<b>Platform:</b>\n${escapeHtml(requestRecord.platform || 'ANDROID')}\n\n<b>Status:</b>\n✅ <b>APPROVED</b> by Admin (1-Tap Direct)`;
        await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: requestRecord.chat_id,
            message_id: requestRecord.telegram_message_id,
            text: approvedText,
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: [] },
          }),
        }).catch(err => console.warn('Failed to edit Telegram message:', err));
      }
    } else if (requestRecord.status === 'APPROVED') {
      // If already approved, check for valid unused token
      const { data: latestToken } = await supabaseAdmin
        .from('login_approval_tokens')
        .select('*')
        .eq('request_id', requestId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestToken && !latestToken.used_at && new Date(latestToken.expires_at).getTime() > Date.now()) {
        // Token still valid, but we need a fresh rawToken for URL, so create a new 5-min token
        rawToken = crypto.randomUUID() + '-' + Math.random().toString(36).substring(2, 10);
        const tokenHash = await sha256Hex(rawToken);
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

        await supabaseAdmin.from('login_approval_tokens').insert({
          request_id: requestId,
          user_id: targetUserId,
          token_hash: tokenHash,
          expires_at: expiresAt,
        });
      } else {
        // Generate fresh single-use approval token
        rawToken = crypto.randomUUID() + '-' + Math.random().toString(36).substring(2, 10);
        const tokenHash = await sha256Hex(rawToken);
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

        await supabaseAdmin.from('login_approval_tokens').insert({
          request_id: requestId,
          user_id: targetUserId,
          token_hash: tokenHash,
          expires_at: expiresAt,
        });
      }
    } else {
      return new Response(
        '<!DOCTYPE html><html><body style="background:#0f172a;color:#f87171;font-family:sans-serif;padding:40px;text-align:center;"><h2>❌ Request Rejected</h2><p>This access request was previously rejected by Admin.</p></body></html>',
        { headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' }, status: 400 }
      );
    }

    const targetUrl = `https://universal-attendance.vercel.app/auth/approved?request=${encodeURIComponent(requestId)}&token=${encodeURIComponent(rawToken)}`;
    const intentUrl = `intent://universal-attendance.vercel.app/auth/approved?request=${encodeURIComponent(requestId)}&token=${encodeURIComponent(rawToken)}#Intent;scheme=https;package=com.universalaquasolutions.attendance;end;`;
    const customSchemeUrl = `universalattendance://auth/approved?request=${encodeURIComponent(requestId)}&token=${encodeURIComponent(rawToken)}`;

    const htmlBody = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Universal Attendance — Redirecting...</title>
    <meta http-equiv="refresh" content="0;url=${intentUrl}" />
    <script>
      (function() {
        var intentUrl = "${intentUrl}";
        var customSchemeUrl = "${customSchemeUrl}";
        var appLinkUrl = "${targetUrl}";

        // Try launching native Android App via Intent URL immediately
        window.location.href = intentUrl;

        // Fallback to custom scheme
        setTimeout(function() {
          window.location.href = customSchemeUrl;
        }, 300);

        // Fallback to HTTPS App Link
        setTimeout(function() {
          window.location.href = appLinkUrl;
        }, 600);
      })();
    </script>
    <style>
      body { background-color: #090d16; color: #f8fafc; font-family: system-ui, -apple-system, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; padding: 20px; text-align: center; }
      .card { background: #1e293b; border: 1px solid rgba(255,255,255,0.1); border-radius: 24px; padding: 32px; max-width: 400px; width: 100%; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); }
      .icon { width: 64px; height: 64px; background: linear-gradient(135deg, #2563eb, #4f46e5); border-radius: 20px; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; font-size: 28px; }
      h2 { margin: 0 0 8px; font-size: 20px; font-weight: 800; color: #fff; }
      p { font-size: 13px; color: #94a3b8; margin: 0 0 24px; }
      .btn { display: inline-block; background: #2563eb; color: #fff; text-decoration: none; padding: 14px 24px; border-radius: 16px; font-weight: 700; font-size: 14px; transition: background 0.2s; }
      .btn:hover { background: #1d4ed8; }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="icon">📱</div>
      <h2>✅ Access Approved!</h2>
      <p>Launching Universal Attendance Android App...</p>
      <a href="${intentUrl}" class="btn">Open App Now</a>
    </div>
  </body>
</html>`;

    return new Response(htmlBody, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html; charset=utf-8',
        'Location': targetUrl,
      },
    });
  } catch (err) {
    console.error('Error in approve-and-redirect:', err);
    return new Response(
      `<!DOCTYPE html><html><body style="background:#0f172a;color:#f87171;font-family:sans-serif;padding:40px;text-align:center;"><h2>Internal Error</h2><p>${escapeHtml(String(err))}</p></body></html>`,
      { headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' }, status: 500 }
    );
  }
});
