import 'dotenv/config';
import express from 'express';
import sql from 'mssql';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { parse } from 'csv-parse/sync';
import { createClient } from '@supabase/supabase-js';

// we'll load this dynamically only when needed (dev mode)
// import { createServer as createViteServer } from 'vite';

// Prevent crash on unhandled errors
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase Configuration
// Default credentials (updated with user provided project)
const DEFAULT_URL = 'https://ecjleikavlsiqyazbbvt.supabase.co';
const DEFAULT_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'votre_cle_secrete_ici'; 

// Environment variables priority
const nextUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const nextKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const baseUrl = process.env.SUPABASE_URL;
const baseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🚀 App starting initialization...');
const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json());

// Logging middleware FIRST
app.use((req, res, next) => {
  if (req.url.startsWith('/api')) {
    console.log(`🚀 [API Request] ${req.method} ${req.url}`);
  }
  next();
});

// Selection logic with pair awareness
let supabaseUrl = DEFAULT_URL;
let supabaseKey = DEFAULT_KEY;

// Validation helper for keys
const isValidKey = (key: string | undefined): boolean => {
  if (!key) return false;
  if (key.startsWith('http')) return false; // Definitely a URL, not a key
  if (key.length < 20) return false; // Too short for a Supabase key
  return true;
};

// Selection logic: prioritize the project the user explicitly configured
// If the environment variables match the old project, we ignore them in favor of the new default.
const isOldProject = nextUrl?.includes('qwdqglglyxvamdkhrafl') || baseUrl?.includes('qwdqglglyxvamdkhrafl');

if (nextUrl && isValidKey(nextKey) && !isOldProject) {
  console.log('🔑 Using custom NEXT_PUBLIC Supabase project from environment.');
  supabaseUrl = nextUrl;
  supabaseKey = nextKey!;
} else if (baseUrl && isValidKey(baseKey) && !isOldProject) {
  console.log('🔑 Using custom SUPABASE project from environment.');
  supabaseUrl = baseUrl;
  supabaseKey = baseKey!;
} else {
  console.log('ℹ️ Using default configured project (user provided).');
  supabaseUrl = DEFAULT_URL;
  supabaseKey = DEFAULT_KEY;
}

// Always prefer Service Role Key if valid and provided (overrides ANON)
// BUT only if we are using a custom project or if the service key is specifically intended for this project
if (isValidKey(serviceKey) && (supabaseUrl !== DEFAULT_URL || !isOldProject)) {
  console.log('🔐 Upgrade: Using SERVICE_ROLE_KEY for full operations.');
  supabaseKey = serviceKey!;
}

console.log(`📡 Supabase URL: ${supabaseUrl}`);
let supabase: any;
try {
  supabase = createClient(supabaseUrl, supabaseKey);
  console.log('✅ Supabase client initialized.');
} catch (e: any) {
  console.error('❌ Error initializing Supabase client:', e.message);
}

// Helper to determine the correct table names dynamically
const cachedTables: string[] = [];
async function getActiveTables(force = false) {
  if (cachedTables.length > 0 && !force) return cachedTables;
  
  const defaultTable = 'lienspdfs';
  if (!supabase) {
    console.warn('⚠️ Supabase client not initialized, using default table name');
    return [defaultTable];
  }

  const tablesToTry = ['lienspdfs', 'lienspdfs1', 'lienspdfs2', 'liens_pdfs', 'lienspdf'];
  const working: string[] = [];
  console.log(`🔍 Supabase: Detecting active tables...${force ? ' (FORCED)' : ''}`);

  for (const table of tablesToTry) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      
      if (!error) {
        console.log(`✅ Supabase: Table active détectée : "${table}"`);
        working.push(table);
      } else {
        console.log(`ℹ️ Supabase: Essai table "${table}" échoué : ${error.message}`);
        if (error.message && (error.message.includes('Invalid API key') || error.message.includes('JWT'))) {
          console.error('❌ FATAL: Supabase API key error.');
          break; 
        }
      }
    } catch (e: any) {
      console.log(`❌ Supabase: Erreur critique sur table "${table}": ${e.message}`);
    }
  }

  if (working.length === 0) {
    console.warn(`⚠️ Supabase: No matching table found. Defaulting to ["${defaultTable}"]`);
    return [defaultTable];
  }

  cachedTables.length = 0;
  cachedTables.push(...working);
  return working; 
}

