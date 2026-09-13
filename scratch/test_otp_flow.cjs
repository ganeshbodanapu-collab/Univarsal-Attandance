const fs = require('fs');
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
const anonKey = env.VITE_SUPABASE_ANON_KEY;

const client = createClient(url, anonKey);

async function testOtp() {
  console.log('Testing verify-approval-token response for site_s001...');
  
  // We can test calling verify-approval-token with a fake request to see response format
  const { data, error } = await client.functions.invoke('verify-approval-token', {
    body: { requestId: 'invalid', token: 'invalid' }
  });

  console.log('Data:', data);
  console.log('Error:', error);
}

testOtp();
