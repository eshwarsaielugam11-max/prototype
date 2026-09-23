import React, { useState, useMemo, useRef } from 'react';
import { Sparkles, Info, AlertCircle, Clock, Play, Pause, RotateCcw } from 'lucide-react';
import { AttentionHeatmapData } from '../api/client';

interface AttentionHeatmapProps {
  attentionData: AttentionHeatmapData | null;
  audioDurationSec?: number;
  audioUrl?: string | null;
}

export const AttentionHeatmap: React.FC<AttentionHeatmapProps> = ({
  attentionData,
  audioDurationSec,
  audioUrl,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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

  const totalDuration = audioDurationSec || (timestamps[timestamps.length - 1] ?? 4.0);

  // Audio time synchronization
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const togglePlayPause = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(e => console.error('Audio play error:', e));
      setIsPlaying(true);
    }
  };

  const restartAudio = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = 0;
    setCurrentTime(0);
    audioRef.current.play().catch(e => console.error('Audio play error:', e));
    setIsPlaying(true);
  };

  if (!valid) {
    return (
      <div className="rounded-lg bg-bg-panel border border-bg-panel-border p-6 text-center text-ink-muted">
        <AlertCircle className="w-6 h-6 text-signal-gold mx-auto mb-2" />
        <p className="font-medium text-ink font-body text-sm">Attention Rollout Data Unavailable</p>
        <p className="text-xs text-ink-muted mt-1 font-body">
          Time-aligned attention weights were not computed or could not be decoded for this screening session.
        </p>
      </div>
    );
  }

  // Signal-Gold intensity palette (avoids misleading red-yellow-green severity scale)
  const getGoldIntensityColor = (weight: number): string => {
    const norm = Math.min(Math.max(weight / maxWeight, 0), 1);
    if (norm > 0.80) return 'rgba(217, 165, 92, 1.0)';     // Full Luminous Gold (Peak Salience)
    if (norm > 0.55) return 'rgba(217, 165, 92, 0.75)';    // High Gold Salience
    if (norm > 0.30) return 'rgba(217, 165, 92, 0.45)';    // Moderate Gold Salience
    if (norm > 0.15) return 'rgba(217, 165, 92, 0.25)';    // Low Gold Salience
    return 'rgba(217, 165, 92, 0.12)';                    // Baseline Salience
  };

  const hoveredTimestamp = hoveredIndex !== null ? timestamps[hoveredIndex] : null;
  const hoveredWeight = hoveredIndex !== null ? attentionWeights[hoveredIndex] : null;

  const currentPlayPct = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;
  const peakPct = totalDuration > 0 ? (peakTimestamp / totalDuration) * 100 : 0;

  return (
    <div className="bg-bg-panel rounded-lg border border-bg-panel-border shadow-panel p-6">
      {/* Header with Title and Peak Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-bg-panel-border">
        <div>
          <h3 className="text-base font-display font-medium text-ink flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-signal-gold" />
            <span>Time-Aligned Attention Rollout Heatmap</span>
          </h3>
          <p className="text-xs text-ink-muted font-body mt-0.5">
            Temporal acoustic salience across self-supervised multi-layer transformer attention heads
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono font-medium bg-bg-void text-signal-gold border border-signal-gold/30">
            <span className="w-1.5 h-1.5 rounded-full bg-signal-gold animate-pulse" />
            Peak Salience: {peakTimestamp.toFixed(2)}s
          </span>
        </div>
      </div>

      {/* Audio Playback Sync Bar (if audioUrl provided) */}
      {audioUrl && (
        <div className="mb-4 p-3 rounded bg-bg-void border border-bg-panel-border flex items-center justify-between gap-4">
          <audio
            ref={audioRef}
            src={audioUrl}
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleAudioEnded}
            className="hidden"
          />
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={togglePlayPause}
              className="w-8 h-8 rounded bg-signal-gold hover:bg-signal-gold-hover text-bg-void flex items-center justify-center transition-colors focus-visible:ring-2 focus-visible:ring-signal-gold focus-visible:outline-none"
              aria-label={isPlaying ? 'Pause playback' : 'Play audio synced with heatmap'}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>
            <button
              type="button"
              onClick={restartAudio}
              className="p-1.5 rounded text-ink-muted hover:text-ink transition-colors"
              aria-label="Restart audio from beginning"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs font-mono text-ink">
              {currentTime.toFixed(2)}s / {totalDuration.toFixed(2)}s
            </span>
          </div>
          <span className="text-xs text-ink-muted font-body hidden sm:inline-block">
            Playback synchronized with attention timeline
          </span>
        </div>
      )}

      {/* Interactive Heatmap Intensity Rollout */}
      <div className="relative pt-6 pb-2">
        {/* Hover Inspector Tooltip */}
        {hoveredIndex !== null && hoveredTimestamp !== null && hoveredWeight !== null && (
          <div
            className="absolute top-0 transform -translate-x-1/2 z-20 bg-bg-panel-elevated text-ink text-[11px] font-mono px-2.5 py-1 rounded shadow-panel pointer-events-none flex items-center gap-2 border border-bg-panel-border"
            style={{
              left: `${(hoveredIndex / (timestamps.length - 1)) * 100}%`,
            }}
          >
            <span>Time: <strong className="text-signal-gold">{hoveredTimestamp.toFixed(2)}s</strong></span>
            <span>Weight: <strong className="text-ink">{hoveredWeight.toFixed(3)}</strong></span>
          </div>
        )}

        {/* Visual Heatmap Bars */}
        <div
          className="h-28 flex items-end gap-[1px] bg-bg-void rounded p-3 relative overflow-hidden border border-bg-panel-border"
          onMouseLeave={() => setHoveredIndex(null)}
        >
          {attentionWeights.map((weight, idx) => {
            const heightPct = Math.max((weight / maxWeight) * 100, 6);
            const color = getGoldIntensityColor(weight);
            const isHovered = hoveredIndex === idx;

            return (
              <div
                key={idx}
                onMouseEnter={() => setHoveredIndex(idx)}
                className="flex-1 h-full flex items-end cursor-pointer group transition-all"
              >
                <div
                  className={`w-full rounded-t-xs transition-all ${
                    isHovered ? 'brightness-125 scale-y-105' : 'opacity-90 hover:opacity-100'
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
              className="absolute top-0 bottom-0 w-[2px] bg-signal-gold z-10 pointer-events-none shadow-[0_0_8px_rgba(217,165,92,0.8)]"
              style={{
                left: `${peakPct}%`,
              }}
            >
              <span className="absolute -top-1 -left-1 w-2.5 h-2.5 rounded-full bg-signal-gold" />
            </div>
          )}

          {/* Playback Current Position Marker Line */}
          {audioUrl && isPlaying && (
            <div
              className="absolute top-0 bottom-0 w-[2px] bg-signal-blue z-20 pointer-events-none shadow-[0_0_8px_rgba(94,124,226,0.9)]"
              style={{
                left: `${currentPlayPct}%`,
              }}
            >
              <span className="absolute -top-1 -left-1 w-2.5 h-2.5 rounded-full bg-signal-blue" />
            </div>
          )}
        </div>

        {/* Time Axis Markers */}
        <div className="flex justify-between items-center text-[10px] font-mono text-ink-muted mt-2 px-1">
          <span>0.0s</span>
          <span>{(totalDuration * 0.25).toFixed(1)}s</span>
          <span>{(totalDuration * 0.50).toFixed(1)}s</span>
          <span>{(totalDuration * 0.75).toFixed(1)}s</span>
          <span>{totalDuration.toFixed(1)}s</span>
        </div>
      </div>

      {/* Heatmap Intensity Scale Legend */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-bg-panel-border text-xs">
        <div className="flex items-center gap-4">
          <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider font-body">
            Signal Salience:
          </span>
          <div className="flex items-center gap-3 font-body">
            <span className="flex items-center gap-1.5 text-ink-muted text-[11px]">
              <span className="w-2.5 h-2.5 rounded-xs" style={{ backgroundColor: 'rgba(217, 165, 92, 0.15)' }} /> Baseline
            </span>
            <span className="flex items-center gap-1.5 text-ink-muted text-[11px]">
              <span className="w-2.5 h-2.5 rounded-xs" style={{ backgroundColor: 'rgba(217, 165, 92, 0.45)' }} /> Moderate
            </span>
            <span className="flex items-center gap-1.5 text-ink-muted text-[11px]">
              <span className="w-2.5 h-2.5 rounded-xs bg-signal-gold" /> Peak Focus
            </span>
          </div>
        </div>

        <div className="text-[11px] text-ink-faint font-mono flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          <span>{timestamps.length} acoustic frames</span>
        </div>
      </div>

      {/* Mandatory Scientific Limitation Notice */}
      <div className="mt-4 p-3.5 rounded bg-bg-void border border-bg-panel-border flex items-start gap-2.5 text-ink-muted text-xs leading-relaxed font-body">
        <Info className="w-4 h-4 text-signal-gold shrink-0 mt-0.5" />
        <p>
          <strong className="text-ink font-medium">Explainability Notice:</strong> This visualization reflects algorithmic self-attention salience across multi-layer transformer heads. It demonstrates which temporal phonation windows most influenced the model&rsquo;s statistical confidence, and is <strong>not an anatomical or diagnostic clinical measurement</strong>.
        </p>
      </div>
    </div>
  );
};
