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
  
  const [keywords, setKeywords] = useState<string[]>(DEFAULT_KEYWORDS);
  const [newKeyword, setNewKeyword] = useState('');
  const [activeTab, setActiveTab] = useState<'occurrences' | 'co-occurrences'>('occurrences');

  const handleAddKeyword = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newKeyword.trim();
    if (trimmed && !keywords.includes(trimmed)) {
      setKeywords([...keywords, trimmed]);
    }
    setNewKeyword('');
  };

  const removeKeyword = (kw: string) => {
    setKeywords(keywords.filter(k => k !== kw));
  };

  // Compute stats memoized
  const occurrencesData = useMemo(() => {
    return findOccurrences(data, keywords, columns);
  }, [data, keywords, columns]);

  const { chartData: cooccurrencesData, topPairs } = useMemo(() => {
    return findCoOccurrences(data, keywords, columns, 10);
  }, [data, keywords, columns]);

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
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 shrink-0">2. Portfolio de Mots-clés</h3>
            <div className="flex flex-wrap gap-2 mb-4 overflow-y-auto pr-1">
              {keywords.map(kw => (
                <div key={kw} className="flex items-center gap-1.5 px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs border border-indigo-200 font-medium group transition-colors">
                  <span>{kw}</span>
                  <button 
                    onClick={() => removeKeyword(kw)}
                    className="text-indigo-400 hover:text-indigo-900 focus:outline-none transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
            <form onSubmit={handleAddKeyword} className="relative mt-auto shrink-0">
              <input 
                type="text" 
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                placeholder="Ajouter un mot-clé..." 
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-shadow"
              />
              <button 
                type="submit"
                disabled={!newKeyword.trim()}
                className="absolute right-2 top-2 text-indigo-600 font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:text-indigo-800 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </form>
          </section>
        </aside>

        {/* Content Area */}
        <div className="flex-1 flex flex-col p-6 space-y-6 overflow-y-auto">
          {/* Top Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 shrink-0">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
              <p className="text-xs text-slate-500 font-medium mb-1">Mots-clés Actifs</p>
              <p className="text-3xl font-bold text-slate-900 tracking-tight">{keywords.length}</p>
              <p className="text-[10px] text-indigo-600 mt-2 font-bold uppercase tracking-wider">Ciblage Précis</p>
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

          <div className="flex p-1 bg-white border border-slate-200 rounded-lg w-fit shrink-0 shadow-sm">
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

          {/* Main Chart Visualization */}
          <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col min-h-[400px]">
            {activeTab === 'occurrences' ? (
              <TrendsChart 
                data={occurrencesData} 
                dataKeys={keywords} 
                title=""
              />
            ) : (
              <TrendsChart 
                data={cooccurrencesData} 
                dataKeys={topPairs} 
                title="" 
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