const SUBJECT_MAPPING: Record<string, string[]> = {
  'arabic': ['arabe', 'ar', 'اللغة العربية', 'عربية', 'arabic', 'اللغه العربيه', 'لغة عربية', 'لغة العربية'],
  'french': ['fr', 'french', 'اللغة الفرنسية', 'فرنسية', 'francais', 'français', 'اللغه الفرنسيه'],
  'english': ['eng', 'en', 'english', 'اللغة الإنجليزية', 'انجليزية', 'anglais', 'اللغه الانجليزيه', 'اللغة الانجليزية'],
  'islamic': ['islam', 'islamic', 'التربية الإسلامية', 'العلوم الإسلامية', 'اسلامية', 'education islamique', 'تربية اسلامية', 'التربيه الاسلاميه'],
  'history_geo': ['hist', 'histoire', 'history', 'جغرافيا', 'تاريخ', 'histoire geographie', 'hg', 'التاريخ والجغرافيا', 'تاريخ وجغرافيا'],
  'civic': ['civic', 'التربية المدنية', 'مدنية', 'education civique', 'التربيه المدنيه', 'تربية مدنية'],
  'science': ['science', 'sci', 'علوم', 'العلوم الطبيعية', 'snv', 'sciences', 'علوم الطبيعة والحياة', 'علوم الطبيعة و الحياة'],
  'primary_science': ['science', 'sci', 'التربية العلمية', 'علمية', 'sciences', 'التربية العلمية والتكنولوجية', 'تربية علمية'],
  'physics': ['physique', 'ph', 'فيزياء', 'الفيزياء', 'physique chimie', 'علوم فيزيائية', 'العلوم الفيزيائية'],
  'informatics': ['info', 'informatique', 'إعلام آلي', 'اعلام', 'informatique'],
  'amazigh': ['tamazigh', 'amazigh', 'الأمازيغية', 'امازيغية'],
  'art': ['dessin', 'art', 'فنية', 'رسم', 'arts'],
  'music': ['musique', 'music', 'موسيقية', 'موسيقى'],
  'math': ['math', 'maths', 'الرياضيات', 'رياضيات', 'mathematiques'],
  'philosophy': ['phil', 'philosophie', 'philosophy', 'فلسفة', 'philo'],
  'accounting': ['compta', 'comptabilité', 'accounting', 'محاسبة', 'gestion'],
  'law': ['droit', 'law', 'قانون'],
  'economy': ['eco', 'economie', 'economy', 'إقتصاد', 'اقتصاد'],
  'technology': ['tech', 'technologie', 'technology', 'تكنولوجيا', 'techno', 'technologie-st'],
  'documents': ['docs', 'document', 'documents', 'مستندات', 'مستندات تعليمية']
};

function getCanonicalMatiere(rawMatiere: string): string {
  const matiere = rawMatiere.toLowerCase().trim();
  for (const [key, aliases] of Object.entries(SUBJECT_MAPPING)) {
    if (key === matiere || aliases.map(a => a.toLowerCase()).includes(matiere)) return key;
  }
  return matiere;
}

function getCanonicalYear(rawYear: string, rawCycle?: string): string {
  if (!rawYear) return 'unknown';
  const c = rawYear.toString().toLowerCase().trim();
  const cy = (rawCycle || '').toLowerCase().trim();
  
  if (c.startsWith('61') || c.includes('1ثا') || c.includes('1as') || (cy.includes('secondaire') && (c === '1' || c === '1as'))) return '1as';
  if (c.startsWith('62') || c.includes('2ثا') || c.includes('2as') || (cy.includes('secondaire') && (c === '2' || c === '2as'))) return '2as';
  if (c.startsWith('63') || c.includes('3ثا') || c.includes('3as') || (cy.includes('secondaire') && (c === '3' || c === '3as'))) return '3as';
  
  if (c.startsWith('41') || c.includes('1مت') || c.includes('1am') || (cy.includes('moyen') && (c === '1' || c === '1am'))) return '1am';
  if (c.startsWith('42') || c.includes('2مت') || c.includes('2am') || (cy.includes('moyen') && (c === '2' || c === '2am'))) return '2am';
  if (c.startsWith('43') || c.includes('3مت') || c.includes('3am') || (cy.includes('moyen') && (c === '3' || c === '3am'))) return '3am';
  if (c.startsWith('44') || c.includes('4مت') || c.includes('4am') || (cy.includes('moyen') && (c === '4' || c === '4am'))) return '4am';

  if (c.startsWith('21') || c.includes('1اب') || c.includes('1ap') || (cy.includes('primaire') && (c === '1' || c === '1ap'))) return '1ap';
  if (c.startsWith('22') || c.includes('2اب') || c.includes('2ap') || (cy.includes('primaire') && (c === '2' || c === '2ap'))) return '2ap';
  if (c.startsWith('23') || c.includes('3اب') || c.includes('3ap') || (cy.includes('primaire') && (c === '3' || c === '3ap'))) return '3ap';
  if (c.startsWith('24') || c.includes('4اب') || c.includes('4ap') || (cy.includes('primaire') && (c === '4' || c === '4ap'))) return '4ap';
  if (c.startsWith('25') || c.includes('5اب') || c.includes('5ap') || (cy.includes('primaire') && (c === '5' || c === '5ap'))) return '5ap';
  
  if (c.includes('1as')) return '1as';
  if (c.includes('2as')) return '2as';
  if (c.includes('3as')) return '3as';
  if (c.includes('1am')) return '1am';
  if (c.includes('2am')) return '2am';
  if (c.includes('3am')) return '3am';
  if (c.includes('4am')) return '4am';
  if (c.includes('1ap')) return '1ap';
  if (c.includes('2ap')) return '2ap';
  if (c.includes('3ap')) return '3ap';
  if (c.includes('4ap')) return '4ap';
  if (c.includes('5ap')) return '5ap';
  
  return c;
}

