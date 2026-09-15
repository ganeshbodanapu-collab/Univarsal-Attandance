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
    const { action, targetUserId, targetUsername, targetAuthUserId, newUsername, newPassword, name, role, assignedSiteId, assignedSectionId, mobile, email, username, password, userId } = body;

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
          assigned_section_id: null,
        },
      ];

      const results = [];
      const { data: listData } = await supabaseAdmin.auth.admin.listUsers();

      for (const u of defaultUsers) {
        // Check if app_users record exists by username, id, or email
        const { data: existingAppUser } = await supabaseAdmin
          .from('app_users')
          .select('id, auth_user_id')
          .or(`username.eq.${u.username},id.eq.${u.id},email.eq.${u.email}`)
          .maybeSingle();

        let authUser = listData?.users?.find((x) =>
          x.email?.toLowerCase() === u.email.toLowerCase() ||
          (existingAppUser?.auth_user_id && x.id === existingAppUser.auth_user_id)
        );

        if (!authUser) {
          const { data: createdAuth } = await supabaseAdmin.auth.admin.createUser({
            email: u.email,
            password: u.password,
            email_confirm: true,
          });
          if (createdAuth?.user) {
            authUser = createdAuth.user;
          }
        } else {
          await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
            email: u.email,
            password: u.password,
            email_confirm: true,
          });
        }

        if (authUser) {
          // Check if app_users record exists by username, id, or email
          const { data: existingAppUser } = await supabaseAdmin
            .from('app_users')
            .select('id')
            .or(`username.eq.${u.username},id.eq.${u.id},email.eq.${u.email}`)
            .maybeSingle();

          let profile = null;
          let profileErr = null;

          if (existingAppUser) {
            const { data: updatedP, error: uErr } = await supabaseAdmin
              .from('app_users')
              .update({
                auth_user_id: authUser.id,
                name: u.name,
                role: u.role,
                assigned_site_id: u.assigned_site_id,
                assigned_section_id: u.assigned_section_id,
                email: u.email,
                status: 'active',
                updated_at: new Date().toISOString(),
              })
              .eq('id', existingAppUser.id)
              .select()
              .single();
            profile = updatedP;
            profileErr = uErr;
          } else {
            const { data: insertedP, error: iErr } = await supabaseAdmin
              .from('app_users')
              .insert({
                id: u.id,
                auth_user_id: authUser.id,
                username: u.username,
                name: u.name,
                role: u.role,
                assigned_site_id: u.assigned_site_id,
                assigned_section_id: u.assigned_section_id,
                email: u.email,
                status: 'active',
              })
              .select()
              .single();
            profile = insertedP;
            profileErr = iErr;
          }

          results.push({ username: u.username, email: u.email, auth_user_id: authUser.id, profile, error: profileErr?.message });
        }
      }

      return new Response(
        JSON.stringify({ success: true, seeded: results }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    if (action === 'cleanTestData') {
      const { data: allReqs } = await supabaseAdmin.from('login_requests').select('id');
      let deletedReqsCount = 0;
      if (allReqs && allReqs.length > 0) {
        const idsToDelete = allReqs.map((r: any) => r.id);
        await supabaseAdmin.from('login_requests').delete().in('id', idsToDelete);
        deletedReqsCount = idsToDelete.length;
      }

      const { data: allUsers } = await supabaseAdmin.from('app_users').select('*');
      const validUsernames = ['admin', 'ganesh', 'site_s001', 'site_s002', 'site_s003'];
      const testUsersToDelete = allUsers?.filter((u: any) => !validUsernames.includes(u.username.toLowerCase())) || [];

      for (const u of testUsersToDelete) {
        await supabaseAdmin.from('app_users').delete().eq('id', u.id);
        if (u.auth_user_id) {
          await supabaseAdmin.auth.admin.deleteUser(u.auth_user_id).catch(() => {});
        }
      }

      const { data: remainingUsers } = await supabaseAdmin.from('app_users').select('id, username, role, email, assigned_site_id');
      const { count: reqCount } = await supabaseAdmin.from('login_requests').select('*', { count: 'exact' });

      return new Response(
        JSON.stringify({
          success: true,
          deletedReqsCount,
          deletedTestUsersCount: testUsersToDelete.length,
          remainingUsers,
          remainingLoginRequestsCount: reqCount,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Parse calling user from Authorization header if present
    let callingUser: any = null;
    let callingAppUser: any = null;

    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);
      if (user) {
        callingUser = user;
        const { data: p } = await supabaseAdmin
          .from('app_users')
          .select('role, id, username, email')
          .eq('auth_user_id', user.id)
          .maybeSingle();

        if (p) {
          callingAppUser = p;
        } else if (user.email) {
          const { data: pByEmail } = await supabaseAdmin
            .from('app_users')
            .select('role, id, username, email')
            .ilike('email', user.email)
            .maybeSingle();

          if (pByEmail) {
            callingAppUser = pByEmail;
            await supabaseAdmin
              .from('app_users')
              .update({ auth_user_id: user.id })
              .eq('id', pByEmail.id);
          }
        }
      }
    }

    if (action === 'createUser') {
      if (callingUser && callingAppUser && callingAppUser.role !== 'admin') {
        return new Response(
          JSON.stringify({ success: false, error: 'Unauthorized: Only system administrators can create user accounts.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
        );
      }
      const cleanUser = (targetUsername || username || newUsername || body.username || '').trim().toLowerCase();
      const cleanPass = (newPassword || password || body.password || '').trim();
      const cleanName = (name || body.name || '').trim();
      const siteIdToAssign = assignedSiteId || body.assigned_site_id || null;
      const sectionIdToAssign = assignedSectionId || body.assigned_section_id || null;

      if (!cleanUser || !cleanPass || !cleanName) {
        return new Response(
          JSON.stringify({ success: false, error: 'User ID (username), password, and full name are required.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      const userEmail = email && email.includes('@') ? email.trim() : `${cleanUser}@universalattendance.com`;

      // Check if app_user already exists
      const { data: existingAppUser } = await supabaseAdmin
        .from('app_users')
        .select('id')
        .ilike('username', cleanUser)
        .maybeSingle();

      let authUserId: string | null = null;
      const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
      let existingAuth = listData?.users?.find((u) => u.email?.toLowerCase() === userEmail.toLowerCase());

      if (!existingAuth) {
        const { data: newAuthData, error: createAuthErr } = await supabaseAdmin.auth.admin.createUser({
          email: userEmail,
          password: cleanPass,
          email_confirm: true,
        });

        if (createAuthErr || !newAuthData.user) {
          return new Response(
            JSON.stringify({ success: false, error: `Failed to create user in Auth: ${createAuthErr?.message}` }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          );
        }
        authUserId = newAuthData.user.id;
      } else {
        await supabaseAdmin.auth.admin.updateUserById(existingAuth.id, { password: cleanPass });
        authUserId = existingAuth.id;
      }

      let appUser: any = null;
      let appUserErr: any = null;

      if (existingAppUser) {
        const { data: updatedP, error: uErr } = await supabaseAdmin
          .from('app_users')
          .update({
            auth_user_id: authUserId,
            name: cleanName,
            role: role || 'supervisor',
            assigned_site_id: siteIdToAssign,
            assigned_section_id: sectionIdToAssign,
            mobile: mobile ? mobile.trim() : null,
            email: userEmail,
            status: 'active',
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingAppUser.id)
          .select()
          .single();
        appUser = updatedP;
        appUserErr = uErr;
      } else {
        const newId = `U_${Date.now().toString(36)}`;
        const { data: insertedP, error: iErr } = await supabaseAdmin
          .from('app_users')
          .insert({
            id: newId,
            auth_user_id: authUserId,
            username: cleanUser,
            password_hash: '[SUPABASE_AUTH]',
            name: cleanName,
            role: role || 'supervisor',
            assigned_site_id: siteIdToAssign,
            assigned_section_id: sectionIdToAssign,
            mobile: mobile ? mobile.trim() : null,
            email: userEmail,
            status: 'active',
          })
          .select()
          .single();
        appUser = insertedP;
        appUserErr = iErr;
      }

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

    } else if (action === 'changePassword' || action === 'updateUserCredentials' || action === 'updateUsername') {
      const targetUserStr = targetUserId || targetUsername || (body.userId ? body.userId : '');
      const cleanNewUser = newUsername ? newUsername.trim().toLowerCase() : '';
      const cleanNewPass = newPassword ? newPassword.trim() : '';

      if (!targetUserStr && !callingUser) {
        return new Response(
          JSON.stringify({ success: false, error: 'Target user ID or username is required.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      // Find target profile in app_users
      let targetProfile: any = null;

      if (targetUserStr) {
        const { data: pById } = await supabaseAdmin
          .from('app_users')
          .select('*')
          .eq('id', targetUserStr)
          .maybeSingle();

        if (pById) {
          targetProfile = pById;
        } else {
          const { data: pByUn } = await supabaseAdmin
            .from('app_users')
            .select('*')
            .ilike('username', targetUserStr)
            .maybeSingle();
          if (pByUn) targetProfile = pByUn;
        }
      }

      if (!targetProfile && callingUser) {
        const { data: pByAuth } = await supabaseAdmin
          .from('app_users')
          .select('*')
          .eq('auth_user_id', callingUser.id)
          .maybeSingle();
        if (pByAuth) targetProfile = pByAuth;
      }

      if (!targetProfile) {
        return new Response(
          JSON.stringify({ success: false, error: 'User profile not found.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
        );
      }

      // 1. Determine if email/username is being changed vs password-only update
      let emailToUpdateInAuth: string | null = null;
      if (cleanNewUser && cleanNewUser !== targetProfile.username.toLowerCase()) {
        const newEmailStr = cleanNewUser.includes('@')
          ? cleanNewUser
          : `${cleanNewUser}@universalattendance.com`;

        emailToUpdateInAuth = newEmailStr;

        await supabaseAdmin.from('app_users').update({
          username: cleanNewUser,
          email: newEmailStr,
          updated_at: new Date().toISOString(),
        }).eq('id', targetProfile.id);
      } else {
        await supabaseAdmin.from('app_users').update({
          updated_at: new Date().toISOString(),
        }).eq('id', targetProfile.id);
      }

      // 2. Locate Supabase Auth User
      let authUserIdToUpdate = targetProfile.auth_user_id;

      if (!authUserIdToUpdate) {
        const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
        let existingAuth = listData?.users?.find(
          (u) =>
            u.id === callingUser?.id ||
            u.email?.toLowerCase() === targetProfile.email?.toLowerCase()
        );

        if (!existingAuth && targetProfile.email) {
          const { data: createdAuth } = await supabaseAdmin.auth.admin.createUser({
            email: targetProfile.email,
            password: cleanNewPass || 'Default@Password2026',
            email_confirm: true,
          });
          if (createdAuth?.user) {
            existingAuth = createdAuth.user;
          }
        }

        if (existingAuth) {
          authUserIdToUpdate = existingAuth.id;
          await supabaseAdmin
            .from('app_users')
            .update({ auth_user_id: existingAuth.id })
            .eq('id', targetProfile.id);
        }
      }

      if (!authUserIdToUpdate) {
        return new Response(
          JSON.stringify({ success: false, error: 'Unable to locate associated Supabase Auth account.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }

      // 3. Update Supabase Auth user record (email and/or password)
      const authUpdatePayload: any = {};
      if (emailToUpdateInAuth) authUpdatePayload.email = emailToUpdateInAuth;
      if (cleanNewPass) authUpdatePayload.password = cleanNewPass;

      const { error: updateAuthErr } = await supabaseAdmin.auth.admin.updateUserById(
        authUserIdToUpdate,
        authUpdatePayload
      );

      if (updateAuthErr) {
        return new Response(
          JSON.stringify({ success: false, error: `Failed to update Auth credentials: ${updateAuthErr.message}` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'User credentials (User ID & Password) updated successfully in Supabase Auth & Database.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );

    } else {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid action parameter.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

  } catch (err) {
    console.error('Edge Function internal error stack:', err);
    return new Response(
      JSON.stringify({ success: false, error: `Internal error: ${err instanceof Error ? err.message : String(err)}` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
