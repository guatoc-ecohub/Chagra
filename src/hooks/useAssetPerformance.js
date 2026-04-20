import { useMemo } from 'react';
import useLogStore from '../store/useLogStore';
import { MATERIAL_CATEGORY_BY_NAME, MATERIAL_CATEGORIES } from '../config/materials';

/**
 * useAssetPerformance — Motor de bio-eficiencia por activo (Fase 15.2 / refactor 16.2).
 *
 * Correlaciona aplicaciones de insumos (log--input) con cosechas (log--harvest)
 * normalizando unidades a base decimal (kg/l) antes de calcular ratios.
 * A partir de Fase 16, agrupa los insumos por categoría agroecológica
 * (fertilization, protection, remineralization, biofabrica) y calcula ratios
 * específicos por eje funcional.
 *
 * Retorna:
 *   - globalRatio:          cosecha_total / insumos_aplicables_total
 *   - byCategory:           { fertilization: { ratio, total }, ... }
 *   - totalHarvestWeight
 *   - totalInputWeight      (excluye biofabrica)
 *   - inputCount, harvestCount
 *   - hasData
 */

// Factor de conversión a la unidad base decimal (kg/l).
const toBaseUnit = (qty) => {
  if (!qty) return 0;
  const value = parseFloat(qty.value) || 0;
  const unit = (qty.unit || '').toLowerCase();
  if (unit === 'g' || unit === 'ml') return value * 0.001;
  if (unit === 'bultos') return value * 50;
  return value;
};

// ISO 8601 week key (YYYY-Www) a partir de un timestamp UNIX seconds.
// Algoritmo estándar: jueves de la semana ISO determina el año y la semana.
const toIsoWeek = (ts) => {
  if (!ts) return '';
  const d = new Date(ts * 1000);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
};

// Extrae el nombre canónico del material desde un log--input.
// Formato esperado: "Aplicación de {Nombre del Material}"
const extractMaterialName = (log) => {
  const name = log.name || log.attributes?.name || '';
  return name.replace(/^Aplicación de /, '');
};

// Categoría por defecto para materiales no listados en MATERIAL_PRESETS
const DEFAULT_CATEGORY = 'fertilization';

// Fallback estable: evita crear un array literal nuevo en cada ejecución del
// selector de Zustand, lo cual dispara re-render infinito (React #185).
const EMPTY_LOGS = [];

export const useAssetPerformance = (assetId) => {
  const assetLogs = useLogStore((s) => s.logsByAsset[assetId] || EMPTY_LOGS);

  return useMemo(() => {
    const inputs = assetLogs.filter((l) => l.type === 'log--input');
    const harvests = assetLogs.filter((l) => l.type === 'log--harvest');

    // Sumatoria de cosechas (siempre normalizada a kg/l)
    const totalHarvestWeight = harvests.reduce(
      (acc, l) => acc + toBaseUnit(l.quantity || l.attributes?.quantity),
      0
    );

    // Agrupación de inputs por categoría
    const byCategory = Object.keys(MATERIAL_CATEGORIES).reduce((acc, cat) => {
      acc[cat] = { total: 0, count: 0, ratio: '0.00', label: MATERIAL_CATEGORIES[cat].label };
      return acc;
    }, {});

    let totalInputWeight = 0; // excluye biofabrica del ratio global

    for (const log of inputs) {
      const materialName = extractMaterialName(log);
      const category = MATERIAL_CATEGORY_BY_NAME[materialName] || DEFAULT_CATEGORY;
      const weight = toBaseUnit(log.quantity || log.attributes?.quantity);

      byCategory[category].total += weight;
      byCategory[category].count += 1;

      // Biofábrica (materias primas internas) no suma al ratio global del cultivo.
      if (category !== 'biofabrica') {
        totalInputWeight += weight;
      }
    }

    // Cálculo de ratios por categoría
    for (const cat of Object.keys(byCategory)) {
      const bucket = byCategory[cat];
      bucket.ratio = bucket.total > 0
        ? (totalHarvestWeight / bucket.total).toFixed(2)
        : '0.00';
      bucket.total = parseFloat(bucket.total.toFixed(2));
    }

    const globalRatio = totalInputWeight > 0
      ? (totalHarvestWeight / totalInputWeight).toFixed(2)
      : '0.00';

    // Fase 16.3 — Serie temporal por semana ISO.
    // Correlaciona la intensidad de aplicación de insumos con los picos de
    // cosecha en una ventana semanal, para cultivos de ciclo largo.
    const weeklyMap = new Map();
    const bumpWeek = (ts, bucket, weight) => {
      const week = toIsoWeek(ts);
      if (!week) return;
      if (!weeklyMap.has(week)) {
        weeklyMap.set(week, { week, inputs: 0, harvests: 0 });
      }
      weeklyMap.get(week)[bucket] += weight;
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

    const weeklyTrend = Array.from(weeklyMap.values())
      .sort((a, b) => a.week.localeCompare(b.week))
      .map((entry) => ({
        week: entry.week,
        inputs: parseFloat(entry.inputs.toFixed(2)),
        harvests: parseFloat(entry.harvests.toFixed(2)),
        ratio: entry.inputs > 0 ? parseFloat((entry.harvests / entry.inputs).toFixed(2)) : 0,
      }));

    return {
      globalRatio,
      efficiencyRatio: globalRatio, // alias backward compat (Fase 15.3)
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
