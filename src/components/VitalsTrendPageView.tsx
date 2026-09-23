import React, { useState } from 'react';
import { PatientProfile, VitalsReading } from '../types';
import {
  computeVitalsTrends,
  MetricTrendItem,
} from '../services/vitalsTrendService';

interface VitalsTrendPageViewProps {
  profile: PatientProfile;
  onCaptureReading: () => void;
  onNavigateTab: (tab: 'vitals' | 'mass') => void;
  onDownloadCsv: (readings?: VitalsReading[]) => void;
}

export const VitalsTrendPageView: React.FC<VitalsTrendPageViewProps> = ({
  profile,
  onCaptureReading,
  onNavigateTab,
  onDownloadCsv,
}) => {
  const history = profile.vitalsHistory && profile.vitalsHistory.length > 0
    ? profile.vitalsHistory
    : [profile.vitals];

  // Selected comparison index in history (1 is immediate previous, history.length - 1 is oldest/baseline)
  const [comparisonIdx, setComparisonIdx] = useState<number>(history.length > 1 ? 1 : 0);
  const [filterCategory, setFilterCategory] = useState<'all' | 'hemodynamic' | 'respiratory' | 'physical'>('all');

  const analysis = computeVitalsTrends(profile, comparisonIdx);

  // Grouping filter
  const filteredMetrics = analysis.metrics.filter((m) => {
    if (filterCategory === 'hemodynamic') {
      return ['heartRate', 'bpSys', 'bpDia'].includes(m.id);
    }
    if (filterCategory === 'respiratory') {
      return ['spO2', 'respRate', 'tempC'].includes(m.id);
    }
    if (filterCategory === 'physical') {
      return ['weight', 'pain'].includes(m.id);
    }
    return true;
  });

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-150">
      {/* Page Header & Comparison Selector */}
      <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/20 flex flex-col gap-3 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shadow-2xs">
              <span className="material-symbols-outlined text-[24px]">trending_up</span>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm font-extrabold text-on-surface">
                  Vital Signs &amp; Weight Trend Indicators
                </h4>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase tracking-wider">
                  Comparative Analysis
                </span>
              </div>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Evaluates directionality (stable, increasing, or decreasing) compared to previous measurements
              </p>
            </div>
          </div>

          {/* Quick Capture & CSV Action Buttons */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={onCaptureReading}
              className="px-3 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs hover:bg-primary-container transition-all active:scale-98"
              title="Record current telemetry into trend timeline"
            >
              <span className="material-symbols-outlined text-[16px]">add_chart</span>
              <span>Capture Reading</span>
            </button>
            <button
              onClick={() => onDownloadCsv()}
              className="px-2.5 py-1.5 rounded-lg border border-outline-variant/30 bg-surface-container-lowest text-on-surface hover:text-primary hover:bg-surface-container text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
              title="Export complete telemetry history as CSV"
            >
              <span className="material-symbols-outlined text-[15px] text-primary">download</span>
              <span>CSV</span>
            </button>
          </div>
        </div>

        {/* Comparison Reference Selector Bar */}
        <div className="pt-2 border-t border-outline-variant/15 flex flex-col md:flex-row md:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-extrabold text-on-surface-variant flex items-center gap-1">
              <span className="material-symbols-outlined text-[15px] text-primary">compare_arrows</span>
              Comparing against:
            </span>
            {history.length > 1 ? (
              <select
                value={comparisonIdx}
                onChange={(e) => setComparisonIdx(Number(e.target.value))}
                className="bg-surface-container-lowest text-on-surface text-xs font-bold px-2.5 py-1 rounded-lg border border-outline-variant/30 focus:outline-primary cursor-pointer shadow-2xs"
              >
                {history.map((reading, idx) => {
                  if (idx === 0) return null; // Can't compare against current
                  const label =
                    idx === 1
                      ? `Immediate Last Reading (${reading.recordedAt || reading.id})`
                      : idx === history.length - 1
                      ? `Baseline / Initial Reading (${reading.recordedAt || reading.id})`
                      : `${reading.id || `Reading #${idx + 1}`} (${reading.recordedAt})`;
                  return (
                    <option key={reading.id || idx} value={idx}>
                      {label}
                    </option>
                  );
                })}
              </select>
            ) : (
              <span className="text-[11px] text-on-surface-variant italic">
                Only 1 reading logged. Click &quot;Capture Reading&quot; to log another point for comparison.
              </span>
            )}
          </div>

          {/* Reference Reading Summary Badges */}
          <div className="flex items-center gap-1.5 text-[11px] font-mono">
            <span className="px-2 py-0.5 rounded bg-surface-container text-on-surface font-bold">
              Current: <strong className="text-primary">{analysis.currentLabel}</strong>
            </span>
            <span className="text-outline">vs</span>
            <span className="px-2 py-0.5 rounded bg-surface-container text-on-surface font-bold">
              Ref: <strong className="text-secondary">{analysis.previousLabel}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Clinical Status Overview Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div className="bg-surface-container-low p-3 rounded-xl border border-outline-variant/20 flex items-center gap-3 shadow-2xs">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-black">
            <span className="material-symbols-outlined text-[18px]">trending_flat</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-on-surface-variant">Stable Metrics</span>
            <p className="text-sm font-black text-on-surface">{analysis.stableCount} of 8 steady</p>
          </div>
        </div>

        <div className="bg-surface-container-low p-3 rounded-xl border border-outline-variant/20 flex items-center gap-3 shadow-2xs">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-black">
            <span className="material-symbols-outlined text-[18px]">verified</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-on-surface-variant">Therapeutic Gains</span>
            <p className="text-sm font-black text-emerald-700">{analysis.improvingCount} improving</p>
          </div>
        </div>

        <div className="bg-surface-container-low p-3 rounded-xl border border-outline-variant/20 flex items-center gap-3 shadow-2xs">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black ${
            analysis.concerningCount > 0 ? 'bg-amber-100 text-amber-800' : 'bg-surface-container text-outline'
          }`}>
            <span className="material-symbols-outlined text-[18px]">
              {analysis.concerningCount > 0 ? 'priority_high' : 'check_circle'}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-on-surface-variant">Actionable Alerts</span>
            <p className="text-sm font-black text-on-surface">
              {analysis.concerningCount > 0 ? `${analysis.concerningCount} need review` : '0 alerts pending'}
            </p>
          </div>
        </div>
      </div>

      {/* Category Pills Filter */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1 bg-surface-container-low p-1 rounded-xl border border-outline-variant/20 text-xs">
          {[
            { key: 'all', label: 'All Indicators (8)' },
            { key: 'physical', label: 'Weight & Pain (2)' },
            { key: 'hemodynamic', label: 'Cardiac & BP (3)' },
            { key: 'respiratory', label: 'Respiratory & Temp (3)' },
          ].map((cat) => (
            <button
              key={cat.key}
              onClick={() => setFilterCategory(cat.key as any)}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors cursor-pointer ${
                filterCategory === cat.key
                  ? 'bg-surface-container-lowest text-primary shadow-xs font-black'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigateTab('vitals')}
            className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Open Vitals Editor</span>
            <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
          </button>
        </div>
      </div>

      {/* Grid of Metric Trend Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {filteredMetrics.map((metric) => {
          return (
            <div
              key={metric.id}
              className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/20 flex flex-col justify-between gap-3 shadow-2xs hover:border-outline-variant/40 transition-all group"
            >
              {/* Card Header: Metric Name & Trend Badge */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                    <span className="material-symbols-outlined text-[20px]">{metric.icon}</span>
                  </div>
                  <div>
                    <h5 className="text-xs font-extrabold text-on-surface">{metric.name}</h5>
                    <span className="text-[10px] text-on-surface-variant font-mono">
                      Safe target: {metric.minSafe !== undefined ? `${metric.minSafe}–${metric.maxSafe} ${metric.unit}` : 'Clinical Baseline'}
                    </span>
                  </div>
                </div>

                {/* Prominent Arrow Icon & Trend Badge */}
                <div className="flex items-center gap-1.5">
                  <div
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-black shadow-2xs ${metric.badgeClass}`}
                  >
                    <span
                      className={`material-symbols-outlined text-[18px] font-black ${metric.arrowColorClass}`}
                    >
                      {metric.arrowIcon}
                    </span>
                    <span className="capitalize">{metric.direction}</span>
                  </div>
                </div>
              </div>

              {/* Card Values: Current vs Previous Measurement */}
              <div className="flex items-baseline justify-between bg-surface-container-lowest/80 p-3 rounded-xl border border-outline-variant/15">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                    Current Reading
                  </span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-2xl font-black text-on-surface">
                      {metric.displayCurrent}
                    </span>
                    <span className="text-xs font-bold text-on-surface-variant">{metric.unit}</span>
                  </div>
                </div>

                {/* Arrow & Delta Display */}
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                    Last Measurement
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xs font-mono font-bold text-outline">
                      {metric.displayPrevious} {metric.unit}
                    </span>
                    <span
                      className={`text-xs font-black font-mono px-1.5 py-0.2 rounded flex items-center ${
                        metric.diff > 0
                          ? 'bg-amber-100/70 text-amber-900'
                          : metric.diff < 0
                          ? 'bg-blue-100/70 text-blue-900'
                          : 'bg-surface-container text-outline'
                      }`}
                    >
                      {metric.diff > 0 ? `+${metric.diff}` : metric.diff} {metric.unit}
                    </span>
                  </div>
                </div>
              </div>

              {/* Trajectory Bar / Mini Sparkline */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-[10px] text-outline font-mono">
                  <span>Timeline trajectory ({metric.historyPoints.length} points)</span>
                  <span>
                    {metric.direction === 'stable'
                      ? 'No variance'
                      : `${metric.diffPercent > 0 ? '+' : ''}${metric.diffPercent}% shift`}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden flex">
                  {metric.historyPoints.map((pt, i) => {
                    const isLatest = i === metric.historyPoints.length - 1;
                    return (
                      <div
                        key={i}
                        className={`h-full flex-1 border-r border-surface-container-lowest last:border-none ${
                          isLatest ? 'bg-primary' : 'bg-primary/30'
                        }`}
                        title={`${pt.label}: ${pt.value} ${metric.unit}`}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Clinical Interpretation */}
              <div className="text-[11px] leading-relaxed text-on-surface bg-surface-container-lowest/50 p-2.5 rounded-lg border border-outline-variant/10">
                <p className="font-sans text-on-surface-variant">
                  <strong className="text-on-surface font-extrabold mr-1">Clinical Insight:</strong>
                  {metric.interpretation}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Educational / Reference Note */}
      <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-on-surface-variant">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[18px]">info</span>
          <span>
            Delta arrows reflect direct mathematical variance between sequential telemetry captures.
          </span>
        </div>
        <div className="flex items-center gap-2 font-bold">
          <button
            onClick={() => onNavigateTab('mass')}
            className="text-primary hover:underline cursor-pointer"
          >
            Review Weight Mass Profile
          </button>
          <span>•</span>
          <button
            onClick={() => onNavigateTab('vitals')}
            className="text-primary hover:underline cursor-pointer"
          >
            Input Manual Vitals
          </button>
        </div>
      </div>
    </div>
  );
};
