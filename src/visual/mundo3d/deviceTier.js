/*
 * deviceTier — el DEVICE-TIERING del framework (heredado del valle, DR §4.4).
 *
 * La 3D es ASPIRACIONAL (gama media+). No basta con "¿hay WebGL?": un teléfono
 * humilde lo tiene pero sufre jank y calor. Se degrada por señales de equipo
 * débil: poca RAM, pocos núcleos, ahorro de datos o menos-movimiento. Devuelve un
 * `tier` que el host `<Mundo>` usa para decidir 3D vs 2D:
 *
 *   'alto'  → 3D pleno.
 *   'medio' → 3D frugal (los arquetipos ya son frugales por contrato: sin
 *             sombras, MeshLambert/Basic, DPR≤1.5 — DR §6).
 *   'bajo'  → 2D digno (sin-WebGL, poca RAM/CPU, saveData, reduced-motion).
 *
 * Misma lógica que `decidirRender()` del mockup del valle, pero graduada en tres
 * niveles (aquel decide binario 2d/3d). Es la fuente de verdad del framework.
 */

/** @returns {{ tier: 'alto'|'medio'|'bajo', motivo: string }} */
export function decidirTier() {
  if (typeof window === 'undefined') return { tier: 'bajo', motivo: 'ssr' };

  /* `deviceMemory`/`connection` son APIs experimentales que la lib de tipos del
     DOM aún no declara; se tipan aquí como opcionales (sin `any`). */
  const nav =
    /** @type {Navigator & { deviceMemory?: number, connection?: { saveData?: boolean }, mozConnection?: { saveData?: boolean }, webkitConnection?: { saveData?: boolean } }} */ (
      window.navigator
    );

  // 1) WebGL es requisito DURO del 3D.
  let webgl = false;
  try {
    const canvas = document.createElement('canvas');
    webgl = !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl2') || canvas.getContext('webgl'))
    );
  } catch {
    webgl = false;
  }
  if (!webgl) return { tier: 'bajo', motivo: 'sin-webgl' };

  // 2) El usuario pidió ahorrar datos o menos movimiento → respetarlo.
  const conn = nav.connection || nav.mozConnection || nav.webkitConnection;
  if (conn && conn.saveData) return { tier: 'bajo', motivo: 'ahorro' };
  const menosMov =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (menosMov) return { tier: 'bajo', motivo: 'calma' };

  // 3) Equipos humildes → 2D (no los ponemos a sudar la GPU).
  const mem = nav.deviceMemory; // GiB aprox. (Chrome/Android); undefined en otros
  if (typeof mem === 'number' && mem > 0 && mem <= 3) return { tier: 'bajo', motivo: 'equipo' };
  const nucleos = nav.hardwareConcurrency;
  if (typeof nucleos === 'number' && nucleos > 0 && nucleos <= 4) {
    return { tier: 'bajo', motivo: 'equipo' };
  }

  // 4) Gama media declarada → 3D frugal; el resto, 3D pleno.
  if ((typeof mem === 'number' && mem <= 6) || (typeof nucleos === 'number' && nucleos <= 6)) {
    return { tier: 'medio', motivo: 'ok' };
  }
  return { tier: 'alto', motivo: 'ok' };
}

/** ¿Este tier puede montar una escena 3D? (bajo y '2d' forzado → no). */
export const permite3D = (tier) => tier === 'alto' || tier === 'medio';

/*
 * PERFIL DE RENDER por tier (DR-3D-PERF-GAMABAJA §2): el presupuesto que las
 * escenas 3D consultan para degradarse SIN duplicar condicionales por archivo.
 *
 *   'alto'  → el look actual INTACTO (sombras reales, DPR 1.8, detalle pleno).
 *   'medio' → 3D frugal: sin shadow-map (el repaso de sombras es ~40% de la
 *             GPU), DPR≤1.3, sin antialias, vegetación instanciada, LOD por
 *             distancia en los landmarks, menos fauna DOM y menos estrellas.
 *   'bajo'  → perfil MÍNIMO de seguridad. Por defecto gama baja ni monta 3D
 *             (cae al 2D digno); si algo la fuerza, esto la mantiene ~30 fps:
 *             DPR 1 fijo, sin niebla, sin sombras de contacto, densidad mínima.
 */
const PERFIL_RENDER = {
  alto: {
    dpr: [1, 1.8],
    antialias: true,
    sombras: true, // shadow-map real: SOLO aquí
    materialRico: true, // meshStandardMaterial (PBR); frugal usa Lambert
    segmentosTerreno: 56,
    flatShading: true, // des-indexa la malla: solo donde sobra GPU
    estrellas: 900,
    criaturas: 5, // billboards DOM de fauna decorativa
    matasInstanciadas: false,
    matasCada: 1, // siembra todas las matas
    lod: false, // landmarks siempre a detalle completo
    lodDistancia: Infinity,
    fog: true,
    sombrasContacto: true,
    luzBeacon: true,
  },
  medio: {
    dpr: [1, 1.3],
    antialias: false,
    sombras: false,
    materialRico: false,
    segmentosTerreno: 32,
    flatShading: false, // geometría indexada (~1k vértices, no ~19k)
    estrellas: 300,
    criaturas: 3,
    matasInstanciadas: true,
    matasCada: 1,
    lod: true,
    lodDistancia: 12,
    fog: true,
    sombrasContacto: true,
    luzBeacon: true,
  },
  bajo: {
    dpr: 1,
    antialias: false,
    sombras: false,
    materialRico: false,
    segmentosTerreno: 20,
    flatShading: false,
    estrellas: 0,
    criaturas: 0,
    matasInstanciadas: true,
    matasCada: 2, // una mata de cada dos
    lod: true,
    lodDistancia: 10,
    fog: false, // niebla fuera: fill-rate al mínimo
    sombrasContacto: false,
    luzBeacon: false,
  },
};

/** El perfil de render del tier (desconocido → frugal, nunca el caro). */
export const perfilDeTier = (tier) => PERFIL_RENDER[tier] || PERFIL_RENDER.medio;
