// Single Source of Truth para insumos y unidades de la biofábrica.
// Cada preset declara:
//   - name:     nombre canónico (coincide con log.attributes.name tras strip del prefijo)
//   - desc:     descripción corta para tooltip
//   - unit:     unidad natural sugerida (auto-ajuste en InputLogForm)
//   - category: eje funcional para análisis de bio-eficiencia (Fase 16)
//
// Categorías (principios Restrepo):
//   - fertilization:    aporte nutricional y microbiología del suelo
//   - protection:       control de plagas y enfermedades (fitoprotección)
//   - remineralization: minerales base y correctores de pH
//   - biofabrica:       materias primas de producción (no aplicables directamente)

export const MATERIAL_CATEGORIES = {
  fertilization: {
    label: 'Fertilización',
    color: '#22c55e', // green-500
    kpi: 'Eficiencia Nutricional',
  },
  protection: {
    label: 'Fitoprotección',
    color: '#f59e0b', // amber-500
    kpi: 'Ratio de Sanidad',
  },
  remineralization: {
    label: 'Remineralización',
    color: '#8b5cf6', // violet-500
    kpi: 'Estabilidad de Suelo',
  },
  biofabrica: {
    label: 'Biofábrica (materia prima)',
    color: '#64748b', // slate-500
    kpi: 'Consumo Interno',
  },
};

export const MATERIAL_PRESETS = [
  // --- Abonos Orgánicos Sólidos (fertilization) ---
  { name: 'Bokashi', desc: 'Abono fermentado aeróbico rico en microorganismos', unit: 'kg', category: 'fertilization' },
  { name: 'Humus de Lombriz', desc: 'Excreta de lombriz estabilizada (Lombricompuesto)', unit: 'kg', category: 'fertilization' },
  { name: 'Compost', desc: 'Materia orgánica descompuesta térmicamente', unit: 'kg', category: 'fertilization' },
  { name: 'Gallinaza Mineralizada', desc: 'Estiércol de ave reposado y estabilizado', unit: 'kg', category: 'fertilization' },

  // --- Caldos Minerales (protection) ---
  { name: 'Caldo Sulfocálcico', desc: 'Fungicida, acaricida e insecticida (Azufre + Cal)', unit: 'ml', category: 'protection' },
  { name: 'Caldo Bordelés', desc: 'Fungicida cúprico (Sulfato de Cobre + Cal)', unit: 'ml', category: 'protection' },
  { name: 'Caldo de Ceniza', desc: 'Insecticida y fuente de potasio/sílice', unit: 'ml', category: 'protection' },
  { name: 'Caldo Visosa', desc: 'Fungicida multimineral con micronutrientes', unit: 'ml', category: 'protection' },

  // --- Biofertilizantes y Fermentados Líquidos (fertilization) ---
  { name: 'Biol', desc: 'Fertilizante líquido anaeróbico enriquecido', unit: 'l', category: 'fertilization' },
  { name: 'Purín de Ortiga', desc: 'Bioestimulante nitrogenado y repelente', unit: 'l', category: 'fertilization' },
  { name: 'Bioactivador Lácteo', desc: 'Inóculo de bacterias acidolácticas (Suero + Melaza)', unit: 'l', category: 'fertilization' },
  { name: 'Microorganismos Líquidos (MM)', desc: 'Inoculante biológico activado', unit: 'l', category: 'fertilization' },
  { name: 'Té de Compost', desc: 'Extracción líquida de microbiología aeróbica', unit: 'l', category: 'fertilization' },

  // --- Enmiendas Minerales y Correctores (remineralization / protection) ---
  { name: 'Harina de Rocas / Basalto', desc: 'Remineralizador de suelo de liberación lenta', unit: 'kg', category: 'remineralization' },
  { name: 'Tierra de Diatomeas', desc: 'Control mecánico de insectos y fuente de Silicio', unit: 'g', category: 'protection' },
  { name: 'Cal Agrícola / Dolomita', desc: 'Corrector de acidez (pH) y aporte de Ca/Mg', unit: 'kg', category: 'remineralization' },
  { name: 'Fosfito / Roca Fosfórica', desc: 'Fuente de fósforo natural', unit: 'kg', category: 'remineralization' },

  // --- Materias Primas e Insumos de Biofábrica (biofabrica) ---
  { name: 'Melaza de Caña', desc: 'Fuente de energía para fermentaciones', unit: 'l', category: 'biofabrica' },
  { name: 'Suero de Leche / Yogurt', desc: 'Base proteica y bacteriana para bioles', unit: 'l', category: 'biofabrica' },
  { name: 'Levadura de Panadería', desc: 'Catalizador de fermentación', unit: 'g', category: 'biofabrica' },
  { name: 'Ceniza de Leña', desc: 'Aporte de minerales y carbono', unit: 'kg', category: 'remineralization' },
];

// Lookup rápido por nombre → categoría (evita .find() repetido en hooks de analítica)
export const MATERIAL_CATEGORY_BY_NAME = MATERIAL_PRESETS.reduce((acc, preset) => {
  acc[preset.name] = preset.category;
  return acc;
}, {});

export const UNIT_OPTIONS = [
  { label: 'Mililitros', value: 'ml' },
  { label: 'Litros', value: 'l' },
  { label: 'Gramos', value: 'g' },
  { label: 'Kilogramos', value: 'kg' },
  { label: 'Unidades', value: 'unidades' },
  { label: 'Bultos (50kg)', value: 'bultos' },
];
