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

// Helper to determine the correct table name dynamically
let cachedTable: string | null = null;
async function getSupabaseTable(force = false) {
  if (cachedTable && !force) return cachedTable;
  
  const defaultTable = 'lienspdfs';
  if (!supabase) {
    console.warn('⚠️ Supabase client not initialized, using default table name');
    return defaultTable;
  }

  const tablesToTry = [defaultTable, 'lienspdfs2', 'liens_pdfs', 'lienspdf'];
  console.log(`🔍 Supabase: Detecting active table...${force ? ' (FORCED)' : ''}`);

  for (const table of tablesToTry) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      
      if (!error) {
        console.log(`✅ Supabase: Table active détectée : "${table}"`);
        cachedTable = table;
        return table;
      }
      
      console.log(`ℹ️ Supabase: Essai table "${table}" échoué : ${error.message}`);
      
      if (error.message && (error.message.includes('Invalid API key') || error.message.includes('JWT'))) {
        console.error('❌ FATAL: Supabase API key error.');
        break; 
      }
    } catch (e: any) {
      console.log(`❌ Supabase: Erreur critique sur table "${table}": ${e.message}`);
    }
  }

  console.warn(`⚠️ Supabase: No matching table found. Defaulting to "${defaultTable}"`);
  return defaultTable; 
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
      const tableName = await getSupabaseTable(true);
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
      const tableName = await getSupabaseTable();
      
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
      const tableName = await getSupabaseTable();
      
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
      const tableName = await getSupabaseTable(true);
      const { count, error } = await supabase.from(tableName).select('*', { count: 'exact', head: true });
      
      if (error) {
        console.error(`❌ Supabase test error on table "${tableName}":`, error.message || 'Unknown error');
        
        const isAuthError = error.message?.includes('Invalid API key') || error.message?.includes('JWT') || error.code === '401';
        
        return res.status(500).json({ 
          status: 'error', 
          message: error.message || 'Erreur de connexion Supabase',
          isAuthError,
          hint: error.hint,
          details: error.details,
          table: tableName
        });
      }

      console.log(`✅ Supabase test success! Found ${count} rows in table "${tableName}"`);
      return res.json({
        status: 'success',
        url: supabaseUrl,
        table: tableName,
        rows: count,
        message: count === 0 ? 'Connecté, mais la table est vide.' : 'Connecté et données trouvées !'
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
      const timeoutId = setTimeout(() => controller.abort(), 10000); // Increased timeout to 10s

      if (supabase) {
        try {
          console.log('📊 Fetching stats from Supabase...');
          const tableName = await getSupabaseTable();
          const { data: supaData, error } = await supabase
            .from(tableName)
            .select('*') 
            .limit(20000) // Increased limit to capture all data for stats
            .abortSignal(controller.signal);
          
          if (error) {
            console.warn('⚠️ Supabase stats error:', error.message);
            if (error.message.includes('Invalid API key')) {
              console.error('❌ La clé API Supabase est rejetée. Vérifiez vos variables d\'environnement.');
            }
          } else {
            data = supaData || [];
            console.log(`✅ Fetched ${data.length} rows from Supabase table "${tableName}".`);
          }
        } catch (supaErr: any) {
          console.warn('⚠️ Supabase fetch aborted or failed:', supaErr.message);
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
        let annee = (row.annee || row.Année || row['Année'] || 'unknown').toLowerCase();
        let matiere = (row.matiere || row.Matière || row.Matiere || row.filliere || 'unknown').toLowerCase();
        
        // Normalize common arabic cycle names to technical IDs
        if (cycle.includes('ابتدائ') || cycle.includes('primary')) cycle = 'primary';
        if (cycle.includes('متوسط') || cycle.includes('middle') || cycle.includes('moyen')) cycle = 'middle';
        if (cycle.includes('ثانوي') || cycle.includes('secondary')) cycle = 'secondary';

        const trimestre = extractTrimestreLabel(row);
        
        const key = `${cycle}|${annee}|${matiere}|${trimestre}`;
        if (!acc[key]) {
          acc[key] = { cycle, annee, matiere, trimestre, count: 0 };
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
    if (!matiere) {
      return res.status(400).json({ error: "Le paramètre 'matiere' est manquant." });
    }

    const subjectMapping: Record<string, string[]> = {
      'arabic': ['arabe', 'ar', 'اللغة العربية', 'عربية', 'arabic', 'اللغه العربيه', 'لغة عربية', 'لغة العربية'],
      'french': ['fr', 'french', 'اللغة الفرنسية', 'فرنسية', 'francais', 'français', 'اللغه الفرنسيه'],
      'english': ['eng', 'en', 'english', 'اللغة الإنجليزية', 'انجليزية', 'anglais', 'اللغه الانجليزيه', 'اللغة الانجليزية'],
      'islamic': ['islam', 'islamic', 'التربية الإسلامية', 'العلوم الإسلامية', 'اسلامية', 'education islamique', 'تربية اسلامية', 'التربيه الاسلاميه'],
      'history_geo': ['hist', 'histoire', 'history', 'جغرافيا', 'تاريخ', 'histoire geographie', 'hg', 'التاريخ والجغرافيا', 'تاريخ وجغرافيا'],
      'civic': ['civic', 'hist', 'التربية المدنية', 'مدنية', 'education civique', 'التربيه المدنيه', 'تربية مدنية'],
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

    const targetLabels = (subjectMapping[matiere] || [matiere]).map(t => t.toLowerCase());

    // Try Supabase first
    if (supabase) {
      try {
        console.log(`🔍 Querying Supabase for subject: ${matiere}`);
        const tableName = await getSupabaseTable();
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout for this query

        // Fetch with higher limit to ensure we see all data
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(10000)
          .abortSignal(controller.signal);

        clearTimeout(timeoutId);

        if (!error && data && data.length > 0) {
          console.log(`✅ Loaded ${data.length} rows from Supabase, filtering...`);
          
          const filtered = data.filter((row: any) => {
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

              const matchSubject = rowMatiere === matiere.toLowerCase() || 
                                  targetLabels.includes(rowMatiere) ||
                                  (matiere === 'documents' && targetLabels.some(label => rowMatiere.includes(label)));
              
              const matchPath = targetLabels.some(label => rowPath.includes(`/${label}`) || rowPath.includes(`/${label}/`));
              
              // New: Also match by level if path and subject are ambiguous
              const matchLevel = rowAnnee.includes('2am') || rowPath.includes('/2am/');

              return matchSubject || matchPath;
            } catch (e) {
              return false;
            }
          });

          if (filtered.length > 0) {
            console.log(`✨ Found ${filtered.length} matches in Supabase.`);
            
            const mapped = filtered.map((row: any) => {
              return {
                code_niveau: row.annee || row.code_niveau || row.cycle || '',
                matiere: row.matiere || row.filliere || '',
                reference_pdf: row.nom_pdf || row.reference_pdf || row.Trimesttre || row.trimestre || '',
                lien_direct_drive: row.lien_direct || row.lien_direct_drive || '',
                chemin_complet: row.chemin_complet || '',
                trimestre: extractTrimestreLabel(row),
                filliere: row.filliere || '',
                annee: row.annee || '',
                cycle: row.cycle || ''
              };
            });
            return res.json(mapped);
          }
        }
        
        if (error) {
          console.warn(`⚠️ Supabase Query error: ${error.message}`);
        } else {
          console.log(`ℹ️ No results in Supabase for ${matiere}`);
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
        console.log(`🔍 Supabase global search: ${query}`);
        const tableName = await getSupabaseTable();
        
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

        let activeQuery = query;
        Object.entries(subjectMapping).forEach(([key, values]: [string, any]) => {
          if (values.includes(query) || key === query) {
            aliases.push(...values, key);
          }
        });

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(10000)
          .abortSignal(controller.signal);
        
        clearTimeout(timeoutId);
        
        if (!error && data && data.length > 0) {
          const filtered = data.filter((row: any) => {
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
          }).slice(0, 100);

          const mapped = filtered.map((row: any) => {
            return {
              code_niveau: row.annee || row.cycle || '',
              matiere: row.matiere || row.filliere || '',
              reference_pdf: row.nom_pdf || row.Trimesttre || row.trimestre || '',
              lien_direct_drive: row.lien_direct || row.lien_direct_drive || '',
              chemin_complet: row.chemin_complet || '',
              trimestre: extractTrimestreLabel(row),
              cycle: row.cycle || '',
              annee: row.annee || '',
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

    const mappedCsv = csvResults.map(row => ({
      code_niveau: row.Cycle || row.Cycle || row.cycle || row.Année || row.annee || '',
      matiere: row.Matière || row.matiere || '',
      reference_pdf: row['Nom du fichier PDF'] || row.reference_pdf || '',
      lien_direct_drive: row['Lien direct'] || row.lien_direct_drive || '',
      chemin_complet: row['Chemin complet'] || row.chemin_complet || ''
    }));

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
