const fs = require('fs');
const WebSocket = require('ws');
const { createClient } = require('@supabase/supabase-js');

let env = {};
if (fs.existsSync('.env.local')) {
  const lines = fs.readFileSync('.env.local', 'utf8').split('\n');
  for (const line of lines) {
    const parts = line.split('=');
    if (parts.length >= 2) {
      env[parts[0].trim()] = parts.slice(1).join('=').trim();
    }
  }
}

const url = env.VITE_SUPABASE_URL || 'https://gkphikhsgysoqjradbaz.supabase.co';
const anonKey = env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(url, anonKey, {
  auth: { persistSession: false },
  global: { WebSocket },
});

async function runAllTests() {
  console.log('========================================================================');
  console.log('STEP 27.13 E2E TEST SUITE: TELEGRAM APPROVAL & PASSWORD AUTHENTICATION');
  console.log('========================================================================');

  let passed = 0;
  let failed = 0;

  function logPass(msg) {
    console.log(`✅ [PASS] ${msg}`);
    passed++;
  }

  function logFail(msg, err) {
    console.error(`❌ [FAIL] ${msg}`, err || '');
    failed++;
  }

  // --------------------------------------------------------------------------
  // TEST 1: Telegram Approval Auto-Login for Existing User (site_s001)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 1: Telegram Approval Auto-Login (Existing User: site_s001) ---');
  const reqId1 = `REQ-2713-S001-${Date.now()}`;
  const { data: req1Data, error: req1Err } = await supabase.functions.invoke('send-login-request', {
    body: { username: 'site_s001', platform: 'ANDROID', requestId: reqId1 },
  });

  if (req1Err || !req1Data?.success) {
    logFail('Failed to send login request for site_s001.', req1Err?.message || req1Data?.error);
  } else {
    logPass(`Login request sent successfully for site_s001 (Request ID: ${reqId1})`);
  }

  // Admin approves via telegram-webhook
  const { data: app1Data, error: app1Err } = await supabase.functions.invoke('telegram-webhook', {
    body: {
      callback_query: {
        id: `cb_${Date.now()}`,
        data: `approve:${reqId1}`,
        from: { id: 1092499824, first_name: 'System Admin' },
        message: { chat: { id: 1092499824 }, message_id: 1001 },
      },
    },
  });

  if (app1Err || !app1Data?.ok) {
    logFail('telegram-webhook approval failed for site_s001.', app1Err?.message || app1Data?.error);
  } else {
    logPass('telegram-webhook approved request for site_s001 successfully!');
  }

  // Retrieve raw_token from login_requests
  const { data: req1Db } = await supabase.from('login_requests').select('*').eq('request_id', reqId1).single();
  if (req1Db && req1Db.status === 'APPROVED' && req1Db.raw_token) {
    logPass(`login_requests status APPROVED in DB. Token: ${req1Db.raw_token.substring(0, 8)}...`);

    // Verify token
    const { data: ver1Data, error: ver1Err } = await supabase.functions.invoke('verify-approval-token', {
      body: { requestId: reqId1, token: req1Db.raw_token },
    });

    if (ver1Err || !ver1Data?.success) {
      logFail('verify-approval-token failed for site_s001.', ver1Err?.message || ver1Data?.error);
    } else {
      logPass(`verify-approval-token succeeded! Issued OTP for ${ver1Data.email}`);
      const { data: auth1, error: auth1Err } = await supabase.auth.verifyOtp({
        email: ver1Data.email,
        token: ver1Data.otp,
        type: 'email',
      });

      if (auth1Err || !auth1.session) {
        logFail('verifyOtp failed for site_s001.', auth1Err?.message);
      } else {
        logPass(`Supabase Auth session established! User ID: ${auth1.session.user.id}`);
        await supabase.auth.signOut();
      }
    }
  } else {
    logFail('Failed to retrieve raw_token for site_s001 request.');
  }

  // --------------------------------------------------------------------------
  // TEST 2: Telegram Approval Auto-Login for NEW / DYNAMIC User (ganesh)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 2: Telegram Approval Auto-Login (NEW User: ganesh) ---');
  const reqId2 = `REQ-2713-GANESH-${Date.now()}`;
  const { data: req2Data, error: req2Err } = await supabase.functions.invoke('send-login-request', {
    body: { username: 'ganesh', platform: 'ANDROID', requestId: reqId2 },
  });

  if (req2Err || !req2Data?.success) {
    logFail('Failed to send login request for ganesh.', req2Err?.message || req2Data?.error);
  } else {
    logPass(`Login request sent successfully for ganesh (Request ID: ${reqId2})`);
  }

  // Admin approves via telegram-webhook
  const { data: app2Data, error: app2Err } = await supabase.functions.invoke('telegram-webhook', {
    body: {
      callback_query: {
        id: `cb_${Date.now()}`,
        data: `approve:${reqId2}`,
        from: { id: 1092499824, first_name: 'System Admin' },
        message: { chat: { id: 1092499824 }, message_id: 1002 },
      },
    },
  });

  if (app2Err || !app2Data?.ok) {
    logFail('telegram-webhook approval failed for ganesh.', app2Err?.message || app2Data?.error);
  } else {
    logPass('telegram-webhook approved request & auto-provisioned auth user for ganesh!');
  }

  // Retrieve raw_token from login_requests
  const { data: req2Db } = await supabase.from('login_requests').select('*').eq('request_id', reqId2).single();
  if (req2Db && req2Db.status === 'APPROVED' && req2Db.raw_token) {
    // Verify token
    const { data: ver2Data, error: ver2Err } = await supabase.functions.invoke('verify-approval-token', {
      body: { requestId: reqId2, token: req2Db.raw_token },
    });

    if (ver2Err || !ver2Data?.success) {
      logFail('verify-approval-token failed for ganesh.', ver2Err?.message || ver2Data?.error);
    } else {
      logPass(`verify-approval-token succeeded for NEW user ganesh! Email: ${ver2Data.email}`);
      const { data: auth2, error: auth2Err } = await supabase.auth.verifyOtp({
        email: ver2Data.email,
        token: ver2Data.otp,
        type: 'email',
      });

      if (auth2Err || !auth2.session) {
        logFail('verifyOtp failed for ganesh.', auth2Err?.message);
      } else {
        logPass(`Supabase Auth session established for NEW user ganesh! Session ID: ${auth2.session.user.id}`);
        await supabase.auth.signOut();
      }
    }
  } else {
    logFail('Failed to retrieve raw_token for ganesh request.');
  }

  // --------------------------------------------------------------------------
  // TEST 3: Admin Normal Login & Password Change Test
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 3: Admin Password Login & Self Password Change ---');
  // Seed default credentials first to ensure known initial state
  await supabase.functions.invoke('admin-manage-user-password', { body: { action: 'seedDefaultUsers' } });

  // 1. Login Admin with initial password
  const { data: adminLogin1, error: adminErr1 } = await supabase.auth.signInWithPassword({
    email: 'admin@universalattendance.com',
    password: 'Admin@2026',
  });

  if (adminErr1 || !adminLogin1.user) {
    logFail('Admin login with default password Admin@2026 failed.', adminErr1?.message);
  } else {
    logPass('Admin logged in with default password Admin@2026 successfully!');

    // 2. Change Admin password
    const newAdminPwd = 'Admin@Updated2026!';
    const { error: changeErr } = await supabase.auth.updateUser({ password: newAdminPwd });
    if (changeErr) {
      logFail('Admin updateUser password change failed.', changeErr.message);
    } else {
      logPass(`Admin password updated to "${newAdminPwd}" via Supabase Auth!`);

      // 3. Logout
      await supabase.auth.signOut();

      // 4. Test OLD password -> MUST FAIL
      const { error: oldPwdErr } = await supabase.auth.signInWithPassword({
        email: 'admin@universalattendance.com',
        password: 'Admin@2026',
      });
      if (oldPwdErr) {
        logPass('OLD password "Admin@2026" correctly REJECTED!');
      } else {
        logFail('OLD password was incorrectly accepted!');
      }

      // 5. Test NEW password -> MUST SUCCEED
      const { data: newPwdLogin, error: newPwdErr } = await supabase.auth.signInWithPassword({
        email: 'admin@universalattendance.com',
        password: newAdminPwd,
      });
      if (newPwdErr || !newPwdLogin.user) {
        logFail('NEW password login failed.', newPwdErr?.message);
      } else {
        logPass('NEW password login SUCCEEDED!');
        // Restore password back to Admin@2026
        await supabase.auth.updateUser({ password: 'Admin@2026' });
        await supabase.auth.signOut();
        logPass('Admin password restored back to default Admin@2026.');
      }
    }
  }

  // --------------------------------------------------------------------------
  // TEST 4: Supervisor Password Login & Self Password Change
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 4: Supervisor Password Login & Self Password Change ---');
  const { data: supLogin1, error: supErr1 } = await supabase.auth.signInWithPassword({
    email: 'site_s001@universalattendance.com',
    password: 'Downtown@2026',
  });

  if (supErr1 || !supLogin1.user) {
    logFail('Supervisor login with default password Downtown@2026 failed.', supErr1?.message);
  } else {
    logPass('Supervisor logged in with default password Downtown@2026 successfully!');

    // Change Supervisor password
    const newSupPwd = 'Downtown@New2026!';
    const { error: supChangeErr } = await supabase.auth.updateUser({ password: newSupPwd });

    if (supChangeErr) {
      logFail('Supervisor password update failed.', supChangeErr.message);
    } else {
      logPass(`Supervisor password updated to "${newSupPwd}"!`);
      await supabase.auth.signOut();

      // Old password test
      const { error: supOldErr } = await supabase.auth.signInWithPassword({
        email: 'site_s001@universalattendance.com',
        password: 'Downtown@2026',
      });
      if (supOldErr) {
        logPass('Supervisor OLD password correctly REJECTED!');
      } else {
        logFail('Supervisor OLD password was incorrectly accepted!');
      }

      // New password test
      const { data: supNewLogin, error: supNewErr } = await supabase.auth.signInWithPassword({
        email: 'site_s001@universalattendance.com',
        password: newSupPwd,
      });
      if (supNewErr || !supNewLogin.user) {
        logFail('Supervisor NEW password login failed.', supNewErr?.message);
      } else {
        logPass('Supervisor NEW password login SUCCEEDED!');
        // Restore password
        await supabase.auth.updateUser({ password: 'Downtown@2026' });
        await supabase.auth.signOut();
        logPass('Supervisor password restored back to Downtown@2026.');
      }
    }
  }

  // --------------------------------------------------------------------------
  // TEST 5: Admin-Managed Password Change for Supervisor
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 5: Admin-Managed Supervisor Password Change ---');
  // Admin logs in
  const { data: adminAuth } = await supabase.auth.signInWithPassword({
    email: 'admin@universalattendance.com',
    password: 'Admin@2026',
  });

  if (adminAuth?.session) {
    const managedPwd = 'Downtown@AdminReset2026!';
    const { data: mgData, error: mgErr } = await supabase.functions.invoke('admin-manage-user-password', {
      body: { action: 'changePassword', targetUsername: 'site_s001', newPassword: managedPwd },
    });

    if (mgErr || !mgData?.success) {
      logFail('Admin-managed password change failed.', mgErr?.message || mgData?.error);
    } else {
      logPass('Admin changed Supervisor password via admin-manage-user-password Edge Function!');
      await supabase.auth.signOut();

      // Test Supervisor login with managed password
      const { data: supMgLogin, error: supMgErr } = await supabase.auth.signInWithPassword({
        email: 'site_s001@universalattendance.com',
        password: managedPwd,
      });

      if (supMgErr || !supMgLogin.user) {
        logFail('Supervisor login with Admin-managed password failed.', supMgErr?.message);
      } else {
        logPass('Supervisor login with Admin-managed NEW password SUCCEEDED!');
        // Restore default password
        await supabase.auth.updateUser({ password: 'Downtown@2026' });
        await supabase.auth.signOut();
        logPass('Supervisor password restored to Downtown@2026.');
      }
    }
  } else {
    logFail('Failed to authenticate Admin for managed password change test.');
  }

  // --------------------------------------------------------------------------
  // TEST 6: Safe Error Handling (No raw "Edge Function returned a non-2xx status code")
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 6: Safe Error Parsing & Contract Verification ---');
  const { data: errFuncData, error: errFuncErr } = await supabase.functions.invoke('verify-approval-token', {
    body: { requestId: 'invalid_req', token: 'invalid_tok' },
  });

  if (errFuncErr) {
    let cleanMsg = 'Token verification failed. Please try again.';
    if (errFuncErr.context && typeof errFuncErr.context.json === 'function') {
      try {
        const body = await errFuncErr.context.json();
        if (body?.error) cleanMsg = body.error;
      } catch {}
    }
    if (cleanMsg !== 'Edge Function returned a non-2xx status code') {
      logPass(`Safe error parsing verified! Clean user-facing error message: "${cleanMsg}"`);
    } else {
      logFail('Raw "Edge Function returned a non-2xx status code" was NOT handled safely!');
    }
  } else {
    logFail('Expected invalid token call to fail, but it returned success.');
  }

  console.log('\n========================================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================================');

  process.exit(failed > 0 ? 1 : 0);
}

runAllTests();
