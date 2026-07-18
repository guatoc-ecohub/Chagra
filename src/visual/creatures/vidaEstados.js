/*
 * vidaEstados — el REPERTORIO DEL IDLE VIVO de los 8 bichos rubber-hose,
 * como SOLO DATOS + funciones puras (cero React, cero DOM, cero azar oculto).
 *
 * Es la MISMA vara que Angelita v2 (`agente/angelitaEstados.js` →
 * MOMENTOS_IDLE + elegirMomentoIdle), extendida species-agnostic: una criatura
 * de verdad EXISTE aunque nadie le hable — entre ratos de identidad serena se
 * rasca, resopla, olfatea, se retrae, croa o se acuesta un rato… cada especie
 * con SU repertorio y SU compás (la ardilla no descansa lo que descansa el
 * morrocoy). `useVidaIdle` (el reloj con jitter) hojea este repertorio; la
 * CADENCIA de cada momento ya vive en `creatures.css` como los gestos-firma
 * opt-in de cada bicho (data-resopla, data-acecha, data-olfatea…) — este
 * módulo solo decide CUÁNDO y CUÁL.
 *
 * REGLA DURA (la misma de Angelita v2): `dur` (ms) debe ser MÚLTIPLO EXACTO
 * de la duración del keyframe-loop CSS del elemento DOMINANTE del gesto — el
 * scheduler suelta el atributo justo cuando el loop cierra en identidad y el
 * empalme no salta. Los múltiplos están anotados momento a momento.
 *
 * `peso` = probabilidad relativa al elegir. El gesto elegido NUNCA repite el
 * anterior (una criatura viva no se rasca dos veces seguidas como un GIF).
 *
 * REGLA DE ORO (la de abejaIdentidad.js): SOLO datos y funciones puras. La
 * CADENCIA vive en `creatures.css`; el RELOJ en `useVidaIdle.js`; el DIBUJO
 * en cada bicho.
 */

/* ── EL REPERTORIO POR ESPECIE ───────────────────────────────────────────────
   momento → { dur, peso }. El nombre del momento ES el nombre del gesto-firma
   del bicho ('resopla' → data-resopla) o la pose species-agnostic 'reposo'
   (data-pose='reposo', rh-g-reposo 4.4s). `descanso` = [min,max] ms del rato
   de identidad serena entre gestos (con jitter: el reloj de una criatura viva
   no es de cuarzo). El TEMPERAMENTO va en el compás: los nerviosos (ardilla,
   colibrí) gesticulan seguido; los lentos (morrocoy, perezoso) casi nunca. */
export const VIDA_REPERTORIO = {
  colibri: {
    descanso: [2600, 6400], // hiperactivo: casi no se queda quieto
    momentos: {
      acicala: { dur: 2600, peso: 2 }, // 1× colibri-acicala 2.6s — pico al ala
      vibra: { dur: 1800, peso: 2 }, // 4× colibri-vibra 0.45s — burst staccato
      reposo: { dur: 8800, peso: 0.8 }, // 2× rh-g-reposo — el ÚNICO momento quieto
    },
  },
  'rana-andina': {
    descanso: [4200, 9800],
    momentos: {
      croa: { dur: 2400, peso: 2 }, // 1× rana-croa-garganta 2.4s — el canto
      medita: { dur: 4800, peso: 1.5 }, // 1× rana-medita-respira 4.8s — zen hondo
      reposo: { dur: 8800, peso: 1 }, // 2× rh-g-reposo
    },
  },
  perezoso: {
    descanso: [6400, 13200], // lentísimo: la tensión cómica es la espera
    momentos: {
      estira: { dur: 5200, peso: 2 }, // 1× perezoso-estira 5.2s
      dormita: { dur: 8400, peso: 2 }, // 2× perezoso-zzz 4.2s — se le van las luces
      reposo: { dur: 8800, peso: 1 }, // 2× rh-g-reposo
    },
  },
  ardilla: {
    descanso: [2600, 6400], // inquieta: pizpireta, no para
    momentos: {
      inspecciona: { dur: 3400, peso: 2 }, // 1× ardilla-invierte 3.4s — su firma
      roe: { dur: 3060, peso: 2 }, // 9× ardilla-roe 0.34s
      reposo: { dur: 4400, peso: 0.6 }, // 1× rh-g-reposo — descansa POCO
    },
  },
  jaguar: {
    descanso: [4200, 9800],
    momentos: {
      acecha: { dur: 6400, peso: 2 }, // 2× jaguar-acecho 3.2s · 4× cejas 1.6s
      ruge: { dur: 3200, peso: 1 }, // 2× jaguar-rugido 1.6s — raro e imponente
      reposo: { dur: 8800, peso: 1 }, // 2× rh-g-reposo
    },
  },
  morrocoy: {
    descanso: [6400, 13200], // ancestral: la sabiduría no corre
    momentos: {
      asiente: { dur: 5600, peso: 2 }, // 2× morrocoy-asiente 2.8s — el sabio asiente
      seRetrae: { dur: 4600, peso: 1 }, // 1× morrocoy-retrae 4.6s — su firma elástica
      reposo: { dur: 8800, peso: 1.5 }, // 2× rh-g-reposo — descansar es lo suyo
    },
  },
};

