/*
 * creatureClimaCuerpo — el CLIMA REAL escrito en el CUERPO de una CREATURE
 * rubber-hose andina (species-agnostic).
 *
 * La coreografía (useEntradaAbeja + reaccionFinca) ya modula el VUELO con el
 * estado real de la finca; este módulo es la pieza hermana para el DIBUJO: una
 * función PURA y determinista que traduce el `clima` del `estadoFinca` REAL
 * (useFincaViva → Open-Meteo/efemérides, vocabulario de valleData.CLIMAS) en
 * parámetros de cuerpo que la creature aplica tal cual.
 *
 * GENÉRICO A PROPÓSITO: toda la familia rubber-hose (abeja Angelita, colibrí,
 * oso andino, rana…) comparte el MISMO lenguaje CSS/SVG — `.crt-body`,
 * `.crt-wing`, glow/blur de `_filters.jsx`, contorno de tinta que respira — así
 * que la MISMA lógica clima→cuerpo (mojado / sed / niebla / vibrante) vale para
 * todas. Lo único que cambia es CUÁNTO le pega cada clima a cada especie: eso
 * vive en un PERFIL. Angelita (abeja) es el primer consumidor; el resto entra
 * pasando su perfil.
 *
 *   cuerpoDeClima(clima, { enso, tier, perfil }) → {
 *     humedad,       // 0..1 — cuánta agua carga el cuerpo (para creatures que
 *                    //   dibujan su propia mojadura: gotas, rocío, brillo)
 *     opacidad,      // 0..1 — presencia: la niebla la vuelve silueta difusa
 *     tinte,         // null | string — filtro CSS determinista (sequía apagada,
 *                    //   dorada vibrante, lluvia con brillo mojado)
 *     velocidadAlas, // multiplicador del aleteo (1 = base): dorada rápida,
 *                    //   lluvia pesada y lenta. En especies SIN alas → 1.
 *     altura,        // multiplicador de vuelo COMPLEMENTARIO al de reaccionFinca
 *                    //   (niebla vuela corto, dorada un poco más alto). Se
 *                    //   MULTIPLICA con reaccion.vuelo.altura; lluvia/sequía van
 *                    //   en 1 aquí porque su descenso ya lo pone reaccionFinca.
 *   }
 *
 * REGLAS DE LA CASA:
 *   · Sin clima (standalone: avatares, catálogo, storybook) → NEUTRO digno:
 *     todo en 1, tinte null. La creature se ve EXACTO como siempre.
 *   · Determinista: cero azar, cero reloj — mismo clima, mismo cuerpo.
 *   · Frugal por tier: en 'bajo' no hay blur (raster caro en gama baja); la
 *     niebla se dice solo con opacidad. Los demás filtros son estáticos (se
 *     pintan una vez, no por frame) y opacity/filter van por GPU.
 *   · reducedMotion NO vive aquí: `velocidadAlas` solo lo aplica la creature
 *     cuando anima (con RM las alas ya están quietas; queda el estado visual).
 *   · Los tintes son filtros CSS y NO colores de atmosferaMadre.js a propósito:
 *     ese módulo importa `three` y las creatures viven en el bundle BASE (2D:
 *     home, avatares) — importarlo aquí arrastraría three fuera del chunk
 *     perezoso vendor-three. La dirección de arte se honra en los valores
 *     (cálido dorado, sequía sepia-tierra), no en el import.
 */

/** El cuerpo NEUTRO (sin dato de clima): la creature de siempre, sin disfraz. */
export const CUERPO_NEUTRO = Object.freeze({
  humedad: 0,
  opacidad: 1,
  tinte: null,
  velocidadAlas: 1,
  altura: 1,
});

/*
 * CLIMA_BASE — la respuesta CANÓNICA de cuerpo por clima, calibrada para una
 * creature de referencia (un polinizador alado: la abeja). El PERFIL de cada
 * especie escala estos valores. `humedad` y la caída de `opacidad` se atenúan
 * por perfil; `velocidadAlas` se anula si la especie no tiene alas; el `tinte`
 * es dirección de arte compartida (bajo el mismo sol todas se doran igual), y el
 * perfil puede sustituirlo por especie vía `perfil.tintes[clima]`.
 */
