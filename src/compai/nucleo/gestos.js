/**
 * gestos — EL REPERTORIO OCIOSO DEL compAI. Núcleo portable.
 *
 * *"En su puesto se rasca, se pica el ojo, hace de todo. No es predecible,
 * siempre hace cosas diferentes."* — SPEC del operador.
 *
 * Vivía dentro de `visual/agente/angelitaEstados.js` (que ya era puro) y se
 * mudó al núcleo para que el compAI de la PWA y el de `3d.guatoc.co` tengan
 * EL MISMO repertorio y EL MISMO azar. `angelitaEstados.js` re-exporta desde
 * aquí — no copia. Ver `MANIFIESTO.md`.
 *
 * NUEVO 2026-07-26: **`guino`** — "picarse el ojo". El operador lo nombró por
 * su nombre en el SPEC y no estaba entre los 9 gestos. Un parpadeo es
 * biología; un guiño es complicidad, que es otra cosa.
 *
 * Y con él entran **`estira`, `bosteza`, `rascanuca`, `cabecea` y
 * `voltereta`** (merge de `fable/compai-gestos-entrada`, 2026-07-26): el
 * repertorio elegible por azar pasa de 6 a **12 momentos**, que es lo que
 * pedía el SPEC — *"no es predecible, siempre hace cosas diferentes"*. Con 6
 * gestos y anti-repetición el ciclo se leía; con 12 deja de leerse.
 *
 * Entran AQUÍ y no en `angelitaEstados.js` a propósito: el núcleo es la fuente
 * única, y si el repertorio se quedara en la PWA el compAI de `3d.guatoc.co`
 * heredaría otra vez un personaje más pobre — que es exactamente la divergencia
 * que este núcleo existe para cerrar.
 *
 * REGLA DURA: `dur` (ms) debe COINCIDIR con la duración del keyframe one-shot
 * del CSS de ese momento — el scheduler suelta el atributo exactamente cuando
 * el gesto termina en identidad, y así el empalme no salta.
 * `peso` = probabilidad relativa al elegir (0 = no se elige por azar: son los
 * momentos de secuencia — flota es el "entre-gestos"; posada/despega los
 * encadena el propio scheduler después de posa).
 *
 * @module compai/nucleo/gestos
 */

export const MOMENTOS_IDLE = {
  flota: { dur: [3200, 8600], peso: 0 },  // vuelo sereno entre gestos (dur al azar)
  mira: { dur: 2600, peso: 3 },       // mira alrededor, curiosa (ojos primero, cabeza después)
  distraida: { dur: 3600, peso: 2 },  // pasa una mota de vilano y la sigue con los ojos
  acicala: { dur: 3000, peso: 2 },    // se acicala la antena con la manita (aseo de abeja)
  rasca: { dur: 2400, peso: 1.5 },    // se rasca la barriguita, satisfecha
  sacude: { dur: 1500, peso: 1.5 },   // sacudón de alas: escalofrío alegre que la esponja
  guino: { dur: 1800, peso: 1.2 },    // se pica el ojo: complicidad, no biología (SPEC)
  estira: { dur: 2600, peso: 1.4 },   // se estira a gusto: bracitos arriba, bosteza el cuerpo
  bosteza: { dur: 3200, peso: 1.1 },  // bostezo de goma: boca enorme, manita tarde a taparla
  rascanuca: { dur: 2400, peso: 1.3 },// se rasca la nuca, medio apenada (rascarse distinto)
  cabecea: { dur: 3600, peso: 0.9 },  // se le van los ojos… zzz… y DESPIERTA de un brinco
  voltereta: { dur: 1700, peso: 0.8 },// pirueta juguetona: vuelta de campana con anticipación
  posa: { dur: 1150, peso: 2 },       // aterriza con peso (→ posada → despega)
  posada: { dur: [3400, 5200], peso: 0 }, // descansa posada: alitas plegadas, respira hondo
  despega: { dur: 950, peso: 0 },     // se agacha, coge impulso y vuelve al aire
};

/* Los momentos elegibles por azar (peso > 0), congelados una vez. */
const GESTOS_IDLE = Object.keys(MOMENTOS_IDLE).filter((m) => MOMENTOS_IDLE[m].peso > 0);

/**
 * EL AZAR DE LA CASA: elección ponderada que NUNCA repite la anterior. Es la
 * línea que separa una criatura viva de un GIF — nadie se rasca dos veces
 * seguidas. Genérica a propósito: el mismo azar sirve para los micro-gestos
 * de Angelita en la PWA y para las poses que de verdad tiene cada rig del
 * valle (el oso no tiene los mismos gestos que la abeja, pero merece la misma
 * impredecibilidad).
 *
 * @param {Array<string>|Object<string,{peso:number}>} candidatos — lista de
 *   nombres (peso 1 cada uno) o tabla nombre→{peso}.
 * @param {string|null} [previo] — se excluye de la tirada.
 * @param {() => number} [rand] — fuente de azar 0..1 (inyectable → testeable).
 * @returns {string|null} el elegido, o null si no había candidatos.
 */
export function elegirSinRepetir(candidatos, previo = null, rand = Math.random) {
  const esTabla = candidatos && !Array.isArray(candidatos) && typeof candidatos === 'object';
  const nombres = (esTabla ? Object.keys(candidatos) : (candidatos || []))
    .filter((n) => esTabla ? Number(candidatos[n]?.peso) > 0 : true);
  const libres = nombres.filter((n) => n !== previo);
  // Con un solo candidato no hay forma de no repetir: se repite y no se miente.
  const pool = libres.length ? libres : nombres;
  if (!pool.length) return null;
  const peso = (n) => (esTabla ? Number(candidatos[n].peso) : 1);
  const total = pool.reduce((s, n) => s + peso(n), 0);
  let bola = rand() * total;
  for (const n of pool) {
    bola -= peso(n);
    if (bola <= 0) return n;
  }
  return pool[pool.length - 1];
}

/**
 * Elige el próximo micro-gesto del idle de Angelita: el azar de la casa sobre
 * el repertorio ponderado de arriba.
 * @param {string|null} [previo]  el último gesto hecho (se excluye).
 * @param {() => number} [rand]  fuente de azar 0..1 (default Math.random).
 * @returns {string} nombre del momento elegido.
 */
export function elegirMomentoIdle(previo = null, rand = Math.random) {
  const elegibles = {};
  for (const m of GESTOS_IDLE) elegibles[m] = MOMENTOS_IDLE[m];
  return elegirSinRepetir(elegibles, previo, rand);
}

/**
 * Duración en ms de un momento del idle; los rangos [min,max] salen con
 * jitter (el reloj de una criatura viva no es de cuarzo).
 * @param {string} momento
 * @param {() => number} [rand]
 * @returns {number}
 */
export function duracionDeMomento(momento, rand = Math.random) {
  const m = MOMENTOS_IDLE[momento] || MOMENTOS_IDLE.flota;
  return Array.isArray(m.dur) ? Math.round(m.dur[0] + rand() * (m.dur[1] - m.dur[0])) : m.dur;
}

export default { MOMENTOS_IDLE, elegirMomentoIdle, elegirSinRepetir, duracionDeMomento };
