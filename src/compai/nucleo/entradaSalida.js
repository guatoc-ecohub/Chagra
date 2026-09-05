/*
 * entradaSalida — plan de ENTRADA y SALIDA de cada compai, derivado de la
 * fuente única de conducta (perfilesConducta.js, ejes `entrada` y `salida`).
 *
 * Hasta 2026-09-04 esos dos ejes existían por especie y no los leía nadie:
 * los seis compais de tinta aparecían y se iban exactamente igual. Este
 * módulo los traduce a FASES cronometradas (nombre + ms + variables) que
 * consume el metrónomo de `visual/agente/CompaiEntradaSalida.jsx`.
 *
 * Reglas:
 *   · SOLO consume. Ningún número se inventa: cada `ms` sale del perfil o de
 *     los helpers por masa que exporta perfilesConducta (asientaMsDe,
 *     squashImpactoDe). Si el perfil no trae un dato, la fase no existe y el
 *     hueco queda NOMBRADO en `huecos` (lo leen el informe y los tests).
 *   · Angelita NO está en PERFILES_CONDUCTA: `planEntradaDe('angelita')` es
 *     null y su entrada actual (la vara) no cambia ni un píxel.
 *   · Puro y síncrono: sin DOM, sin React.
 */
import { PERFILES_CONDUCTA, asientaMsDe, squashImpactoDe } from './perfilesConducta.js';

/**
 * @typedef {object} FaseCompai
 * @property {string} nombre   nombre de la fase (clase CSS `compai-es--fase-<nombre>`)
 * @property {number} ms       duración en ms, tomada del perfil
 * @property {Record<string, string|number|boolean>} [vars]  variables para el CSS
 */

/**
 * @typedef {object} PlanCompai
 * @property {string} tipo          tipo declarado en el perfil (o derivado del de entrada)
 * @property {readonly FaseCompai[]} fases
 * @property {number} totalMs       suma de las fases
 * @property {string} aura          color de aura del perfil
 * @property {readonly string[]} huecos   lo que el perfil pide y el FAB no puede rendir hoy
 */

/**
 * @param {string} nombre
 * @param {number} ms
 * @param {Record<string, string|number|boolean>} [vars]
 * @returns {FaseCompai}
 */
const fase = (nombre, ms, vars) => ({
  nombre,
  ms: Math.max(0, Math.round(Number(ms) || 0)),
  ...(vars ? { vars } : {}),
});

/**
 * @param {string} tipo
 * @param {FaseCompai[]} fases
 * @param {string} aura
 * @param {string[]} [huecos]
 * @returns {PlanCompai}
 */
const plan = (tipo, fases, aura, huecos = []) => Object.freeze({
  tipo,
  fases: Object.freeze(fases),
  totalMs: fases.reduce((suma, f) => suma + f.ms, 0),
  aura,
  huecos: Object.freeze(huecos),
});

/* ── ENTRADAS por tipo declarado en `perfil.entrada.tipo` ─────────────────── */
const ENTRADAS = {
  // Jaguar: ojos 0→1 ANTES que el cuerpo → cuerpo con blur → quieto latente.
  'mistico-sombra': (e, p) => plan(e.tipo, [
    fase('sombra', e.ojosMs),
    fase('cuerpo', e.cuerpoMs),
    fase('quieto', e.quietoMs),
  ], p.aura, [
    'ojos-antes-que-el-cuerpo: el rig no expone los ojos hacia afuera; la fase se rinde como sombra/aura y el cuerpo llega después',
  ]),

  // Oso: con marcha caminaría; hoy su locomoción es mística → llega místico,
  // se planta (clac del bastón), florece, quieto.
  'camina-o-mistico': (e, p) => plan(e.tipo, [
    fase('llega', e.caminaMs),
    fase('planta', e.plantaMs, { squash: squashImpactoDe(p.masa) }),
    fase('florece', e.floreceMs),
    fase('quieto', e.quietoMs),
  ], p.aura, [
    'marcha real al entrar: el rig 2D no camina todavía (locomocion.modo=mistico); la llegada dura caminaMs y se rinde mística',
    'corona que florece: vive dentro del rig; la fase se rinde con el aura del perfil',
  ]),

  // Zarigüeya: trote desde el borde → frena (squash) → se yergue y husmea.
  trote: (e, p) => plan(e.tipo, [
    fase('trote', e.troteMs, { pasos: Math.max(1, Math.round((e.troteMs / 1000) / e.pasoS)) }),
    fase('frena', asientaMsDe(p.masa), { squash: e.frenaSquash }),
    fase('yergue', e.yergueMs),
  ], p.aura),

  // Luciérnaga: un punto de luz primero → el cuerpo aparece alrededor (con
  // tri-parpadeo si el perfil lo pide).
  'luz-primero': (e, p) => plan(e.tipo, [
    fase('luz', e.luzMs),
    fase('cuerpo', e.cuerpoMs, { tri: Boolean(e.triParpadeo) }),
  ], p.aura),

  // Chivito: dardo en recta desde fuera → frena en hover → se posa con rebase.
  dardo: (e, p) => plan(e.tipo, [
    fase('dardo', e.dardoMs),
    fase('hover', e.hoverMs),
    fase('posa', e.posaMs, { squash: e.squash }),
  ], p.aura, e.crestaFlick
    ? ['crestaFlick: la cresta vive dentro del rig; el envoltorio no la puede sacudir']
    : []),

  // Guacamaya: teatro (asoma → quieta → crece → brillo), los mismos tiempos
  // de GuacamayaEntrada que el perfil copia.
  teatral: (e, p) => plan(e.tipo, [
    fase('asoma', e.asomaMs),
    fase('quieta', e.quietaMs),
    fase('crece', e.creceMs),
    fase('brillo', e.brilloMs),
  ], p.aura),
};