const CLIMA_BASE = {
  // Mojada: brillo húmedo (la piel destella), alas pesadas de agua. El vuelo
  // bajo/pesado lo pone reaccionFinca (mojada) → altura 1 aquí (no doble-contar).
  lluvia: {
    humedad: 1,
    opacidad: 1,
    tinte: 'saturate(1.06) brightness(1.05) contrast(1.06)',
    velocidadAlas: 0.72,
    altura: 1,
  },
  // Casi no se ve: silueta difusa entre la bruma, con algo de rocío encima.
  niebla: {
    humedad: 0.35,
    opacidad: 0.5,
    tinte: 'saturate(0.85) blur(0.5px)',
    velocidadAlas: 0.9,
    altura: 0.85, // vuela corto y cerca — no se pierde en la bruma
  },
  // La hora dorada: cálida al sol bajo, alas ágiles. ATENUADA a propósito: el
  // dorado saturaba y cansaba la vista (la Angelita 3D se veía "solo dorada,
  // demasiado brillante"). Bajamos saturación/brillo — sigue dorándose, sin
  // quemar. La des-saturación fina del billboard 3D la remata en mundo.css.
  dorada: {
    humedad: 0,
    opacidad: 1,
    tinte: 'saturate(1.05) brightness(1.02)',
    velocidadAlas: 1.18,
    altura: 1.04, // se luce un pelín más alto
  },
  // Día claro y honesto: viva, apenas más ágil que el neutro.
  soleado: {
    humedad: 0,
    opacidad: 1,
    tinte: 'saturate(1.03)',
    velocidadAlas: 1.1,
    altura: 1,
  },
  // La finca duerme: presencia serena, medio tono abajo, aleteo de reposo.
  noche: {
    humedad: 0,
    opacidad: 0.92,
    tinte: 'saturate(0.9) brightness(0.92)',
    velocidadAlas: 0.7,
    altura: 0.9,
  },
};

/* Sequía (El Niño resecando un día claro): con sed, tono apagado tierra, alas
   más lentas. El bajar a buscar sombra ya lo hace reaccionFinca (sed) → altura 1. */
const SEQUIA_BASE = {
  humedad: 0,
  opacidad: 1,
  tinte: 'saturate(0.72) sepia(0.18) brightness(0.96)',
  velocidadAlas: 0.8,
  altura: 1,
};

/*
 * PERFILES por especie. Campos (todos con defecto = pasar de largo como la
 * abeja de referencia, así una llamada SIN perfil se comporta idéntica):
 *   alas    boolean  ¿tiene aleteo? false → velocidadAlas siempre 1.
 *   humedad 0..1     cuán visiblemente carga agua (escala `humedad`).
 *   difusa  0..1     cuánto la disuelve la niebla (escala la CAÍDA de opacidad).
 *   sequia  0..1     vulnerabilidad a la sequía; 0 = inmune (no reacciona).
 *   tintes  {clima→str}  sustituye tintes por identidad de especie (opcional).
 */
export const PERFIL_ABEJA = Object.freeze({
  alas: true, humedad: 1, difusa: 1, sequia: 1,
});
/* Colibrí: plumas aceitadas que escurren el agua (menos mojado), ágil y
   pequeño (la niebla lo traga casi como a la abeja), aguanta algo la seca. */
export const PERFIL_COLIBRI = Object.freeze({
  alas: true, humedad: 0.55, difusa: 0.9, sequia: 0.7,
});
/* Oso andino: pelaje que empapa despacio, mole grande (la niebla apenas lo
   difumina), robusto ante la seca. Sin alas. */
export const PERFIL_OSO = Object.freeze({
  alas: false, humedad: 0.7, difusa: 0.45, sequia: 0.4,
});
/* Rana: anfibia — la más brillante mojada y la MÁS golpeada por la sequía
   (la piel se le reseca). Sin alas. Su tinte de lluvia empuja el verde húmedo. */
export const PERFIL_RANA = Object.freeze({
  alas: false, humedad: 1, difusa: 0.85, sequia: 1,
  tintes: { lluvia: 'saturate(1.2) brightness(1.06) contrast(1.05)' },
});

/** Registro consultable slug→perfil (para cablear el selector de avatar). */
export const PERFILES = Object.freeze({
  'abeja-angelita': PERFIL_ABEJA,
  colibri: PERFIL_COLIBRI,
  'oso-andino': PERFIL_OSO,
  rana: PERFIL_RANA,
  'rana-andina': PERFIL_RANA, // alias del slug de la creature 2D (RanaAndina)
});

function clamp01(n) {
  return Math.max(0, Math.min(1, n));
}

/* La sequía manda sobre el brillo del día: El Niño sobre un día claro
   (mismo criterio de sed de reaccionFinca — coherencia cuerpo↔vuelo). */
function esSequia(clima, enso) {
  return enso === 'nino' && (clima === 'soleado' || clima === 'dorada');
}

