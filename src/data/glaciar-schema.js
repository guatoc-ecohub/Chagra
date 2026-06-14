/**
 * glaciar-schema.js — esquema PROVISIONAL del Reporte de Punto Glaciar.
 *
 * MVP demo para guías de glaciar (validación en campo). Todos los enums viven
 * acá para que sean fáciles de refinar con la investigación que corre en
 * paralelo. NO hardcodear estos valores en la pantalla: importar desde acá.
 *
 * Español Colombia (usted/tú, SIN voseo). Tono de campo, claro y corto.
 *
 * IMPORTANTE: este es un esquema provisional. La escala de dureza, los tipos
 * de superficie y los peligros se refinarán con fuentes glaciológicas
 * autoritativas. Mantener todo editable acá.
 *
 * @module data/glaciar-schema
 */

/* ── Tipo de superficie del hielo/nieve ─────────────────────────────── */
export const TIPOS_SUPERFICIE = [
  { key: 'nieve_fresca', icon: '❄️', label: 'Nieve fresca' },
  { key: 'firn', icon: '🌨️', label: 'Firn / nieve vieja' },
  { key: 'hielo_glaciar', icon: '🧊', label: 'Hielo de glaciar (azul/compacto)' },
  { key: 'hielo_podrido', icon: '💧', label: 'Hielo podrido (derretido)' },
  { key: 'penitentes', icon: '🗻', label: 'Penitentes' },
  { key: 'hielo_cubierto', icon: '🪨', label: 'Hielo cubierto (detritos)' },
];

/* ── Dureza del hielo (penetración de piolet/sonda, 1–5) ────────────── */
export const ESCALA_DUREZA = [
  { valor: 1, label: 'Muy blando', desc: 'Nieve fresca, el piolet entra todo.', color: 'sky' },
  { valor: 2, label: 'Blando', desc: 'Firn, poco esfuerzo.', color: 'cyan' },
  { valor: 3, label: 'Medio', desc: 'Compacto, golpe firme.', color: 'amber' },
  { valor: 4, label: 'Duro', desc: 'Hielo de glaciar, rebota.', color: 'orange' },
  { valor: 5, label: 'Muy duro', desc: 'Hielo azul frío, casi no penetra.', color: 'blue' },
];

/* ── Peligros observados (multi-select) ─────────────────────────────── */
export const PELIGROS = [
  { key: 'grietas_cerradas', icon: '〰️', label: 'Grietas cerradas' },
  { key: 'grietas_abiertas', icon: '⚠️', label: 'Grietas abiertas' },
  { key: 'puente_nieve', icon: '🌉', label: 'Puente de nieve' },
  { key: 'seracs', icon: '🏔️', label: 'Séracs' },
  { key: 'agua_deshielo', icon: '💦', label: 'Agua de deshielo' },
  { key: 'riesgo_avalancha', icon: '🏂', label: 'Riesgo de avalancha' },
  { key: 'penitentes', icon: '🗻', label: 'Penitentes' },
];

/* ── Condiciones del entorno (selects cortos) ───────────────────────── */
export const NUBOSIDAD = [
  { key: 'despejado', label: 'Despejado' },
  { key: 'parcial', label: 'Parcialmente nublado' },
  { key: 'nublado', label: 'Nublado' },
  { key: 'niebla', label: 'Niebla / sin visibilidad' },
];

export const VIENTO = [
  { key: 'calma', label: 'Calma' },
  { key: 'brisa', label: 'Brisa' },
  { key: 'fuerte', label: 'Viento fuerte' },
  { key: 'rafagas', label: 'Ráfagas peligrosas' },
];

export const VISIBILIDAD = [
  { key: 'buena', label: 'Buena' },
  { key: 'regular', label: 'Regular' },
  { key: 'mala', label: 'Mala' },
];

/* ── Estado de seguridad derivado (lógica en evaluarSeguridadGlaciar) ── */
export const ESTADOS_SEGURIDAD = {
  estable: {
    nivel: 'estable',
    emoji: '🟢',
    label: 'Estable',
    desc: 'Hielo firme sin peligros visibles. Avance con las precauciones normales.',
    color: 'emerald',
  },
  precaucion: {
    nivel: 'precaucion',
    emoji: '🟡',
    label: 'Precaución',
    desc: 'Hay señales de cuidado. Evalúe la ruta y use protección.',
    color: 'amber',
  },
  peligro: {
    nivel: 'peligro',
    emoji: '🔴',
    label: 'Peligro',
    desc: 'Condiciones inseguras. Considere no avanzar o buscar otra ruta.',
    color: 'red',
  },
};

/* Mapas key→meta para mostrar etiquetas en la lista/trazabilidad. */
export const SUPERFICIE_BY_KEY = Object.fromEntries(TIPOS_SUPERFICIE.map((t) => [t.key, t]));
export const PELIGRO_BY_KEY = Object.fromEntries(PELIGROS.map((p) => [p.key, p]));
export const DUREZA_BY_VALOR = Object.fromEntries(ESCALA_DUREZA.map((d) => [d.valor, d]));
