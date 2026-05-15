
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qwdqglglyxvamdkhrafl.supabase.co';
const supabaseKey = 'sb_publishable_KFjOuZO-EROsbG0zbD0AOg_MfI6CgKC';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase.from('lienspdfs2').select('*');
  if (error) return console.error(error);
  
  const techKeywords = ['tech', 'تكنو', 'genie', 't.c', 'tc'];
  const matches = data.filter(r => {
    const s = JSON.stringify(r).toLowerCase();
    return techKeywords.some(kw => s.includes(kw));
  });
  
  console.log('Total matches for tech keywords:', matches.length);
  if (matches.length > 0) {
    console.log('Unique matieres:', [...new Set(matches.map(m => m.matiere))]);
    console.log('Example matches:', matches.slice(0, 5).map(m => m.chemin_complet));
  }
}

test();