/* El nombre de momento que significa "pose species-agnostic", no gesto-firma:
   el bicho lo traduce a data-pose='reposo' en vez de a un data-attr propio. */
export const MOMENTO_POSE = 'reposo';

/* Gestos elegibles por especie (peso > 0), congelados una vez. */
const GESTOS_DE = Object.fromEntries(
  Object.entries(VIDA_REPERTORIO).map(([slug, r]) => [
    slug,
    Object.keys(r.momentos).filter((m) => r.momentos[m].peso > 0),
  ]),
);

/**
 * Elige el próximo micro-gesto del idle de una especie: azar ponderado que
 * NUNCA repite el anterior. Pura y testeable: el azar se inyecta.
 * @param {string} slug  especie (clave de VIDA_REPERTORIO).
 * @param {string|null} [previo]  el último gesto hecho (se excluye).
 * @param {() => number} [rand]  fuente de azar 0..1 (default Math.random).
 * @returns {string|null} nombre del momento elegido (null si la especie no
 *   tiene repertorio — el bicho queda en su identidad de siempre, sin romper).
 */
export function elegirMomentoVida(slug, previo = null, rand = Math.random) {
  const gestos = GESTOS_DE[slug];
  if (!gestos || gestos.length === 0) return null;
  const candidatos = gestos.length > 1 ? gestos.filter((m) => m !== previo) : gestos;
  const momentos = VIDA_REPERTORIO[slug].momentos;
  const total = candidatos.reduce((s, m) => s + momentos[m].peso, 0);
  let bola = rand() * total;
  for (const m of candidatos) {
    bola -= momentos[m].peso;
    if (bola <= 0) return m;
  }
  return candidatos[candidatos.length - 1];
}

/**
 * Duración en ms de un momento (el tiempo que el scheduler sostiene el gesto
 * — múltiplo exacto del loop CSS, ver REGLA DURA arriba).
 * @param {string} slug @param {string} momento
 * @returns {number}
 */
export function duracionDeMomentoVida(slug, momento) {
  const m = VIDA_REPERTORIO[slug]?.momentos?.[momento];
  return m ? m.dur : 0;
}

/**
 * Duración en ms del próximo rato de identidad serena (descanso entre gestos),
 * con jitter dentro del rango del temperamento de la especie.
 * @param {string} slug
 * @param {() => number} [rand]
 * @returns {number}
 */
export function duracionDeDescanso(slug, rand = Math.random) {
  const d = VIDA_REPERTORIO[slug]?.descanso;
  if (!d) return 6000;
  return Math.round(d[0] + rand() * (d[1] - d[0]));
}

/**
 * RITMO PROPIO por instancia — el fix del metrónomo: `.rh-blink` corría con
 * la MISMA duración y fase en todas las instancias, así que todos los bichos
 * de una pantalla parpadeaban al tiempo (el robot delatado — mismo hallazgo
 * de Angelita v2). Estas vars CSS le dan a CADA instancia su propia duración
 * y fase de parpadeo y su propia fase de dardeo de pupilas. Pura: el azar se
 * inyecta (default Math.random, una vez al montar).
 * @param {() => number} [rand]
 * @returns {Record<string, string>} vars CSS para el style del nodo raíz.
 */
export function crearRitmoPropio(rand = Math.random) {
  return {
    '--rh-blink-dur': `${(4.9 + rand() * 1.7).toFixed(2)}s`,
    '--rh-blink-delay': `${(-rand() * 5).toFixed(2)}s`,
    '--rh-mirada-delay': `${(-rand() * 7.9).toFixed(2)}s`,
  };
}