/* ── SALIDAS: por tipo o, sin tipo, por las duraciones que trae el perfil ── */
const SALIDAS = {
  'sale-corriendo': (s, p) => plan(s.tipo, [fase('corre', s.ms)], p.aura),
  'se-apaga-derivando-arriba': (s, p) => plan(s.tipo, [fase('deriva', s.ms)], p.aura),
  dardo: (s, p) => plan(s.tipo, [fase('dardo', s.ms)], p.aura),
};

/** El perfil de la guacamaya nombra un componente, no tiempos: hueco nombrado. */
const SALIDA_COMPONENTE = 'GuacamayaSalida';

/**
 * @param {string} slug
 * @returns {import('./perfilesConducta.js').PERFILES_CONDUCTA[keyof typeof PERFILES_CONDUCTA] | null}
 */
function perfilDe(slug) {
  if (typeof slug !== 'string') return null;
  return PERFILES_CONDUCTA[slug.trim()] || null;
}

/**
 * Plan de entrada de una especie, o null si el perfil no existe (Angelita,
 * slugs desconocidos) o no declara `entrada`.
 * @param {string} slug
 * @returns {PlanCompai|null}
 */
export function planEntradaDe(slug) {
  const p = perfilDe(slug);
  const e = p?.entrada;
  if (!e || !ENTRADAS[e.tipo]) return null;
  return ENTRADAS[e.tipo](e, p);
}

/**
 * Plan de salida, o null si no hay perfil, no hay `salida`, o la salida está
 * declarada como componente sin tiempos (guacamaya → hueco, ver huecosDe).
 * @param {string} slug
 * @returns {PlanCompai|null}
 */
export function planSalidaDe(slug) {
  const p = perfilDe(slug);
  const s = p?.salida;
  if (!s) return null;
  if (s.tipo === SALIDA_COMPONENTE) return null;
  if (s.tipo && SALIDAS[s.tipo]) return SALIDAS[s.tipo](s, p);
  // Sin tipo: el perfil trae duraciones propias de cuerpo y de un órgano que
  // se apaga después (ojos del jaguar, corona del oso).
  const tipo = p.entrada?.tipo ? `${p.entrada.tipo}` : 'apaga';
  const fases = [];
  if (s.cuerpoMs) fases.push(fase('cuerpo', s.cuerpoMs));
  if (s.ojosMs) fases.push(fase('ojos', s.ojosMs));
  if (s.coronaMs) fases.push(fase('corona', s.coronaMs));
  return fases.length ? plan(tipo, fases, p.aura) : null;
}

/**
 * Todo lo que el perfil pide y este cableado NO rinde hoy, por especie.
 * Es la lista honesta para el informe: hueco nombrado > cableado inventado.
 * @param {string} slug
 * @returns {string[]}
 */
export function huecosDe(slug) {
  const p = perfilDe(slug);
  if (!p) return [];
  const huecos = [
    ...(planEntradaDe(slug)?.huecos ?? []),
    ...(planSalidaDe(slug)?.huecos ?? []),
  ];
  if (p.salida?.tipo === SALIDA_COMPONENTE) {
    huecos.push(`salida ${SALIDA_COMPONENTE}: el perfil nombra el componente, sus tiempos no están en el perfil; el FAB no monta otro cuerpo`);
  }
  if (p.poseDigna) {
    huecos.push(`poseDigna '${p.poseDigna}': ningún rig entiende ese nombre de pose todavía; sin consumidor`);
  }
  return huecos;
}

/** Slugs con plan de entrada (los seis de tinta; Angelita queda fuera a propósito). */
export const ESPECIES_CON_ENTRADA = Object.freeze(
  Object.keys(PERFILES_CONDUCTA).filter((slug) => planEntradaDe(slug) !== null),
);
