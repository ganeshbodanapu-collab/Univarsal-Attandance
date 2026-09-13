import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://gkphikhsgysoqjradbaz.supabase.co";
const supabaseKey = "sb_publishable_AF9xkYaNTvl0kBf60-FtGQ_vu2HYBfQ";

const supabase = createClient(supabaseUrl, supabaseKey);

async function testLogins() {
  const users = [
    { email: 'admin@universalattendance.com', pass: 'ProdAdmin#2026!SecuredVal', username: 'admin' },
    { email: 'site_s001@universalattendance.com', pass: 'SiteS001#Pass2026!', username: 'site_s001' },
    { email: 'site_s002@universalattendance.com', pass: 'SiteS002#Pass2026!', username: 'site_s002' },
    { email: 'site_s003@universalattendance.com', pass: 'SiteS003#Pass2026!', username: 'site_s003' },
  ];

  for (const u of users) {
    console.log(`\nTesting login for ${u.username} (${u.email}):`);
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: u.email,
      password: u.pass,
    });

    if (authError) {
      console.error('Auth Error:', authError.message);
      continue;
    }
    console.log('Auth Success! Auth User ID:', authData.user.id);

    // Fetch app_users record using authenticated client
    const { data: profile, error: profileError } = await supabase
      .from('app_users')
      .select('*')
      .eq('auth_user_id', authData.user.id)
      .single();

    if (profileError) {
      console.error('Profile Error:', profileError.message);
    } else {
      console.log('AppUser Profile:', profile);
    }
    await supabase.auth.signOut();
  }
}

testLogins();
