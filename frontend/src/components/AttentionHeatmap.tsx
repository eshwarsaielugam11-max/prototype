import React, { useState, useMemo } from 'react';
import { Sparkles, Info, AlertCircle, Clock } from 'lucide-react';
import { AttentionHeatmapData } from '../api/client';

interface AttentionHeatmapProps {
  attentionData: AttentionHeatmapData | null;
  audioDurationSec?: number;
}

export const AttentionHeatmap: React.FC<AttentionHeatmapProps> = ({
  attentionData,
  audioDurationSec,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Extract and validate series
  const { timestamps, attentionWeights, peakTimestamp, maxWeight, valid } = useMemo(() => {
    if (
      !attentionData ||
      !Array.isArray(attentionData.timestamps_sec) ||
      !Array.isArray(attentionData.attention) ||
      attentionData.timestamps_sec.length === 0 ||
      attentionData.attention.length === 0
    ) {
      return { timestamps: [], attentionWeights: [], peakTimestamp: 0, maxWeight: 0, valid: false };
    }

    const ts = attentionData.timestamps_sec as number[];
    const att = attentionData.attention as number[];
    const peak = typeof attentionData.peak_timestamp_sec === 'number'
      ? attentionData.peak_timestamp_sec
      : ts[att.indexOf(Math.max(...att))];
    const max = Math.max(...att, 0.001);

    return {
      timestamps: ts,
      attentionWeights: att,
      peakTimestamp: peak,
      maxWeight: max,
      valid: true,
    };
  }, [attentionData]);

  if (!valid) {
    return (
      <div className="rounded-xl bg-slate-50 border border-slate-200 p-6 text-center text-slate-500 text-sm">
        <AlertCircle className="w-6 h-6 text-slate-400 mx-auto mb-2" />
        <p className="font-medium text-slate-700">Attention Rollout Data Unavailable</p>
        <p className="text-xs text-slate-400 mt-1">
          Time-aligned attention weights were not computed or could not be decoded for this screening session.
        </p>
      </div>
    );
  }

  // Get color for attention value [0, 1]
  const getAttentionColor = (weight: number): string => {
    const normalized = Math.min(Math.max(weight / maxWeight, 0), 1);
    if (normalized > 0.75) return '#ef4444'; // Crimson (High Salience)
    if (normalized > 0.45) return '#f59e0b'; // Amber (Moderate Salience)
    if (normalized > 0.20) return '#3b82f6'; // Blue (Low Salience)
    return '#94a3b8'; // Slate (Baseline / Low Salience)
  };

  const totalDuration = audioDurationSec || (timestamps[timestamps.length - 1] ?? 4.0);
  const hoveredTimestamp = hoveredIndex !== null ? timestamps[hoveredIndex] : null;
  const hoveredWeight = hoveredIndex !== null ? attentionWeights[hoveredIndex] : null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-6">
      {/* Header with Title and Peak Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-600" />
            Time-Aligned Attention Rollout Heatmap
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Temporal acoustic salience across multi-layer transformer attention heads
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
            <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
            Peak Salience: {peakTimestamp.toFixed(2)}s
          </span>
        </div>
      </div>

      {/* Interactive Bar Chart Visualization */}
      <div className="relative pt-6 pb-2">
        {/* Hover Inspector Tooltip */}
        {hoveredIndex !== null && hoveredTimestamp !== null && hoveredWeight !== null && (
          <div
            className="absolute top-0 transform -translate-x-1/2 z-20 bg-slate-900 text-white text-[11px] font-mono px-2.5 py-1 rounded shadow-lg pointer-events-none flex items-center gap-2 border border-slate-700"
            style={{
              left: `${(hoveredIndex / (timestamps.length - 1)) * 100}%`,
            }}
          >
            <span>Time: <strong>{hoveredTimestamp.toFixed(2)}s</strong></span>
            <span>Weight: <strong>{hoveredWeight.toFixed(3)}</strong></span>
          </div>
        )}

        {/* Visual Heatmap Bars */}
        <div
          className="h-28 flex items-end gap-[1px] bg-slate-900 rounded-xl p-3 relative overflow-hidden border border-slate-800"
          onMouseLeave={() => setHoveredIndex(null)}
        >
          {attentionWeights.map((weight, idx) => {
            const heightPct = Math.max((weight / maxWeight) * 100, 4);
            const color = getAttentionColor(weight);
            const isHovered = hoveredIndex === idx;

            return (
              <div
                key={idx}
                onMouseEnter={() => setHoveredIndex(idx)}
                className="flex-1 h-full flex items-end cursor-pointer group transition-all"
              >
                <div
                  className={`w-full rounded-t-xs transition-all ${
                    isHovered ? 'brightness-125 scale-y-105' : 'opacity-85 hover:opacity-100'
                  }`}
                  style={{
                    height: `${heightPct}%`,
                    backgroundColor: color,
                  }}
                />
              </div>
            );
          })}

          {/* Peak Timestamp Marker Line */}
          {timestamps.length > 0 && (
            <div
              className="absolute top-0 bottom-0 w-[2px] bg-red-400 z-10 pointer-events-none shadow-[0_0_8px_rgba(239,68,68,0.8)]"
              style={{
                left: `${(peakTimestamp / totalDuration) * 100}%`,
              }}
            >
              <span className="absolute -top-1 -left-1 w-2.5 h-2.5 rounded-full bg-red-500" />
            </div>
          )}
        </div>

        {/* Time Axis Markers */}
        <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 mt-2 px-1">
          <span>0.0s</span>
          <span>{(totalDuration * 0.25).toFixed(1)}s</span>
          <span>{(totalDuration * 0.50).toFixed(1)}s</span>
          <span>{(totalDuration * 0.75).toFixed(1)}s</span>
          <span>{totalDuration.toFixed(1)}s</span>
        </div>
      </div>

      {/* Heatmap Color Scale Legend */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-100 text-xs">
        <div className="flex items-center gap-4">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Acoustic Salience:</span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-slate-600 text-[11px]">
              <span className="w-2.5 h-2.5 rounded-xs bg-slate-400" /> Baseline / Low
            </span>
            <span className="flex items-center gap-1.5 text-slate-600 text-[11px]">
              <span className="w-2.5 h-2.5 rounded-xs bg-blue-500" /> Minor Influence
            </span>
            <span className="flex items-center gap-1.5 text-slate-600 text-[11px]">
              <span className="w-2.5 h-2.5 rounded-xs bg-amber-500" /> Moderate
            </span>
            <span className="flex items-center gap-1.5 text-slate-600 text-[11px]">
              <span className="w-2.5 h-2.5 rounded-xs bg-red-500" /> Peak Influence
            </span>
          </div>
        </div>

        <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>{timestamps.length} acoustic frames</span>
        </div>
      </div>

      {/* Mandatory Scientific Limitation Notice */}
      <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5 text-slate-600 text-xs leading-relaxed">
        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <p>
          <strong>Explainability Limitation:</strong> This shows which parts of the recording most influenced the model&rsquo;s output.
          It is an algorithmic visualization of self-attention weights and is <strong>not a certified clinical or anatomical measurement</strong>.
        </p>
      </div>
    </div>
  );
};
