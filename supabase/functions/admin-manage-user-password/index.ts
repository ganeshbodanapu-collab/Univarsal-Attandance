import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Server configuration error.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const body = await req.json();
    const { action, targetUsername, targetAuthUserId, newPassword, name, role, assignedSiteId, assignedSectionId, mobile, email } = body;

    // SEED DEFAULT USERS (Bypasses JWT check so seed script can initialize default accounts)
    if (action === 'seedDefaultUsers') {
      const defaultUsers = [
        {
          id: 'U001',
          username: 'admin',
          email: 'admin@universalattendance.com',
          password: 'Admin@2026',
          name: 'System Admin',
          role: 'admin',
          assigned_site_id: null,
          assigned_section_id: null,
        },
        {
          id: 'U002',
          username: 'site_s001',
          email: 'site_s001@universalattendance.com',
          password: 'Downtown@2026',
          name: 'Downtown Supervisor',
          role: 'supervisor',
          assigned_site_id: 'S001',
          assigned_section_id: 'SEC001',
        },
      ];

      const results = [];
      const { data: listData } = await supabaseAdmin.auth.admin.listUsers();

      for (const u of defaultUsers) {
        let authUser = listData?.users?.find((x) => x.email === u.email);

        if (!authUser) {
          const { data: createdAuth, error: createErr } = await supabaseAdmin.auth.admin.createUser({
            email: u.email,
            password: u.password,
            email_confirm: true,
          });
          if (createdAuth?.user) {
            authUser = createdAuth.user;
          }
        } else {
          await supabaseAdmin.auth.admin.updateUserById(authUser.id, { password: u.password });
        }

        if (authUser) {
          const { data: profile, error: profileErr } = await supabaseAdmin
            .from('app_users')
            .upsert(
              {
                id: u.id,
                auth_user_id: authUser.id,
                username: u.username,
                name: u.name,
                role: u.role,
                assigned_site_id: u.assigned_site_id,
                assigned_section_id: u.assigned_section_id,
                email: u.email,
                status: 'active',
              },
              { onConflict: 'username' }
            )
            .select()
            .single();

          results.push({ username: u.username, email: u.email, auth_user_id: authUser.id, profile, error: profileErr?.message });
        }
      }

      return new Response(
        JSON.stringify({ success: true, seeded: results }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Verify requesting user is admin for other management actions
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: callingUser }, error: userErr } = await supabaseAdmin.auth.getUser(token);

    if (userErr || !callingUser) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or expired auth session.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Check calling user role in app_users
    const { data: callingAppUser } = await supabaseAdmin
      .from('app_users')
      .select('role')
      .eq('auth_user_id', callingUser.id)
      .maybeSingle();

    if (!callingAppUser || callingAppUser.role !== 'admin') {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized: Only system administrators can perform this action.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    if (action === 'createUser') {
      if (!targetUsername || !newPassword || !name) {
        return new Response(
          JSON.stringify({ success: false, error: 'Username, password, and name are required.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      const cleanUser = targetUsername.trim().toLowerCase();
      const userEmail = email && email.includes('@') ? email.trim() : `${cleanUser}@universalattendance.com`;

      // Create in auth.users
      const { data: newAuthData, error: createAuthErr } = await supabaseAdmin.auth.admin.createUser({
        email: userEmail,
        password: newPassword,
        email_confirm: true,
      });

      if (createAuthErr || !newAuthData.user) {
        return new Response(
          JSON.stringify({ success: false, error: `Failed to create user in Auth: ${createAuthErr?.message}` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      // Generate a unique ID if not provided
      const newId = `U_${Date.now().toString(36)}`;

      // Create in app_users
      const { data: appUser, error: appUserErr } = await supabaseAdmin
        .from('app_users')
        .insert({
          id: newId,
          auth_user_id: newAuthData.user.id,
          username: cleanUser,
          name: name.trim(),
          role: role || 'supervisor',
          assigned_site_id: assignedSiteId || null,
          assigned_section_id: assignedSectionId || null,
          mobile: mobile ? mobile.trim() : null,
          email: userEmail,
          status: 'active',
        })
        .select()
        .single();

      if (appUserErr) {
        return new Response(
          JSON.stringify({ success: false, error: `Failed to create app profile: ${appUserErr.message}` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }

      return new Response(
        JSON.stringify({ success: true, appUser }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );

    } else if (action === 'changePassword') {
      if (!newPassword) {
        return new Response(
          JSON.stringify({ success: false, error: 'New password is required.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      let authUserIdToUpdate = targetAuthUserId;
      let cleanUser = targetUsername ? targetUsername.trim().toLowerCase() : '';
      let targetProfile: any = null;

      if (cleanUser) {
        const { data: profile } = await supabaseAdmin
          .from('app_users')
          .select('*')
          .ilike('username', cleanUser)
          .maybeSingle();

        if (profile) {
          targetProfile = profile;
          if (profile.auth_user_id) {
            authUserIdToUpdate = profile.auth_user_id;
          }
        }
      }

      if (!authUserIdToUpdate && (cleanUser || targetProfile)) {
        const userEmail = targetProfile?.email || (cleanUser.includes('@') ? cleanUser : `${cleanUser}@universalattendance.com`);
        const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
        let existingAuth = listData?.users?.find((u) => u.email?.toLowerCase() === userEmail.toLowerCase());

        if (!existingAuth) {
          const { data: createdAuth } = await supabaseAdmin.auth.admin.createUser({
            email: userEmail,
            password: newPassword,
            email_confirm: true,
          });
          if (createdAuth?.user) {
            existingAuth = createdAuth.user;
          }
        }

        if (existingAuth) {
          authUserIdToUpdate = existingAuth.id;
          if (targetProfile) {
            await supabaseAdmin
              .from('app_users')
              .update({ auth_user_id: existingAuth.id, email: userEmail })
              .eq('id', targetProfile.id);
          }
        }
      }

      if (!authUserIdToUpdate) {
        return new Response(
          JSON.stringify({ success: false, error: 'Target user profile or auth_user_id not found.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
        );
      }

      const { error: updateAuthErr } = await supabaseAdmin.auth.admin.updateUserById(
        authUserIdToUpdate,
        { password: newPassword }
      );

      if (updateAuthErr) {
        return new Response(
          JSON.stringify({ success: false, error: `Failed to update password: ${updateAuthErr.message}` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Password updated successfully in Supabase Auth.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );

    } else {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid action parameter.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: `Internal error: ${err instanceof Error ? err.message : String(err)}` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