/* Aplica el PERFIL de especie sobre una respuesta base de clima. Escala la
   humedad, atenúa la caída de opacidad, anula el aleteo si no hay alas y deja
   sustituir el tinte por identidad. Determinista y barato (una vez por cambio
   de clima, no por frame). */
function aplicarPerfil(base, perfil, clima, tier) {
  const humedad = clamp01(base.humedad * (perfil.humedad ?? 1));
  // opacidad: la creature parte de 1 y la niebla la BAJA; el perfil escala esa
  // caída (una mole difumina menos). difusa=1 → caída plena; 0 → nunca se borra.
  const caida = (1 - base.opacidad) * (perfil.difusa ?? 1);
  const opacidad = clamp01(1 - caida);
  const velocidadAlas = perfil.alas === false ? 1 : base.velocidadAlas;
  // tinte: identidad de especie si la define; si no, el canónico. En tier bajo
  // se poda el blur (raster caro en gama baja): la opacidad sola cuenta la niebla.
  let tinte = perfil.tintes?.[clima] ?? base.tinte;
  if (tier === 'bajo' && typeof tinte === 'string' && tinte.includes('blur(')) {
    tinte = tinte.replace(/\s*blur\([^)]*\)/g, '').trim() || null;
  }
  return { humedad, opacidad, tinte, velocidadAlas, altura: base.altura };
}

/**
 * Deriva los parámetros de CUERPO de una creature del clima real de la finca.
 *
 * @param {('dorada'|'soleado'|'niebla'|'lluvia'|'noche'|null|undefined)} clima
 *   el clima de escena del `estadoFinca` REAL (mapearClima de useFincaViva).
 *   Desconocido o ausente → CUERPO_NEUTRO (estado digno, jamás inventado).
 * @param {object} [opts]
 * @param {('nino'|'nina'|'neutro')} [opts.enso='neutro'] fase ENSO efectiva —
 *   El Niño sobre día claro = sequía (tono deshidratado, alas lentas).
 * @param {('alto'|'medio'|'bajo')} [opts.tier] device-tier: 'bajo' evita blur.
 * @param {object} [opts.perfil=PERFIL_ABEJA] perfil de especie (ver PERFILES).
 * @returns {{humedad:number, opacidad:number, tinte:(string|null), velocidadAlas:number, altura:number}}
 */
export function cuerpoDeClima(clima, { enso = 'neutro', tier, perfil = PERFIL_ABEJA } = {}) {
  const p = perfil || PERFIL_ABEJA;
  // Sequía (Niño + día claro): gana sobre 'dorada'/'soleado' salvo especie
  // inmune (perfil.sequia === 0), que entonces ve su clima normal.
  if (esSequia(clima, enso) && (p.sequia ?? 1) > 0) {
    return aplicarPerfil(SEQUIA_BASE, p, clima, tier);
  }
  const base = CLIMA_BASE[clima];
  if (!base) return CUERPO_NEUTRO; // sin dato / vocabulario desconocido → digno
  return aplicarPerfil(base, p, clima, tier);
}

export default cuerpoDeClima;

/* ═══════════════════════════════════════════════════════════════════════════
 * ROPA / CUERPO por CLIMA + HORA  (extensión — biblia de personajes)
 * ───────────────────────────────────────────────────────────────────────────
 * `cuerpoDeClima` (arriba) modula PIEL: mojado / niebla / tinte / aleteo. Esto
 * es la capa de VESTUARIO: ruana, sombrero y sudor. Mismo vocabulario de clima
 * de escena ('dorada'|'soleado'|'niebla'|'lluvia'|'noche') — la HORA ya viaja
 * ahí ('noche' = de noche; 'dorada'/'soleado' = día con sol).
 *
 * El BUG que mata: la abeja SUDANDO de noche. Regla dura → de noche se pone la
 * RUANA (nunca suda); el sudor SOLO sale de día, con sol y calor. Species-
 * agnostic: cada bicho trae su umbral térmico (según su piso); la lógica es una.
 * ═══════════════════════════════════════════════════════════════════════════ */

/* Perfil de VESTUARIO por bicho (derivado del piso térmico de la biblia):
 *   frioC     °C por debajo de la cual siente frío → ruana (además de la noche).
 *   calorC    °C a la cual (o más), de día y con sol, suda → sombrero+sudor.
 *   sudaAlSol cuando NO hay temperatura, ¿suda igual con sol de día? Los de
 *             páramo/frío (oso, rana) NO; los templados/cálidos SÍ (default).
 */
