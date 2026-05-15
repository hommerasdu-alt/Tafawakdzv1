
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qwdqglglyxvamdkhrafl.supabase.co';
const supabaseKey = 'sb_publishable_KFjOuZO-EROsbG0zbD0AOg_MfI6CgKC';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase.from('lienspdfs2').select('chemin_complet').limit(1000);
  if (error) return console.error(error);
  
  const paths = data.map(d => d.chemin_complet);
  const techPaths = paths.filter(p => (p || '').toLowerCase().includes('tech'));
  console.log('Unique Tech Paths:', [...new Set(techPaths)]);
}

test();
