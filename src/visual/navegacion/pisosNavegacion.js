/*
 * pisosNavegacion — EL DATO ÚNICO de la navegación por pisos térmicos.
 *
 * Los TRES zooms de navegación (minimapa, mapa estratégico, vista global)
 * LEEN de aquí y solo de aquí: qué bandas de altitud existen, qué mundo vive
 * en cuál banda y a dónde navega cada mundo al tocarlo. Coherencia total:
 * cambiar el piso de un mundo en `mundoData.js` mueve su estampa en los tres
 * zooms a la vez, sin tocar ningún componente.
 *
 * FUENTES (solo LECTURA, este módulo no las edita):
 *   · `MUNDO` (mundoData.js) — cada mundo declara su `pisoTermico`, y el mundo
 *     `pisos` trae el dato canónico de las 4 bandas (id, nombre, rango, color,
 *     cultivo insignia). NO se inventan pisos ni colores: se leen.
 *   · `MAPA_PISO_ENT` (pisosBosqueGradiente.js) — el Ent guardián de cada piso
 *     (ceiba/roble/aliso/queñua), que marca su banda en los zooms.
 *   · `MUNDO_BY_ID` (mundosFinca.js) — título/emoji/destino reales del home
 *     para los mundos que viven en el manifiesto (no se duplican).
 *
 * Módulo PURO (sin React, sin three, sin DOM): testeable y seguro en el
 * bundle base.
 */
import { MUNDO } from '../mundo3d/mundoData.js';
import { MAPA_PISO_ENT } from '../mundo3d/bosque/pisosBosqueGradiente.js';
import { MUNDO_BY_ID } from '../../components/dashboard/mundosFinca.js';

/* Nombre legible del Ent guardián de cada piso (ids de MAPA_PISO_ENT). */
const NOMBRE_ENT = {
  ceiba: 'La ceiba',
  roble: 'El roble',
  aliso: 'El aliso',
  quenua: 'La queñua',
};

/* Emoji del cultivo insignia de cada banda (el id viene del dato canónico). */
const EMOJI_CULTIVO = {
  platano: '🍌',
  cafe: '☕',
  papa: '🥔',
  frailejon: '🌼',
};

/* Convierte el rango canónico ('3000–4200 m') en metros [min, max]. */
function parsearRango(rango) {
  const nums = String(rango).match(/\d+/g) || [];
  const min = Number(nums[0] ?? 0);
  const max = Number(nums[1] ?? min);
  return [min, max];
}

/**
 * LAS BANDAS de altitud, de abajo (cálido) a arriba (páramo), derivadas del
 * dato canónico `MUNDO.pisos.params.pisos`. Cada banda:
 *   { id, nombre, rango, color, altMin, altMax, cultivo, emojiCultivo,
 *     entId, entNombre, niebla, protege, indice }
 */
export const BANDAS_NAVEGACION = Object.freeze(
  MUNDO.pisos.params.pisos.map((piso, indice) => {
    const [altMin, altMax] = parsearRango(piso.rango);
    return Object.freeze({
      id: piso.id,
      nombre: piso.nombre,
      rango: piso.rango,
      color: piso.color,
      altMin,
      altMax,
      cultivo: piso.cultivo,
      emojiCultivo: EMOJI_CULTIVO[piso.cultivo] || '🌱',
      entId: MAPA_PISO_ENT[piso.id] || null,
      entNombre: NOMBRE_ENT[MAPA_PISO_ENT[piso.id]] || null,
      niebla: Boolean(piso.niebla),
      protege: Boolean(piso.protege),
      indice,
    });
  }),
);

/** Banda por id ('calido' | 'templado' | 'frio' | 'paramo') o null. */
export function bandaPorId(id) {
  return BANDAS_NAVEGACION.find((b) => b.id === id) || null;
}

/** Altura máxima del gradiente (la cima del páramo, hoy 4200 m). */
export const ALTITUD_CIMA = BANDAS_NAVEGACION[BANDAS_NAVEGACION.length - 1].altMax;

/**
 * Fracción 0..1 del CENTRO de una banda respecto a la cima (0 = valle,
 * 1 = cima). Para ubicar bandas y estampas en el eje vertical de cualquier
 * zoom sin duplicar aritmética.
 */
export function fraccionBanda(id) {
  const banda = bandaPorId(id);
  if (!banda) return 0;
  return (banda.altMin + banda.altMax) / 2 / ALTITUD_CIMA;
}

/*
 * Mundos del registro 3D que NO viven en el manifiesto del home
 * (mundosFinca.js): título/emoji/destino propios, sin inventar vistas — cada
 * `view` es un case real de App.jsx (las mismas que usan sus hotspots).
 */
const MUNDOS_FUERA_DE_MANIFIESTO = {
  valle: {
    titulo: 'El valle de la finca',
    emoji: '🏞️',
    destino: { view: 'dashboard' },
    esCasa: true,
  },
  frutales: { titulo: 'Frutales de la finca', emoji: '🍊', destino: { view: 'frutales' } },
  milpa: { titulo: 'La milpa', emoji: '🌽', destino: { view: 'milpa_cultivo' } },
  pisos: { titulo: 'Qué siembro a mi altura', emoji: '🌡️', destino: { view: 'directorio' } },
};

/* El destino real de un mundo del manifiesto: directo > portada > pantalla
   genérica de mundo (la misma regla que aplica la grilla del home). */
function destinoDeManifiesto(id, manifiesto) {
  if (manifiesto.directo) {
    return { view: manifiesto.directo.view, data: manifiesto.directo.data || null };
  }
  if (manifiesto.portada) return { view: manifiesto.portada };
  return { view: 'mundo', data: { mundo: id } };
}

/**
 * TODOS los mundos navegables, cada uno con su banda:
 *   { id, piso, titulo, emoji, destino: {view, data?}, esCasa }
 * El piso sale de `MUNDO[id].pisoTermico` (la fase de datos ya lo asignó);
 * título/emoji salen del manifiesto del home cuando el mundo vive allí.
 */
export const MUNDOS_NAVEGACION = Object.freeze(
  Object.entries(MUNDO)
    .filter(([, mundo]) => Boolean(mundo.pisoTermico))
    .map(([id, mundo]) => {
      const manifiesto = MUNDO_BY_ID[id] || null;
      const propio = MUNDOS_FUERA_DE_MANIFIESTO[id] || null;
      return Object.freeze({
        id,
        piso: mundo.pisoTermico,
        titulo: manifiesto?.titulo || propio?.titulo || id,
        emoji: manifiesto?.emoji || propio?.emoji || '🌱',
        destino: manifiesto ? destinoDeManifiesto(id, manifiesto) : propio?.destino || { view: 'dashboard' },
        esCasa: Boolean(propio?.esCasa),
      });
    }),
);

/**
 * Los mundos agrupados por banda, en el orden altitudinal de las bandas:
 *   [{ banda, mundos: [...] }, ...]  de cálido (abajo) a páramo (arriba).
 */
export function mundosPorBanda() {
  return BANDAS_NAVEGACION.map((banda) => ({
    banda,
    mundos: MUNDOS_NAVEGACION.filter((m) => m.piso === banda.id),
  }));
}

/** El piso de un mundo (id de banda) o null si no se conoce el mundo. */
export function pisoDeMundo(mundoId) {
  return MUNDOS_NAVEGACION.find((m) => m.id === mundoId)?.piso ?? null;
}
