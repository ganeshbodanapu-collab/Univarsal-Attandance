import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseUrl = "https://gkphikhsgysoqjradbaz.supabase.co";
const anonKey = "sb_publishable_AF9xkYaNTvl0kBf60-FtGQ_vu2HYBfQ";

const supabase = createClient(supabaseUrl, anonKey);

async function run1TapRedirectTests() {
  console.log('====================================================');
  console.log('  1-TAP TELEGRAM DIRECT APP OPEN E2E TEST SUITE');
  console.log('====================================================');

  // Sign in as admin to inspect DB tables
  const { data: authAdmin } = await supabase.auth.signInWithPassword({
    email: 'admin@universalattendance.com',
    password: 'ProdAdmin#2026!SecuredVal'
  });
  console.log('✅ Admin DB Client Authenticated. User ID:', authAdmin.user?.id);

  // --------------------------------------------------------------------------
  // TEST 1: Send Login Request & Verify 1-Tap Approval Secret Generated
  // --------------------------------------------------------------------------
  const userA = `sup_1tap_${Date.now()}`;
  const reqIdA = `REQ-${Date.now()}-1TAP`;

  console.log(`\n[TEST 1] Sending Login Request for '${userA}' (${reqIdA})...`);
  const reqResA = await fetch(`${supabaseUrl}/functions/v1/send-login-request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${anonKey}`, 'apikey': anonKey },
    body: JSON.stringify({ username: userA, platform: 'ANDROID', requestId: reqIdA })
  });
  const reqDataA = await reqResA.json();
  console.log('[TEST 1] send-login-request response:', reqDataA);

  const { data: dbReqA } = await supabase.from('login_requests').select('*').eq('request_id', reqIdA).single();
  console.log('[TEST 1] DB Request created with status:', dbReqA?.status, 'Secret:', dbReqA?.approval_secret ? 'PRESENT ✅' : 'MISSING ❌');

  const test1Pass = reqDataA.success && dbReqA?.approval_secret;
  console.log(`[TEST 1] RESULT: ${test1Pass ? 'PASS ✅' : 'FAIL ❌'}`);

  // --------------------------------------------------------------------------
  // TEST 2: 1-Tap Telegram URL Approval & Redirect Execution
  // --------------------------------------------------------------------------
  console.log('\n[TEST 2] Simulating 1-Tap Admin click on Telegram [ ✅ APPROVE ] URL...');
  const approveUrl = `${supabaseUrl}/functions/v1/approve-and-redirect?request=${reqIdA}&secret=${dbReqA.approval_secret}`;
  
  const redirectRes = await fetch(approveUrl, { redirect: 'manual' });
  console.log('[TEST 2] approve-and-redirect status:', redirectRes.status);
  const locationHeader = redirectRes.headers.get('location');
  console.log('[TEST 2] Redirect Location header:', locationHeader);

  // Read response HTML if no direct 302 location header
  let finalAppUrl = locationHeader;
  if (!finalAppUrl) {
    const htmlText = await redirectRes.text();
    const match = htmlText.match(/https:\/\/universal-attendance\.vercel\.app\/auth\/approved\?[^"'\s]+/);
    if (match) {
      finalAppUrl = match[0];
    }
  }
  console.log('[TEST 2] Extracted App Link URL:', finalAppUrl);

  // Verify approval in DB
  const { data: updatedReqA } = await supabase.from('login_requests').select('*').eq('request_id', reqIdA).single();
  const { data: appUserA } = await supabase.from('app_users').select('*').eq('username', userA).single();
  const { data: tokenRecA } = await supabase.from('login_approval_tokens').select('*').eq('request_id', reqIdA).single();

  console.log('[TEST 2] DB Request Status:', updatedReqA?.status);
  console.log('[TEST 2] User Status:', appUserA?.status);
  console.log('[TEST 2] DB Approval Token Hash:', tokenRecA?.token_hash);

  const test2Pass = updatedReqA?.status === 'APPROVED' && appUserA?.status === 'active' && tokenRecA && finalAppUrl?.includes('/auth/approved');
  console.log(`[TEST 2] RESULT: ${test2Pass ? 'PASS ✅' : 'FAIL ❌'}`);

  // --------------------------------------------------------------------------
  // TEST 3: Verify Token Extracted from App Link via Edge Function
  // --------------------------------------------------------------------------
  console.log('\n[TEST 3] Verifying Extracted App Link Token via Edge Function...');
  const urlObj = new URL(finalAppUrl);
  const extractedReq = urlObj.searchParams.get('request');
  const extractedToken = urlObj.searchParams.get('token');

  console.log('[TEST 3] Extracted Request:', extractedReq, 'Token:', extractedToken?.substring(0, 10) + '...');

  const verifyRes = await fetch(`${supabaseUrl}/functions/v1/verify-approval-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requestId: extractedReq, token: extractedToken })
  });
  const verifyData = await verifyRes.json();
  console.log('[TEST 3] verify-approval-token response:', verifyData);

  const test3Pass = verifyData.success === true && verifyData.otp && verifyData.profile?.username === userA;
  console.log(`[TEST 3] RESULT: ${test3Pass ? 'PASS ✅' : 'FAIL ❌'}`);

  // --------------------------------------------------------------------------
  // TEST 4: Replay Protection (Attempting to reuse extracted token)
  // --------------------------------------------------------------------------
  console.log('\n[TEST 4] Testing Replay Protection for extracted token...');
  const verifyRes4 = await fetch(`${supabaseUrl}/functions/v1/verify-approval-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requestId: extractedReq, token: extractedToken })
  });
  const verifyData4 = await verifyRes4.json();
  console.log('[TEST 4] Second verification response:', verifyData4);

  const test4Pass = verifyData4.success === false && verifyData4.error?.includes('already been used');
  console.log(`[TEST 4] RESULT: ${test4Pass ? 'PASS ✅' : 'FAIL ❌'}`);

  // --------------------------------------------------------------------------
  // TEST 5: Invalid Secret / Unauthorized Approval Attempt
  // --------------------------------------------------------------------------
  console.log('\n[TEST 5] Testing Unauthorized Approval Attempt with invalid secret...');
  const fakeApproveUrl = `${supabaseUrl}/functions/v1/approve-and-redirect?request=${reqIdA}&secret=fake-invalid-secret`;
  const fakeRes = await fetch(fakeApproveUrl, { redirect: 'manual' });
  console.log('[TEST 5] Unauthorized request status code:', fakeRes.status);

  const test5Pass = fakeRes.status === 403 || fakeRes.status === 400;
  console.log(`[TEST 5] RESULT: ${test5Pass ? 'PASS ✅' : 'FAIL ❌'}`);

  console.log('\n====================================================');
  const allPass = test1Pass && test2Pass && test3Pass && test4Pass && test5Pass;
  console.log(`  FINAL 1-TAP REDIRECT VERIFICATION: ${allPass ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`);
  console.log('====================================================');
}

run1TapRedirectTests().catch(err => console.error('E2E Test Suite Error:', err));
