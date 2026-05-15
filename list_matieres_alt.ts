
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qwdqglglyxvamdkhrafl.supabase.co';
const supabaseKey = 'sb_publishable_KFjOuZO-EROsbG0zbD0AOg_MfI6CgKC';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const table = 'liens_pdfs';
  const { data, error, count } = await supabase.from(table).select('matiere', { count: 'exact' });
  if (error) {
    console.error('Table', table, 'error:', error.message);
  } else {
    console.log('Table', table, 'count:', count);
    const uniqueMatieres = [...new Set((data || []).map(d => d.matiere))];
    console.log('Unique matieres in', table, ':', uniqueMatieres);
  }
}

test();
