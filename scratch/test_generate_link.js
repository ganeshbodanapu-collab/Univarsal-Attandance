import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://gkphikhsgysoqjradbaz.supabase.co";
const anonKey = "sb_publishable_AF9xkYaNTvl0kBf60-FtGQ_vu2HYBfQ";

const supabase = createClient(supabaseUrl, anonKey);

async function testLinkGeneration() {
  console.log('Testing Supabase Auth link generation...');
  // We can test fetching app_users profile for site_s001
  const { data: profile } = await supabase.from('app_users').select('*').eq('username', 'site_s001').single();
  console.log('Profile:', profile);
}

testLinkGeneration();
