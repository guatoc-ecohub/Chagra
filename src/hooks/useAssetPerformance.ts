import { useMemo } from 'react';
import useLogStore from '../store/useLogStore';
import {
  MATERIAL_CATEGORY_BY_NAME,
  MATERIAL_CATEGORIES,
  type MaterialCategoryId,
} from '../config/materials';

/**
 * useAssetPerformance — Motor de bio-eficiencia por activo.
 *
 * Correlaciona aplicaciones de insumos (log--input) con cosechas (log--harvest)
 * normalizando unidades a base decimal (kg/l) antes de calcular ratios.
 */

interface Quantity {
  value?: number | string;
  unit?: string;
  [key: string]: unknown;
}

interface AssetLog {
  type?: string;
  name?: string;
  timestamp?: number;
  quantity?: Quantity | null | unknown;
  attributes?: {
    name?: string;
    timestamp?: number;
    quantity?: Quantity | null;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

interface CategoryBucket {
  total: number;
  count: number;
  ratio: string;
  label: string;
}

interface WeeklyEntry {
  week: string;
  inputs: number;
  harvests: number;
  ratio: number;
}

export interface AssetPerformance {
  globalRatio: string;
  efficiencyRatio: string;
  byCategory: Record<MaterialCategoryId, CategoryBucket>;
  weeklyTrend: WeeklyEntry[];
  totalHarvestWeight: string;
  totalInputWeight: string;
  inputCount: number;
  harvestCount: number;
  hasData: boolean;
}

// Factor de conversión a la unidad base decimal (kg/l).
const toBaseUnit = (qty: Quantity | null | undefined | unknown): number => {
  if (!qty || typeof qty !== 'object') return 0;
  const q = qty as Quantity;
  const value = parseFloat(String(q.value ?? 0)) || 0;
  const unit = (q.unit || '').toLowerCase();
  if (unit === 'g' || unit === 'ml') return value * 0.001;
  if (unit === 'bultos') return value * 50;
  return value;
};

// ISO 8601 week key (YYYY-Www).
const toIsoWeek = (ts: number | undefined): string => {
  if (!ts) return '';
  const d = new Date(ts * 1000);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
};

const extractMaterialName = (log: AssetLog): string => {
  const name = log.name || log.attributes?.name || '';
  return name.replace(/^Aplicación de /, '');
};

const DEFAULT_CATEGORY: MaterialCategoryId = 'fertilization';

export const useAssetPerformance = (assetId: string | null | undefined): AssetPerformance => {
  const assetLogs = useLogStore(
    (s) => (s.logsByAsset[assetId ?? ''] || []) as unknown as AssetLog[]
  );

  return useMemo<AssetPerformance>(() => {
    const inputs = assetLogs.filter((l) => l.type === 'log--input');
    const harvests = assetLogs.filter((l) => l.type === 'log--harvest');

    const totalHarvestWeight = harvests.reduce(
      (acc, l) => acc + toBaseUnit(l.quantity || l.attributes?.quantity),
      0
    );

    const byCategory = (Object.keys(MATERIAL_CATEGORIES) as MaterialCategoryId[]).reduce(
      (acc, cat) => {
        acc[cat] = {
          total: 0,
          count: 0,
          ratio: '0.00',
          label: MATERIAL_CATEGORIES[cat].label,
        };
        return acc;
      },
      {} as Record<MaterialCategoryId, CategoryBucket>
    );

    let totalInputWeight = 0;

    for (const log of inputs) {
      const materialName = extractMaterialName(log);
      const category: MaterialCategoryId =
        MATERIAL_CATEGORY_BY_NAME[materialName] || DEFAULT_CATEGORY;
      const weight = toBaseUnit(log.quantity || log.attributes?.quantity);

      const bucket = byCategory[category];
      bucket.total += weight;
      bucket.count += 1;

      if (category !== 'biofabrica') {
        totalInputWeight += weight;
      }
    }

    for (const cat of Object.keys(byCategory) as MaterialCategoryId[]) {
      const bucket = byCategory[cat];
      bucket.ratio =
        bucket.total > 0 ? (totalHarvestWeight / bucket.total).toFixed(2) : '0.00';
      bucket.total = parseFloat(bucket.total.toFixed(2));
    }

    const globalRatio =
      totalInputWeight > 0 ? (totalHarvestWeight / totalInputWeight).toFixed(2) : '0.00';

    const weeklyMap = new Map<string, { week: string; inputs: number; harvests: number }>();
    const bumpWeek = (
      ts: number | undefined,
      bucket: 'inputs' | 'harvests',
      weight: number
    ) => {
      const week = toIsoWeek(ts);
      if (!week) return;
      const existing = weeklyMap.get(week);
      if (!existing) {
        weeklyMap.set(week, { week, inputs: 0, harvests: 0 });
      }
      const current = weeklyMap.get(week)!;
      current[bucket] += weight;
    };

    for (const log of inputs) {
      bumpWeek(
        log.timestamp || log.attributes?.timestamp,
        'inputs',
        toBaseUnit(log.quantity || log.attributes?.quantity)
      );
    }
    for (const log of harvests) {
      bumpWeek(
        log.timestamp || log.attributes?.timestamp,
        'harvests',
        toBaseUnit(log.quantity || log.attributes?.quantity)
      );
    }

    const weeklyTrend: WeeklyEntry[] = Array.from(weeklyMap.values())
      .sort((a, b) => a.week.localeCompare(b.week))
      .map((entry) => ({
        week: entry.week,
        inputs: parseFloat(entry.inputs.toFixed(2)),
        harvests: parseFloat(entry.harvests.toFixed(2)),
        ratio: entry.inputs > 0 ? parseFloat((entry.harvests / entry.inputs).toFixed(2)) : 0,
      }));

    return {
      globalRatio,
      efficiencyRatio: globalRatio,
      byCategory,
      weeklyTrend,
      totalHarvestWeight: totalHarvestWeight.toFixed(2),
      totalInputWeight: totalInputWeight.toFixed(2),
      inputCount: inputs.length,
      harvestCount: harvests.length,
      hasData: inputs.length > 0 || harvests.length > 0,
    };
  }, [assetLogs]);
};

export default useAssetPerformance;
