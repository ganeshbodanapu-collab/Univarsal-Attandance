import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import * as fs from 'fs';

function loadEnv() {
  const envFiles = ['.env', '.env.local'];
  for (const envFile of envFiles) {
    const envPath = path.join(process.cwd(), envFile);
    if (fs.existsSync(envPath)) {
      const lines = fs.readFileSync(envPath, 'utf8').split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const [key, ...vals] = trimmed.split('=');
          process.env[key.trim()] = vals.join('=').trim().replace(/^["']|["']$/g, '');
        }
      }
    }
  }
}

loadEnv();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://gkphikhsgysoqjradbaz.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function seed() {
  console.log('Invoking admin-manage-user-password seedDefaultUsers...');
  const { data, error } = await supabase.functions.invoke('admin-manage-user-password', {
    body: { action: 'seedDefaultUsers' },
  });

  console.log('Seed response:', data, error);
}

seed();
