import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://gkphikhsgysoqjradbaz.supabase.co";
const anonKey = "sb_publishable_AF9xkYaNTvl0kBf60-FtGQ_vu2HYBfQ";

// Client for sending request & triggering webhook
const supabaseAnon = createClient(supabaseUrl, anonKey);

async function runEndToEndTests() {
  console.log('--- STARTING STEP 27.1 END-TO-END VERIFICATION ---');

  // Login as admin to query DB tables bypass RLS or inspect records
  const { data: authAdmin } = await supabaseAnon.auth.signInWithPassword({
    email: 'admin@universalattendance.com',
    password: 'ProdAdmin#2026!SecuredVal'
  });
  console.log('Logged in as Admin to verify DB. User ID:', authAdmin.user?.id);

  // TEST A: APPROVE WORKFLOW
  const testUserA = `sup_test_a_${Date.now()}`;
  const reqIdA = `REQ-${Date.now()}-APPROVE`;

  console.log(`\n[TEST A] Sending Login Access Request for '${testUserA}' (Request ID: ${reqIdA})...`);

  const resA = await fetch(`${supabaseUrl}/functions/v1/send-login-request`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${anonKey}`,
      'apikey': anonKey
    },
    body: JSON.stringify({
      username: testUserA,
      platform: 'ANDROID',
      requestId: reqIdA
    })
  });

  const dataA = await resA.json();
  console.log('[TEST A] send-login-request response:', dataA);

  if (!dataA.success) {
    throw new Error(`TEST A failed: ${dataA.error}`);
  }

  // Simulate Telegram Admin clicking [ ✅ APPROVE ] button
  console.log(`[TEST A] Simulating Telegram Server sending callback query for [ ✅ APPROVE ] (${reqIdA})...`);
  const webhookResA = await fetch(`${supabaseUrl}/functions/v1/telegram-webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      update_id: Date.now(),
      callback_query: {
        id: `cb_${Date.now()}`,
        from: { id: 1092499824, first_name: 'Gani Admin', username: 'gani_admin' },
        message: { message_id: dataA.telegramMessageId, chat: { id: 1092499824 } },
        data: `approve:${reqIdA}`
      }
    })
  });

  const webhookDataA = await webhookResA.json();
  console.log('[TEST A] telegram-webhook approve response:', webhookDataA);

  // Query DB using authenticated admin client to verify DB updates
  const { data: dbReqA } = await supabaseAnon.from('login_requests').select('*').eq('request_id', reqIdA).single();
  console.log('[TEST A] login_requests status in DB:', dbReqA?.status);
  console.log('[TEST A] Approved by:', dbReqA?.approved_by);

  const { data: dbUserA } = await supabaseAnon.from('app_users').select('*').eq('username', testUserA).single();
  console.log('[TEST A] app_users status in DB:', dbUserA?.status);
  console.log('[TEST A] Assigned Site:', dbUserA?.assigned_site_id);

  const approvePass = dbReqA?.status === 'APPROVED' && dbUserA?.status === 'active';
  console.log(`[TEST A] APPROVE WORKFLOW RESULT: ${approvePass ? 'PASS ✅' : 'FAIL ❌'}`);

  // TEST B: REJECT WORKFLOW
  const testUserB = `sup_test_b_${Date.now()}`;
  const reqIdB = `REQ-${Date.now()}-REJECT`;

  console.log(`\n[TEST B] Sending Login Access Request for '${testUserB}' (Request ID: ${reqIdB})...`);

  const resB = await fetch(`${supabaseUrl}/functions/v1/send-login-request`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${anonKey}`,
      'apikey': anonKey
    },
    body: JSON.stringify({
      username: testUserB,
      platform: 'ANDROID',
      requestId: reqIdB
    })
  });

  const dataB = await resB.json();
  console.log('[TEST B] send-login-request response:', dataB);

  // Simulate Telegram Admin clicking [ ❌ REJECT ] button
  console.log(`[TEST B] Simulating Telegram Server sending callback query for [ ❌ REJECT ] (${reqIdB})...`);
  const webhookResB = await fetch(`${supabaseUrl}/functions/v1/telegram-webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      update_id: Date.now(),
      callback_query: {
        id: `cb_${Date.now()}`,
        from: { id: 1092499824, first_name: 'Gani Admin', username: 'gani_admin' },
        message: { message_id: dataB.telegramMessageId, chat: { id: 1092499824 } },
        data: `reject:${reqIdB}`
      }
    })
  });

  const webhookDataB = await webhookResB.json();
  console.log('[TEST B] telegram-webhook reject response:', webhookDataB);

  // Verify DB state for Test B
  const { data: dbReqB } = await supabaseAnon.from('login_requests').select('*').eq('request_id', reqIdB).single();
  console.log('[TEST B] login_requests status in DB:', dbReqB?.status);
  console.log('[TEST B] Rejected by:', dbReqB?.rejected_by);

  const rejectPass = dbReqB?.status === 'REJECTED';
  console.log(`[TEST B] REJECT WORKFLOW RESULT: ${rejectPass ? 'PASS ✅' : 'FAIL ❌'}`);

  console.log('\n--- FINAL END-TO-END VERIFICATION RESULT ---');
  console.log(`OVERALL STATUS: ${approvePass && rejectPass ? 'ALL TESTS PASSED ✅' : 'TESTS FAILED ❌'}`);
}

runEndToEndTests().catch(err => console.error('E2E Test Error:', err));
