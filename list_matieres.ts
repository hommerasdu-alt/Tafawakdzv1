
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qwdqglglyxvamdkhrafl.supabase.co';
const supabaseKey = 'sb_publishable_KFjOuZO-EROsbG0zbD0AOg_MfI6CgKC';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase.from('lienspdfs2').select('matiere');
  if (error) {
    console.error(error);
    return;
  }
  const uniqueMatieres = [...new Set(data.map(d => d.matiere))];
  console.log('Unique matieres:', uniqueMatieres);
}

test();
