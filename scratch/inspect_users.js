const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

let env = {};
if (fs.existsSync('.env')) {
  const lines = fs.readFileSync('.env', 'utf8').split('\n');
  for (const line of lines) {
    const parts = line.split('=');
    if (parts.length >= 2) {
      env[parts[0].trim()] = parts.slice(1).join('=').trim();
    }
  }
}

const url = env.VITE_SUPABASE_URL || 'https://gkphikhsgysoqjradbaz.supabase.co';
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY;

console.log('URL:', url);
console.log('Has Service Key:', !!serviceKey);

const supabase = createClient(url, serviceKey || anonKey);

async function run() {
  const { data: appUsers, error } = await supabase.from('app_users').select('*');
  console.log('App Users count:', appUsers ? appUsers.length : 0);
  console.log('App Users:', appUsers);
  
  if (serviceKey) {
    const { data: authUsers, error: authErr } = await supabase.auth.admin.listUsers();
    console.log('Auth Users count:', authUsers?.users?.length);
    console.log('Auth Users:', authUsers?.users?.map(u => ({ id: u.id, email: u.email })));
  }
}
run();
