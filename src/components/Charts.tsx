import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { MetricData } from '../types';

interface ChartsProps {
  data: MetricData[];
  dataKeys: string[];
  title: string;
  colors?: string[];
  suffix?: string;
}

const DEFAULT_COLORS = [
  '#4f46e5', '#ec4899', '#0ea5e9', '#14b8a6', '#f59e0b', 
  '#ef4444', '#8b5cf6', '#10b981', '#3b82f6', '#f43f5e'
];

export const TrendsChart: React.FC<ChartsProps> = ({ data, dataKeys, title, colors = DEFAULT_COLORS, suffix = '' }) => {
  if (dataKeys.length === 0 || data.length === 0) {
    return (
      <div className="flex h-full min-h-[300px] items-center justify-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
        <p className="text-slate-500 text-sm font-medium">Données insuffisantes ou aucun mot-clé sélectionné.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full min-h-[300px]">
      {title && <h3 className="text-lg font-bold text-slate-900 mb-4">{title}</h3>}
      <div className="flex-1 w-full pt-4 pr-6 pb-2 pl-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
            <XAxis 
              dataKey="year" 
              tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }} 
              axisLine={{ stroke: '#f1f5f9' }}
              tickLine={false}
              dy={10}
            />
            <YAxis 
              tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }} 
              axisLine={false}
              tickLine={false}
              dx={-10}
              tickFormatter={(val) => `${val}${suffix}`}
            />
            <Tooltip 
              contentStyle={{ borderRadius: '8px', border: 'none', backgroundColor: '#0f172a', color: '#fff', fontSize: '12px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              itemStyle={{ color: '#fff' }}
              formatter={(value: any, name: string) => [`${value}${suffix}`, name]}
            />
            <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
            {dataKeys.map((key, i) => (
              <Line 
                key={key} 
                type="monotone" 
                dataKey={key} 
                stroke={colors[i % colors.length]} 
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
