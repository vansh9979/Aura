import React from 'react';
import { ForecastResponse } from '@/lib/api/types';
import { TrendingUp, TrendingDown, Minus, AlertCircle, Calendar } from 'lucide-react';

interface ForecastSummaryCardProps {
  forecast: ForecastResponse | null;
}

export function ForecastSummaryCard({ forecast }: ForecastSummaryCardProps) {
  if (!forecast) {
    return null;
  }

  const direction =
    forecast.trend?.visibility_score?.direction ||
    (forecast.forecast_status === 'insufficient_data' ? 'insufficient_data' : 'stable');

  const getTrendBadge = () => {
    switch (direction?.toLowerCase()) {
      case 'improving':
      case 'upward':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
            <TrendingUp className="h-3 w-3" /> Improving Trend
          </span>
        );
      case 'declining':
      case 'downward':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase">
            <TrendingDown className="h-3 w-3" /> Declining Trend
          </span>
        );
      case 'stable':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/30 uppercase">
            <Minus className="h-3 w-3" /> Stable
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
            <AlertCircle className="h-3 w-3" /> Insufficient Data
          </span>
        );
    }
  };

  const visTrend = forecast.trend?.visibility_score;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-xs p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <TrendingUp className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">AI Visibility Forecast</h3>
            <p className="text-xs text-slate-400">
              Deterministic {forecast.forecast?.length || 7}-day linear regression trajectory
            </p>
          </div>
        </div>
        <div>{getTrendBadge()}</div>
      </div>

      {/* Regression Statistics Banner */}
      <div className="grid grid-cols-3 gap-3 p-3.5 rounded-lg bg-slate-950/40 border border-slate-800/80 text-xs mb-4">
        <div>
          <span className="text-slate-500 block text-[10px] uppercase font-semibold">
            History Points
          </span>
          <span className="font-semibold text-slate-200">
            {forecast.historical_points || 0} observations
          </span>
        </div>
        <div>
          <span className="text-slate-500 block text-[10px] uppercase font-semibold">
            Change vs First
          </span>
          <span
            className={`font-semibold ${
              visTrend && visTrend.absolute_change > 0
                ? 'text-emerald-400'
                : visTrend && visTrend.absolute_change < 0
                ? 'text-rose-400'
                : 'text-slate-200'
            }`}
          >
            {visTrend
              ? `${visTrend.absolute_change > 0 ? '+' : ''}${visTrend.absolute_change.toFixed(1)}%`
              : 'N/A'}
          </span>
        </div>
        <div>
          <span className="text-slate-500 block text-[10px] uppercase font-semibold">
            Confidence
          </span>
          <span className="font-semibold text-slate-200 uppercase text-[11px]">
            {forecast.confidence || 'low'}
          </span>
        </div>
      </div>

      {forecast.message && (
        <p className="text-xs text-slate-400 mb-4 bg-slate-950/30 p-2.5 rounded border border-slate-800/60 leading-relaxed">
          {forecast.message}
        </p>
      )}

      {/* Forecast Points Table */}
      {(!forecast.forecast || forecast.forecast.length === 0) ? (
        <div className="text-center py-6 text-xs text-slate-500">
          At least 3 historical data points are needed to compute linear forecast.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="pb-2 font-medium">Target Date</th>
                <th className="pb-2 font-medium text-right">Predicted Visibility</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {forecast.forecast.map((pt) => (
                <tr key={pt.date} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-2.5 font-medium text-slate-200 flex items-center gap-1.5">
                    <Calendar className="h-3 w-3 text-slate-500" />
                    {pt.date}
                  </td>
                  <td className="py-2.5 text-right font-bold text-emerald-300">
                    {pt.predicted_value.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
