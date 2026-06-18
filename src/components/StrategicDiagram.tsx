import React, { useMemo } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
  Cell
} from 'recharts';
import { StrategicTheme } from '../utils/analyzer';

interface StrategicDiagramProps {
  themes: StrategicTheme[];
}

const STRATEGIC_COLORS = [
  '#f43f5e', '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b',
  '#06b6d4', '#ec4899', '#14b8a6', '#6366f1', '#84cc16'
];

export const StrategicDiagram: React.FC<StrategicDiagramProps> = ({ themes }) => {
  if (themes.length === 0) {
    return (
      <div className="flex h-full min-h-[400px] items-center justify-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 p-6 text-center">
        <div className="max-w-md">
          <p className="text-slate-500 font-medium">Aucun mot-clé actif pour générer le diagramme stratégique.</p>
          <p className="text-xs text-slate-400 mt-2">Veuillez sélectionner ou ajouter des mots-clés dans le panneau latéral gauche.</p>
        </div>
      </div>
    );
  }

  // Calculate midpoints (averages or medians) to partition the quadrants
  // If there's only 1 point, use reasonable default medians
  const { avgCentrality, avgDensity } = useMemo(() => {
    if (themes.length === 0) return { avgCentrality: 0, avgDensity: 0 };
    const sumC = themes.reduce((acc, t) => acc + t.centrality, 0);
    const sumD = themes.reduce((acc, t) => acc + t.density, 0);
    return {
      avgCentrality: Math.max(sumC / themes.length || 1, 1),
      avgDensity: Math.max(sumD / themes.length || 1, 1)
    };
  }, [themes]);

  // Custom tooltips
  const { xDomain, yDomain } = useMemo(() => {
    if (themes.length === 0) return { xDomain: [0, 50], yDomain: [0, 100] };
    
    // Ensure the axes are strictly symmetric around the average to center the cross
    const maxC = Math.max(...themes.map(t => t.centrality), 10);
    const deltaC = Math.max(avgCentrality, maxC - avgCentrality);
    // Pad a little bit so outer points aren't cut off
    const padC = deltaC * 1.1;

    const maxD = Math.max(...themes.map(t => t.density), 10);
    const deltaD = Math.max(avgDensity, maxD - avgDensity);
    const padD = deltaD * 1.1;

    return { 
      xDomain: [Number((avgCentrality - padC).toFixed(1)), Number((avgCentrality + padC).toFixed(1))], 
      yDomain: [Number((avgDensity - padD).toFixed(1)), Number((avgDensity + padD).toFixed(1))] 
    };
  }, [themes, avgCentrality, avgDensity]);
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data: StrategicTheme = payload[0].payload;
      
      // Determine quadrant
      let quadrant = '';
      if (data.centrality >= avgCentrality && data.density >= avgDensity) {
        quadrant = 'Moteur (Actif & Structuré)';
      } else if (data.centrality < avgCentrality && data.density >= avgDensity) {
        quadrant = 'Niche (Spécialisé)';
      } else if (data.centrality < avgCentrality && data.density < avgDensity) {
        quadrant = 'Émergent ou En déclin';
      } else {
        quadrant = 'Basique / Transversal';
      }

      return (
        <div className="bg-slate-900 border border-slate-800 text-white p-3.5 rounded-xl shadow-xl text-xs space-y-1.5 max-w-[280px]">
          <div className="font-extrabold text-sm border-b border-slate-800 pb-1 text-indigo-400 uppercase tracking-wide">
            {data.keyword}
          </div>
          <div>
            <span className="text-slate-400 font-medium">Fréquence : </span>
            <strong className="text-slate-100 font-bold">{data.occurrences} documents</strong>
          </div>
          <div>
            <span className="text-slate-400 font-medium">Centralité : </span>
            <strong className="text-slate-100 font-bold">{data.centrality}</strong>
          </div>
          <div>
            <span className="text-slate-400 font-medium">Densité : </span>
            <strong className="text-slate-100 font-bold">{data.density}%</strong>
          </div>
          <div className="pt-1 mt-1 border-t border-slate-800/80 text-[10px] text-indigo-300 font-semibold uppercase tracking-wider">
            Quadrant : {quadrant}
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom Label element for bubbles
  const renderCustomLabel = (props: any) => {
    const { x, y, keyword, occurrences } = props;
    if (x === undefined || y === undefined) return null;
    return (
      <g>
        <text 
          x={x} 
          y={y - 12} 
          fill="#1e293b" 
          textAnchor="middle" 
          fontSize={11} 
          fontWeight={700}
          className="select-none pointer-events-none drop-shadow-xs"
        >
          {keyword}
        </text>
        <text 
          x={x} 
          y={y + 16} 
          fill="#64748b" 
          textAnchor="middle" 
          fontSize={9} 
          fontWeight={500}
          className="select-none pointer-events-none"
        >
          ({occurrences})
        </text>
      </g>
    );
  };

  return (
    <div className="relative flex flex-col h-full w-full min-h-0 bg-slate-50/50 rounded-2xl border border-slate-100 p-3 overflow-hidden">
      {/* Header and explanation */}
      <div className="mb-2 shrink-0">
        <h3 className="text-sm font-bold text-slate-800 tracking-tight flex items-center gap-1.5">
          <span className="flex h-2.5 w-2.5 rounded-full bg-indigo-500 animate-pulse"></span>
          Diagramme Stratégique de Callon (Co-Word Map)
        </h3>
        <p className="text-[11px] text-slate-500 mt-0.5">
          Visualisation bidimensionnelle classant vos concepts scientifiques selon leur <strong>Centralité</strong> (liens externes) et leur <strong>Densité</strong> (cohésion interne).
        </p>
      </div>

      <div className="relative w-full flex-1 flex items-center justify-center bg-white rounded-xl min-h-0">
        {/* The Scatter Plot Chart */}
        <div className="absolute inset-0 z-10 w-full h-full">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart
              margin={{ top: 10, right: 20, bottom: 30, left: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              
              {/* Quadrant Backgrounds */}
              <ReferenceArea 
                x1={xDomain[0]} x2={avgCentrality} y1={avgDensity} y2={yDomain[1]} 
                fill="#eef2ff" fillOpacity={0.6} 
                label={{ value: "NICHES / ISOLÉS", position: "inside", fill: "#6366f1", opacity: 0.2, fontSize: 36, fontWeight: "bold" }}
              />
              <ReferenceArea 
                x1={avgCentrality} x2={xDomain[1]} y1={avgDensity} y2={yDomain[1]} 
                fill="#ecfdf5" fillOpacity={0.6}
                label={{ value: "MOTEURS", position: "inside", fill: "#10b981", opacity: 0.2, fontSize: 36, fontWeight: "bold" }}
              />
              <ReferenceArea 
                x1={xDomain[0]} x2={avgCentrality} y1={yDomain[0]} y2={avgDensity} 
                fill="#fff1f2" fillOpacity={0.6}
                label={{ value: "DÉCLIN / ÉMERGENTS", position: "inside", fill: "#f43f5e", opacity: 0.2, fontSize: 36, fontWeight: "bold" }}
              />
              <ReferenceArea 
                x1={avgCentrality} x2={xDomain[1]} y1={yDomain[0]} y2={avgDensity} 
                fill="#fffbeb" fillOpacity={0.6}
                label={{ value: "BASIQUES", position: "inside", fill: "#f59e0b", opacity: 0.2, fontSize: 36, fontWeight: "bold" }}
              />
              
              {/* Centrality Axis */}
              <XAxis 
                type="number" 
                dataKey="centrality" 
                name="Centrality" 
                domain={xDomain}
                stroke="#64748b"
                fontSize={10}
                tickLine={false}
                label={{ 
                  value: "Degré de Centralité (Liaisons Externes) ➔", 
                  position: "bottom", 
                  offset: 20,
                  fill: "#475569", 
                  fontSize: 11,
                  fontWeight: 600
                }} 
              />
              
              {/* Density Axis */}
              <YAxis 
                type="number" 
                dataKey="density" 
                name="Density" 
                domain={yDomain}
                stroke="#64748b"
                fontSize={10}
                tickLine={false}
                label={{ 
                  value: "Degré de Densité (Structure Interne %) ➔", 
                  angle: -90, 
                  position: "left", 
                  offset: 0,
                  fill: "#475569", 
                  fontSize: 11,
                  fontWeight: 600
                }}
              />

              {/* ZAxis control size of bubble */}
              <ZAxis 
                type="number" 
                dataKey="occurrences" 
                range={[150, 900]} 
              />

              <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />

              {/* Threshold Dividers based on average */}
              <ReferenceLine 
                x={avgCentrality} 
                stroke="#94a3b8" 
                strokeWidth={1.5}
                strokeDasharray="4 4" 
              />
              <ReferenceLine 
                y={avgDensity} 
                stroke="#94a3b8" 
                strokeWidth={1.5}
                strokeDasharray="4 4" 
              />

              {/* Main themes rendering */}
              <Scatter name="Themes" data={themes} fill="#cbd5e1" isAnimationActive={false}>
                {themes.map((theme, index) => {
                  const color = STRATEGIC_COLORS[index % STRATEGIC_COLORS.length];
                  return (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={color} 
                      fillOpacity={0.65} 
                      stroke={color} 
                      strokeWidth={1.5}
                      className="cursor-pointer"
                    />
                  );
                })}
              </Scatter>

              {/* Render custom labels overlay for keywords */}
              {themes.map((theme, index) => (
                <Scatter
                  key={`label-${index}`}
                  data={[theme]}
                  isAnimationActive={false}
                  shape={(props) => renderCustomLabel({ ...props, keyword: theme.keyword, occurrences: theme.occurrences })}
                />
              ))}

            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
