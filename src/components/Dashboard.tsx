import React, { useState, useMemo } from 'react';
import { DocumentRecord, ActiveColumns, MetricData } from '../types';
import { findOccurrences, findCoOccurrences, calculateStrategicThemes } from '../utils/analyzer';
import { TrendsChart } from './Charts';
import { StrategicDiagram } from './StrategicDiagram';
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
  const [activeTab, setActiveTab] = useState<'trends' | 'strategic'>('trends');
  const [isVolumeOpen, setIsVolumeOpen] = useState(false);
  const [isStateLoaded, setIsStateLoaded] = useState(false);

  // Load state from IndexedDB
  React.useEffect(() => {
    import('idb-keyval').then(idb => {
      idb.get('analysis-state').then(state => {
        if (state) {
          if (state.columns !== undefined) setColumns(state.columns);
          if (state.availableKeywords !== undefined) setAvailableKeywords(state.availableKeywords);
          if (state.activeKeywords !== undefined) setActiveKeywords(state.activeKeywords);
          if (state.metricMode !== undefined) setMetricMode(state.metricMode);
          if (state.activeTab !== undefined) {
            const tab = state.activeTab;
            setActiveTab(tab === 'occurrences' || tab === 'co-occurrences' ? 'trends' : tab);
          }
        }
        setIsStateLoaded(true);
      });
    });
  }, []);

  // Save state to IndexedDB
  React.useEffect(() => {
    if (isStateLoaded) {
      import('idb-keyval').then(idb => {
        idb.set('analysis-state', {
          columns,
          availableKeywords,
          activeKeywords,
          metricMode,
          activeTab
        });
      });
    }
  }, [columns, availableKeywords, activeKeywords, metricMode, activeTab, isStateLoaded]);

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

  // Combine occurrences and co-occurrences for the single graph
  const combinedTrendsData = useMemo(() => {
    const years = Array.from(new Set([
      ...occurrencesData.map(d => d.year),
      ...cooccurrencesData.map(d => d.year)
    ])).sort((a, b) => parseInt(a) - parseInt(b));

    return years.map(yr => {
      const occItem = occurrencesData.find(d => d.year === yr) || {};
      const coItem = cooccurrencesData.find(d => d.year === yr) || {};
      
      const merged: Record<string, number | string> = { year: yr };
      
      // Merge all keys from occItem
      Object.keys(occItem).forEach(key => {
        if (key !== 'year') merged[key] = occItem[key];
      });
      // Merge all keys from coItem
      Object.keys(coItem).forEach(key => {
        if (key !== 'year') merged[key] = coItem[key];
      });

      // Ensure _totalDocs is computed correctly
      merged._totalDocs = occItem._totalDocs || coItem._totalDocs || 1;
      
      return merged as MetricData;
    });
  }, [occurrencesData, cooccurrencesData]);

  const processedChartData = useMemo(() => {
    if (metricMode === 'absolute') {
      return combinedTrendsData;
    }
    // Relative %: percentage of documents in that year
    return combinedTrendsData.map(item => {
      const totalDocs = (item._totalDocs as number) || 1;
      const convertedItem: Record<string, number | string> = { year: item.year };
      Object.keys(item).forEach(key => {
        if (key !== 'year' && key !== '_totalDocs') {
          const val = item[key];
          if (typeof val === 'number') {
            convertedItem[key] = parseFloat(((val / totalDocs) * 100).toFixed(1));
          }
        }
      });
      return convertedItem as MetricData;
    });
  }, [combinedTrendsData, metricMode]);

  const strategicThemes = useMemo(() => {
    return calculateStrategicThemes(data, activeKeywords, columns);
  }, [data, activeKeywords, columns]);

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

      <main className="flex flex-col flex-1 overflow-hidden">
        {/* Full-width upper area with statistics, toggles and visualization canvas */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          
          {/* Top Header Row with Cards and Controls */}
          <div className="flex flex-col xl:flex-row gap-4 shrink-0">
            {/* Top Stats Cards (Dense) */}
            <div className="flex flex-1 gap-3">
              <div className="bg-white p-3 rounded-xl shadow-xs border border-slate-100 flex-1 flex flex-col justify-center">
                <div className="flex justify-between items-baseline">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Mots-clés Actifs</p>
                  <p className="text-xl font-extrabold text-slate-900 tracking-tight">{activeKeywords.length}</p>
                </div>
                <p className="text-[9px] text-indigo-500 font-semibold mt-0.5">Ciblage Graphe</p>
              </div>
              <div className="bg-white p-3 rounded-xl shadow-xs border border-slate-100 flex-1 flex flex-col justify-center">
                <div className="flex justify-between items-baseline">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Co-occurences</p>
                  <p className="text-xl font-extrabold text-slate-900 tracking-tight">{topPairs.length > 0 ? topPairs.length : 0}</p>
                </div>
                <p className="text-[9px] text-indigo-500 font-semibold mt-0.5">Top Liaisons</p>
              </div>
              <div className="bg-white p-3 rounded-xl shadow-xs border border-slate-100 flex-1 flex flex-col justify-center">
                <div className="flex justify-between items-baseline">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Années</p>
                  <p className="text-xl font-extrabold text-slate-900 tracking-tight">{occurrencesData.length > 0 ? occurrencesData.length : 0}</p>
                </div>
                <p className="text-[9px] text-slate-400 font-semibold mt-0.5">Période Active</p>
              </div>
            </div>

            {/* Chart Header Options & Controls */}
            <div className="flex items-center gap-3 shrink-0 bg-white p-2 rounded-xl shadow-xs border border-slate-100 self-start xl:self-stretch">
              <div className="flex bg-slate-50 p-1 rounded-lg border border-slate-200/60">
                <button
                  onClick={() => setActiveTab('trends')}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-[11px] font-bold transition-all duration-200",
                    activeTab === 'trends' 
                      ? "bg-white text-slate-900 shadow-xs border border-slate-200/50" 
                      : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  📊 Évolution & Co-occurrences
                </button>
                <button
                  onClick={() => setActiveTab('strategic')}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-[11px] font-bold transition-all duration-200",
                    activeTab === 'strategic' 
                      ? "bg-white text-slate-900 shadow-xs border border-slate-200/50" 
                      : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  🗺️ Callon
                </button>
              </div>

              {activeTab !== 'strategic' && (
                <div className="flex items-center gap-1.5 pl-2 border-l border-slate-100">
                  <div className="flex bg-slate-50 p-1 rounded-lg border border-slate-200/60">
                    <button
                      onClick={() => setMetricMode('absolute')}
                      className={cn(
                        "px-2.5 py-1 rounded-md text-[10px] font-bold transition-all duration-200",
                        metricMode === 'absolute'
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "text-slate-500 hover:text-slate-700"
                      )}
                    >
                      #
                    </button>
                    <button
                      onClick={() => setMetricMode('percentage')}
                      className={cn(
                        "px-2.5 py-1 rounded-md text-[10px] font-bold transition-all duration-200",
                        metricMode === 'percentage'
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "text-slate-500 hover:text-slate-700"
                      )}
                    >
                      %
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Main Chart Canvas Display Area (Flex-1 to take all remaining space) */}
          <div className="flex-1 w-full bg-white rounded-2xl shadow-xs border border-slate-100 p-4 flex flex-col min-h-0">
            {activeTab === 'trends' ? (
              <TrendsChart 
                data={processedChartData} 
                activeKeywords={activeKeywords}
                topPairs={topPairs}
                suffix={metricMode === 'percentage' ? '%' : ''}
              />
            ) : (
              <StrategicDiagram themes={strategicThemes} />
            )}
          </div>

          {/* Resolved Year Distribution Layout - No negative space, wraps cleanly as cards under header */}
          {occurrencesData.length > 0 && (
            <div className="bg-white rounded-xl shadow-xs border border-slate-100 px-4 py-2 shrink-0 transition-all duration-300">
              <button 
                onClick={() => setIsVolumeOpen(!isVolumeOpen)}
                className="w-full text-left focus:outline-none"
              >
                <div className={cn("text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center justify-between gap-2", isVolumeOpen ? "border-b border-slate-100 pb-2" : "")}>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-indigo-500"></span>
                    Volume annuel documentaire total (Bilan d'archivage)
                  </div>
                  <span className="text-slate-400 font-bold px-2 py-0.5 rounded-full bg-slate-50 border border-slate-200 text-[9px]">
                    {isVolumeOpen ? 'Masquer' : 'Afficher Détails'}
                  </span>
                </div>
              </button>
              {isVolumeOpen && (
                <div className="flex flex-wrap gap-1.5 text-[11px] mt-2 max-h-[80px] overflow-y-auto">
                  {occurrencesData.map(item => (
                    <span 
                      key={item.year} 
                      className="inline-flex items-center gap-1 bg-slate-50 hover:bg-slate-100 border border-slate-200/50 rounded-full px-2 py-0.5 transition-colors"
                    >
                      <span className="text-slate-900 font-extrabold">{item.year}</span>
                      <span className="text-slate-300">|</span>
                      <span className="text-indigo-600 font-bold">{item._totalDocs || 0}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Horizontal Dashboard Control Center (Fixed & Dense) */}
        <footer className="bg-white border-t border-slate-200 px-4 py-3 shrink-0 w-full z-20 shadow-md">
          <div className="w-full flex flex-col lg:flex-row gap-4 items-stretch justify-between h-full min-h-0">
            
            {/* Control 1: Research targets (Checkboxes) */}
            <div className="lg:w-1/6 flex flex-col justify-center border-r border-slate-100 pr-3">
              <h3 className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">1. Cibles</h3>
              <div className="flex flex-wrap lg:flex-col gap-x-4 gap-y-0.5">
                {(Object.keys(columns) as Array<keyof ActiveColumns>).map((col) => (
                  <label key={col} className="flex items-center gap-1.5 text-[11px] font-semibold cursor-pointer select-none group text-slate-600 hover:text-slate-900 transition-colors">
                    <input 
                      type="checkbox" 
                      className="w-3 h-3 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 transition-colors"
                      checked={columns[col]}
                      onChange={() => setColumns({...columns, [col]: !columns[col]})}
                    />
                    <span className="capitalize leading-none">{col === "title" ? "Titres" : col === "abstract" ? "Résumés" : "Mots-clés"}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Control 2: Portfolio of keywords (Pillboard of activation/deactivation) */}
            <div className="flex-1 flex flex-col justify-start min-h-0 px-2 border-r border-slate-100 pr-3">
              <div className="flex justify-between items-center mb-1.5 shrink-0">
                <h3 className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">2. Portfolio Mots-clés</h3>
                <span className="text-[9px] text-slate-400 font-medium">Cliquez pour basculer</span>
              </div>
              <div className="flex-1 overflow-y-auto max-h-[70px] flex flex-wrap gap-1 content-start align-start pr-1">
                {availableKeywords.length === 0 ? (
                  <p className="text-slate-400 text-[10px] italic">Aucun mot-clé disponible.</p>
                ) : (
                  availableKeywords.map(kw => {
                    const isActive = activeKeywords.includes(kw);
                    return (
                      <div
                        key={kw}
                        onClick={() => toggleKeyword(kw)}
                        className={cn(
                          "flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer select-none transition-all border",
                          isActive 
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-xs" 
                            : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200"
                        )}
                        title={isActive ? "Mot actif (cliquez pour désactiver)" : "Mot inactif (cliquez pour activer)"}
                      >
                        <span className="mr-0.5 opacity-80">{isActive ? "●" : "○"}</span>
                        <span>{kw}</span>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            removeKeywordFromAvailable(kw);
                          }}
                          className={cn(
                            "ml-0.5 font-bold rounded-sm px-0.5 transition-colors",
                            isActive ? "text-indigo-300 hover:text-white" : "text-slate-400 hover:text-slate-700"
                          )}
                          title="Supprimer"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Control 3: New Keyword input + Wildcard search selectors (Action hub) */}
            <div className="lg:w-1/4 flex flex-col justify-center pl-2">
              <h3 className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">3. Ajouter Terme</h3>
              <form onSubmit={handleAddKeyword} className="space-y-1.5">
                <div className="flex gap-1.5">
                  <input 
                    type="text" 
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    placeholder="Ex: Clinic* ou Cancer" 
                    className="flex-1 text-[11px] border border-slate-200 rounded-md px-2 py-1 bg-slate-50 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                  <button 
                    type="submit"
                    disabled={!newKeyword.trim()}
                    className="bg-indigo-600 text-white px-2 py-1 rounded-md hover:bg-indigo-700 disabled:opacity-50 transition-colors shrink-0 flex items-center justify-center shadow-xs"
                    title="Ajouter"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input 
                    type="checkbox"
                    checked={useWildcard}
                    onChange={(e) => setUseWildcard(e.target.checked)}
                    className="w-2.5 h-2.5 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500"
                  />
                  <span className="text-[9px] text-slate-500 font-semibold">Inclure les variantes (Ajout *)</span>
                </label>
              </form>
            </div>

          </div>
        </footer>
      </main>
    </div>
  );
};
