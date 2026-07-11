/*
 * LAMINAS_FIABLES — el CONJUNTO CERRADO de láminas que el agente puede
 * ADJUNTAR a una respuesta (DR "el agente dibuja de forma fiable", 2026-07-11).
 *
 * Vive en su propio módulo (no en index.js) para que `AgentLamina` pueda
 * importar el validador sin crear un ciclo con el barrel. index.js re-exporta
 * desde aquí para conservar el import ergonómico `@/visual/laminas`.
 *
 * El agente NUNCA genera SVG: SELECCIONA un `slug` de este registro y, a lo
 * sumo, una `prop de enum cerrado` (`activo`, `etapa`). Todo lo demás es arte
 * fijo, ya verificado a mano. Cada plantilla está LOCKED a su especie o a su
 * proposición: `LaminaMaiz` dibuja maíz, `LaminaMilpa` dibuja la milpa
 * (maíz+frijol+calabaza) — no se generalizan.
 *
 * Cada fila declara:
 *   - `Component`  el componente de la lámina (arte local, self-contained).
 *   - `nombre`     título humano (usted colombiano).
 *   - `dim`        '2d' — todas las láminas de cuaderno son 2D (contrato del DR).
 *   - `lock`       'especie' | 'proposicion' | 'parametrica'  (naturaleza del lock).
 *   - `aplica_a`   binomio (locked-a-especie) o proposición (proposición-locked)
 *                  o dominio (paramétrica). Lo consume el GATE DE GROUNDING del
 *                  agente (regla #3) — NO el frontend.
 *   - `props`      enums CERRADOS permitidos por prop de dominio. `{}` = sin prop.
 *   - `accesible`  'decorativa' (aria-hidden) | 'enseña' (role=img con rótulos).
 *
 * REPARTO DE RESPONSABILIDAD (importante):
 *   - El FRONTEND (`resolveLaminaFiable`) valida SOLO reglas #1 y #2 del gate:
 *     slug ∈ registro  y  prop ∈ enum. Si algo no calza → devuelve null → la
 *     lámina no se dibuja (degrada a solo texto).
 *   - La regla #3 (la especie/proposición de la lámina coincide con una entidad
 *     ATERRIZADA del turno) la revalida el HANDLER del agente contra
 *     resolvedEntities/toolEvidence. Eso NO vive aquí — el arte no sabe de
 *     grounding, solo de "este slug+prop es dibujable".
 */
import LaminaSiembra from './LaminaSiembra.jsx';
import LaminaAporque from './LaminaAporque.jsx';
import LaminaMaiz from './LaminaMaiz.jsx';
import LaminaCafeto from './LaminaCafeto.jsx';
import LaminaMataEtapa from './LaminaMataEtapa.jsx';
import LaminaMilpa from './LaminaMilpa.jsx';
import LaminaRotacion from './LaminaRotacion.jsx';
import LaminaPisoTermico from './LaminaPisoTermico.jsx';

export const LAMINAS_FIABLES = {
  siembra: {
    Component: LaminaSiembra,
    nombre: 'Formas de siembra',
    dim: '2d',
    lock: 'parametrica',
    aplica_a: 'propagacion-vegetativa', // tubérculos/esquejes/colinos
    props: { activo: ['tuberculo', 'esqueje', 'colino'] },
    accesible: 'decorativa',
  },
  aporque: {
    Component: LaminaAporque,
    nombre: 'El aporque (en corte)',
    dim: '2d',
    lock: 'parametrica',
    aplica_a: 'tuberculos-y-raices',
    props: {},
    accesible: 'decorativa',
  },
  maiz: {
    Component: LaminaMaiz,
    nombre: 'La mata de maíz',
    dim: '2d',
    lock: 'especie',
    aplica_a: 'Zea mays',
    props: {},
    accesible: 'enseña',
  },
  cafeto: {
    Component: LaminaCafeto,
    nombre: 'El cafeto',
    dim: '2d',
    lock: 'especie',
    aplica_a: 'Coffea arabica',
    props: {},
    accesible: 'enseña',
  },
  'mata-etapa': {
    Component: LaminaMataEtapa,
    nombre: 'La mata por etapa (viva)',
    dim: '2d',
    lock: 'especie',
    aplica_a: 'Solanum lycopersicum',
    props: { etapa: ['semilla', 'plantula', 'juvenil', 'adulto', 'floracion', 'cosecha'] },
    accesible: 'decorativa',
  },
  milpa: {
    Component: LaminaMilpa,
    nombre: 'La milpa (las tres hermanas)',
    dim: '2d',
    lock: 'proposicion',
    aplica_a: 'milpa: Zea mays + Phaseolus vulgaris + Cucurbita',
    props: {},
    accesible: 'enseña',
  },
  rotacion: {
    Component: LaminaRotacion,
    nombre: 'La rotación por eras',
    dim: '2d',
    lock: 'proposicion',
    aplica_a: 'rotacion: hoja → fruto → raíz → leguminosa',
    props: {},
    accesible: 'enseña',
  },
  'piso-termico': {
    Component: LaminaPisoTermico,
    nombre: 'El piso térmico (en corte)',
    dim: '2d',
    lock: 'proposicion',
    aplica_a: 'piso-termico: gradiente cálido → páramo',
    props: {},
    accesible: 'enseña',
  },
};

/**
 * Valida (reglas #1 y #2 del gate) un `slug` + `props` contra el registro
 * cerrado y devuelve lo dibujable, o `null` si algo no calza.
 *
 * Conservador a propósito: rechaza slugs desconocidos, props no declaradas
 * para esa lámina y valores fuera del enum. Ante la duda → `null` (no dibuja).
 * NO valida grounding (regla #3): eso lo hace el handler del agente.
 *
 * @param {string} slug
 * @param {Record<string, unknown>} [props]
 * @returns {{ slug: string, Component: import('react').ComponentType<any>,
 *   props: Record<string, string>, meta: (typeof LAMINAS_FIABLES)[string] } | null}
 */
export function resolveLaminaFiable(slug, props = {}) {
  if (typeof slug !== 'string' || !Object.prototype.hasOwnProperty.call(LAMINAS_FIABLES, slug)) {
    return null;
  }
  const meta = LAMINAS_FIABLES[slug];
  const allowed = meta.props || {};
  const clean = /** @type {Record<string, string>} */ ({});

  if (props && typeof props === 'object') {
    for (const key of Object.keys(props)) {
      // Prop no declarada para esta lámina → rechazo total (conservador).
      if (!Object.prototype.hasOwnProperty.call(allowed, key)) return null;
      const value = props[key];
      // Valor fuera del enum cerrado → rechazo total.
      if (typeof value !== 'string' || !allowed[key].includes(value)) return null;
      clean[key] = value;
    }
  }

  return { slug, Component: meta.Component, props: clean, meta };
}

/**
 * ¿Es `slug` un miembro del conjunto cerrado de láminas fiables?
 * @param {unknown} slug
 * @returns {boolean}
 */
export function esLaminaFiable(slug) {
  return typeof slug === 'string'
    && Object.prototype.hasOwnProperty.call(LAMINAS_FIABLES, slug);
}
