/**
 * landTypes.js — fuente de verdad de tipos de zona (LAND_TYPES) + helpers.
 *
 * UX-13 (#286) 2026-05-27: extraído de AssetsDashboard.jsx para cumplir
 * con la regla react-refresh/only-export-components (un archivo .jsx no
 * puede exportar constantes junto con componentes). Mover a un util
 * independiente nos da:
 *   - Tests unitarios livianos sin cargar todo AssetsDashboard.
 *   - Reuso desde otros componentes (form siembra, estrato condicional,
 *     UX-15/UX-16) sin acoplarse al dashboard.
 *
 * URBAN_LAND_TYPES es el subset usado downstream para:
 *   - Ocultar/relajar campos sin sentido en apartamento (estrato dosel).
 *   - Saltar prompts de polígono GPS (un balcón no tiene contorno útil).
 *   - Adaptar placeholders y copy contextual.
 */

export const LAND_TYPES = [
  { value: 'field', label: 'Lote / Campo abierto' },
  { value: 'bed', label: 'Cama / Huerta' },
  { value: 'greenhouse', label: 'Invernadero' },
  { value: 'paddock', label: 'Pastizal' },
  { value: 'building', label: 'Edificación' },
  // Urbano — apartamento / casa con cultivo doméstico
  { value: 'balcony', label: 'Balcón', urban: true },
  { value: 'terrace', label: 'Terraza', urban: true },
  { value: 'window_sill', label: 'Ventana', urban: true },
  { value: 'indoor_pot', label: 'Matera interior', urban: true },
  { value: 'urban_garden', label: 'Jardín / huerta urbana', urban: true },
];

export const URBAN_LAND_TYPES = new Set(
  LAND_TYPES.filter((lt) => lt.urban).map((lt) => lt.value)
);

/**
 * Determina si el valor de tipo de terreno pertenece al subset urbano
 * (balcón, terraza, ventana, matera interior, jardín urbano).
 *
 * @param {string} landType - Valor de tipo de terreno (ej. 'balcony').
 * @returns {boolean} true si es un tipo urbano.
 */
export const isUrbanLandType = (landType) => URBAN_LAND_TYPES.has(landType);
