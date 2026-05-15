import React from 'react';
import { Database, Link, ArrowRight, Table as TableIcon, FileText, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';

interface DatabaseDashboardProps {
  stats: any[];
  onSync?: () => Promise<void>;
}

const DatabaseDashboard: React.FC<DatabaseDashboardProps> = ({ stats, onSync }) => {
  const [activeTab, setActiveTab] = React.useState<'mapping' | 'stats' | 'samples' | 'structure' | 'explorer'>('mapping');
  const [sampleData, setSampleData] = React.useState<any[]>([]);
  const [isLoadingSamples, setIsLoadingSamples] = React.useState(false);
  const [explorerTable, setExplorerTable] = React.useState('');
  const [explorerResult, setExplorerResult] = React.useState<any>(null);
  const [isExploring, setIsExploring] = React.useState(false);
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [isImporting, setIsImporting] = React.useState(false);
  const [isExporting, setIsExporting] = React.useState(false);
  const [isTesting, setIsTesting] = React.useState(false);
  const [syncStatus, setSyncStatus] = React.useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setSyncStatus(null);
    try {
      const resp = await fetch('/api/test-supabase');
      const data = await resp.json();
      if (resp.ok && data.status === 'success') {
        setSyncStatus({ 
          message: `Connexion RÉUSSIE ! Table: ${data.table} (${data.rows} lignes)`, 
          type: 'success' 
        });
      } else {
        const isAuthError = data.isAuthError || data.message?.includes('Invalid API key');
        setSyncStatus({ 
          message: isAuthError 
            ? '❌ CLÉ API INVALIDE : Vérifiez vos variables d\'environnement Supabase.' 
            : `ÉCHEC : ${data.message || 'Erreur inconnue'}${data.hint ? ' - ' + data.hint : ''}`, 
          type: 'error' 
        });
      }
    } catch (e) {
      console.error('Test failed', e);
      setSyncStatus({ message: 'Erreur réseau lors du test', type: 'error' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncStatus(null);
    try {
      const resp = await fetch('/api/sync');
      if (resp.ok && onSync) {
        await onSync();
        setSyncStatus({ message: 'Table détectée et stats rafraîchies', type: 'success' });
      } else {
        setSyncStatus({ message: 'Échec de synchronisation de la table', type: 'error' });
      }
    } catch (e) {
      console.error('Sync failed', e);
      setSyncStatus({ message: 'Erreur réseau lors de la synchro', type: 'error' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleImport = async () => {
    if (!window.confirm('Voulez-vous vraiment importer toutes les données CSV vers Supabase ? (Cela peut prendre du temps)')) return;
    
    setIsImporting(true);
    setSyncStatus(null);
    try {
      const resp = await fetch('/api/import-csv', { method: 'POST' });
      const data = await resp.json();
      if (resp.ok) {
        setSyncStatus({ message: data.message, type: 'success' });
        if (onSync) await onSync();
      } else {
        setSyncStatus({ message: data.error || 'Échec de l\'importation', type: 'error' });
      }
    } catch (e) {
      console.error('Import failed', e);
      setSyncStatus({ message: 'Erreur réseau lors de l\'importation', type: 'error' });
    } finally {
      setIsImporting(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    setSyncStatus(null);
    try {
      const response = await fetch('/api/export-csv');
      if (!response.ok) throw new Error('Échec du téléchargement');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `export_supabase_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      setSyncStatus({ message: 'Données exportées avec succès', type: 'success' });
    } catch (e) {
      console.error('Export failed', e);
      setSyncStatus({ message: 'Erreur lors de l\'exportation', type: 'error' });
    } finally {
      setIsExporting(false);
    }
  };

  const checkTable = async () => {
    if (!explorerTable) return;
    setIsExploring(true);
    try {
      const resp = await fetch(`/api/check-table?table=${explorerTable}`);
      const data = await resp.json();
      setExplorerResult(data);
    } catch (e) {
      setExplorerResult({ error: 'Erreur de connexion' });
    } finally {
      setIsExploring(false);
    }
  };

  const tableStructure = [
    { db: 'id', label: 'ID', type: 'UUID', desc: 'Identifiant unique auto-généré' },
    { db: 'cycle', label: 'Cycle', type: 'Text', desc: 'Cycle d\'enseignement (ex: primaire, moyen, secondaire)' },
    { db: 'annee', label: 'Année / Niveau', type: 'Text', desc: 'Le niveau scolaire (ex: 1am, 4am, 3as)' },
    { db: 'matiere', label: 'Matière / Sujet', type: 'Text', desc: 'Contient le nom du sujet (ex: anglais, maths, arabe)' },
    { db: 'Trimesttre', label: 'Période / Trimestre', type: 'Text', desc: 'Contient l\'information du trimestre (ex: trimestre-1)' },
    { db: 'nom_pdf', label: 'Nom du Fichier', type: 'Text', desc: 'Le nom réel du document PDF' },
    { db: 'chemin_complet', label: 'Chemin Logiciel', type: 'Text', desc: 'Structure complète du dossier dans le Storage' },
    { db: 'lien_direct', label: 'URL de Téléchargement', type: 'URL', desc: 'Lien public vers le fichier sur Supabase' },
    { db: 'created_at', label: 'Date d\'Enregistrement', type: 'Date', desc: 'Horodatage de l\'insertion en base' },
  ];

  const fetchSamples = async () => {
    setIsLoadingSamples(true);
    try {
      const resp = await fetch('/api/search?q=202'); // Fetch some recent files as samples
      if (resp.ok) {
        const data = await resp.json();
        setSampleData(data.slice(0, 10));
      }
    } catch (e) {
      console.error('Failed to fetch samples', e);
    } finally {
      setIsLoadingSamples(false);
    }
  };

  React.useEffect(() => {
    if (activeTab === 'samples' && sampleData.length === 0) {
      fetchSamples();
    }
  }, [activeTab]);

  const subjectMapping = {
    'arabic': ['arabe', 'ar', 'اللغة العربية', 'عربية'],
    'french': ['fr', 'french', 'اللغة الفرنسية', 'فرنسية'],
    'english': ['eng', 'en', 'english', 'اللغة الإنجليزية', 'انجليزية'],
    'islamic': ['islam', 'islamic', 'التربية الإسلامية', 'العلوم الإسلامية', 'اسلامية'],
    'history_geo': ['hist', 'histoire', 'history', 'جغرافيا', 'تاريخ'],
    'math': ['math', 'maths', 'الرياضيات', 'رياضيات'],
    'physics': ['physique', 'ph', 'فيزياء', 'الفيزياء'],
    'science': ['science', 'sci', 'علوم', 'العلوم الطبيعية'],
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-dz-gold overflow-hidden shadow-2xl gold-3d mb-12">
      <div className="bg-dz-green p-6 text-white border-b-2 border-dz-gold flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Database className="text-dz-gold" />
          <h2 className="text-xl font-black">Base de Données</h2>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleTestConnection}
              disabled={isTesting}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[9px] font-black transition-all bg-indigo-500 text-white hover:bg-indigo-600 gold-3d ${isTesting ? 'animate-pulse opacity-70' : ''}`}
            >
              <div>🧪</div>
              {isTesting ? 'Test...' : 'Tester la Connexion'}
            </button>
            <button 
              onClick={handleSync}
              disabled={isSyncing}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[9px] font-black transition-all bg-white/10 hover:bg-white/20 border border-white/20 ${isSyncing ? 'animate-pulse cursor-wait' : ''}`}
              title="Re-détecter la table active"
            >
              <div className={`${isSyncing ? 'animate-spin' : ''}`}>🔄</div>
              {isSyncing ? 'Synchronisation...' : 'Synchro Table'}
            </button>
            <button 
              onClick={handleImport}
              disabled={isImporting || isSyncing}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[9px] font-black transition-all bg-dz-gold text-dz-green-dark border-2 border-dz-gold gold-3d ${isImporting ? 'animate-pulse cursor-wait' : ''}`}
              title="Importer le CSV vers Supabase"
            >
              <div>🚀</div>
              {isImporting ? 'Importation...' : 'Importer CSV'}
            </button>
            <button 
              onClick={handleExport}
              disabled={isExporting || isSyncing}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[9px] font-black transition-all bg-dz-dark text-dz-gold border-2 border-dz-gold/30 hover:border-dz-gold gold-3d ${isExporting ? 'animate-pulse cursor-wait' : ''}`}
              title="Exporter les données de Supabase en CSV"
            >
              <div>📥</div>
              {isExporting ? 'Exportation...' : 'Exporter CSV'}
            </button>
          </div>
          {syncStatus && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className={`px-3 py-1.5 rounded-lg text-[9px] font-black ${syncStatus.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}
            >
              {syncStatus.message}
            </motion.div>
          )}
        </div>
        <div className="flex bg-black/20 p-1 rounded-xl gap-1">
          <button 
            onClick={() => setActiveTab('mapping')}
            className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${activeTab === 'mapping' ? 'bg-dz-gold text-dz-green-dark' : 'text-white hover:bg-white/10'}`}
          >
            Mapping
          </button>
          <button 
            onClick={() => setActiveTab('stats')}
            className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${activeTab === 'stats' ? 'bg-dz-gold text-dz-green-dark' : 'text-white hover:bg-white/10'}`}
          >
            Statistiques
          </button>
          <button 
            onClick={() => setActiveTab('structure')}
            className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${activeTab === 'structure' ? 'bg-dz-gold text-dz-green-dark' : 'text-white hover:bg-white/10'}`}
          >
            Structure
          </button>
          <button 
            onClick={() => setActiveTab('explorer')}
            className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${activeTab === 'explorer' ? 'bg-dz-gold text-dz-green-dark' : 'text-dz-gold hover:bg-white/10'}`}
          >
            Explorateur
          </button>
          <button 
            onClick={() => setActiveTab('samples')}
            className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${activeTab === 'samples' ? 'bg-dz-gold text-dz-green-dark' : 'text-white hover:bg-white/10'}`}
          >
            Échantillons
          </button>
          <button 
            onClick={() => setActiveTab('deploy')}
            className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${activeTab === 'deploy' ? 'bg-indigo-500 text-white' : 'text-dz-gold hover:bg-white/10'}`}
          >
            Déployer 🚀
          </button>
        </div>
      </div>

      <div className="p-8">
        {activeTab === 'deploy' && (
          <div className="flex flex-col gap-8">
            <div className="bg-indigo-50 dark:bg-indigo-900/20 p-8 rounded-3xl border-2 border-indigo-500/30">
              <h3 className="text-2xl font-black text-indigo-700 dark:text-indigo-400 mb-4 flex items-center gap-3">
                <span>🚀</span>
                Guide de Déploiement Vercel
              </h3>
              <p className="text-sm font-bold text-slate-600 dark:text-slate-400 mb-6">
                Pour que votre site fonctionne une fois déployé, vous devez configurer les variables d'environnement suivantes dans votre tableau de bord Vercel (ou Netlify).
              </p>
              
              <div className="grid grid-cols-1 gap-4">
                {[
                  { name: 'NEXT_PUBLIC_SUPABASE_URL', value: 'L\'URL de votre projet Supabase' },
                  { name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', value: 'Votre clé ANON pour les accès publics' },
                  { name: 'SUPABASE_SERVICE_ROLE_KEY', value: 'Votre clé SECRET (Service Role) pour l\'importation de données' }
                ].map((env, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-white dark:bg-black/30 rounded-2xl border border-indigo-500/10">
                    <code className="text-xs font-black text-indigo-500">{env.name}</code>
                    <span className="text-[10px] font-bold text-slate-400 italic">{env.value}</span>
                  </div>
                ))}
              </div>

              <div className="mt-8 p-6 bg-white dark:bg-slate-800 rounded-2xl border border-dz-gold shadow-lg">
                <h4 className="text-xs font-black text-dz-dark dark:text-white uppercase tracking-widest mb-3">Étapes Finales :</h4>
                <ul className="flex flex-col gap-3">
                  <li className="flex items-start gap-4 text-[11px] font-bold text-slate-500">
                    <span className="w-5 h-5 rounded-full bg-dz-gold text-dz-green-dark flex items-center justify-center text-[10px] shrink-0">1</span>
                    Créez une table nommée <code className="text-dz-gold">lienspdfs2</code> sur Supabase.
                  </li>
                  <li className="flex items-start gap-4 text-[11px] font-bold text-slate-500">
                    <span className="w-5 h-5 rounded-full bg-dz-gold text-dz-green-dark flex items-center justify-center text-[10px] shrink-0">2</span>
                    Désactivez temporairement RLS ou ajoutez une politique SELECT pour <code className="text-dz-gold">anon</code>.
                  </li>
                  <li className="flex items-start gap-4 text-[11px] font-bold text-slate-500">
                    <span className="w-5 h-5 rounded-full bg-dz-gold text-dz-green-dark flex items-center justify-center text-[10px] shrink-0">3</span>
                    Cliquez sur <strong className="text-dz-green">Importer CSV</strong> une fois connecté pour synchroniser vos données initiales.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'mapping' && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2 mb-4">
              <h3 className="text-lg font-black text-dz-dark dark:text-white">Mapping des Matières</h3>
              <p className="text-xs text-slate-500 font-bold">Correspondance entre les noms de l'interface et les colonnes Supabase.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(subjectMapping).map(([key, aliases]) => (
                <div key={key} className="bg-dz-bg dark:bg-white/5 p-4 rounded-2xl border border-dz-gold/20 flex items-center gap-4">
                  <div className="w-10 h-10 bg-dz-green rounded-xl flex items-center justify-center text-white font-black text-xs shrink-0">
                    {key.substring(0, 3).toUpperCase()}
                  </div>
                  <div className="flex-1 flex flex-col gap-1">
                    <span className="text-xs font-black text-dz-green-dark dark:text-dz-gold">{key}</span>
                    <div className="flex flex-wrap gap-1">
                      {aliases.map((alias, idx) => (
                        <span key={idx} className="bg-white dark:bg-slate-800 text-[8px] font-bold px-2 py-0.5 rounded border border-dz-gold/10">
                          {alias}
                        </span>
                      ))}
                    </div>
                  </div>
                  <ArrowRight size={14} className="text-dz-gold rotate-180" />
                  <div className="flex flex-col items-end">
                    <CheckCircle2 size={16} className="text-dz-green" />
                    <span className="text-[8px] font-bold text-slate-400 mt-1 uppercase">Connected</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-emerald-50 dark:bg-emerald-900/20 p-6 rounded-2xl border-2 border-emerald-500/20 text-center">
                <div className="text-lg font-black text-emerald-600 mb-1">Total Fichiers</div>
                <div className="text-4xl font-black text-emerald-700 dark:text-emerald-400">
                  {stats.reduce((acc, curr) => acc + curr.count, 0).toLocaleString()}
                </div>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-2xl border-2 border-blue-500/20 text-center">
                <div className="text-lg font-black text-blue-600 mb-1">Matières Actives</div>
                <div className="text-4xl font-black text-blue-700 dark:text-blue-400">
                  {new Set(stats.map(s => s.matiere)).size}
                </div>
              </div>
              <div className="bg-amber-50 dark:bg-amber-900/20 p-6 rounded-2xl border-2 border-amber-500/20 text-center">
                <div className="text-lg font-black text-amber-600 mb-1">Niveaux</div>
                <div className="text-4xl font-black text-amber-700 dark:text-amber-400">
                  {new Set(stats.map(s => s.annee)).size}
                </div>
              </div>
            </div>

             <div className="bg-white dark:bg-slate-800 rounded-2xl border border-dz-gold/20 overflow-hidden mt-4">
               <div className="max-h-[400px] overflow-y-auto">
                 <table className="w-full text-right border-collapse">
                    <thead className="bg-dz-bg dark:bg-black/20 text-[10px] font-black text-dz-green uppercase tracking-widest border-b border-dz-gold/10 sticky top-0 z-10">
                      <tr>
                        <th className="px-6 py-4 text-center">Cycle</th>
                        <th className="px-6 py-4 text-center">Niveau</th>
                        <th className="px-6 py-4 text-center">Matière</th>
                        <th className="px-6 py-4 text-center">Trimestre</th>
                        <th className="px-6 py-4 text-center">Fichiers</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-dz-gold/5 text-[10px]">
                      {stats.map((stat, i) => (
                        <tr key={i} className="hover:bg-dz-bg/30 transition-colors">
                          <td className="px-6 py-3 font-bold text-slate-500 text-center uppercase">{stat.cycle}</td>
                          <td className="px-6 py-3 font-black text-dz-gold text-center uppercase">{stat.annee}</td>
                          <td className="px-6 py-3 font-black text-dz-dark dark:text-white text-center">{stat.matiere}</td>
                          <td className="px-6 py-3 font-bold text-dz-green text-center">{stat.trimestre}</td>
                          <td className="px-6 py-3 text-center">
                            <span className="bg-dz-green text-white px-3 py-1 rounded-full font-black">
                              {stat.count}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                 </table>
               </div>
            </div>
          </div>
        )}

        {activeTab === 'structure' && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2 mb-4">
              <h3 className="text-lg font-black text-dz-dark dark:text-white">Structure des colonnes Supabase</h3>
              <p className="text-xs text-slate-500 font-bold">Noms techniques et descriptions des colonnes de données.</p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {tableStructure.map((col, idx) => (
                <div key={idx} className="bg-dz-bg dark:bg-black/20 p-4 rounded-xl border border-dz-gold/10 flex items-center justify-between group hover:border-dz-gold/40 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-lg bg-dz-gold/10 flex items-center justify-center text-dz-gold group-hover:bg-dz-gold group-hover:text-dz-green-dark transition-all">
                      <TableIcon size={16} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-dz-dark dark:text-white uppercase tracking-tighter">{col.db}</span>
                      <span className="text-[10px] font-bold text-slate-400">{col.desc}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[9px] font-black px-2 py-0.5 bg-dz-green/10 text-dz-green rounded uppercase">{col.type}</span>
                    <div className="w-32 text-left">
                      <span className="text-[11px] font-black text-dz-gold">{col.label}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'explorer' && (
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-2">
              <h3 className="text-lg font-black text-dz-dark dark:text-white">Explorateur de Tables</h3>
              <p className="text-xs text-slate-500 font-bold">Vérifiez l'existence et la structure d'une autre table sur votre base Supabase.</p>
            </div>

            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Nom de la table (ex: users, orders...)"
                value={explorerTable}
                onChange={(e) => setExplorerTable(e.target.value)}
                className="flex-1 bg-dz-bg dark:bg-black/40 border-2 border-dz-gold/20 rounded-xl px-4 py-3 text-sm font-bold focus:border-dz-gold outline-none transition-all dark:text-white"
              />
              <button 
                onClick={checkTable}
                disabled={isExploring || !explorerTable}
                className="bg-dz-gold text-dz-green-dark px-6 py-3 rounded-xl font-black text-xs gold-3d disabled:opacity-50"
              >
                {isExploring ? 'Vérification...' : 'Vérifier'}
              </button>
            </div>

            {explorerResult && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-6 rounded-2xl border-2 ${explorerResult.exists ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-500/20' : 'bg-red-50 dark:bg-red-900/10 border-red-500/20'}`}
              >
                {explorerResult.exists ? (
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 size={24} />
                      <span className="text-xl font-black">Table trouvée !</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white/50 dark:bg-black/20 p-4 rounded-xl">
                        <div className="text-[10px] font-black text-slate-400 uppercase">Nombre de lignes</div>
                        <div className="text-2xl font-black text-dz-dark dark:text-white">{explorerResult.count}</div>
                      </div>
                      <div className="bg-white/50 dark:bg-black/20 p-4 rounded-xl">
                        <div className="text-[10px] font-black text-slate-400 uppercase">Colonnes détectées</div>
                        <div className="text-2xl font-black text-dz-dark dark:text-white">{explorerResult.columns.length}</div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {explorerResult.columns.map((col: string) => (
                        <span key={col} className="bg-dz-gold/10 text-dz-gold px-2 py-1 rounded text-[10px] font-bold border border-dz-gold/10">{col}</span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 text-red-600 dark:text-red-400">
                    <div className="flex items-center gap-3">
                      <FileText size={24} />
                      <span className="text-xl font-black">Table non trouvée</span>
                    </div>
                    <p className="text-sm font-bold opacity-80">{explorerResult.error}</p>
                    <p className="text-xs font-bold mt-2">💡 {explorerResult.hint}</p>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        )}

        {activeTab === 'samples' && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between mb-4">
               <div className="flex flex-col gap-2">
                <h3 className="text-lg font-black text-dz-dark dark:text-white">Données Réelles (Live Data)</h3>
                <p className="text-xs text-slate-500 font-bold">Échantillon des derniers enregistrements dans la base.</p>
              </div>
              <button 
                onClick={fetchSamples}
                className="p-2 bg-dz-gold/10 text-dz-gold rounded-lg hover:bg-dz-gold/20 transition-all text-[10px] font-black"
                disabled={isLoadingSamples}
              >
                {isLoadingSamples ? 'Chargement...' : 'Actualiser'}
              </button>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-dz-gold/20 overflow-x-auto">
               <table className="w-full text-right min-w-[800px]">
                  <thead className="bg-dz-bg dark:bg-black/20 text-[10px] font-black text-dz-green uppercase tracking-widest border-b border-dz-gold/10">
                    <tr>
                      <th className="px-6 py-4">Nom du Fichier</th>
                      <th className="px-6 py-4">Matière</th>
                      <th className="px-6 py-4">Niveau</th>
                      <th className="px-6 py-4">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dz-gold/5 text-[10px]">
                    {sampleData.map((row, i) => (
                      <tr key={i} className="hover:bg-dz-bg/30 transition-colors">
                        <td className="px-6 py-3 font-bold text-dz-dark dark:text-white truncate max-w-[200px]">{row.nom_pdf || row.reference_pdf || row.name}</td>
                        <td className="px-6 py-3 font-black text-dz-green">{row.matiere}</td>
                        <td className="px-6 py-3 font-bold text-dz-gold">{row.annee || row.code_niveau}</td>
                        <td className="px-6 py-3">
                           <a 
                            href={row.lien_direct || row.lien_direct_drive || row.url} 
                            target="_blank" 
                            rel="noreferrer"
                            className="bg-dz-green/10 text-dz-green px-3 py-1 rounded-md font-black hover:bg-dz-green hover:text-white transition-colors"
                          >
                            Ouvrir
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
               </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DatabaseDashboard;
