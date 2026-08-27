import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const envPath = 'D:\\Christian Lyrics\\.env.local';
const envContent = readFileSync(envPath, 'utf-8');

const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);

const supabaseUrl = urlMatch[1].trim();
const supabaseAnonKey = keyMatch[1].trim();

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  const { data, error } = await supabase
    .from('categories')
    .insert([{ slug: 'test-cat', name: 'Test Cat', display_order: 999 }])
    .select()
    .single();

  console.log('[WF DEBUG] CATEGORIES INSERT DATA:', data);
  console.log('[WF DEBUG] CATEGORIES INSERT ERROR:', error);
}

main().catch((e) => {
  console.error('[WF DEBUG] FATAL:', e);
  process.exit(1);
});