// Helper to extract trimester label from row data
function extractTrimestreLabel(row: any) {
  const val = row.Trimesttre || row.trimestre || '';
  const path = row.chemin_complet || '';
  const fileName = row.nom_pdf || '';
  const text = `${val} ${path} ${fileName} ${row.matiere || ''}`.toLowerCase();
  
  if (text.includes('docs') || text.includes('document') || text.includes('مستندات') || text.includes('وثائق') || text.includes('ملخص') || text.includes('ملخصات')) {
    return 'document';
  }

  if (text.includes('3eme trimestre') || text.includes('3ème trimestre') || text.includes('trimestre 3') || text.includes('trimestre-3') || path.includes('/t3/') || path.includes('/f3/') || path.includes('/trimestre-3/') || text.includes('ثالث') || text.includes('الفصل 3') || text.includes('الفصل الثالث') || /\b(t3|f3|3eme|3ème)\b/.test(text)) {
    return 'trimestre-3';
  }

  if (text.includes('2eme trimestre') || text.includes('2ème trimestre') || text.includes('trimestre 2') || text.includes('trimestre-2') || path.includes('/t2/') || path.includes('/f2/') || path.includes('/trimestre-2/') || text.includes('ثاني') || text.includes('الفصل 2') || text.includes('الفصل الثاني') || /\b(t2|f2|2eme|2ème)\b/.test(text)) {
      return 'trimestre-2';
  }

  if (text.includes('1er trimestre') || text.includes('trimestre 1') || text.includes('trimestre-1') || path.includes('/t1/') || path.includes('/f1/') || path.includes('/trimestre-1/') || text.includes('أول') || text.includes('اول') || text.includes('الفصل 1') || text.includes('الفصل الأول') || /\b(t1|f1|1er)\b/.test(text)) {
    return 'trimestre-1';
  }
  
  return 'Général';
}