export const ROPA_PERFIL_POR_BICHO = Object.freeze({
  'abeja-angelita': { frioC: 12, calorC: 26, sudaAlSol: true },
  'oso-andino': { frioC: 4, calorC: 18, sudaAlSol: false },
  'rana-andina': { frioC: 8, calorC: 22, sudaAlSol: false }, // slug real de la creature
  'rana-arlequin': { frioC: 8, calorC: 22, sudaAlSol: false }, // alias biblia
  colibri: { frioC: 11, calorC: 26, sudaAlSol: true },
  jaguar: { frioC: 16, calorC: 32, sudaAlSol: true },
  ardilla: { frioC: 11, calorC: 26, sudaAlSol: true },
  perezoso: { frioC: 12, calorC: 27, sudaAlSol: true },
  morrocoy: { frioC: 16, calorC: 32, sudaAlSol: true },
  // Borugo: roedor NOCTURNO de montaña húmeda — siente el frío pronto y de páramo
  // NUNCA suda (como el oso/la rana).
  borugo: { frioC: 8, calorC: 22, sudaAlSol: false },
});

/* Perfil neutro (slug desconocido / standalone). */
export const ROPA_PERFIL_DEFECTO = Object.freeze({ frioC: 12, calorC: 26, sudaAlSol: true });

/**
 * Perfil de vestuario de un bicho por slug. Desconocido → neutro.
 * @param {string} slug
 * @returns {{frioC:number, calorC:number, sudaAlSol:boolean}}
 */
export function ropaPerfilDeBicho(slug) {
  return (typeof slug === 'string' && ROPA_PERFIL_POR_BICHO[slug]) || ROPA_PERFIL_DEFECTO;
}

/** Vestuario NEUTRO (sin clima): sin abrigo ni sudor. */
export const ROPA_NEUTRA = Object.freeze({
  ruana: false, sombrero: false, sudor: false, mojado: false, niebla: false,
});

/**
 * Resuelve el VESTUARIO del bicho para un clima de escena + (opcional) la °C real.
 *
 * @param {('dorada'|'soleado'|'niebla'|'lluvia'|'noche'|null|undefined)} clima
 *   clima de escena (mismo vocabulario que cuerpoDeClima). Desconocido → neutro.
 * @param {object} [opts]
 * @param {{frioC:number, calorC:number, sudaAlSol:boolean}} [opts.perfil=ROPA_PERFIL_DEFECTO]
 * @param {number} [opts.tempC]  °C real si se conoce (afina frío/calor). Sin ella,
 *   se infiere del clima + piso (sol de día = calor salvo bichos de páramo).
 * @returns {{ruana:boolean, sombrero:boolean, sudor:boolean, mojado:boolean, niebla:boolean}}
 */
export function ropaDeClima(clima, { perfil = ROPA_PERFIL_DEFECTO, tempC } = {}) {
  const p = perfil || ROPA_PERFIL_DEFECTO;
  if (clima == null) return ROPA_NEUTRA;

  const esNoche = clima === 'noche';
  const soleadoDia = clima === 'soleado' || clima === 'dorada';
  const lluvia = clima === 'lluvia';
  const niebla = clima === 'niebla';

  const tieneTemp = Number.isFinite(tempC);
  const frioPorTemp = tieneTemp ? tempC <= p.frioC : false;
  // Calor: por °C si la hay; si no, sol de día basta salvo bichos que no sudan.
  const calorEfectivo = tieneTemp ? tempC >= p.calorC : (soleadoDia && p.sudaAlSol !== false);

  // RUANA: de noche o con frío. (Bug muerto: de noche → ruana, jamás sudor.)
  const ruana = esNoche || frioPorTemp;
  // SOMBRERO + SUDOR: solo de día, con sol, con calor y sin ruana.
  const sombrero = !esNoche && soleadoDia && calorEfectivo && !ruana;
  const sudor = sombrero;

  return { ruana, sombrero, sudor, mojado: lluvia, niebla };
}

/**
 * Azúcar: vestuario directo desde el slug del bicho.
 * @param {string} slug
 * @param {('dorada'|'soleado'|'niebla'|'lluvia'|'noche'|null|undefined)} clima
 * @param {object} [opts]  { tempC }
 * @returns {{ruana:boolean, sombrero:boolean, sudor:boolean, mojado:boolean, niebla:boolean}}
 */
export function ropaDeClimaBicho(slug, clima, { tempC } = {}) {
  return ropaDeClima(clima, { perfil: ropaPerfilDeBicho(slug), tempC });
}
