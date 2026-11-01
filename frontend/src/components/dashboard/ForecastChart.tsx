'use client';

import React from 'react';
import { ForecastResponse, Metric } from '@/lib/api/types';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { TrendingUp, AlertCircle, Info } from 'lucide-react';

interface ForecastChartProps {
  forecast: ForecastResponse | null;
  historicalMetrics: Metric[];
}

export function ForecastChart({ forecast, historicalMetrics }: ForecastChartProps) {
  // If forecast is unavailable or status is insufficient_data
  if (!forecast || forecast.forecast_status === 'insufficient_data' || !forecast.forecast || forecast.forecast.length === 0) {
    return (
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">AI Visibility Forecast</h3>
              <p className="text-xs text-slate-400">Deterministic linear regression trajectory</p>
            </div>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase flex items-center gap-1">
            <AlertCircle className="h-3 w-3" /> Insufficient Data
          </span>
        </div>

        <div className="p-8 text-center rounded-lg border border-dashed border-slate-800 bg-slate-950/40">
          <Info className="h-8 w-8 text-amber-400/80 mx-auto mb-2" />
          <h4 className="text-sm font-semibold text-slate-200">More Historical Observations Required</h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
            The forecasting engine requires at least 3 distinct daily metric observations to compute a linear regression trajectory without fabricating ungrounded data.
          </p>
          <div className="mt-3 text-[11px] text-slate-500 font-mono">
            Current historical points: {historicalMetrics?.length || 0} / 3 minimum
          </div>
        </div>
      </div>
    );
  }

  // Sort historical chronologically
  const sortedHistorical = [...historicalMetrics]
    .sort((a, b) => new Date(a.metric_date).getTime() - new Date(b.metric_date).getTime());

  // Build unified chart points
  interface UnifiedPoint {
    date: string;
    historical?: number | null;
    forecast?: number | null;
  }

  const chartData: UnifiedPoint[] = [];

  sortedHistorical.forEach((m) => {
    chartData.push({
      date: m.metric_date,
      historical: m.visibility_score,
      forecast: null,
    });
  });

  // Connect the last historical point with the start of forecast
  if (sortedHistorical.length > 0 && chartData.length > 0) {
    chartData[chartData.length - 1].forecast = chartData[chartData.length - 1].historical;
  }

  forecast.forecast.forEach((f) => {
    chartData.push({
      date: f.date,
      historical: null,
      forecast: f.predicted_value,
    });
  });

  const trendDir = forecast.trend?.visibility_score?.direction || 'stable';

  return (
    <div className="glass-card p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <TrendingUp className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">AI Visibility Forecast & Trajectory</h3>
            <p className="text-xs text-slate-400">
              Historical performance combined with {forecast.forecast.length}-day linear regression projection
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs self-start sm:self-auto">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-4 rounded-full bg-indigo-500" />
            <span className="text-slate-300 font-medium">Historical (Actual)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-4 rounded-full bg-emerald-400 border-t border-dashed border-emerald-300" />
            <span className="text-emerald-300 font-medium">Forecast (Projected)</span>
          </div>
        </div>
      </div>

      {/* Regression KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-lg bg-slate-950/50 border border-slate-800 text-xs mb-5">
        <div>
          <span className="text-slate-500 block text-[10px] uppercase font-semibold">
            Observations Used
          </span>
          <span className="font-bold text-slate-200">
            {forecast.historical_points || sortedHistorical.length} daily points
          </span>
        </div>
        <div>
          <span className="text-slate-500 block text-[10px] uppercase font-semibold">
            Trajectory Trend
          </span>
          <span className="font-bold text-emerald-400 capitalize">
            {trendDir}
          </span>
        </div>
        <div>
          <span className="text-slate-500 block text-[10px] uppercase font-semibold">
            Confidence Rating
          </span>
          <span className="font-bold text-slate-200 uppercase">
            {forecast.confidence || 'low'}
          </span>
        </div>
        <div>
          <span className="text-slate-500 block text-[10px] uppercase font-semibold">
            Projected Horizon
          </span>
          <span className="font-bold text-slate-200">
            +{forecast.forecast.length} days
          </span>
        </div>
      </div>

      {/* Unified Timeline Chart */}
      <div className="h-[260px] w-full">
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
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const d = payload[0].payload as UnifiedPoint;
                  return (
                    <div className="rounded-lg border border-slate-700 bg-slate-950 p-2.5 shadow-xl text-xs">
                      <div className="text-slate-400 font-medium mb-1">{label}</div>
                      {d.historical !== null && d.historical !== undefined && (
                        <div className="text-indigo-300 font-bold">
                          Historical Actual: {Number(d.historical).toFixed(1)}%
                        </div>
                      )}
                      {d.forecast !== null && d.forecast !== undefined && (
                        <div className="text-emerald-300 font-bold">
                          Projected Forecast: {Number(d.forecast).toFixed(1)}%
                        </div>
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />
            {/* Solid line for historical */}
            <Line
              type="monotone"
              dataKey="historical"
              stroke="#6366f1"
              strokeWidth={2.5}
              dot={{ fill: '#6366f1', stroke: '#0f172a', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, fill: '#818cf8', stroke: '#fff', strokeWidth: 2 }}
              connectNulls={false}
            />
            {/* Dashed line for forecast */}
            <Line
              type="monotone"
              dataKey="forecast"
              stroke="#10b981"
              strokeWidth={2.5}
              strokeDasharray="5 5"
              dot={{ fill: '#10b981', stroke: '#0f172a', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, fill: '#34d399', stroke: '#fff', strokeWidth: 2 }}
              connectNulls={true}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
