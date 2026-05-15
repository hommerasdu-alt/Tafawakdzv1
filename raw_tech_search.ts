
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qwdqglglyxvamdkhrafl.supabase.co';
const supabaseKey = 'sb_publishable_KFjOuZO-EROsbG0zbD0AOg_MfI6CgKC';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase
    .from('lienspdfs2')
    .select('*')
    .or('matiere.ilike.%tech%,chemin_complet.ilike.%tech%,nom_pdf.ilike.%tech%');
  
  if (error) return console.error(error);
  console.log('Result count for tech:', data.length);
  if (data.length > 0) {
    console.log('Unique matieres:', [...new Set(data.map(d => d.matiere))]);
  }
}

test();
