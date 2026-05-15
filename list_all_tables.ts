
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qwdqglglyxvamdkhrafl.supabase.co';
const supabaseKey = 'sb_publishable_KFjOuZO-EROsbG0zbD0AOg_MfI6CgKC';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  // We can't list tables directly with JS SDK without RPC or special permissions usually
  // but we can try to guess or use the information we have.
  // Actually, I can try to fetch from information_schema if I have a service role key,
  // but I only have the anon key.
  
  // Let's try to query 'lienspdfs' (no 2) again but more carefully.
  const { data, error } = await supabase.from('lienspdfs').select('*').limit(1);
  if (error) {
    console.log('lienspdfs error:', error.message);
  } else {
    console.log('lienspdfs exists!');
  }
}

test();
