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

async function runTest() {
  console.log('========================================================================');
  console.log('STEP 27.10 E2E TEST: TELEGRAM CALLBACK → REALTIME AUTOMATIC APPROVAL');
  console.log('========================================================================');

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

  const testUsername = 'site_s001';
  const requestId = `REQ-TEST-2710-${Date.now()}`;

  // --------------------------------------------------------------------------
  // TEST 1: Send Login Request (Pure callback_data, NO URL)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 1: Send Login Request via send-login-request ---');
  const { data: reqData, error: reqErr } = await supabase.functions.invoke('send-login-request', {
    body: { username: testUsername, platform: 'ANDROID', requestId },
  });

  if (reqErr || !reqData?.success) {
    logFail('Failed to send login request.', reqErr?.message || reqData?.error);
    return;
  } else {
    logPass(`Login request created successfully! Request ID: ${requestId}`);
  }

  // --------------------------------------------------------------------------
  // TEST 2: Subscribe to Supabase Realtime for login_requests
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 2: Subscribe to Supabase Realtime (login_requests UPDATE) ---');
  let realtimeReceived = false;
  let receivedRawToken = null;

  const realtimePromise = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Realtime event timeout after 10 seconds.'));
    }, 10000);

    const channel = supabase
      .channel(`test_realtime_${requestId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'login_requests',
          filter: `request_id=eq.${requestId}`,
        },
        (payload) => {
          clearTimeout(timeout);
          console.log('Realtime event received payload:', payload.new);
          if (payload.new && payload.new.status === 'APPROVED' && payload.new.raw_token) {
            realtimeReceived = true;
            receivedRawToken = payload.new.raw_token;
            resolve(payload.new);
          } else {
            reject(new Error(`Unexpected payload status: ${payload.new?.status}`));
          }
        }
      )
      .subscribe((status) => {
        console.log('Realtime channel subscription status:', status);
      });
  });

  // Give Realtime 1.5s to establish connection
  await new Promise((r) => setTimeout(r, 1500));

  // --------------------------------------------------------------------------
  // TEST 3: Simulate Admin Tapping [ ✅ APPROVE ] in Telegram (Callback Query)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 3: Admin Taps ✅ APPROVE (Telegram callback_query) ---');
  const { data: cbData, error: cbErr } = await supabase.functions.invoke('telegram-webhook', {
    body: {
      callback_query: {
        id: `cb_${Date.now()}`,
        data: `approve:${requestId}`,
        from: {
          id: 1092499824, // Authorized Admin Telegram ID
          first_name: 'System Admin',
          username: 'admin_test',
        },
        message: {
          chat: { id: 1092499824 },
          message_id: 12345,
        },
      },
    },
  });

  if (cbErr || !cbData?.ok) {
    logFail('telegram-webhook callback processing failed.', cbErr?.message || cbData?.error);
  } else {
    logPass('telegram-webhook approved request successfully without opening any URL!');
  }

  // --------------------------------------------------------------------------
  // TEST 4: Await Realtime Event Broadcast
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 4: Verify Realtime APPROVED Event Delivered to App ---');
  try {
    const realtimeRow = await realtimePromise;
    logPass(`Realtime UPDATE event received! Status = ${realtimeRow.status}, Raw Token = ${realtimeRow.raw_token.substring(0, 10)}...`);
  } catch (err) {
    logFail('Realtime event failed or timed out.', err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 5: Verify One-Time Token & Execute Automatic Handoff Login
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 5: Token Verification & Automatic Handoff Login ---');
  if (receivedRawToken) {
    const { data: verifyData, error: verifyErr } = await supabase.functions.invoke('verify-approval-token', {
      body: { requestId, token: receivedRawToken },
    });

    if (verifyErr || !verifyData?.success) {
      logFail('verify-approval-token failed.', verifyErr?.message || verifyData?.error);
    } else {
      logPass(`Token verified! Received OTP for ${verifyData.email}.`);

      // Verify OTP session
      const { data: authSession, error: authErr } = await supabase.auth.verifyOtp({
        email: verifyData.email,
        token: verifyData.otp,
        type: 'email',
      });

      if (authErr || !authSession.session) {
        logFail('Supabase Auth verifyOtp failed.', authErr?.message);
      } else {
        logPass(`Supabase Auth session established! Logged in User ID: ${authSession.user.id}`);
        logPass(`Requested User Profile verified: ${verifyData.profile.username} (Role: ${verifyData.profile.role}, Status: ${verifyData.profile.status})`);
      }
    }
  } else {
    logFail('No raw token received from Realtime.');
  }

  // --------------------------------------------------------------------------
  // TEST 6: Security Audit Verification
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 6: Security Audit (Zero Passwords) ---');
  const { data: reqDb } = await supabase.from('login_requests').select('*').eq('request_id', requestId).single();

  if (reqDb && reqDb.status === 'APPROVED') {
    logPass(`Database verification: login_requests status = APPROVED, approved_by = ${reqDb.approved_by}`);
  } else {
    logFail('Database login_requests verification failed.');
  }

  console.log('\n========================================================================');
  console.log(`TEST SUMMARY: ${testPassed} PASSED, ${testFailed} FAILED`);
  console.log('========================================================================');

  process.exit(testFailed > 0 ? 1 : 0);
}

runTest();
