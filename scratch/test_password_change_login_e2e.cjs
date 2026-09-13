const fs = require('fs');
const path = require('path');
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

const supabase = createClient(url, anonKey);

async function runTests() {
  console.log('====================================================');
  console.log('STEP 27.8 — E2E TEST SUITE: PASSWORD CHANGE & LOGIN');
  console.log('====================================================');

  const adminEmail = 'admin@universalattendance.com';
  const oldAdminPass = 'Admin@2026';
  const newAdminPass = 'Admin@NewPass2026!';

  const supEmail = 'site_s001@universalattendance.com';
  const oldSupPass = 'Downtown@2026';
  const newSupPass = 'Supervisor@NewPass2026!';

  let testPassed = 0;
  let testFailed = 0;

  function logPass(msg) {
    console.log(`✅ [PASS] ${msg}`);
    testPassed++;
  }

  function logFail(msg, err) {
    console.error(`❌ [FAIL] ${msg}`, err || '');
    testFailed++;
  }

  // --------------------------------------------------------------------------
  // TEST 1: Admin initial login with current password
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 1: Admin Initial Login ---');
  let { data: adminAuth, error: adminErr } = await supabase.auth.signInWithPassword({
    email: adminEmail,
    password: oldAdminPass,
  });

  if (adminErr || !adminAuth.session) {
    logFail('Admin initial login failed.', adminErr?.message);
  } else {
    logPass(`Admin logged in successfully. User ID: ${adminAuth.user.id}`);
  }

  // --------------------------------------------------------------------------
  // TEST 2: Admin Password Change to New Password
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 2: Admin Password Change ---');
  const { data: updateAdminRes, error: updateAdminErr } = await supabase.auth.updateUser({
    password: newAdminPass,
  });

  if (updateAdminErr) {
    logFail('Admin password change failed.', updateAdminErr.message);
  } else {
    logPass('Admin password changed successfully in Supabase Auth.');
  }

  // Sign out Admin
  await supabase.auth.signOut();

  // --------------------------------------------------------------------------
  // TEST 3: Admin Login with OLD Password (MUST FAIL)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 3: Admin Login with OLD Password (Must Fail) ---');
  const { data: oldLoginRes, error: oldLoginErr } = await supabase.auth.signInWithPassword({
    email: adminEmail,
    password: oldAdminPass,
  });

  if (oldLoginErr) {
    logPass(`OLD password correctly rejected by Supabase Auth! Error: "${oldLoginErr.message}"`);
  } else {
    logFail('OLD password was incorrectly accepted! Passwords must be strictly updated.');
  }

  // --------------------------------------------------------------------------
  // TEST 4: Admin Login with NEW Password (MUST SUCCEED)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 4: Admin Login with NEW Password (Must Succeed) ---');
  const { data: newLoginRes, error: newLoginErr } = await supabase.auth.signInWithPassword({
    email: adminEmail,
    password: newAdminPass,
  });

  if (newLoginErr || !newLoginRes.session) {
    logFail('Admin login with NEW password failed.', newLoginErr?.message);
  } else {
    logPass('Admin logged in successfully with NEW password!');

    // Verify app_users profile mapping
    const { data: profile } = await supabase
      .from('app_users')
      .select('*')
      .eq('auth_user_id', newLoginRes.user.id)
      .maybeSingle();

    if (profile && profile.role === 'admin' && profile.status === 'active') {
      logPass(`Admin app_users profile verified: Role = ${profile.role}, Status = ${profile.status}`);
    } else {
      logFail('Admin app_users profile lookup or role verification failed.');
    }
  }

  // Reset Admin password back to oldAdminPass for clean state
  await supabase.auth.updateUser({ password: oldAdminPass });
  await supabase.auth.signOut();

  // --------------------------------------------------------------------------
  // TEST 5: Supervisor Initial Login
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 5: Supervisor Initial Login ---');
  let { data: supAuth, error: supErr } = await supabase.auth.signInWithPassword({
    email: supEmail,
    password: oldSupPass,
  });

  if (supErr || !supAuth.session) {
    logFail('Supervisor initial login failed.', supErr?.message);
  } else {
    logPass(`Supervisor logged in successfully. User ID: ${supAuth.user.id}`);
  }

  // --------------------------------------------------------------------------
  // TEST 6: Supervisor Password Change to New Password
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 6: Supervisor Password Change ---');
  const { data: updateSupRes, error: updateSupErr } = await supabase.auth.updateUser({
    password: newSupPass,
  });

  if (updateSupErr) {
    logFail('Supervisor password change failed.', updateSupErr.message);
  } else {
    logPass('Supervisor password changed successfully in Supabase Auth.');
  }

  // Sign out Supervisor
  await supabase.auth.signOut();

  // --------------------------------------------------------------------------
  // TEST 7: Supervisor Login with OLD Password (MUST FAIL)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 7: Supervisor Login with OLD Password (Must Fail) ---');
  const { data: supOldRes, error: supOldErr } = await supabase.auth.signInWithPassword({
    email: supEmail,
    password: oldSupPass,
  });

  if (supOldErr) {
    logPass(`Supervisor OLD password correctly rejected! Error: "${supOldErr.message}"`);
  } else {
    logFail('Supervisor OLD password was incorrectly accepted!');
  }

  // --------------------------------------------------------------------------
  // TEST 8: Supervisor Login with NEW Password (MUST SUCCEED)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 8: Supervisor Login with NEW Password (Must Succeed) ---');
  const { data: supNewRes, error: supNewErr } = await supabase.auth.signInWithPassword({
    email: supEmail,
    password: newSupPass,
  });

  if (supNewErr || !supNewRes.session) {
    logFail('Supervisor login with NEW password failed.', supNewErr?.message);
  } else {
    logPass('Supervisor logged in successfully with NEW password!');

    const { data: profile } = await supabase
      .from('app_users')
      .select('*')
      .eq('auth_user_id', supNewRes.user.id)
      .maybeSingle();

    if (profile && profile.role === 'supervisor' && profile.status === 'active') {
      logPass(`Supervisor profile verified: Role = ${profile.role}, Site = ${profile.assigned_site_id}`);
    } else {
      logFail('Supervisor profile verification failed.');
    }
  }

  // Reset Supervisor password back to oldSupPass for clean state
  await supabase.auth.updateUser({ password: oldSupPass });
  await supabase.auth.signOut();

  // --------------------------------------------------------------------------
  // TEST 9: Security Audit (Zero Passwords in app_users)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 9: Security Audit ---');
  const { data: allAppUsers } = await supabase.from('app_users').select('*');
  let hasPlaintextPassword = false;
  if (allAppUsers) {
    for (const u of allAppUsers) {
      if (u.password || u.password_hash || u.plain_password) {
        hasPlaintextPassword = true;
        break;
      }
    }
  }

  if (!hasPlaintextPassword) {
    logPass('Zero plaintext passwords found in app_users table!');
  } else {
    logFail('FOUND stored password fields in app_users table. Security violation.');
  }

  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${testPassed} PASSED, ${testFailed} FAILED`);
  console.log('====================================================');

  if (testFailed > 0) {
    process.exit(1);
  }
}

runTests();
