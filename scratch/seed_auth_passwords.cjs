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
const anonKey = env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(url, anonKey);

async function seed() {
  console.log('--- SEEDING/RESETTING TEST AUTH PASSWORDS IN SUPABASE AUTH ---');

  const { data, error } = await supabase.functions.invoke('admin-manage-user-password', {
    body: { action: 'seedDefaultUsers' },
  });

  if (error || !data?.success) {
    console.error('Failed to seed default users:', error || data);
  } else {
    console.log('✅ Default auth users seeded/verified successfully:', JSON.stringify(data, null, 2));
  }
}

seed();
