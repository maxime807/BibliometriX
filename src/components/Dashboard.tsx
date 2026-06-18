import React, { useState, useMemo } from 'react';
import { DocumentRecord, ActiveColumns } from '../types';
import { findOccurrences, findCoOccurrences } from '../utils/analyzer';
import { TrendsChart } from './Charts';
import { Plus, X } from 'lucide-react';
import { cn } from '../utils/cn';

interface DashboardProps {
  data: DocumentRecord[];
  onReset: () => void;
}

const DEFAULT_KEYWORDS = [
  "environment*", "cancer*", "child*", "pollution", "toxicity", 
  "tumor", "pediatric", "health", "exposure", "risk", 
  "prevention", "clinical", "disease"
];

export const Dashboard: React.FC<DashboardProps> = ({ data, onReset }) => {
  const [columns, setColumns] = useState<ActiveColumns>({
    title: true,
    abstract: true,
    keywords: true,
  });
  
  const [availableKeywords, setAvailableKeywords] = useState<string[]>(DEFAULT_KEYWORDS);
  const [activeKeywords, setActiveKeywords] = useState<string[]>([]);
  const [useWildcard, setUseWildcard] = useState(false);
  const [metricMode, setMetricMode] = useState<'absolute' | 'percentage'>('absolute');
  const [newKeyword, setNewKeyword] = useState('');
  const [activeTab, setActiveTab] = useState<'occurrences' | 'co-occurrences'>('occurrences');

  const handleAddKeyword = (e: React.FormEvent) => {
    e.preventDefault();
    let trimmed = newKeyword.trim();
    if (trimmed) {
      if (useWildcard && !trimmed.endsWith('*')) {
        trimmed += '*';
      }
      // Add to available if not present
      if (!availableKeywords.includes(trimmed)) {
        setAvailableKeywords([...availableKeywords, trimmed]);
      }
      // Activate instantly
      if (!activeKeywords.includes(trimmed)) {
        setActiveKeywords([...activeKeywords, trimmed]);
      }
    }
    setNewKeyword('');
  };

  const removeKeywordFromAvailable = (kw: string) => {
    setAvailableKeywords(availableKeywords.filter(k => k !== kw));
    setActiveKeywords(activeKeywords.filter(k => k !== kw));
  };

  const toggleKeyword = (kw: string) => {
    if (activeKeywords.includes(kw)) {
      setActiveKeywords(activeKeywords.filter(k => k !== kw));
    } else {
      setActiveKeywords([...activeKeywords, kw]);
    }
  };

  // Compute stats memoized using only active keywords
  const occurrencesData = useMemo(() => {
    return findOccurrences(data, activeKeywords, columns);
  }, [data, activeKeywords, columns]);

  const { chartData: cooccurrencesData, topPairs } = useMemo(() => {
    return findCoOccurrences(data, activeKeywords, columns, 10);
  }, [data, activeKeywords, columns]);

  const processedChartData = useMemo(() => {
    const rawData = activeTab === 'occurrences' ? occurrencesData : cooccurrencesData;
    if (metricMode === 'absolute') {
      return rawData;
    }
    // Relative %: percentage of documents in that year
    return rawData.map(item => {
      const totalDocs = (item._totalDocs as number) || 1;
      const convertedItem: typeof item = { year: item.year };
      Object.keys(item).forEach(key => {
        if (key !== 'year' && key !== '_totalDocs') {
          const val = item[key];
          if (typeof val === 'number') {
            convertedItem[key] = parseFloat(((val / totalDocs) * 100).toFixed(1));
          }
        }
      });
      return convertedItem;
    });
  }, [occurrencesData, cooccurrencesData, metricMode, activeTab]);

  return (
    <div className="flex flex-col h-full w-full overflow-hidden font-sans text-slate-800 bg-slate-50">
      {/* Top Navigation Bar */}
      <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-white rotate-45"></div>
          </div>
          <h1 className="text-lg font-bold tracking-tight text-slate-900">LexiTrend <span className="text-indigo-600">Analytic</span></h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-xs font-medium px-3 py-1 bg-green-50 text-green-700 border border-green-200 rounded-full">
            {data.length} document{data.length > 1 ? 's' : ''} traités
          </div>
          <button 
            onClick={onReset}
            className="px-4 py-1.5 text-sm font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
          >
            Nouveau Fichier
          </button>
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden">
        {/* Sidebar Controls */}
        <aside className="w-72 bg-white border-r border-slate-200 flex flex-col p-5 shrink-0 overflow-y-auto">
          <section className="mb-8 shrink-0">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">1. Colonnes de Recherche</h3>
            <div className="space-y-3">
              {(Object.keys(columns) as Array<keyof ActiveColumns>).map((col) => (
                <label key={col} className="flex items-center gap-3 text-sm cursor-pointer group">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 transition-colors"
                    checked={columns[col]}
                    onChange={() => setColumns({...columns, [col]: !columns[col]})}
                  />
                  <span className="capitalize text-slate-700 font-medium group-hover:text-slate-900 transition-colors">{col === "title" ? "Titres" : col === "abstract" ? "Résumés" : "Mots-clés"}</span>
                </label>
              ))}
            </div>
          </section>

          <section className="flex-1 flex flex-col min-h-0">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 shrink-0">2. Portfolio de Mots-clés</h3>
            <p className="text-[11px] text-slate-400 mb-3 shrink-0">Cliquez sur un mot-clé pour l'analyser ou le désactiver.</p>
            <div className="flex-1 flex flex-wrap gap-2 mb-4 overflow-y-auto pr-1 content-start align-start">
              {availableKeywords.map(kw => {
                const isActive = activeKeywords.includes(kw);
                return (
                  <div
                    key={kw}
                    onClick={() => toggleKeyword(kw)}
                    className={cn(
                      "flex items-center gap-1.5 px-2 py-1.5 rounded-full text-xs font-semibold cursor-pointer select-none transition-all border",
                      isActive 
                        ? "bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700 shadow-sm" 
                        : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                    )}
                  >
                    <span>{kw}</span>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        removeKeywordFromAvailable(kw);
                      }}
                      className={cn(
                        "ml-1 font-bold rounded-full p-0.5 transition-colors",
                        isActive ? "text-indigo-200 hover:text-white" : "text-slate-400 hover:text-slate-700"
                      )}
                      title="Supprimer du portfolio"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
            <form onSubmit={handleAddKeyword} className="relative mt-auto shrink-0 border-t border-slate-100 pt-3">
              <div className="flex gap-2 mb-2">
                <input 
                  type="text" 
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  placeholder="Nouveau terme..." 
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-shadow"
                />
                <button 
                  type="submit"
                  disabled={!newKeyword.trim()}
                  className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input 
                  type="checkbox"
                  checked={useWildcard}
                  onChange={(e) => setUseWildcard(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500"
                />
                <span className="text-[11px] text-slate-500 font-medium">Variantes incluses (Ajouter *)</span>
              </label>
            </form>
          </section>
        </aside>

        {/* Content Area */}
        <div className="flex-1 flex flex-col p-6 space-y-6 overflow-y-auto">
          {/* Top Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 shrink-0">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
              <p className="text-xs text-slate-500 font-medium mb-1">Mots-clés Actifs</p>
              <p className="text-3xl font-bold text-slate-900 tracking-tight">{activeKeywords.length}</p>
              <p className="text-[10px] text-indigo-600 mt-2 font-bold uppercase tracking-wider">Ciblage Actif</p>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
              <p className="text-xs text-slate-500 font-medium mb-1">Paires de Co-occurrences</p>
              <p className="text-3xl font-bold text-slate-900 tracking-tight">{topPairs.length > 0 ? topPairs.length : 0}</p>
              <p className="text-[10px] text-indigo-600 mt-2 font-bold uppercase tracking-wider">Top Associations</p>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hidden lg:block">
              <p className="text-xs text-slate-500 font-medium mb-1">Années Analysées</p>
              <p className="text-3xl font-bold text-slate-900 tracking-tight">{occurrencesData.length > 0 ? occurrencesData.length : 0}</p>
              <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase tracking-wider">Période Temporelle</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between shrink-0">
            <div className="flex p-1 bg-white border border-slate-200 rounded-lg w-fit shadow-sm">
              <button
                onClick={() => setActiveTab('occurrences')}
                className={cn(
                  "px-4 py-1.5 rounded-md text-sm font-semibold transition-all duration-200",
                  activeTab === 'occurrences' 
                    ? "bg-slate-100 text-slate-900" 
                    : "text-slate-500 hover:text-slate-700"
                )}
              >
                Évolution des Occurrences
              </button>
              <button
                onClick={() => setActiveTab('co-occurrences')}
                className={cn(
                  "px-4 py-1.5 rounded-md text-sm font-semibold transition-all duration-200",
                  activeTab === 'co-occurrences' 
                    ? "bg-slate-100 text-slate-900" 
                    : "text-slate-500 hover:text-slate-700"
                )}
              >
                Tendances de Co-occurrences (Top 10)
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Affichage :</span>
              <div className="flex p-1 bg-white border border-slate-200 rounded-lg shadow-sm">
                <button
                  onClick={() => setMetricMode('absolute')}
                  className={cn(
                    "px-3 py-1 rounded-md text-xs font-bold transition-all duration-200",
                    metricMode === 'absolute'
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  Valeurs entières
                </button>
                <button
                  onClick={() => setMetricMode('percentage')}
                  className={cn(
                    "px-3 py-1 rounded-md text-xs font-bold transition-all duration-200",
                    metricMode === 'percentage'
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  Pourcentage %
                </button>
              </div>
            </div>
          </div>

          {/* Main Chart Visualization */}
          <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col min-h-[400px]">
            {activeTab === 'occurrences' ? (
              <TrendsChart 
                data={processedChartData} 
                dataKeys={activeKeywords} 
                title=""
                suffix={metricMode === 'percentage' ? '%' : ''}
              />
            ) : (
              <TrendsChart 
                data={processedChartData} 
                dataKeys={topPairs} 
                title="" 
                suffix={metricMode === 'percentage' ? '%' : ''}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
