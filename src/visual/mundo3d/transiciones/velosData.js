/*
 * velosData — el LENGUAJE DE TRANSICIÓN entre mundos, en datos puros (cero DOM,
 * cero three). Norte: el cruce estilo Odyssey — entrar a un mundo es un
 * MOMENTO, no un corte de pantalla.
 *
 * QUÉ ES UN VELO
 * No un fade negro genérico: la cortina que cubre y descubre el mundo tiene
 * identidad ANDINA y la elige el DESTINO del viaje:
 *
 *   · 'niebla' — la niebla del páramo sube y envuelve (sierra, agua, altura);
 *   · 'tierra' — la tierra se abre y lo traga a uno (suelo, microsuelo, compost);
 *   · 'hojas'  — un remolino de hojas cierra el monte (bosque, restauración);
 *   · 'luz'    — la luz dorada de la casa (valle, hogar — y el default digno).
 *
 * ASIMETRÍA ENTRAR/VOLVER (regla del lenguaje):
 *   · ENTRAR es DESCUBRIR: más ceremonial, un pelo más largo, el velo se lanza
 *     con hambre y el destino se revela con overshoot (la sorpresa pesa).
 *   · VOLVER es REGRESAR A CASA: más corto y más tibio — sin ansiedad, el velo
 *     exhala. La resolución siempre termina cálida (uno ya conoce ese lugar).
 *
 * ANATOMÍA DEL CRUCE (squash & stretch del timing, spec rubber-hose):
 * fracciones de la duración total, iguales para todos los velos:
 *
 *   0%  → 14%   ANTICIPACIÓN  el velo asoma y SE RECOGE (movimiento contrario:
 *                             toma aire antes de lanzarse — ahí está el peso);
 *   14% → 46%   LANZAMIENTO   cubre con aceleración franca (el resorte suelto);
 *   46% → 62%   MESETA        pantalla 100% cubierta — a mitad de meseta (54%)
 *                             dispara `onCubierto`: el host intercambia la
 *                             escena DEBAJO del velo;
 *   62% → 100%  RESOLUCIÓN    revela con overshoot y asentado (back-out): el
 *                             mundo nuevo "aterriza", no aparece.
 *
 * CONTRATO TEMPORAL (misma filosofía que TransicionMundo/TransicionMundoKit):
 * los callbacks los disparan timers JS deterministas, NUNCA `animationend`.
 * El CSS anima "a ciegas" con la MISMA duración via `--vo-ms`.
 *
 * TIER-SAFE (deviceTier): gama baja NUNCA cae a pantalla en blanco — cae al
 * MISMO velo sin decoraciones (una sola capa con los colores de su identidad)
 * y más corto. `reducedMotion` colapsa todo a un corte simple y digno.
 */

/** Fracción del total en que la anticipación termina y arranca el lanzamiento. */
export const ANTICIPACION_FRAC = 0.14;

/** Ventana garantizada de pantalla cubierta (el CSS mesetea 46%–62%). */
export const MESETA_INICIO_FRAC = 0.46;
export const MESETA_FIN_FRAC = 0.62;

/** Momento de `onCubierto`: centro de la meseta. */
export const CUBIERTO_FRAC = 0.54;

/** Con `reducedMotion` TODO colapsa a un corte simple de esta duración. */
export const REDUCIDA_MS = 180;
/** `onCubierto` bajo reduced-motion (la cubierta es instantánea). */
export const CUBIERTO_REDUCIDA_MS = 60;

/** Tier `bajo` acorta el viaje: menos tiempo de overlay en equipos flojos. */
export const FACTOR_TIER_BAJO = 0.7;

/*
 * EASINGS DEL LENGUAJE (cubic-beziers compartidos velo ↔ cámara ↔ demos).
 * Nombrados por su papel en la anatomía, no por su matemática:
 */
/** Lanzamiento: arranca por debajo de cero — la anticipación vive AQUÍ. */
export const EASE_LANZA = 'cubic-bezier(0.5, -0.28, 0.75, 0.55)';
/** Resolución al ENTRAR: back-out con overshoot — el mundo aterriza. */
export const EASE_DESCUBRE = 'cubic-bezier(0.22, 1.28, 0.42, 1)';
/** Resolución al VOLVER: exhalar largo, sin rebote — ya es casa. */
export const EASE_REGRESA = 'cubic-bezier(0.3, 0.6, 0.25, 1)';

/**
 * LOS VELOS. Colores en tríada [claro, medio, profundo] — el claro es el
 * corazón/borde vivo, el profundo es el cuerpo que cubre. `ms` asimétrico:
 * entrar (descubrir) respira más largo que volver (regresar).
 */
