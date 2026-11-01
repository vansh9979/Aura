'use client';

import React from 'react';
import { Metric } from '@/lib/api/types';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus, Eye } from 'lucide-react';

interface VisibilityChartProps {
  metrics: Metric[];
}

export function VisibilityChart({ metrics }: VisibilityChartProps) {
  if (!metrics || metrics.length === 0) {
    return (
      <div className="glass-card p-6 flex flex-col justify-between h-[340px]">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Eye className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">AI Visibility Trend</h3>
            <p className="text-xs text-slate-400">% of analyzed AI responses mentioning the target brand</p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center flex-1 text-center py-6 text-xs text-slate-500">
          No historical visibility data recorded yet.
        </div>
      </div>
    );
  }

  // Sort chronologically ascending for timeline
  const chartData = [...metrics]
    .sort((a, b) => new Date(a.metric_date).getTime() - new Date(b.metric_date).getTime())
    .map((m) => ({
      date: m.metric_date,
      visibility: m.visibility_score,
      mentions: m.mention_count,
    }));

  const latest = chartData[chartData.length - 1];
  const previous = chartData.length > 1 ? chartData[chartData.length - 2] : null;
  const change = previous ? latest.visibility - previous.visibility : 0;

  return (
    <div className="glass-card p-6 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Eye className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">AI Visibility Trend</h3>
            <p className="text-xs text-slate-400">% of analyzed AI responses mentioning the target brand</p>
          </div>
        </div>

        {/* Latest Value & Movement Badge */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-lg font-bold text-indigo-300">
              {latest.visibility.toFixed(1)}%
            </div>
            {previous && (
              <div
                className={`text-[11px] font-medium flex items-center justify-end gap-0.5 ${
                  change > 0
                    ? 'text-emerald-400'
                    : change < 0
                    ? 'text-rose-400'
                    : 'text-slate-400'
                }`}
              >
                {change > 0 && <TrendingUp className="h-3 w-3" />}
                {change < 0 && <TrendingDown className="h-3 w-3" />}
                {change === 0 && <Minus className="h-3 w-3" />}
                {change > 0 ? '+' : ''}
                {change.toFixed(1)}% vs prior
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="h-[240px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="visibilityFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis
              dataKey="date"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#334155' }}
            />
            <YAxis
              domain={[0, 100]}
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#334155' }}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="rounded-xl border border-violet-200/20 bg-[#0b0918]/95 p-2.5 shadow-xl text-xs backdrop-blur">
                      <div className="text-slate-400 font-medium mb-1">{label}</div>
                      <div className="text-violet-200 font-bold">
                        Visibility: {Number(data.visibility).toFixed(1)}%
                      </div>
                      <div className="text-slate-400 text-[11px]">
                        Mentions: {data.mentions}
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="visibility"
              stroke="#a78bfa"
              strokeWidth={2.5}
              fill="url(#visibilityFill)"
              activeDot={{ r: 6, fill: '#c4b5fd', stroke: '#fff', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
