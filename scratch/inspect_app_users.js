import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://gkphikhsgysoqjradbaz.supabase.co";
const supabaseKey = "sb_publishable_AF9xkYaNTvl0kBf60-FtGQ_vu2HYBfQ";

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
  const { data, error } = await supabase.from('app_users').select('*');
  console.log('app_users error:', error);
  console.log('app_users data:', data);
}

inspect();
