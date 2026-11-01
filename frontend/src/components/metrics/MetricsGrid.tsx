import React from 'react';
import { Metric } from '@/lib/api/types';
import { MetricCard } from './MetricCard';
import {
  Eye,
  ListOrdered,
  Smile,
  PieChart,
  MessageSquareQuote,
} from 'lucide-react';

interface MetricsGridProps {
  latestMetric: Metric | null;
  previousMetric?: Metric | null;
}

export function MetricsGrid({ latestMetric, previousMetric }: MetricsGridProps) {
  // Helpers to compute trend between latest and previous metric if available
  const getTrend = (current?: number | null, prev?: number | null) => {
    if (current == null || prev == null) return undefined;
    if (current > prev) return 'up';
    if (current < prev) return 'down';
    return 'neutral';
  };

  const getTrendLabel = (current?: number | null, prev?: number | null, suffix = '') => {
    if (current == null || prev == null) return undefined;
    const diff = current - prev;
    if (diff === 0) return 'No change vs prior';
    const sign = diff > 0 ? '+' : '';
    return `${sign}${diff.toFixed(1)}${suffix} vs prior`;
  };

  const visibilityTrend = getTrend(
    latestMetric?.visibility_score,
    previousMetric?.visibility_score
  );
  const visibilityTrendLabel = getTrendLabel(
    latestMetric?.visibility_score,
    previousMetric?.visibility_score,
    '%'
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {/* 1. AI Visibility */}
      <MetricCard
        title="AI Visibility"
        value={
          latestMetric?.visibility_score != null
            ? `${latestMetric.visibility_score.toFixed(1)}%`
            : '0.0%'
        }
        numericValue={latestMetric?.visibility_score ?? 0}
        formatValue={(n) => `${n.toFixed(1)}%`}
        subtitle="% of analyzed AI responses mentioning the target brand"
        icon={<Eye className="h-4 w-4" />}
        colorScheme="indigo"
        trend={visibilityTrend}
        trendLabel={visibilityTrendLabel}
      />

      {/* 2. Average Position */}
      <MetricCard
        title="Avg Position"
        value={
          latestMetric?.average_position != null && latestMetric.average_position > 0
            ? `#${latestMetric.average_position.toFixed(1)}`
            : 'N/A'
        }
        numericValue={
          latestMetric?.average_position != null && latestMetric.average_position > 0
            ? latestMetric.average_position
            : undefined
        }
        formatValue={(n) => (n > 0 ? `#${n.toFixed(1)}` : 'N/A')}
        subtitle="Average first-mention position"
        icon={<ListOrdered className="h-4 w-4" />}
        colorScheme="sky"
      />

      {/* 3. Sentiment */}
      <MetricCard
        title="Sentiment"
        value={
          latestMetric?.sentiment_score != null
            ? `${latestMetric.sentiment_score >= 0 ? '+' : ''}${latestMetric.sentiment_score.toFixed(2)}`
            : 'N/A'
        }
        numericValue={
          latestMetric?.sentiment_score != null
            ? latestMetric.sentiment_score
            : undefined
        }
        formatValue={(n) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}`}
        subtitle="Average perceived sentiment score"
        icon={<Smile className="h-4 w-4" />}
        colorScheme={
          latestMetric?.sentiment_score != null && latestMetric.sentiment_score > 0.2
            ? 'emerald'
            : latestMetric?.sentiment_score != null && latestMetric.sentiment_score < -0.2
            ? 'amber'
            : 'indigo'
        }
      />

      {/* 4. Share of Voice */}
      <MetricCard
        title="Share of Voice"
        value={
          latestMetric?.share_of_voice != null
            ? `${latestMetric.share_of_voice.toFixed(1)}%`
            : '0.0%'
        }
        numericValue={latestMetric?.share_of_voice ?? 0}
        formatValue={(n) => `${n.toFixed(1)}%`}
        subtitle="% of relevant brand/entity mentions belonging to the target brand"
        icon={<PieChart className="h-4 w-4" />}
        colorScheme="purple"
      />

      {/* 5. Mentions */}
      <MetricCard
        title="Mentions"
        value={latestMetric?.mention_count ?? 0}
        numericValue={latestMetric?.mention_count ?? 0}
        formatValue={(n) => `${Math.round(n)}`}
        subtitle="Total target-brand mentions"
        icon={<MessageSquareQuote className="h-4 w-4" />}
        colorScheme="emerald"
      />
    </div>
  );
}
