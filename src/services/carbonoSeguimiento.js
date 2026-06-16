import RESTAURACION from '../data/restauracion.json';
import ESPECIES from '../data/restauracion-especies.json';
import CARBONO_CAPTURA from '../data/carbono-captura.json';

const FALLBACK_KG_CO2_POR_ARBOL_ANIO = 22;

const ROLE_CAPTURE_TCO2_HA_ANIO = {
  pionera: { min: 1.2, max: 2.4 },
  intermedia: { min: 1.8, max: 3.6 },
  climax: { min: 0.9, max: 2.2 },
};

const AGE_FACTORS = [
  { maxYears: 3, multiplier: 0.35, label: 'establecimiento' },
  { maxYears: 10, multiplier: 0.75, label: 'crecimiento' },
  { maxYears: Infinity, multiplier: 1, label: 'madurez temprana' },
];

const normalize = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

function getSpeciesEntries() {
  const roles = ESPECIES?.especies_por_rol || {};
  return Object.entries(roles).flatMap(([piso, grupos]) =>
    Object.entries(grupos || {}).flatMap(([rol, especies]) =>
      (Array.isArray(especies) ? especies : []).map((item) => ({
        piso,
        rol,
        nombre: item?.nombre || '',
        cientifico: item?.cientifico || '',
        nota: item?.nota || '',
      })),
    ),
  );
}

const SPECIES_INDEX = getSpeciesEntries();

function resolveSpecies(subjectLabel) {
  const query = normalize(subjectLabel);
  if (!query) return null;
  return SPECIES_INDEX.find((item) => {
    const name = normalize(item.nombre);
    const sci = normalize(item.cientifico);
    return query.includes(name) || query.includes(sci) || name.includes(query) || sci.includes(query);
  }) || null;
}

function getRoleCapture(role) {
  return ROLE_CAPTURE_TCO2_HA_ANIO[role] || { min: 1, max: 2 };
}

function getAgeYears(createdAt) {
  if (!createdAt) return null;
  const ms = Number(createdAt);
  if (!Number.isFinite(ms)) return null;
  const years = (Date.now() - ms) / (1000 * 60 * 60 * 24 * 365.25);
  return years < 0 ? 0 : years;
}

function getAgeFactor(years) {
  return AGE_FACTORS.find((entry) => years <= entry.maxYears) || AGE_FACTORS.at(-1);
}

function formatNumber(value, digits = 1) {
  return new Intl.NumberFormat('es-CO', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value);
}

export function calcularCarbonoSeguimiento(proceso = {}) {
  const a = proceso?.attributes || {};
  const species = resolveSpecies(a.subject_label);
  const areaHa = Number(a.area_ha || a.areaHa || a.area_m2 / 10000 || 0);
  const count = Number(a.quantity || 0);
  const years = getAgeYears(a.created_at);
  const ageFactor = getAgeFactor(years ?? 0);
  const selectedRole = species?.rol || 'intermedia';
  const roleCapture = getRoleCapture(selectedRole);
  const speciesCapture = species
    ? {
        min: roleCapture.min * ageFactor.multiplier,
        max: roleCapture.max * ageFactor.multiplier,
      }
    : null;
  const hasArea = Number.isFinite(areaHa) && areaHa > 0;

  const yearlyTCO2 = speciesCapture
    ? ((speciesCapture.min + speciesCapture.max) / 2) * (hasArea ? areaHa : Math.max(count, 1) * 0.05)
    : (Math.max(count, 1) * FALLBACK_KG_CO2_POR_ARBOL_ANIO) / 1000;

  const source = species
    ? `DR-RESTAURACION-1 / ${species.cientifico}`
    : `IDEAM-MADS fallback ${FALLBACK_KG_CO2_POR_ARBOL_ANIO} kg CO2/arbol/anio`;

  const referenceRanges = Array.isArray(CARBONO_CAPTURA?.rangos_referencia)
    ? CARBONO_CAPTURA.rangos_referencia
    : [];
  const stockRange = referenceRanges.find((r) => /bosque andino maduro/i.test(r.ecosistema))?.rango_tC_ha || [100, 200];
  const stockTcHa = hasArea ? ((stockRange[0] + stockRange[1]) / 2) : null;
  const stockTco2Ha = stockTcHa == null ? null : stockTcHa * (CARBONO_CAPTURA?.conversion?.carbono_a_co2 || 3.67);
  const accumulation = Array.from({ length: 6 }, (_, idx) => {
    const year = idx + 1;
    const factor = Math.min(1, year / Math.max((years || 1) + 5, 1)) * ageFactor.multiplier;
    const tco2 = yearlyTCO2 * year * factor;
    return {
      year,
      label: `Año ${year}`,
      tco2,
    };
  });

  return {
    species,
    speciesName: species?.nombre || a.subject_label || 'Reforestación',
    speciesScientific: species?.cientifico || '',
    speciesRole: selectedRole,
    ageYears: years,
    ageLabel: ageFactor.label,
    hasArea,
    areaHa: hasArea ? areaHa : null,
    count,
    source,
    sourceNote: species ? 'Factor proxy por rol sucesional y edad, no alometría de campo.' : 'Fallback universal por árbol joven.',
    yearlyTCO2,
    yearlyTCO2Text: `${formatNumber(yearlyTCO2, 2)} tCO2e/año`,
    stockTcHa,
    stockTco2Ha,
    stockText: stockTco2Ha == null ? null : `${formatNumber(stockTcHa, 1)} tC/ha (${formatNumber(stockTco2Ha, 1)} tCO2e/ha)`,
    estimated: true,
    confidence: species ? 'media' : 'baja',
    timeline: accumulation,
    method: {
      title: 'Cómo se arma la estimación',
      steps: [
        'Se reconoce la especie desde el nombre del seguimiento, si existe en el catálogo local.',
        'Se cruza el rol sucesional con la edad del proceso para ajustar la tasa anual.',
        'Si hay área registrada, la captura se expresa por hectárea y total del lote.',
        'Si la especie no se reconoce, se usa el fallback conservador de 22 kg CO2 por árbol al año.',
      ],
      citation: CARBONO_CAPTURA?.fuente || RESTAURACION?.fuente || 'DR-RESTAURACION-1',
    },
  };
}
