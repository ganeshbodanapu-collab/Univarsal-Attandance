import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

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
    const { requestId, token } = await req.json();

    if (!requestId || !token) {
      return new Response(
        JSON.stringify({ success: false, error: 'Request ID and Token are required.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Server configuration error.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const incomingTokenHash = await sha256Hex(token);

    // 1. Fetch approval token record
    const { data: tokenRecord, error: tokenErr } = await supabaseAdmin
      .from('login_approval_tokens')
      .select('*')
      .eq('request_id', requestId)
      .eq('token_hash', incomingTokenHash)
      .maybeSingle();

    if (tokenErr || !tokenRecord) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or unrecognized approval token.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // 2. Check if token already used
    if (tokenRecord.used_at) {
      return new Response(
        JSON.stringify({ success: false, error: 'This approval link has already been used.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // 3. Check if token expired (5 min expiry)
    const expiresAt = new Date(tokenRecord.expires_at).getTime();
    if (Date.now() > expiresAt) {
      return new Response(
        JSON.stringify({ success: false, error: 'Approval token has expired. Please request access again.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // 4. Verify login request status
    const { data: reqRecord } = await supabaseAdmin
      .from('login_requests')
      .select('*')
      .eq('request_id', requestId)
      .maybeSingle();

    if (!reqRecord || reqRecord.status !== 'APPROVED') {
      return new Response(
        JSON.stringify({ success: false, error: 'Login request is not in APPROVED status.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // 5. Fetch app_users profile (case-insensitive lookup)
    const targetUserId = tokenRecord.user_id;
    let { data: appUser } = await supabaseAdmin
      .from('app_users')
      .select('*')
      .ilike('username', targetUserId)
      .maybeSingle();

    let userEmail = appUser?.email;
    if (!userEmail) {
      const cleanUser = targetUserId.toLowerCase();
      userEmail = cleanUser.includes('@') ? cleanUser : `${cleanUser}@universalattendance.com`;
    }

    // Ensure corresponding user exists in Supabase Auth (auth.users)
    let authUser: any = null;
    if (appUser?.auth_user_id) {
      const { data: getAuthData } = await supabaseAdmin.auth.admin.getUserById(appUser.auth_user_id);
      if (getAuthData?.user) {
        authUser = getAuthData.user;
      }
    }

    if (!authUser) {
      // Find auth user by email
      const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
      authUser = listData?.users?.find((u) => u.email?.toLowerCase() === userEmail.toLowerCase());

      if (!authUser) {
        // Create user in auth.users if not present
        const { data: createdAuth, error: createAuthErr } = await supabaseAdmin.auth.admin.createUser({
          email: userEmail,
          password: crypto.randomUUID(),
          email_confirm: true,
        });

        if (createAuthErr || !createdAuth?.user) {
          return new Response(
            JSON.stringify({ success: false, error: `Failed to provision Auth account: ${createAuthErr?.message}` }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
          );
        }
        authUser = createdAuth.user;
      }
    }

    // Link or create app_users profile with auth_user_id
    if (!appUser) {
      const newId = `USR_${targetUserId.toUpperCase()}`;
      const { data: createdProfile, error: profileErr } = await supabaseAdmin
        .from('app_users')
        .insert({
          id: newId,
          auth_user_id: authUser.id,
          username: targetUserId.toLowerCase(),
          name: `Supervisor ${targetUserId}`,
          role: 'supervisor',
          assigned_site_id: 'S001',
          email: userEmail,
          status: 'active',
        })
        .select()
        .single();

      if (profileErr || !createdProfile) {
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to create user profile.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }
      appUser = createdProfile;
    } else if (!appUser.auth_user_id || appUser.auth_user_id !== authUser.id || !appUser.email) {
      const { data: updatedProfile } = await supabaseAdmin
        .from('app_users')
        .update({
          auth_user_id: authUser.id,
          email: userEmail,
          status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', appUser.id)
        .select()
        .single();

      if (updatedProfile) {
        appUser = updatedProfile;
      }
    }

    if (appUser.status !== 'active') {
      return new Response(
        JSON.stringify({ success: false, error: 'User account is inactive or suspended.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // 6. Mark token as used
    await supabaseAdmin
      .from('login_approval_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('id', tokenRecord.id);

    // 7. Generate a secure Supabase Auth Magic Link OTP
    const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: userEmail,
    });

    if (linkErr || !linkData?.properties?.email_otp) {
      return new Response(
        JSON.stringify({ success: false, error: `Failed to generate authentication link: ${linkErr?.message}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        email: userEmail,
        otp: linkData.properties.email_otp,
        profile: appUser,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: `Verification internal error: ${err instanceof Error ? err.message : String(err)}` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

