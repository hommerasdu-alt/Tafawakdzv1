
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qwdqglglyxvamdkhrafl.supabase.co';
const supabaseKey = 'sb_publishable_KFjOuZO-EROsbG0zbD0AOg_MfI6CgKC';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase.from('lienspdfs2').select('*').eq('matiere', 'sciences-naturelles').limit(10);
  if (error) return console.error(error);
  console.log('Sample Sciences Naturelles:', JSON.stringify(data, null, 2));
}

test();
