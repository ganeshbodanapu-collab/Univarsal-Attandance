import https from 'https';

const url = "https://gkphikhsgysoqjradbaz.supabase.co/functions/v1/send-login-request";
const anonKey = "sb_publishable_AF9xkYaNTvl0kBf60-FtGQ_vu2HYBfQ";

const payload = JSON.stringify({
  username: "test_user_001",
  platform: "ANDROID",
  requestId: `REQ-${Date.now()}-TEST`
});

const req = https.request(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${anonKey}`,
    'apikey': anonKey,
    'Content-Length': Buffer.byteLength(payload)
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Response Status:', res.statusCode);
    console.log('Response Data:', data);
  });
});

req.on('error', err => console.error('Error:', err.message));
req.write(payload);
req.end();
