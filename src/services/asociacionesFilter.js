// asociacionesFilter: logica pura para recomendaciones de policultivo offline.
// Separado de Asociaciones.jsx para no romper react-refresh (only-export-components).
import arquetipos from '../data/asociaciones-arquetipos.json';
import comparativas from '../data/asociaciones-comparativa.json';

const DEFAULT_ROLE = 'campesino';

export function norm(value) {
  if (typeof value !== 'string') return '';
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ñ/g, 'n');
}

function roleFromProfile(profile) {
  const p = /** @type {any} */ (profile && typeof profile === 'object' ? profile : {});
  return norm(p.rol) || norm(p.vocacion) || DEFAULT_ROLE;
}

function cultivoTokens(cultivo) {
  if (!cultivo || typeof cultivo !== 'object') return [];
  return [cultivo.id, cultivo.slug, cultivo.nombre].map(norm).filter(Boolean);
}

function splitCultivosText(value) {
  if (Array.isArray(value)) return value.flatMap(splitCultivosText);
  if (typeof value !== 'string') return [];
  return value
    .split(/[,;/|]+|\s+y\s+/i)
    .map((item) => item.trim())
    .filter(Boolean);
}

function uniqByNorm(items) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const key = norm(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

export function filterAsociacionesByRole(items = arquetipos, profile = {}, opts = {}) {
  if (/** @type {{esOperador?:boolean}} */ (opts).esOperador) return items;
  const role = roleFromProfile(profile);
  return items.filter((item) => Array.isArray(item.rol) && item.rol.map(norm).includes(role));
}

export function getCultivosDisponibles(items = arquetipos, profile = {}, opts = {}) {
  const visibles = filterAsociacionesByRole(items, profile, opts);
  const byKey = new Map();

  visibles.forEach((item) => {
    (item.cultivos || []).forEach((cultivo) => {
      const key = norm(cultivo.id || cultivo.nombre || cultivo.slug);
      if (!key || byKey.has(key)) return;
      byKey.set(key, {
        id: cultivo.id,
        slug: cultivo.slug,
        nombre: cultivo.nombre,
      });
    });
  });

  return Array.from(byKey.values()).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

export function getCultivosFromProfile(profile = {}) {
  const p = /** @type {any} */ (profile && typeof profile === 'object' ? profile : {});
  return uniqByNorm([
    ...splitCultivosText(p.cultivos_actuales),
    ...splitCultivosText(p.cultivos_interes),
    ...splitCultivosText(p.cultivos),
    ...splitCultivosText(p.crop),
    ...splitCultivosText(p.cropName),
  ]);
}

function plantName(plant) {
  const attrs = plant?.attributes || {};
  return attrs.species_slug
    || attrs.species?.name
    || attrs.species?.id
    || attrs.common_name
    || attrs.name
    || plant?.name
    || '';
}

export function getCultivosFromPlants(plants = []) {
  if (!Array.isArray(plants)) return [];
  return uniqByNorm(plants.map(plantName));
}

function itemHasCultivo(item, selectedKey) {
  if (!selectedKey) return false;
  return (item.cultivos || []).some((cultivo) => cultivoTokens(cultivo).includes(selectedKey));
}

export function findCultivoInItems(items = arquetipos, value) {
  const key = norm(value);
  if (!key) return null;
  for (const item of items) {
    const match = (item.cultivos || []).find((cultivo) => cultivoTokens(cultivo).includes(key));
    if (match) return match;
  }
  return null;
}

export function selectCultivoInicial(items = arquetipos, profile = {}, opts = {}) {
  const visibles = filterAsociacionesByRole(items, profile, opts);
  const disponibles = getCultivosDisponibles(items, profile, opts);
  const finca = [...(/** @type {{cultivosFinca?:string[]}} */ (opts).cultivosFinca || []), ...getCultivosFromProfile(profile)];

  for (const cultivo of finca) {
    const match = findCultivoInItems(visibles, cultivo);
    if (match) return match.id || match.nombre;
  }

  return disponibles[0]?.id || '';
}

function comparisonById(data, id) {
  if (!id) return null;
  return data.find((item) => item.id === id) || null;
}

function formatRange(min, max, suffix = '') {
  if (min == null || max == null) return null;
  return `${min}-${max}${suffix}`;
}

function formatLer(ler) {
  if (!ler) return null;
  if (typeof ler === 'number') return `LER ${ler}`;
  if (ler.valor != null) return `LER ${ler.valor}`;
  if (ler.valor_aprox != null) return `LER aprox. ${ler.valor_aprox}`;
  return formatRange(ler.min, ler.max) ? `LER ${formatRange(ler.min, ler.max)}` : null;
}

function formatPercent(value, label) {
  if (value == null) return null;
  if (typeof value === 'number') return `${label} ${value}%`;
  const range = formatRange(value.min, value.max, '%');
  return range ? `${label} ${range}` : null;
}

export function metricasFromComparativa(comparativa) {
  if (!comparativa?.policultivo) return [];
  const poli = comparativa.policultivo;
  const ahorro = poli.ahorro_insumos || {};
  const otros = poli.otros_indicadores || {};
  const metricas = [
    formatLer(poli.LER),
    poli.N_fijado_kg_ha != null ? `fijación N ${poli.N_fijado_kg_ha} kg/ha` : null,
    formatPercent(poli.N_fijado_pct, 'fijación N'),
    formatRange(ahorro.arvenses_reduccion_pct_min, ahorro.arvenses_reduccion_pct_max, '%')
      ? `arvenses -${formatRange(ahorro.arvenses_reduccion_pct_min, ahorro.arvenses_reduccion_pct_max, '%')}`
      : null,
    formatRange(ahorro.N_sintesis_reduccion_pct_min, ahorro.N_sintesis_reduccion_pct_max, '%')
      ? `N de síntesis -${formatRange(ahorro.N_sintesis_reduccion_pct_min, ahorro.N_sintesis_reduccion_pct_max, '%')}`
      : null,
    formatRange(ahorro.fertilizacion_N_sustituible_kg_ha_min, ahorro.fertilizacion_N_sustituible_kg_ha_max, ' kg/ha')
      ? `N sustituible ${formatRange(ahorro.fertilizacion_N_sustituible_kg_ha_min, ahorro.fertilizacion_N_sustituible_kg_ha_max, ' kg/ha')}`
      : null,
    typeof poli.control_plaga_pct === 'number' ? `plaga -${poli.control_plaga_pct}%` : null,
    poli.control_plaga_pct?.infestacion_reduccion_pct_min != null
      ? `infestación -${formatRange(poli.control_plaga_pct.infestacion_reduccion_pct_min, poli.control_plaga_pct.infestacion_reduccion_pct_max, '%')}`
      : null,
    otros.sombra_manejada_pct_min != null
      ? `sombra ${formatRange(otros.sombra_manejada_pct_min, otros.sombra_manejada_pct_max, '%')}`
      : null,
    otros.carbono_biomasa_mg_C_ha != null ? `carbono ${otros.carbono_biomasa_mg_C_ha} Mg C/ha` : null,
    otros.productividad_total_sistema_factor != null ? `productividad total x${otros.productividad_total_sistema_factor}` : null,
  ];

  return metricas.filter(Boolean);
}

function relationTouchesCultivo(rel, selectedKey, cultivo) {
  const origen = norm(rel.origen);
  const destino = norm(rel.destino);
  if (origen === selectedKey || destino === selectedKey) return true;
  if (!cultivo) return false;
  const selectedTokens = cultivoTokens(cultivo);
  return selectedTokens.includes(origen) || selectedTokens.includes(destino);
}

export function buildAsociacionesView(
  items = arquetipos,
  comparativasData = comparativas,
  profile = {},
  opts = {}
) {
  const visibles = filterAsociacionesByRole(items, profile, opts);
  const cultivoSeleccionado = opts.cultivoSeleccionado || selectCultivoInicial(items, profile, opts);
  const selectedKey = norm(cultivoSeleccionado);
  const cultivo = findCultivoInItems(visibles, cultivoSeleccionado);
  const recomendaciones = visibles
    .filter((item) => itemHasCultivo(item, selectedKey))
    .map((item) => {
      const comparativa = comparisonById(comparativasData, item.comparativa_id);
      return {
        ...item,
        comparativa,
        metricas: metricasFromComparativa(comparativa),
        companeras: (item.cultivos || []).filter((c) => !cultivoTokens(c).includes(selectedKey)),
        relacionesCultivo: (item.relaciones || []).filter((rel) => relationTouchesCultivo(rel, selectedKey, cultivo)),
        antagonistasCultivo: (item.antagonistas || []).filter((ant) => norm(ant.cultivo) === selectedKey || !ant.cultivo),
      };
    });

  return {
    cultivoSeleccionado,
    cultivo,
    disponibles: getCultivosDisponibles(items, profile, opts),
    visibles,
    recomendaciones,
  };
}
