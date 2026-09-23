import { VitalsReading, PatientProfile } from '../types';

export type TrendDirection = 'increasing' | 'decreasing' | 'stable';

export interface MetricTrendItem {
  id: string;
  name: string;
  shortName: string;
  icon: string;
  currentValue: number;
  previousValue: number;
  unit: string;
  displayCurrent: string;
  displayPrevious: string;
  diff: number;
  diffPercent: number;
  direction: TrendDirection;
  arrowIcon: string;
  statusBadge: string;
  badgeClass: string;
  arrowColorClass: string;
  interpretation: string;
  clinicalTier: 'normal' | 'caution' | 'warning' | 'improving';
  minSafe?: number;
  maxSafe?: number;
  historyPoints: { label: string; value: number }[];
}

export interface VitalsTrendAnalysis {
  hasComparison: boolean;
  currentLabel: string;
  previousLabel: string;
  currentId?: string;
  previousId?: string;
  metrics: MetricTrendItem[];
  overallSummary: string;
  improvingCount: number;
  stableCount: number;
  concerningCount: number;
}

/**
 * Computes comparative vital trends between current reading and previous reading
 */
export function computeVitalsTrends(
  profile: PatientProfile,
  comparisonIndex: number = 1 // 1 means immediate previous reading in vitalsHistory
): VitalsTrendAnalysis {
  const history = profile.vitalsHistory && profile.vitalsHistory.length > 0
    ? profile.vitalsHistory
    : [profile.vitals];

  const current: VitalsReading = {
    ...profile.vitals,
    weightKg: profile.vitals.weightKg ?? profile.massKg,
  };

  const hasHistory = history.length > 1;
  const targetIndex = Math.min(Math.max(comparisonIndex, 1), history.length - 1);
  const previous: VitalsReading = hasHistory
    ? {
        ...history[targetIndex],
        weightKg: history[targetIndex].weightKg ?? profile.massKg,
      }
    : {
        ...current,
        weightKg: current.weightKg,
      };

  const currWeight = current.weightKg ?? profile.massKg;
  const prevWeight = previous.weightKg ?? profile.massKg;

  // Extract past points for mini charts/sparklines (up to 5 recent readings, reversed for chronological display)
  const recentHistory = [...history].slice(0, 5).reverse();

  // Helper for trend calculation
  const createMetricItem = (params: {
    id: string;
    name: string;
    shortName: string;
    icon: string;
    curr: number;
    prev: number;
    unit: string;
    decimals?: number;
    stableThreshold: number;
    goodDirection: 'up' | 'down' | 'stable';
    minSafe?: number;
    maxSafe?: number;
    interpretFn: (curr: number, prev: number, diff: number, dir: TrendDirection) => string;
    historySelector: (r: VitalsReading) => number;
  }): MetricTrendItem => {
    const dec = params.decimals ?? 0;
    const diff = Number((params.curr - params.prev).toFixed(dec === 0 ? 0 : 2));
    const isStable = Math.abs(diff) <= params.stableThreshold;

    let direction: TrendDirection = 'stable';
    if (!isStable) {
      direction = diff > 0 ? 'increasing' : 'decreasing';
    }

    const diffPercent = params.prev !== 0
      ? Number(((diff / params.prev) * 100).toFixed(1))
      : 0;

    let arrowIcon = 'trending_flat';
    let statusBadge = 'Stable';
    let badgeClass = 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300';
    let arrowColorClass = 'text-emerald-600 dark:text-emerald-400';
    let clinicalTier: MetricTrendItem['clinicalTier'] = 'normal';

    if (direction === 'increasing') {
      arrowIcon = 'arrow_upward';
      const pctStr = diffPercent > 0 ? `+${diffPercent}%` : `${diffPercent}%`;
      statusBadge = `Increasing (${diff > 0 ? '+' : ''}${diff} ${params.unit})`;

      if (params.goodDirection === 'up') {
        badgeClass = 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300';
        arrowColorClass = 'text-emerald-600 dark:text-emerald-400';
        clinicalTier = 'improving';
      } else if (params.goodDirection === 'down') {
        badgeClass = 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300';
        arrowColorClass = 'text-amber-600 dark:text-amber-400';
        clinicalTier = 'caution';
      } else {
        badgeClass = 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300';
        arrowColorClass = 'text-blue-600 dark:text-blue-400';
        clinicalTier = 'normal';
      }
    } else if (direction === 'decreasing') {
      arrowIcon = 'arrow_downward';
      statusBadge = `Decreasing (${diff} ${params.unit})`;

      if (params.goodDirection === 'down') {
        badgeClass = 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300';
        arrowColorClass = 'text-emerald-600 dark:text-emerald-400';
        clinicalTier = 'improving';
      } else if (params.goodDirection === 'up') {
        badgeClass = 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300';
        arrowColorClass = 'text-rose-600 dark:text-rose-400';
        clinicalTier = 'warning';
      } else {
        badgeClass = 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300';
        arrowColorClass = 'text-blue-600 dark:text-blue-400';
        clinicalTier = 'normal';
      }
    } else {
      statusBadge = 'Stable (±0)';
      clinicalTier = 'normal';
      arrowIcon = 'trending_flat';
      badgeClass = 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300';
      arrowColorClass = 'text-emerald-600 dark:text-emerald-400';
    }

    const interpretation = params.interpretFn(params.curr, params.prev, diff, direction);

    const historyPoints = recentHistory.map((item, idx) => ({
      label: item.recordedAt.split(',')[1]?.trim() || item.id || `#${idx + 1}`,
      value: params.historySelector(item),
    }));

    return {
      id: params.id,
      name: params.name,
      shortName: params.shortName,
      icon: params.icon,
      currentValue: params.curr,
      previousValue: params.prev,
      unit: params.unit,
      displayCurrent: dec > 0 ? params.curr.toFixed(dec) : String(params.curr),
      displayPrevious: dec > 0 ? params.prev.toFixed(dec) : String(params.prev),
      diff,
      diffPercent,
      direction,
      arrowIcon,
      statusBadge,
      badgeClass,
      arrowColorClass,
      interpretation,
      clinicalTier,
      minSafe: params.minSafe,
      maxSafe: params.maxSafe,
      historyPoints,
    };
  };

  const metrics: MetricTrendItem[] = [
    // 1. Weight / Body Mass
    createMetricItem({
      id: 'weight',
      name: 'Body Mass / Weight',
      shortName: 'Weight',
      icon: 'monitor_weight',
      curr: currWeight,
      prev: prevWeight,
      unit: 'kg',
      decimals: 1,
      stableThreshold: 0.1,
      goodDirection: 'stable',
      interpretFn: (curr, prev, diff, dir) => {
        if (dir === 'stable') return 'Weight steady at dry mass baseline. No acute fluid shifts.';
        if (dir === 'increasing') return `Gained +${diff.toFixed(1)} kg vs last reading. Monitor for fluid overload/edema.`;
        return `Down ${Math.abs(diff).toFixed(1)} kg. Consistent with post-op diuresis or dietary restriction.`;
      },
      historySelector: (r) => r.weightKg ?? profile.massKg,
    }),

    // 2. Heart Rate
    createMetricItem({
      id: 'heartRate',
      name: 'Heart Rate (Pulse)',
      shortName: 'Heart Rate',
      icon: 'favorite',
      curr: current.heartRate,
      prev: previous.heartRate,
      unit: 'bpm',
      stableThreshold: 1,
      goodDirection: current.heartRate > 100 ? 'down' : 'stable',
      minSafe: 60,
      maxSafe: 100,
      interpretFn: (curr, prev, diff, dir) => {
        if (dir === 'stable') return `Stable rhythm at ${curr} bpm. Within physiological normal limits (60–100 bpm).`;
        if (dir === 'increasing') {
          return curr > 100
            ? `Elevated pulse +${diff} bpm into sinus tachycardia (${curr} bpm). Check pain/fluid/fever.`
            : `Pulse rose by +${diff} bpm to ${curr} bpm. Remains normocardic.`;
        }
        return curr < 60
          ? `Decreased by ${Math.abs(diff)} bpm into relative bradycardia (${curr} bpm).`
          : `Decreased by ${Math.abs(diff)} bpm to ${curr} bpm. Normalized resting cardiac tone.`;
      },
      historySelector: (r) => r.heartRate,
    }),

    // 3. Systolic Blood Pressure
    createMetricItem({
      id: 'bpSys',
      name: 'Systolic Blood Pressure',
      shortName: 'Systolic BP',
      icon: 'speed',
      curr: current.bloodPressureSys,
      prev: previous.bloodPressureSys,
      unit: 'mmHg',
      stableThreshold: 2,
      goodDirection: current.bloodPressureSys > 130 ? 'down' : 'stable',
      minSafe: 90,
      maxSafe: 130,
      interpretFn: (curr, prev, diff, dir) => {
        if (dir === 'stable') return `Systolic BP stable at ${curr} mmHg. Optimal target perfusion achieved.`;
        if (dir === 'increasing') {
          return curr >= 140
            ? `Systolic surged +${diff} mmHg to ${curr} mmHg (Stage 2 Hypertension range).`
            : `Systolic rose +${diff} mmHg to ${curr} mmHg. Perfusion adequate.`;
        }
        return curr < 90
          ? `Systolic dropped ${Math.abs(diff)} mmHg to ${curr} mmHg (Hypotension alert).`
          : `Systolic eased by ${Math.abs(diff)} mmHg to ${curr} mmHg towards normotension.`;
      },
      historySelector: (r) => r.bloodPressureSys,
    }),

    // 4. Diastolic Blood Pressure
    createMetricItem({
      id: 'bpDia',
      name: 'Diastolic Blood Pressure',
      shortName: 'Diastolic BP',
      icon: 'compress',
      curr: current.bloodPressureDia,
      prev: previous.bloodPressureDia,
      unit: 'mmHg',
      stableThreshold: 2,
      goodDirection: current.bloodPressureDia > 85 ? 'down' : 'stable',
      minSafe: 60,
      maxSafe: 85,
      interpretFn: (curr, prev, diff, dir) => {
        if (dir === 'stable') return `Diastolic vascular resistance stable at ${curr} mmHg.`;
        if (dir === 'increasing') return `Diastolic increased +${diff} mmHg to ${curr} mmHg.`;
        return `Diastolic decreased ${Math.abs(diff)} mmHg to ${curr} mmHg.`;
      },
      historySelector: (r) => r.bloodPressureDia,
    }),

    // 5. Oxygen Saturation (SpO2)
    createMetricItem({
      id: 'spO2',
      name: 'Pulse Oximetry (SpO2)',
      shortName: 'SpO2',
      icon: 'air',
      curr: current.spO2,
      prev: previous.spO2,
      unit: '%',
      stableThreshold: 0,
      goodDirection: 'up',
      minSafe: 94,
      maxSafe: 100,
      interpretFn: (curr, prev, diff, dir) => {
        if (dir === 'stable') return `Oxygen saturation optimal and stable at ${curr}%.`;
        if (dir === 'increasing') return `SpO2 improved by +${diff}% to ${curr}%. Excellent pulmonary oxygenation.`;
        return curr < 92
          ? `Desaturation alert: dropped ${Math.abs(diff)}% to ${curr}%. Assess airway/supplemental O2.`
          : `SpO2 dipped ${Math.abs(diff)}% to ${curr}%. Still within safe bounds.`;
      },
      historySelector: (r) => r.spO2,
    }),

    // 6. Respiratory Rate
    createMetricItem({
      id: 'respRate',
      name: 'Respiratory Rate',
      shortName: 'Resp Rate',
      icon: 'pulmonology',
      curr: current.respiratoryRate,
      prev: previous.respiratoryRate,
      unit: 'bpm',
      stableThreshold: 0,
      goodDirection: current.respiratoryRate > 20 ? 'down' : 'stable',
      minSafe: 12,
      maxSafe: 20,
      interpretFn: (curr, prev, diff, dir) => {
        if (dir === 'stable') return `Breathing effort steady at ${curr} breaths/min (eupnea).`;
        if (dir === 'increasing') return `Ventilatory frequency increased +${diff} to ${curr} bpm. Check for tachypnea.`;
        return `Respiratory rate eased ${Math.abs(diff)} to ${curr} bpm. Regular relaxed effort.`;
      },
      historySelector: (r) => r.respiratoryRate,
    }),

    // 7. Body Temperature
    createMetricItem({
      id: 'tempC',
      name: 'Core Body Temperature',
      shortName: 'Temperature',
      icon: 'device_thermostat',
      curr: current.temperatureC,
      prev: previous.temperatureC,
      unit: '°C',
      decimals: 1,
      stableThreshold: 0.1,
      goodDirection: current.temperatureC >= 38.0 ? 'down' : 'stable',
      minSafe: 36.0,
      maxSafe: 37.5,
      interpretFn: (curr, prev, diff, dir) => {
        if (dir === 'stable') return `Afebrile and normothermic at ${curr.toFixed(1)}°C (${((curr * 9) / 5 + 32).toFixed(1)}°F).`;
        if (dir === 'increasing') {
          return curr >= 38.0
            ? `Temperature increased +${diff.toFixed(1)}°C to febrile spike ${curr.toFixed(1)}°C. Order antipyretics.`
            : `Temperature rose +${diff.toFixed(1)}°C to ${curr.toFixed(1)}°C (Low grade).`;
        }
        return `Temperature lowered by ${Math.abs(diff).toFixed(1)}°C to ${curr.toFixed(1)}°C towards normothermia.`;
      },
      historySelector: (r) => r.temperatureC,
    }),

    // 8. Pain Score
    createMetricItem({
      id: 'pain',
      name: 'Numeric Pain Rating (0–10)',
      shortName: 'Pain Score',
      icon: 'sentiment_neutral',
      curr: current.painScore,
      prev: previous.painScore,
      unit: '/10',
      stableThreshold: 0,
      goodDirection: 'down',
      minSafe: 0,
      maxSafe: 3,
      interpretFn: (curr, prev, diff, dir) => {
        if (dir === 'stable') {
          return curr === 0
            ? 'Patient remains completely pain-free (0/10).'
            : `Pain rating unchanged at ${curr}/10. Analgesic regimen stable.`;
        }
        if (dir === 'decreasing') {
          return `Pain decreased by ${Math.abs(diff)} points to ${curr}/10. Good analgesic efficacy.`;
        }
        return `Pain worsened by +${diff} points to ${curr}/10. Re-evaluate analgesia/comfort.`;
      },
      historySelector: (r) => r.painScore,
    }),
  ];

  const improvingCount = metrics.filter((m) => m.clinicalTier === 'improving').length;
  const stableCount = metrics.filter((m) => m.clinicalTier === 'normal').length;
  const concerningCount = metrics.filter((m) => m.clinicalTier === 'caution' || m.clinicalTier === 'warning').length;

  let overallSummary = 'All primary telemetry metrics are currently stable within baseline parameters.';
  if (concerningCount > 0) {
    overallSummary = `${concerningCount} metric(s) shifted out of target range compared to last reading. Close clinical observation recommended.`;
  } else if (improvingCount > 0) {
    overallSummary = `${improvingCount} biometric metric(s) demonstrate positive therapeutic improvement vs previous measurement.`;
  }

  return {
    hasComparison: hasHistory,
    currentLabel: current.recordedAt || 'Current',
    previousLabel: previous.recordedAt || 'Previous',
    currentId: current.id,
    previousId: previous.id,
    metrics,
    overallSummary,
    improvingCount,
    stableCount,
    concerningCount,
  };
}
