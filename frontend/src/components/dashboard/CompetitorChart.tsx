'use client';

import React from 'react';
import { CompetitorItem, Metric } from '@/lib/api/types';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';
import { Users } from 'lucide-react';

interface CompetitorChartProps {
  competitors: CompetitorItem[];
  targetBrand?: string;
  latestMetric?: Metric | null;
}

export function CompetitorChart({
  competitors,
  targetBrand = 'Target Brand',
  latestMetric,
}: CompetitorChartProps) {
  if ((!competitors || competitors.length === 0) && !latestMetric) {
    return (
      <div className="glass-card p-6 flex flex-col justify-between h-[340px]">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Users className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Competitor Visibility Comparison</h3>
            <p className="text-xs text-slate-400">Head-to-head visibility vs competitors across AI responses</p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center flex-1 text-center py-6 text-xs text-slate-500">
          No competitor or entity comparison data available yet.
        </div>
      </div>
    );
  }

  // Combine target brand and top competitors (up to top 5)
  const targetItem = {
    name: `${targetBrand} (Target)`,
    visibility: latestMetric ? latestMetric.visibility_score : 0,
    mentions: latestMetric ? latestMetric.mention_count : 0,
    position: latestMetric?.average_position && latestMetric.average_position > 0
      ? `#${latestMetric.average_position.toFixed(1)}`
      : 'N/A',
    isTarget: true,
  };

  const competitorItems = (competitors || []).slice(0, 5).map((comp) => ({
    name: comp.name,
    visibility: comp.visibility_percentage,
    mentions: comp.mention_count,
    position: comp.average_position ? `#${comp.average_position}` : 'N/A',
    isTarget: false,
  }));

  const chartData = [targetItem, ...competitorItems];

  return (
    <div className="glass-card p-6 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Users className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Competitor Visibility Comparison</h3>
            <p className="text-xs text-slate-400">Target brand vs top competitor visibility (%)</p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-indigo-500" />
            <span className="text-slate-300 font-medium">Target Brand</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-slate-600" />
            <span className="text-slate-400">Competitors</span>
          </div>
        </div>
      </div>

      <div className="h-[240px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
            <XAxis
              type="number"
              domain={[0, 100]}
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#334155' }}
              tickFormatter={(v) => `${v}%`}
            />
            <YAxis
              type="category"
              dataKey="name"
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#334155' }}
              width={110}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const d = payload[0].payload;
                  return (
                    <div className="rounded-lg border border-slate-700 bg-slate-950 p-2.5 shadow-xl text-xs">
                      <div className="font-semibold text-slate-200 mb-1">{d.name}</div>
                      <div className="text-indigo-300 font-bold">
                        Visibility: {Number(d.visibility).toFixed(1)}%
                      </div>
                      <div className="text-slate-400 text-[11px] mt-0.5">
                        Mentions: {d.mentions} | Avg Rank: {d.position}
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="visibility" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.isTarget ? '#6366f1' : '#475569'}
                  stroke={entry.isTarget ? '#818cf8' : '#64748b'}
                  strokeWidth={1}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
