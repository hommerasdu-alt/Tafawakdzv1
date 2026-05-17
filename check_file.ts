import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const DEFAULT_URL = 'https://ecjleikavlsiqyazbbvt.supabase.co';
const DEFAULT_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseUrl = process.env.SUPABASE_URL || DEFAULT_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || DEFAULT_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function searchFile(fileName: string) {
  console.log(`Searching for: ${fileName}`);
  const tables = ['lienspdfs', 'lienspdfs1', 'lienspdfs2'];
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*');
      
      if (error) continue;

      const matches = data.filter((row: any) => 
        JSON.stringify(row).toLowerCase().includes(fileName.toLowerCase())
      );

      if (matches.length > 0) {
        console.log(`✅ Found ${matches.length} matches in table "${table}":`);
        console.log(JSON.stringify(matches, null, 2));
      }
    } catch (e) {
      // Ignore
    }
  }
}
async function checkLinks() {
  const { data } = await supabase.from('lienspdfs1').select('*').limit(10);
  console.log('Sample links from lienspdfs1:', data?.map(r => ({ name: r.nom_pdf, link: r.lien_direct })));
}
checkLinks();
