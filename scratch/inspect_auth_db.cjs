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
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(url, serviceKey || anonKey);

async function inspect() {
  console.log('--- APP USERS ---');
  const { data: appUsers, error: appErr } = await supabase.from('app_users').select('*');
  if (appErr) console.error('Error fetching app_users:', appErr);
  else console.log(appUsers);

  if (serviceKey) {
    console.log('--- AUTH USERS ---');
    const { data: authUsers, error: authErr } = await supabase.auth.admin.listUsers();
    if (authErr) console.error('Error fetching auth users:', authErr);
    else console.log(authUsers.users.map(u => ({ id: u.id, email: u.email, created_at: u.created_at })));
  }
}

inspect();
