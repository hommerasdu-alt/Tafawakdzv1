
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qwdqglglyxvamdkhrafl.supabase.co';
const supabaseKey = 'sb_publishable_KFjOuZO-EROsbG0zbD0AOg_MfI6CgKC';
const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchAllData() {
  let allData: any[] = [];
  let from = 0;
  const step = 1000;
  let done = false;

  console.log('Fetching all records from lienspdfs2...');

  while (!done) {
    const { data, error } = await supabase
      .from('lienspdfs2')
      .select('*')
      .range(from, from + step - 1);

    if (error) {
      console.error('Error fetching data:', error);
      break;
    }

    if (data && data.length > 0) {
      allData = allData.concat(data);
      from += step;
      console.log(`Fetched ${allData.length} records...`);
    } else {
      done = true;
    }
    
    // Safety break
    if (allData.length > 50000) break;
  }

  return allData;
}

async function exportStats() {
  const data = await fetchAllData();
    
  if (data.length === 0) {
    console.log('No data found.');
    return;
  }

  const stats: any = {};

  data.forEach((row: any) => {
    const cycle = row.cycle || 'Inconnu';
    const niveau = row.annee || row.code_niveau || 'Inconnu';
    const matiere = row.matiere || 'Inconnu';
    
    // Trimestre detection
    const trimesterVal = row.Trimesttre || row.trimestre || '';
    const path = row.chemin_complet || '';
    const fileName = row.nom_pdf || '';
    const text = `${trimesterVal} ${path} ${fileName} ${matiere}`.toLowerCase();
    
    let tri = 'Général';
    if (text.includes('trimestre 3') || text.includes('trimestre-3') || path.includes('/t3/') || path.includes('/f3/') || text.includes('ثالث') || /\b(t3|f3|3eme|3ème)\b/.test(text)) {
      tri = 'الفصل 3';
    } else if (text.includes('trimestre 2') || text.includes('trimestre-2') || path.includes('/t2/') || path.includes('/f2/') || text.includes('ثاني') || /\b(t2|f2|2eme|2ème)\b/.test(text)) {
      tri = 'الفصل 2';
    } else if (text.includes('trimestre 1') || text.includes('trimestre-1') || path.includes('/t1/') || path.includes('/f1/') || text.includes('أول') || text.includes('اول') || /\b(t1|f1|1er)\b/.test(text)) {
      tri = 'الفصل 1';
    }

    const key = `${cycle},${niveau},${matiere},${tri}`;
    stats[key] = (stats[key] || 0) + 1;
  });

  console.log('\n--- CSV OUTPUT ---');
  console.log('Cycle,Niveau,Matiere,Trimestre,Nombre de fichiers');
  Object.entries(stats).sort().forEach(([key, count]) => {
    console.log(`${key},${count}`);
  });
  
  console.log('\n--- RÉSUMÉ PAR CYCLE ---');
  const cycleSummary: any = {};
  Object.entries(stats).forEach(([key, count]: [string, any]) => {
    const cycle = key.split(',')[0];
    cycleSummary[cycle] = (cycleSummary[cycle] || 0) + count;
  });
  Object.entries(cycleSummary).forEach(([c, n]) => console.log(`${c}: ${n} ملف`));
}

exportStats();