// This chunk was redundant and is removed

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(), 
      supabase: !!supabase,
      supabaseUrl: supabaseUrl,
      hasKey: !!supabaseKey && supabaseKey !== 'votre_cle_secrete_ici',
      env: process.env.NODE_ENV,
      vercel: !!process.env.VERCEL
    });
  });

  // Force sync / re-detect table
  app.get('/api/sync', async (req, res) => {
    try {
      console.log('🔄 Forced synchronization requested...');
      const tableNames = await getActiveTables(true);
      const tableName = tableNames[0] || 'lienspdfs';
      res.json({ 
        status: 'success', 
        message: 'Synchronisation réussie', 
        table: tableName,
        timestamp: new Date().toISOString()
      });
    } catch (e: any) {
      res.status(500).json({ status: 'error', message: e.message });
    }
  });

  // Bulk import CSV into Supabase
  app.post('/api/import-csv', async (req, res) => {
    if (!supabase) return res.status(500).json({ error: 'Supabase client not initialized' });
    
    try {
      console.log('📤 Starting bulk CSV import to Supabase...');
      const tableNames = await getActiveTables();
      const tableName = tableNames[0] || 'lienspdfs';
      
      if (csvData.length === 0) {
        return res.status(400).json({ error: 'Aucune donnée CSV à importer' });
      }

      // Process and map CSV data to Supabase schema
      const mappedData = csvData.map(row => {
          const path = row['Chemin complet'] || row.chemin_complet || '';
          return {
            cycle: row.Cycle || row.cycle || '',
            annee: row.Année || row.annee || '',
            matiere: row.Matière || row.matiere || '',
            Trimesttre: extractTrimestreLabel(row),
            nom_pdf: row['Nom du fichier PDF'] || row.nom_pdf || row.reference_pdf || '',
            chemin_complet: path,
            lien_direct: row['Lien direct'] || row.lien_direct || row.lien_direct_drive || ''
          };
      });

      // Split into chunks of 100 to avoid request size limits
      const chunkSize = 100;
      let totalInserted = 0;
      let errors = [];

      for (let i = 0; i < mappedData.length; i += chunkSize) {
          const chunk = mappedData.slice(i, i + chunkSize);
          const { error } = await supabase.from(tableName).upsert(chunk, { onConflict: 'chemin_complet' });
          
          if (error) {
              console.error(`❌ Import error in chunk ${i}:`, error.message);
              errors.push(error.message);
          } else {
              totalInserted += chunk.length;
              console.log(`✅ Progress: ${totalInserted}/${mappedData.length} lines synced.`);
          }
      }

      res.json({ 
        status: 'success', 
        inserted: totalInserted, 
        total: mappedData.length,
        errors: errors.length > 0 ? errors : undefined,
        message: `Importation terminée: ${totalInserted} lignes synchronisées.`
      });
    } catch (e: any) {
      console.error('❌ Bulk import failed:', e.message);
      res.status(500).json({ error: e.message });
    }
  });

  // Export Supabase data to CSV
  app.get('/api/export-csv', async (req, res) => {
    if (!supabase) return res.status(500).json({ error: 'Supabase client not initialized' });
    
    try {
      console.log('📥 Exporting data from Supabase to CSV...');
      const tableNames = await getActiveTables();
      const tableName = tableNames[0] || 'lienspdfs';
      
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        return res.status(404).json({ error: 'Aucune donnée à exporter' });
      }

      // Convert JSON to CSV manually
      const headers = Object.keys(data[0]);
      const csvRows = [
        headers.join(','), // Header row
        ...data.map(row => 
          headers.map(fieldName => {
            const val = row[fieldName];
            // Escape quotes and wrap in quotes
            const stringVal = val === null || val === undefined ? '' : String(val);
            const escaped = stringVal.replace(/"/g, '""');
            return `"${escaped}"`;
          }).join(',')
        )
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=export_supabase_${tableName}_${new Date().toISOString().split('T')[0]}.csv`);
      res.send(csvRows);
    } catch (e: any) {
      console.error('❌ Export failed:', e.message);
      res.status(500).json({ error: e.message });
    }
  });

  // Endpoint pour vérifier n'importe quelle table
  app.get('/api/check-table', async (req, res) => {
    const tableName = req.query.table as string;
    if (!tableName) return res.status(400).json({ error: 'Nom de table requis' });
    if (!supabase) return res.status(500).json({ error: 'Supabase non configuré' });

    try {
      const { data, count, error } = await supabase.from(tableName).select('*', { count: 'exact' }).limit(5);
      
      if (error) {
        return res.json({ 
          exists: false, 
          error: error.message,
          hint: "Si la table existe sur Supabase, vérifiez que l'accès 'anon' a bien les permissions SELECT (RLS)."
        });
      }
      
      return res.json({
        exists: true,
        count: count,
        countFallback: data ? data.length : 0,
        columns: data && data.length > 0 ? Object.keys(data[0]) : [],
        sample: data && data.length > 0 ? data[0] : null,
        allSamples: data
      });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  // Test Supabase endpoint (consolidated debug)
  app.get('/api/test-supabase', async (req, res) => {
    if (!supabase) {
      return res.status(500).json({ 
        status: 'error', 
        message: 'Supabase client not initialized.'
      });
    }
    
    try {
      console.log('🧪 Testing Supabase connection...');
      const tableNames = await getActiveTables(true);
      const results = [];
      
      for (const tableName of tableNames) {
        const { count, error } = await supabase.from(tableName).select('*', { count: 'exact', head: true });
        results.push({
          table: tableName,
          count: count || 0,
          error: error ? error.message : null
        });
      }
      
      const mainError = results.find(r => r.error)?.error;
      
      if (tableNames.length === 0) {
        return res.status(500).json({ 
          status: 'error', 
          message: 'Aucune table active détectée.',
          results
        });
      }

      console.log(`✅ Supabase test success! Found ${tableNames.length} tables.`);
      return res.json({
        status: 'success',
        url: supabaseUrl,
        tables: results,
        message: 'Connexion aux sources Supabase établie !'
      });
    } catch (e: any) {
      console.error('❌ Supabase test critical failure:', e.message);
      return res.status(500).json({ status: 'error', message: e.message });
    }
  });

  // Stats endpoint for PDF counts
  app.get('/api/stats', async (req, res) => {
    try {
      let data: any[] = [];
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s for multitable stats

      if (supabase) {
        try {
          console.log('📊 Fetching stats from Supabase multiple tables...');
          const tableNames = await getActiveTables();
          
          for (const tableName of tableNames) {
            try {
              const { data: supaData, error } = await supabase
                .from(tableName)
                .select('*') 
                .limit(20000) 
                .abortSignal(controller.signal);
              
              if (error) {
                console.warn(`⚠️ Supabase stats error table ${tableName}:`, error.message);
              } else if (supaData) {
                data.push(...supaData);
                console.log(`✅ Table "${tableName}": Collected ${supaData.length} records.`);
              }
            } catch (e) {
              console.warn(`⚠️ Table ${tableName} fetch failed.`);
            }
          }
        } catch (supaErr: any) {
          console.warn('⚠️ Supabase stats fetch aborted or failed:', supaErr.message);
        } finally {
          clearTimeout(timeoutId);
        }
      }

      // If Supabase failed or returned nothing, try CSV
      if (data.length === 0 && csvData && csvData.length > 0) {
        console.log('📊 Using CSV for stats fallback...');
        data = csvData;
      }

      // Final fallback to mock stats to prevent UI errors/empty state if both fail
      if (data.length === 0) {
        console.log('📊 Using dummy mock stats (diverse fallback)...');
        return res.json([
          { cycle: 'primary', annee: '1ap', matiere: 'arabic', count: 156 },
          { cycle: 'primary', annee: '1ap', matiere: 'french', count: 89 },
          { cycle: 'middle', annee: '4am', matiere: 'math', count: 243 },
          { cycle: 'middle', annee: '4am', matiere: 'physics', count: 112 },
          { cycle: 'secondary', annee: '3as', matiere: 'physics', count: 189 },
          { cycle: 'secondary', annee: '3as', matiere: 'arabic', count: 205 },
          { cycle: 'secondary', annee: '3as', matiere: 'math', count: 310 }
        ]);
      }

      console.log(`📊 Processing ${data.length} rows for stats...`);
      
      const statsMap = data.reduce((acc: any, row: any) => {
        // Normalize casing to match site_data.json
        let cycle = (row.cycle || row.Cycle || 'unknown').toLowerCase();
        let rawAnnee = (row.annee || row.Année || row['Année'] || 'unknown');
        let annee = getCanonicalYear(rawAnnee, cycle);
        let rawMatiere = row.matiere || row.Matière || row.Matiere || 'unknown';
        let matiere = getCanonicalMatiere(rawMatiere);
        let rawFilliere = row.filliere || row.Filliere || row.filiere || '';
        
        // Normalize common arabic cycle names to technical IDs
        if (cycle.includes('ابتدائ') || cycle.includes('primary')) cycle = 'primary';
        if (cycle.includes('متوسط') || cycle.includes('middle') || cycle.includes('moyen')) cycle = 'middle';
        if (cycle.includes('ثانوي') || cycle.includes('secondary')) cycle = 'secondary';

        const trimestre = extractTrimestreLabel(row);
        
        const key = `${cycle}|${annee}|${matiere}|${trimestre}|${rawFilliere}`;
        if (!acc[key]) {
          acc[key] = { cycle, annee, matiere, trimestre, filiere: rawFilliere, count: 0 };
        }
        acc[key].count++;
        return acc;
      }, {});

      const result = Object.values(statsMap).sort((a: any, b: any) => {
        if (a.cycle !== b.cycle) return a.cycle.localeCompare(b.cycle);
        if (a.annee !== b.annee) return a.annee.localeCompare(b.annee);
        return a.matiere.localeCompare(b.matiere);
      });

      res.json(result);
    } catch (err: any) {
      console.error('❌ Stats error:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // SQL Server Configuration
  const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER || 'localhost',
    database: process.env.DB_NAME,
    options: {
      encrypt: process.env.DB_ENCRYPT === 'true',
      trustServerCertificate: true,
      connectTimeout: 30000 // 30 seconds timeout
    }
  };

  let pool: sql.ConnectionPool | null = null;

  async function getPool() {
    if (!pool) {
      const serverHost = process.env.DB_SERVER || 'localhost';
      
      if (serverHost === 'localhost' || serverHost === '127.0.0.1') {
        console.warn('⚠️ ATTENTION : DB_SERVER est "localhost". L\'application tourne dans le cloud et ne peut pas accéder à votre base de données locale directement.');
        console.info('💡 Pour tester localement, utilisez une IP publique ou un tunnel (ngrok).');
      }
      
      try {
        console.log(`📡 Tentative de connexion : ${serverHost} -> ${config.database}`);
        pool = await sql.connect(config);
        console.log('✅ Connexion SQL Server réussie !');
      } catch (err: any) {
        console.error('❌ Échec de connexion SQL :', err.message);
        
        if (err.message.includes('getaddrinfo')) {
          console.error(`👉 Erreur de résolution : L'hôte "${serverHost}" est introuvable. Vérifiez l'adresse dans vos variables d'environnement.`);
        } else if (err.message.includes('ETIMEDOUT')) {
          console.error(`👉 Timeout : Le serveur "${serverHost}" ne répond pas. Vérifiez le pare-feu (Port 1433).`);
        }
        
        pool = null; 
        return null;
      }
    }
    return pool;
  }

  // CSV Data loading
  const CSV_FILE_PATH = path.join(process.cwd(), 'Liens Pdfs de sitetafawakdz - Base de données Tafawak 98.csv');
  let csvData: any[] = [];

  function loadCsvData() {
    try {
      if (fs.existsSync(CSV_FILE_PATH)) {
        const fileContent = fs.readFileSync(CSV_FILE_PATH, 'utf-8');
        csvData = parse(fileContent, {
          columns: true,
          skip_empty_lines: true,
          bom: true
        });
        console.log(`✅ Loaded ${csvData.length} records from CSV fallback.`);
      } else {
        console.warn(`⚠️ CSV fallback file not found at ${CSV_FILE_PATH}`);
      }
    } catch (err: any) {
      console.error('❌ Failed to load CSV data:', err.message);
    }
  }

  // Load CSV on start
  loadCsvData();

  // API Routes
  app.get('/api/sujets/:matiere', async (req, res) => {
    const { matiere } = req.params;
    const { filiere } = req.query;
    if (!matiere) {
      return res.status(400).json({ error: "Le paramètre 'matiere' est manquant." });
    }

    const targetLabels = (SUBJECT_MAPPING[matiere] || [matiere]).map(t => t.toLowerCase());

    // Try Supabase first
    if (supabase) {
      try {
        console.log(`🔍 Querying Supabase for subject: ${matiere}`);
        const tableNames = await getActiveTables();
        const allData: any[] = [];
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

        for (const tableName of tableNames) {
          try {
            console.log(`👉 Querying table: ${tableName}`);
            const { data, error } = await supabase
              .from(tableName)
              .select('*')
              .limit(10000)
              .abortSignal(controller.signal);

            if (!error && data) {
              allData.push(...data);
            } else if (error) {
              console.warn(`⚠️ Error in table ${tableName}: ${error.message}`);
            }
          } catch (e) {
            console.warn(`⚠️ Failed to fetch from ${tableName}`);
          }
        }

        clearTimeout(timeoutId);

        if (allData.length > 0) {
          console.log(`✅ Loaded ${allData.length} total rows from ${tableNames.length} tables, filtering...`);
          
          const filtered = allData.filter((row: any) => {
            try {
              const rowMatiere = (
                row.matiere || row['Matière'] || row.Matiere || 
                row.mati_re || row.subject || row.Subject || ''
              ).toString().toLowerCase().trim();
              
              const rowPath = (
                row.chemin_complet || row['Chemin complet'] || row.path || row.Path || ''
              ).toString().toLowerCase();

              const rowAnnee = (row.annee || row.Année || row.code_niveau || '').toString().toLowerCase();
              const rowCycle = (row.cycle || row.Cycle || '').toString().toLowerCase();
              const rowFilliere = (row.filliere || row.Filliere || row.filiere || '').toString().toLowerCase();

              const matchSubject = rowMatiere === matiere.toLowerCase() || 
                                  targetLabels.includes(rowMatiere) ||
                                  (matiere === 'documents' && targetLabels.some(label => rowMatiere.includes(label)));
              
              const matchPath = targetLabels.some(label => rowPath.includes(`/${label}`) || rowPath.includes(`/${label}/`));
              
              let matchFiliere = !filiere;
              if (filiere) {
                const fQuery = (filiere as string).toLowerCase();
                const rowF = rowFilliere.toLowerCase();
                const rowP = rowPath.toLowerCase();
                
                if (fQuery.includes('scientific')) {
                  matchFiliere = rowF.includes('scientific') || rowF.includes('se') || rowF.includes('m') || rowF.includes('tm') || 
                                rowF.includes('علوم') || rowF.includes('رياضيات') || rowF.includes('تقني') ||
                                rowP.includes('se') || rowP.includes('tm') || rowP.includes('maths');
                } else if (fQuery.includes('literary')) {
                  matchFiliere = rowF.includes('literary') || rowF.includes('lp') || rowF.includes('le') || 
                                rowF.includes('آداب') || rowF.includes('لغات') ||
                                rowP.includes('lp') || rowP.includes('le') || rowP.includes('lettres');
                } else {
                  matchFiliere = rowF.includes(fQuery) || rowP.includes(fQuery);
                }
              }
              
              return (matchSubject || matchPath) && matchFiliere;
            } catch (e) {
              return false;
            }
          });

          if (filtered.length > 0) {
            console.log(`✨ Found ${filtered.length} matches in Supabase.`);
            
            const mapped = filtered.map((row: any) => {
              const cycle = (row.cycle || '').toLowerCase();
              const rawAnnee = row.annee || row.code_niveau || row.cycle || '';
              const rawMatiere = row.matiere || row.filliere || '';
              
              return {
                code_niveau: getCanonicalYear(rawAnnee, cycle),
                matiere: getCanonicalMatiere(rawMatiere),
                reference_pdf: row.nom_pdf || row.reference_pdf || row.Trimesttre || row.trimestre || '',
                lien_direct_drive: row.lien_direct || row.lien_direct_drive || '',
                chemin_complet: row.chemin_complet || '',
                trimestre: extractTrimestreLabel(row),
                filliere: row.filliere || '',
                annee: getCanonicalYear(rawAnnee, cycle),
                cycle: cycle
              };
            });
            return res.json(mapped);
          }
        }
      } catch (err: any) {
        console.warn(`⚠️ Supabase connection failed or timed out: ${err.message}`);
      }
    }

    // Try SQL second (deprecated but kept as secondary fallback)
    try {
      const conn = await getPool();
      if (conn) {
        console.log(`🔍 Fetching from SQL Server for subject: ${matiere}`);
        const result = await conn.request()
          .input('matiere', sql.NVarChar, matiere)
          .query("SELECT code_niveau, matiere, reference_pdf, [Lien direct] AS lien_direct_drive FROM Liens_Pdfs__sitetafawakdz WHERE matiere = @matiere");
        
        if (result.recordset && result.recordset.length > 0) {
          return res.json(result.recordset);
        }
      }
    } catch (err: any) {
      console.warn(`⚠️ SQL Query failed: ${err.message}.`);
    }

    // Final Fallback to CSV
    console.log(`📂 Searching in CSV for subject: ${matiere}`);
    const filtered = csvData.filter(row => {
      const rowMatiere = (row.Matière || row.matiere || row.MATIERE || row.Subject || '').toLowerCase().trim();
      const rowPath = (row['Chemin complet'] || row.chemin_complet || '').toLowerCase();
      
      const matchSubject = rowMatiere === matiere.toLowerCase() || targetLabels.includes(rowMatiere);
      const matchPath = targetLabels.some(label => rowPath.includes(`/${label}`) || rowPath.includes(`/${label}/`));
      
      return matchSubject || matchPath;
    });

    const extractTrimestre = (path: string, reference: string) => {
      const text = `${path} ${reference}`.toLowerCase();
      if (text.includes('trimestre 1') || text.includes('1er trimestre') || text.includes(' t1 ') || text.includes('/t1/')) return 'الفصل 1';
      if (text.includes('trimestre 2') || text.includes('2eme trimestre') || text.includes('2ème trimestre') || text.includes(' t2 ') || text.includes('/t2/')) return 'الفصل 2';
      if (text.includes('trimestre 3') || text.includes('3eme trimestre') || text.includes('3ème trimestre') || text.includes(' t3 ') || text.includes('/t3/')) return 'الفصل 3';
      return '';
    };

    const mapped = filtered.map(row => {
      const path = row['Chemin complet'] || row.chemin_complet || '';
      const ref = row['Nom du fichier PDF'] || row.reference_pdf || '';
      const cycle = row['Cycle'] || row.cycle || '';
      const annee = row['Année'] || row.annee || '';
      const matiere = row['Matière'] || row.matiere || '';
      
      return {
        code_niveau: annee || cycle || '',
        matiere: matiere,
        reference_pdf: ref,
        lien_direct_drive: row['Lien direct'] || row.lien_direct_drive || '',
        chemin_complet: path,
        trimestre: extractTrimestre(path, ref),
        cycle: cycle,
        annee: annee
      };
    });

    res.json(mapped);
  });

  app.get("/api/search", async (req, res) => {
    const query = (req.query.q as string || "").toLowerCase();
    if (query.length < 2) return res.json([]);

    if (supabase) {
      try {
        console.log(`🔍 Supabase global search in multiple tables: ${query}`);
        const tableNames = await getActiveTables();
        const allSupaData: any[] = [];
        
        // Intelligence: check if query matches a known subject alias
        const aliases = [];
        const subjectMapping: any = {
          'arabic': ['arabe', 'ar', 'اللغة العربية', 'عربية', 'arabic'],
          'french': ['fr', 'french', 'اللغة الفرنسية', 'فرنسية', 'francais'],
          'english': ['eng', 'en', 'english', 'اللغة الإنجليزية', 'انجليزية', 'anglais'],
          'islamic': ['islam', 'islamic', 'التربية الإسلامية', 'العلوم الإسلامية', 'اسلامية', 'education islamique'],
          'history_geo': ['hist', 'histoire', 'history', 'جغرافيا', 'تاريخ', 'histoire geographie', 'hg'],
          'civic': ['civic', 'hist', 'التربية المدنية', 'مدنية', 'education civique'],
          'science': ['science', 'sci', 'علوم', 'العلوم الطبيعية', 'snv', 'sciences'],
          'physics': ['physique', 'ph', 'فيزياء', 'الفيزياء', 'physique chimie'],
          'informatics': ['info', 'informatique', 'إعلام آلي', 'اعلام', 'informatique'],
          'technology': ['tech', 'technologie', 'technology', 'تكنولوجيا', 'techno'],
          'documents': ['docs', 'document', 'documents', 'مستندات', 'مستندات تعليمية']
        };

        Object.entries(subjectMapping).forEach(([key, values]: [string, any]) => {
          if (values.includes(query) || key === query) {
            aliases.push(...values, key);
          }
        });

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);

        for (const tableName of tableNames) {
          try {
            const { data, error } = await supabase
              .from(tableName)
              .select('*')
              .limit(10000)
              .abortSignal(controller.signal);
            
            if (!error && data) {
              allSupaData.push(...data);
            }
          } catch (e) {
            console.warn(`⚠️ Search in table ${tableName} failed.`);
          }
        }
        
        clearTimeout(timeoutId);
        
        if (allSupaData.length > 0) {
          const filtered = allSupaData.filter((row: any) => {
             try {
               const rowMatiere = (row.matiere || '').toLowerCase();
               const rowAnnee = (row.annee || '').toLowerCase();
               const fullText = JSON.stringify(row).toLowerCase();
               
               // Match by alias or by direct text
               const aliasMatch = aliases.some(a => rowMatiere.includes(a) || rowAnnee.includes(a));
               return aliasMatch || fullText.includes(query);
             } catch (e) {
               return false;
             }
          }).slice(0, 150);

          const mapped = filtered.map((row: any) => {
            const cycle = (row.cycle || '').toLowerCase();
            const rawAnnee = row.annee || row.code_niveau || row.cycle || '';
            const rawMatiere = row.matiere || row.filliere || '';
            
            return {
              code_niveau: getCanonicalYear(rawAnnee, cycle),
              matiere: getCanonicalMatiere(rawMatiere),
              reference_pdf: row.nom_pdf || row.Trimesttre || row.trimestre || '',
              lien_direct_drive: row.lien_direct || row.lien_direct_drive || '',
              chemin_complet: row.chemin_complet || '',
              trimestre: extractTrimestreLabel(row),
              cycle: cycle,
              annee: getCanonicalYear(rawAnnee, cycle),
              filliere: row.filliere || ''
            };
          });
          return res.json(mapped);
        }
      } catch (e) {
        console.warn('Supabase search failed', e);
      }
    }

    const csvResults = csvData.filter(row => {
      const text = JSON.stringify(row).toLowerCase();
      return text.includes(query);
    }).slice(0, 30);

    const mappedCsv = csvResults.map(row => {
      const cycle = (row['Cycle'] || row.cycle || '').toLowerCase();
      const rawAnnee = row['Année'] || row.annee || cycle || '';
      const rawMatiere = row['Matière'] || row.matiere || '';
      
      return {
        code_niveau: getCanonicalYear(rawAnnee, cycle),
        matiere: getCanonicalMatiere(rawMatiere),
        reference_pdf: row['Nom du fichier PDF'] || row.reference_pdf || '',
        lien_direct_drive: row['Lien direct'] || row.lien_direct_drive || '',
        chemin_complet: row['Chemin complet'] || row.chemin_complet || ''
      };
    });

    res.json(mappedCsv);
  });

  // Catch-all for unknown /api routes to prevent Vite HTML fallback
  app.all('/api/*', (req, res) => {
    res.status(404).json({ error: `Route API non trouvée: ${req.method} ${req.url}` });
  });

// Global Error Handler for Express (MUST be last)
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('🔥 Global Exception:', err);
  res.status(500).json({ 
    error: 'Internal Server Error', 
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    hint: 'Vérifiez les journaux (logs) sur Vercel pour plus de détails.'
  });
});

export default app;

if (!process.env.VERCEL) {
  async function boot() {
    // Vite middleware for development
    if (process.env.NODE_ENV !== 'production') {
      try {
        console.log('📦 Initializing Vite middleware...');
        const { createServer: createViteServer } = await import('vite');
        const vite = await createViteServer({
          server: { middlewareMode: true },
          appType: 'spa',
        });
        app.use(vite.middlewares);
        console.log('✅ Vite middleware initialized.');
      } catch (viteErr: any) {
        console.error('❌ Failed to initialize Vite middleware:', viteErr.message);
      }
    } else {
      const distPath = path.join(process.cwd(), 'dist');
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }

    console.log(`🚀 Starting server on port ${PORT}...`);
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ Server running on http://localhost:${PORT}`);
    });
  }

  boot();
}
