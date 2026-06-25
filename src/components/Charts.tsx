import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { MetricData } from '../types';
import { Eye, EyeOff, CheckSquare, Square, BarChart2 } from 'lucide-react';
import { cn } from '../utils/cn';

interface TrendsChartProps {
  data: MetricData[];
  activeKeywords: string[];
  topPairs: string[];
  suffix?: string;
}

const KEYWORD_COLORS = [
  '#4f46e5', '#3b82f6', '#0ea5e9', '#06b6d4', '#14b8a6', 
  '#10b981', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899'
];

const PAIR_COLORS = [
  '#f43f5e', '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#84cc16', '#22c55e', '#10b981', '#14b8a6', '#06b6d4'
];

export const TrendsChart: React.FC<TrendsChartProps> = ({
  data,
  activeKeywords,
  topPairs,
  suffix = ''
}) => {
  const [hiddenKeys, setHiddenKeys] = useState<string[]>([]);

  // Assign stable colors to each curve
  const keyConfigs = useMemo(() => {
    const configs: Record<string, { color: string; isPair: boolean }> = {};
    activeKeywords.forEach((kw, index) => {
      configs[kw] = {
        color: KEYWORD_COLORS[index % KEYWORD_COLORS.length],
        isPair: false
      };
    });
    topPairs.forEach((pair, index) => {
      configs[pair] = {
        color: PAIR_COLORS[index % PAIR_COLORS.length],
        isPair: true
      };
    });
    return configs;
  }, [activeKeywords, topPairs]);

  const allKeys = useMemo(() => {
    return [...activeKeywords, ...topPairs];
  }, [activeKeywords, topPairs]);

  const visibleKeys = useMemo(() => {
    return allKeys.filter(key => !hiddenKeys.includes(key));
  }, [allKeys, hiddenKeys]);

  if (allKeys.length === 0 || data.length === 0) {
    return (
      <div className="flex h-full min-h-[300px] items-center justify-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 p-6">
        <div className="text-center max-w-sm space-y-2">
          <BarChart2 className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="text-slate-600 font-semibold text-sm">Données insuffisantes</p>
          <p className="text-slate-400 text-xs">Sélectionnez ou ajoutez des mots-clés dans le portfolio ci-dessous pour lancer l'analyse.</p>
        </div>
      </div>
    );
  }

  const toggleKey = (key: string) => {
    setHiddenKeys(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const showAll = () => setHiddenKeys([]);
  const hideAll = () => setHiddenKeys([...allKeys]);
  const showOnlyKeywords = () => setHiddenKeys([...topPairs]);
  const showOnlyPairs = () => setHiddenKeys([...activeKeywords]);

  return (
    <div className="flex flex-col lg:flex-row h-full w-full min-h-0 gap-4 overflow-hidden">
      {/* Chart Canvas Area */}
      <div className="flex-1 flex flex-col min-h-0 bg-slate-50/40 rounded-xl p-3 border border-slate-100">
        <div className="flex-1 w-full min-h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 10, bottom: 5, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="year" 
                tick={{ fill: '#64748b', fontSize: 11, fontWeight: 'semibold' }} 
                axisLine={{ stroke: '#e2e8f0' }}
                tickLine={false}
                dy={6}
              />
              <YAxis 
                tick={{ fill: '#64748b', fontSize: 11, fontWeight: 'semibold' }} 
                axisLine={false}
                tickLine={false}
                dx={-6}
                tickFormatter={(val) => `${val}${suffix}`}
              />
              <Tooltip 
                contentStyle={{ 
                  borderRadius: '10px', 
                  border: '1px solid #e2e8f0', 
                  backgroundColor: 'rgba(255, 255, 255, 0.98)', 
                  color: '#1e293b', 
                  fontSize: '12px', 
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)' 
                }}
                itemStyle={{ padding: '2px 0' }}
                formatter={(value: any, name: string) => [`${value}${suffix}`, name]}
              />
              {visibleKeys.map((key) => {
                const config = keyConfigs[key];
                if (!config) return null;
                return (
                  <Line 
                    key={key} 
                    type="monotone" 
                    dataKey={key} 
                    stroke={config.color} 
                    strokeWidth={2.5}
                    strokeDasharray={config.isPair ? "4 4" : undefined}
                    dot={{ r: 3, strokeWidth: 1, fill: '#fff' }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Interactive Legend & Filter Panel */}
      <div className="w-full lg:w-72 shrink-0 bg-slate-50/70 border border-slate-200/60 rounded-xl p-3 flex flex-col justify-between max-h-[320px] lg:max-h-none overflow-y-auto">
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
            <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Filtres de courbes</h4>
            <div className="flex gap-1">
              <button 
                onClick={showAll} 
                className="text-[9px] font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-1.5 py-0.5 rounded transition-all"
              >
                Tout
              </button>
              <button 
                onClick={hideAll} 
                className="text-[9px] font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-1.5 py-0.5 rounded transition-all"
              >
                Aucun
              </button>
            </div>
          </div>

          {/* Quick Filters Group */}
          <div className="flex gap-1.5 justify-between">
            <button 
              onClick={showOnlyKeywords} 
              className="flex-1 text-[10px] font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200/60 py-1 px-1.5 rounded-md transition-all text-center"
            >
              Mots-clés uniquement
            </button>
            <button 
              onClick={showOnlyPairs} 
              className="flex-1 text-[10px] font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200/60 py-1 px-1.5 rounded-md transition-all text-center"
            >
              Paires uniquement
            </button>
          </div>

          {/* Keywords occurrences list */}
          {activeKeywords.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Mots-clés (Occurrences — —)</span>
              <div className="grid grid-cols-1 gap-1">
                {activeKeywords.map(kw => {
                  const isHidden = hiddenKeys.includes(kw);
                  const color = keyConfigs[kw]?.color || '#cbd5e1';
                  return (
                    <button
                      key={kw}
                      onClick={() => toggleKey(kw)}
                      className={cn(
                        "flex items-center justify-between w-full px-2 py-1 text-left text-[11px] rounded-lg transition-all border",
                        isHidden 
                          ? "bg-white text-slate-400 border-slate-100/70" 
                          : "bg-white text-slate-700 border-slate-200/60 shadow-xs hover:border-slate-300"
                      )}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span 
                          className="w-2.5 h-2.5 rounded-full shrink-0" 
                          style={{ backgroundColor: color }}
                        />
                        <span className="truncate font-semibold">{kw}</span>
                      </div>
                      {isHidden ? <EyeOff className="w-3 h-3 text-slate-300" /> : <Eye className="w-3 h-3 text-indigo-500" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Co-occurrences list */}
          {topPairs.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Liaisons (Co-occurrences - - -)</span>
              <div className="grid grid-cols-1 gap-1 max-h-[120px] lg:max-h-[220px] overflow-y-auto pr-0.5">
                {topPairs.map(pair => {
                  const isHidden = hiddenKeys.includes(pair);
                  const color = keyConfigs[pair]?.color || '#cbd5e1';
                  return (
                    <button
                      key={pair}
                      onClick={() => toggleKey(pair)}
                      className={cn(
                        "flex items-center justify-between w-full px-2 py-1 text-left text-[11px] rounded-lg transition-all border",
                        isHidden 
                          ? "bg-white text-slate-400 border-slate-100/70" 
                          : "bg-white text-slate-700 border-slate-200/60 shadow-xs hover:border-slate-300"
                      )}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span 
                          className="w-2.5 h-1 rounded-sm shrink-0" 
                          style={{ 
                            backgroundColor: color,
                            backgroundImage: `linear-gradient(to right, ${color} 50%, transparent 50%)`,
                            backgroundSize: '4px 100%' 
                          }}
                        />
                        <span className="truncate font-medium text-[10px]">{pair}</span>
                      </div>
                      {isHidden ? <EyeOff className="w-3 h-3 text-slate-300" /> : <Eye className="w-3 h-3 text-rose-500" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

