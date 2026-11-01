'use client';

import React from 'react';
import { Metric } from '@/lib/api/types';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus, Smile } from 'lucide-react';

interface SentimentChartProps {
  metrics: Metric[];
}

export function SentimentChart({ metrics }: SentimentChartProps) {
  if (!metrics || metrics.length === 0) {
    return (
      <div className="glass-card p-6 flex flex-col justify-between h-[340px]">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Smile className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Brand Sentiment Trend</h3>
            <p className="text-xs text-slate-400">Average perceived sentiment score (0–100)</p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center flex-1 text-center py-6 text-xs text-slate-500">
          No historical sentiment data recorded yet.
        </div>
      </div>
    );
  }

  // Sort chronologically ascending
  const chartData = [...metrics]
    .sort((a, b) => new Date(a.metric_date).getTime() - new Date(b.metric_date).getTime())
    .map((m) => ({
      date: m.metric_date,
      sentiment: m.sentiment_score ?? 0,
    }));

  const latest = chartData[chartData.length - 1];
  const previous = chartData.length > 1 ? chartData[chartData.length - 2] : null;
  const change = previous ? latest.sentiment - previous.sentiment : 0;

  return (
    <div className="glass-card p-6 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Smile className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Brand Sentiment Trend</h3>
            <p className="text-xs text-slate-400">Average perceived sentiment score (0–100)</p>
          </div>
        </div>

        {/* Latest Value & Movement Badge */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-lg font-bold text-emerald-300">
              {latest.sentiment.toFixed(1)} / 100
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
                {change.toFixed(1)} pts vs prior
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="h-[240px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const val = Number(payload[0].value);
                  return (
                    <div className="rounded-lg border border-slate-700 bg-slate-950 p-2.5 shadow-xl text-xs">
                      <div className="text-slate-400 font-medium mb-1">{label}</div>
                      <div className="text-emerald-300 font-bold">
                        Sentiment: {val.toFixed(1)} / 100
                      </div>
                      <div className="text-slate-400 text-[11px]">
                        {val >= 60 ? 'Positive Perception' : val <= 40 ? 'Negative Perception' : 'Neutral Perception'}
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Line
              type="monotone"
              dataKey="sentiment"
              stroke="#10b981"
              strokeWidth={2.5}
              dot={{ fill: '#10b981', stroke: '#0f172a', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, fill: '#34d399', stroke: '#fff', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
