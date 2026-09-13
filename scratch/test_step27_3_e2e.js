import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseUrl = "https://gkphikhsgysoqjradbaz.supabase.co";
const anonKey = "sb_publishable_AF9xkYaNTvl0kBf60-FtGQ_vu2HYBfQ";

const supabase = createClient(supabaseUrl, anonKey);

function sha256Hex(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

async function runStep27_3_Tests() {
  console.log('====================================================');
  console.log('  STEP 27.3 AUTOMATED E2E TEST SUITE (1-TAP DIRECT OPEN)');
  console.log('====================================================');

  // Sign in as admin to inspect DB tables
  const { data: authAdmin } = await supabase.auth.signInWithPassword({
    email: 'admin@universalattendance.com',
    password: 'ProdAdmin#2026!SecuredVal'
  });
  console.log('✅ Admin DB Client Authenticated. User ID:', authAdmin.user?.id);

  // --------------------------------------------------------------------------
  // TEST 1: 1-Tap Telegram APPROVE -> Direct App Link answerCallbackQuery URL
  // --------------------------------------------------------------------------
  const userA = `sup_direct_a_${Date.now()}`;
  const reqIdA = `REQ-${Date.now()}-DIRECT`;

  console.log(`\n[TEST 1] Sending Login Request for '${userA}' (${reqIdA})...`);
  const reqResA = await fetch(`${supabaseUrl}/functions/v1/send-login-request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${anonKey}`, 'apikey': anonKey },
    body: JSON.stringify({ username: userA, platform: 'ANDROID', requestId: reqIdA })
  });
  const reqDataA = await reqResA.json();
  console.log('[TEST 1] send-login-request response:', reqDataA);

  console.log('[TEST 1] Simulating Telegram Admin clicking [ ✅ APPROVE ]...');
  const webhookResA = await fetch(`${supabaseUrl}/functions/v1/telegram-webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      update_id: Date.now(),
      callback_query: {
        id: `cb_${Date.now()}`,
        from: { id: 1092499824, first_name: 'Gani Admin', username: 'gani_admin' },
        message: { message_id: reqDataA.telegramMessageId, chat: { id: 1092499824 } },
        data: `approve:${reqIdA}`
      }
    })
  });
  const webhookDataA = await webhookResA.json();
  console.log('[TEST 1] webhook approve response:', webhookDataA);

  // Verify approval token in DB
  const { data: tokenRecA } = await supabase.from('login_approval_tokens').select('*').eq('request_id', reqIdA).single();
  console.log('[TEST 1] DB Token Hash created:', tokenRecA?.token_hash);
  console.log('[TEST 1] DB Token Expiry:', tokenRecA?.expires_at);

  const test1Pass = webhookDataA.ok && tokenRecA && tokenRecA.request_id === reqIdA;
  console.log(`[TEST 1] RESULT: ${test1Pass ? 'PASS ✅' : 'FAIL ❌'}`);

  // --------------------------------------------------------------------------
  // TEST 2: Verify Approval Token via Edge Function & Establish Session
  // --------------------------------------------------------------------------
  console.log('\n[TEST 2] Verifying Approval Token via Edge Function...');
  const rawToken2 = `test-direct-token-${Date.now()}`;
  const hash2 = sha256Hex(rawToken2);
  const expires2 = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  await supabase.from('login_approval_tokens').insert({
    request_id: reqIdA,
    user_id: userA,
    token_hash: hash2,
    expires_at: expires2
  });

  const verifyRes2 = await fetch(`${supabaseUrl}/functions/v1/verify-approval-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requestId: reqIdA, token: rawToken2 })
  });
  const verifyData2 = await verifyRes2.json();
  console.log('[TEST 2] verify-approval-token response:', verifyData2);

  const test2Pass = verifyData2.success === true && verifyData2.otp && verifyData2.profile?.username === userA;
  console.log(`[TEST 2] RESULT: ${test2Pass ? 'PASS ✅' : 'FAIL ❌'}`);

  // --------------------------------------------------------------------------
  // TEST 3: Replay Attack Protection (Attempting to reuse token)
  // --------------------------------------------------------------------------
  console.log('\n[TEST 3] Testing Token Replay Attack Protection...');
  const verifyRes3 = await fetch(`${supabaseUrl}/functions/v1/verify-approval-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requestId: reqIdA, token: rawToken2 })
  });
  const verifyData3 = await verifyRes3.json();
  console.log('[TEST 3] Second verification response (should be rejected):', verifyData3);

  const test3Pass = verifyData3.success === false && verifyData3.error?.includes('already been used');
  console.log(`[TEST 3] RESULT: ${test3Pass ? 'PASS ✅' : 'FAIL ❌'}`);

  // --------------------------------------------------------------------------
  // TEST 4: Expired Token Protection
  // --------------------------------------------------------------------------
  console.log('\n[TEST 4] Testing Expired Token Protection...');
  const rawToken4 = `expired-token-${Date.now()}`;
  const hash4 = sha256Hex(rawToken4);
  const expiredTime = new Date(Date.now() - 10 * 60 * 1000).toISOString();

  await supabase.from('login_approval_tokens').insert({
    request_id: reqIdA,
    user_id: userA,
    token_hash: hash4,
    expires_at: expiredTime
  });

  const verifyRes4 = await fetch(`${supabaseUrl}/functions/v1/verify-approval-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requestId: reqIdA, token: rawToken4 })
  });
  const verifyData4 = await verifyRes4.json();
  console.log('[TEST 4] Expired token response (should be rejected):', verifyData4);

  const test4Pass = verifyData4.success === false && verifyData4.error?.includes('expired');
  console.log(`[TEST 4] RESULT: ${test4Pass ? 'PASS ✅' : 'FAIL ❌'}`);

  // --------------------------------------------------------------------------
  // TEST 5: Invalid Request ID & Invalid Token
  // --------------------------------------------------------------------------
  console.log('\n[TEST 5] Testing Invalid Request ID / Token...');
  const verifyRes5 = await fetch(`${supabaseUrl}/functions/v1/verify-approval-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requestId: 'INVALID-REQ-ID', token: 'fake-token-123' })
  });
  const verifyData5 = await verifyRes5.json();
  console.log('[TEST 5] Invalid request/token response:', verifyData5);

  const test5Pass = verifyData5.success === false;
  console.log(`[TEST 5] RESULT: ${test5Pass ? 'PASS ✅' : 'FAIL ❌'}`);

  // --------------------------------------------------------------------------
  // TEST 6: Telegram REJECT Workflow
  // --------------------------------------------------------------------------
  const userB = `sup_direct_b_${Date.now()}`;
  const reqIdB = `REQ-${Date.now()}-REJECT`;

  console.log(`\n[TEST 6] Testing REJECT workflow for '${userB}' (${reqIdB})...`);
  const reqResB = await fetch(`${supabaseUrl}/functions/v1/send-login-request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${anonKey}`, 'apikey': anonKey },
    body: JSON.stringify({ username: userB, platform: 'ANDROID', requestId: reqIdB })
  });
  const reqDataB = await reqResB.json();

  const webhookResB = await fetch(`${supabaseUrl}/functions/v1/telegram-webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      update_id: Date.now(),
      callback_query: {
        id: `cb_${Date.now()}`,
        from: { id: 1092499824, first_name: 'Gani Admin', username: 'gani_admin' },
        message: { message_id: reqDataB.telegramMessageId, chat: { id: 1092499824 } },
        data: `reject:${reqIdB}`
      }
    })
  });
  const webhookDataB = await webhookResB.json();

  const { data: dbReqB } = await supabase.from('login_requests').select('*').eq('request_id', reqIdB).single();
  console.log('[TEST 6] DB Request status:', dbReqB?.status);

  const test6Pass = webhookDataB.ok && dbReqB?.status === 'REJECTED';
  console.log(`[TEST 6] RESULT: ${test6Pass ? 'PASS ✅' : 'FAIL ❌'}`);

  console.log('\n====================================================');
  const allPass = test1Pass && test2Pass && test3Pass && test4Pass && test5Pass && test6Pass;
  console.log(`  FINAL STEP 27.3 E2E VERIFICATION: ${allPass ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`);
  console.log('====================================================');
}

runStep27_3_Tests().catch(err => console.error('E2E Test Suite Error:', err));