export const VELOS = {
  niebla: {
    id: 'niebla',
    etiqueta: 'la niebla del páramo',
    nota: 'Bancos de bruma lechosa que suben, envuelven y se abren en jirones.',
    claro: '#eef4f4',
    medio: '#aec7cf',
    profundo: '#587c88',
    ms: { entrando: 1450, saliendo: 1150 },
  },
  tierra: {
    id: 'tierra',
    etiqueta: 'la tierra que se abre',
    nota: 'El suelo lo traga a uno: horizonte de humus, raicillas y piedritas.',
    claro: '#c98f4e',
    medio: '#7a4f2a',
    profundo: '#33200f',
    ms: { entrando: 1400, saliendo: 1100 },
  },
  hojas: {
    id: 'hojas',
    etiqueta: 'el remolino de hojas',
    nota: 'El monte cierra su follaje sobre el camino y lo vuelve a abrir.',
    claro: '#a9c86a',
    medio: '#4f8f3e',
    profundo: '#16331f',
    ms: { entrando: 1400, saliendo: 1100 },
  },
  luz: {
    id: 'luz',
    etiqueta: 'la luz de la casa',
    nota: 'El amanecer dorado del valle: la luz que abraza al que regresa.',
    claro: '#ffe9b0',
    medio: '#f2c063',
    profundo: '#274a2e',
    ms: { entrando: 1300, saliendo: 1050 },
  },
};

/** Ids válidos, para validación barata y para las demos. */
export const VELO_IDS = Object.keys(VELOS);

/*
 * ¿Qué velo le toca a un destino? El mapeo es por FAMILIA de mundo, con
 * matching laxo por subcadena para no acoplarse al manifiesto de mundos
 * (mundoIds nuevos caen solos en su familia; lo desconocido cae en 'luz',
 * que nunca desentona).
 */
const FAMILIAS = [
  { velo: 'tierra', claves: ['suelo', 'microsuelo', 'subsuelo', 'compost', 'abono', 'lombri'] },
  { velo: 'hojas', claves: ['bosque', 'monte', 'restaura', 'arbol', 'vivero', 'semilla'] },
  { velo: 'niebla', claves: ['sierra', 'paramo', 'páramo', 'agua', 'nieve', 'altura', 'clima'] },
  { velo: 'luz', claves: ['valle', 'casa', 'hogar', 'finca'] },
];

/**
 * Resuelve la identidad del velo para un destino (mundoId o familia directa).
 * @param {string} destino p.ej. 'bosque_vivo', 'microsuelo', 'sierra_global'
 * @returns {'niebla'|'tierra'|'hojas'|'luz'}
 */
export function familiaDeVelo(destino) {
  const d = String(destino || '').toLowerCase();
  if (VELOS[d]) return /** @type {any} */ (d);
  for (const f of FAMILIAS) {
    if (f.claves.some((c) => d.includes(c))) return /** @type {any} */ (f.velo);
  }
  return 'luz';
}

/** El velo completo de un destino (nunca undefined). */
export const veloDeDestino = (destino) => VELOS[familiaDeVelo(destino)];

/**
 * Duración total del cruce en ms.
 * @param {string} veloId 'niebla'|'tierra'|'hojas'|'luz' (desconocido → 'luz')
 * @param {'entrando'|'saliendo'} fase
 * @param {'alto'|'medio'|'bajo'} tier
 * @param {boolean} reducedMotion
 */
export function duracionCruce(veloId, fase, tier, reducedMotion) {
  if (reducedMotion) return REDUCIDA_MS;
  const velo = VELOS[veloId] || VELOS.luz;
  const base = velo.ms[fase === 'saliendo' ? 'saliendo' : 'entrando'];
  return tier === 'bajo' ? Math.round(base * FACTOR_TIER_BAJO) : base;
}

/**
 * Momento (ms desde el arranque) de `onCubierto` — centro de la meseta.
 * Con reduced-motion la cubierta es instantánea: llega enseguida.
 */
export function momentoCubierto(veloId, fase, tier, reducedMotion) {
  if (reducedMotion) return CUBIERTO_REDUCIDA_MS;
  return Math.round(duracionCruce(veloId, fase, tier, reducedMotion) * CUBIERTO_FRAC);
}

/**
 * La curva del cruce como FUNCIÓN (para cámaras y animación imperativa):
 * t∈[0,1] → k con anticipación (k<0 al arrancar) y, si `descubre`, overshoot
 * (k>1 antes de asentar). Es la misma alma de EASE_LANZA/EASE_DESCUBRE pero
 * evaluable por frame — el velo DOM y la cámara 3D respiran igual.
 *
 * @param {number} t progreso lineal 0..1
 * @param {{ descubre?: boolean, anticipo?: number, rebote?: number }} [opts]
 * @returns {number} k (puede salir de [0,1]: eso ES el squash & stretch)
 */
export function curvaCruce(t, { descubre = true, anticipo = 0.055, rebote = 1.15 } = {}) {
  const x = Math.min(1, Math.max(0, t));
  if (x < ANTICIPACION_FRAC) {
    // Se recoge: seno que baja y vuelve a cero justo al soltar el resorte.
    return -anticipo * Math.sin((x / ANTICIPACION_FRAC) * Math.PI);
  }
  const u = (x - ANTICIPACION_FRAC) / (1 - ANTICIPACION_FRAC);
  if (!descubre) {
    // Volver: exhalar — easeInOut suave, sin rebote.
    return u * u * (3 - 2 * u);
  }
  // Entrar: back-out — pasa de largo un pelo y asienta (el aterrizaje pesa).
  const s = rebote;
  const v = u - 1;
  return 1 + v * v * ((s + 1) * v + s);
}
