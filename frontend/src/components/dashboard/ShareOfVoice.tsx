'use client';

import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { PieChart as PieIcon } from 'lucide-react';

interface ShareOfVoiceProps {
  shareOfVoice: number;
  brandName?: string;
}

export function ShareOfVoice({ shareOfVoice, brandName = 'Target Brand' }: ShareOfVoiceProps) {
  const brandShare = Math.min(100, Math.max(0, shareOfVoice));
  const remainingShare = Math.max(0, 100 - brandShare);

  const data = [
    { name: brandName, value: brandShare, color: '#8b5cf6' }, // Purple / Indigo
    { name: 'Remaining Entities', value: remainingShare, color: '#334155' }, // Slate 700
  ];

  return (
    <div className="glass-card p-6 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <PieIcon className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Share of Voice</h3>
            <p className="text-xs text-slate-400">% of relevant brand mentions belonging to {brandName}</p>
          </div>
        </div>
      </div>

      <div className="relative h-[220px] w-full flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={65}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
              startAngle={90}
              endAngle={-270}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} stroke="#0f172a" strokeWidth={2} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const d = payload[0].payload;
                  return (
                    <div className="rounded-lg border border-slate-700 bg-slate-950 p-2 shadow-xl text-xs">
                      <span className="font-semibold text-slate-200">{d.name}: </span>
                      <span className="text-purple-300 font-bold">{d.value.toFixed(1)}%</span>
                    </div>
                  );
                }
                return null;
              }}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-bold text-white tracking-tight">
            {brandShare.toFixed(1)}%
          </span>
          <span className="text-[10px] font-semibold text-purple-300 uppercase tracking-wider">
            Brand Share
          </span>
        </div>
      </div>

      {/* Legend & Breakdown */}
      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-800/80 text-xs">
        <div className="flex items-center gap-2 p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
          <span className="h-2.5 w-2.5 rounded-full bg-purple-500 shrink-0" />
          <div className="min-w-0">
            <span className="text-slate-300 font-medium truncate block">{brandName}</span>
            <span className="text-purple-300 font-bold">{brandShare.toFixed(1)}%</span>
          </div>
        </div>
        <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/40 border border-slate-800">
          <span className="h-2.5 w-2.5 rounded-full bg-slate-600 shrink-0" />
          <div className="min-w-0">
            <span className="text-slate-400 font-medium truncate block">Remaining Entities</span>
            <span className="text-slate-300 font-bold">{remainingShare.toFixed(1)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
