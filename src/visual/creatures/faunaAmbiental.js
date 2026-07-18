/*
 * faunaAmbiental — la LÓGICA PURA del valle vivo (cero React, cero three).
 *
 * EL NORTE: los personajes de la chagra HABITAN el valle y la galería de
 * mundos, pero NO todos al tiempo. Unos aparecen, hacen UN gesto lejano de
 * llamar la atención (un saltito, una seña con la manita, un guiño coqueto) y
 * se van; otros entran a reemplazarlos. EL CENTRAL MANDA SIEMPRE: el avatar
 * elegido por la persona es el protagonista en primer plano — los demás son
 * ambiente periférico, más pequeños y suaves, y JAMÁS compiten con él.
 *
 * Este módulo es la fuente única de tres verdades:
 *   1. EL CAST — data-driven desde el registro `CREATURES`: al aterrizar un
 *      personaje nuevo (danta, condor…) entra SOLO al elenco ambiental,
 *      sin tocar este archivo. La microfauna decorativa (lombriz/mariposa/
 *      escarabajo) queda fuera: ella ya vive sembrada por FaunaEscena con
 *      criterio ecológico, no hace giños de personaje.
 *   2. EL CENTRAL — `resolverCentral(slug)` valida contra el registro y cae a
 *      Angelita si no hay avatar elegido (o el hook `useAvatarCreature` aún
 *      no aterriza). El central se EXCLUYE del cast ambiental: nadie se
 *      duplica en escena.
 *   3. EL RITMO — una máquina de estados PURA y determinista por slot
 *      (descansa → entra → gesto → sale → descansa) con pooling: los slots
 *      son fijos (máx 2–3 por tier), se REUSAN los nodos y solo se rota QUÉ
 *      personaje los habita. Nada de spawnear/destruir sin parar.
 *
 * PERFORMANCE (requisito duro — "no carguen el mundo"):
 *   - `limiteAmbiental(tier, reducedMotion)`: alto=3, medio=2, bajo=1, y con
 *     reduced-motion CERO ambientales (a lo sumo el central quieto).
 *   - Duraciones deterministas y desfasadas por slot: nunca entran todos a la
 *     vez, nunca hay más de `limite` en pantalla.
 *   - El componente (FaunaAmbiental.jsx) pausa los timers fuera de pantalla.
 */
import { CREATURES } from './index.js';

/* La microfauna decorativa NO es personaje: ya la siembra FaunaEscena por rol
   ecológico dentro de los dioramas. El elenco ambiental es de PERSONAJES. */
export const MICROFAUNA_EXCLUIDA = ['lombriz', 'mariposa', 'escarabajo'];

/* Sin avatar elegido, la protagonista es la insignia de Chagra. */
export const CENTRAL_DEFECTO = 'abeja-angelita';

/**
 * El PROTAGONISTA: valida el slug contra el registro y cae a Angelita.
 * PUNTO DE INTEGRACIÓN con el avatar elegido: cuando `useAvatarCreature()`
 * aterrice en dev, el host le pasa su slug aquí — una línea y el central
 * cambia en todos los mundos.
 * @param {string|null} slug  el avatar elegido (o null si aún no hay).
 * @param {object} [registro]  slug → { Component, nombre } (default CREATURES).
 * @returns {{ slug: string, Component: Function, nombre: string }}
 */
export function resolverCentral(slug, registro = CREATURES) {
  if (slug && registro[slug]) return { slug, ...registro[slug] };
  return { slug: CENTRAL_DEFECTO, ...registro[CENTRAL_DEFECTO] };
}

/**
 * El ELENCO ambiental: todos los personajes del registro MENOS el central
 * (el protagonista no se duplica en el fondo) y la microfauna decorativa.
 * Data-driven: danta/condor entran solos al aterrizar en CREATURES.
 * @param {string} [centralSlug]
 * @param {object} [registro]
 * @param {string[]} [excluir]  slugs extra fuera del coro (p. ej. Angelita en
 *   el valle, donde ella YA vuela en primer plano dentro de Valle3D).
 * @returns {string[]} slugs del elenco, en el orden del registro.
 */
export function castAmbiental(centralSlug = CENTRAL_DEFECTO, registro = CREATURES, excluir = []) {
  return Object.keys(registro).filter(
    (s) => s !== centralSlug && !MICROFAUNA_EXCLUIDA.includes(s) && !excluir.includes(s),
  );
}

/* Máximo de ambientales EN PANTALLA por gama (pedido del operador: 2–3, jamás
   saturar; en gama baja uno solo, apenas compañía). */
export const AMBIENTE_POR_TIER = { alto: 3, medio: 2, bajo: 1 };

/**
 * Cuántos ambientales caben sin cargar el mundo. Reduced-motion = CERO
 * (sin entradas/salidas: a lo sumo el central quieto). Tier desconocido cae
 * al perfil frugal, nunca al caro (misma filosofía de perfilDeTier).
 */
export function limiteAmbiental(tier = 'alto', reducedMotion = false) {
  if (reducedMotion) return 0;
  return AMBIENTE_POR_TIER[tier] ?? AMBIENTE_POR_TIER.medio;
}

/* Los GESTOS de llamar la atención, lejanos y breves (rubber-hose de lejos se
   lee por silueta): saltito con squash, seña con la manita, asomo con guiño. */
export const GESTOS = ['saltito', 'sena', 'guino'];

/* COHERENCIA DE ENTRADAS (pedido del operador): los animales VIENEN de algún
   lado — del bosque (asoman tras la vegetación del horizonte) o de los
   costados de la pantalla — y se van por donde vinieron. El ÚNICO que aparece
   MÁGICO (surge de la nada, como el espíritu del monte que es) es el jaguar. */
export const MAGICOS = ['jaguar'];

/** ¿Este personaje aparece mágico (sin venir de ningún lado)? */
export const esMagico = (slug) => MAGICOS.includes(slug);

/* El compás de cada fase (ms). El gesto es UNO y corto: chispa, no circo. */
export const FASE_MS = { entra: 700, gesto: 2600, sale: 700 };
/* El descanso base + el desfase por slot: los slots NUNCA respiran al unísono
   (tres ondas co-primas de la coreografía de Angelita, versión de reloj). */
export const DESCANSO_BASE_MS = 3200;
export const DESCANSO_POR_SLOT_MS = 2100;
export const DESCANSO_VARIACION_MS = 1300;

/**
 * El estado inicial del pool: `min(limite, cast)` slots FIJOS, todos
 * descansando con generaciones desfasadas (i) para que la primera entrada
 * sea escalonada, nunca un desembarco.
 * @param {string[]} cast  slugs del elenco (castAmbiental).
 * @param {number} limite  slots en escena (limiteAmbiental).
 */
export function crearEstado(cast, limite) {
  const n = Math.max(0, Math.min(limite, cast.length));
  return {
    cast,
    cursor: 0,
    slots: Array.from({ length: n }, (_, i) => ({
      slug: null,
      fase: 'descansa',
      gesto: GESTOS[i % GESTOS.length],
      gen: i,
    })),
  };
}

/**
 * Avanza UN slot a su siguiente fase (puro e inmutable — el estado viejo no
 * se toca). Al pasar de descansa→entra el slot toma el SIGUIENTE personaje
 * del cast (round-robin con cursor) que no esté ya en otro slot: en escena
 * nunca hay repetidos. El slug se conserva durante `sale` y `descansa`
 * (pooling: el nodo se apaga con fade, no se desmonta) y solo se SWAPEA al
 * volver a entrar.
 * @param {ReturnType<typeof crearEstado>} estado
 * @param {number} i  índice del slot que cumplió su fase.
 */
export function avanzar(estado, i) {
  const slots = estado.slots.slice();
  const s = { ...slots[i] };
  let cursor = estado.cursor;
  if (s.fase === 'descansa') {
    const ocupados = new Set(
      slots.filter((x, j) => j !== i && x.slug).map((x) => x.slug),
    );
    for (let k = 0; k < estado.cast.length; k += 1) {
      const slug = estado.cast[(cursor + k) % estado.cast.length];
      if (!ocupados.has(slug)) {
        s.slug = slug;
        cursor = (cursor + k + 1) % estado.cast.length;
        break;
      }
    }
    s.fase = 'entra';
    s.gen += 1;
    /* El gesto rota por generación+slot: el mismo bicho no repite la misma
       gracia dos veces seguidas, y dos slots vecinos no gesticulan igual. */
    s.gesto = GESTOS[(s.gen + i) % GESTOS.length];
  } else if (s.fase === 'entra') {
    s.fase = 'gesto';
  } else if (s.fase === 'gesto') {
    s.fase = 'sale';
  } else {
    s.fase = 'descansa';
  }
  slots[i] = s;
  return { ...estado, cursor, slots };
}

/**
 * Cuánto dura la fase ACTUAL del slot (ms) — el timer que el componente arma
 * antes de llamar `avanzar`. El descanso se alarga por slot y por generación
 * (determinista): la rotación nunca cae en un compás de reloj.
 */
export function duracionFase(slot, i) {
  if (slot.fase === 'entra') return FASE_MS.entra;
  if (slot.fase === 'gesto') return FASE_MS.gesto;
  if (slot.fase === 'sale') return FASE_MS.sale;
  return (
    DESCANSO_BASE_MS + i * DESCANSO_POR_SLOT_MS + (slot.gen % 3) * DESCANSO_VARIACION_MS
  );
}

/** Los slugs VISIBLES ahora mismo (entra/gesto/sale — descansa ya se apagó). */
export function enEscena(estado) {
  return estado.slots
    .filter((s) => s.slug && s.fase !== 'descansa')
    .map((s) => s.slug);
}

/* Anclajes por defecto de la capa ambiental: bordes y banda del horizonte —
   lejos del centro donde manda el protagonista. Cada host pasa los suyos.
   COHERENCIA: `lado` dice DE DÓNDE VIENE el animal ('izq'/'der' = costado de
   pantalla; 'bosque' = asoma tras la vegetación del horizonte, subiendo) y
   por ahí mismo se va. Sin `lado`, se infiere del anclaje (right → 'der'). */
export const PUNTOS_DEFECTO = [
  { estilo: { left: '5%', top: '38%' }, tam: 46, lado: 'izq' },
  { estilo: { right: '6%', top: '32%' }, tam: 40, voltear: true, lado: 'der' },
  { estilo: { left: '34%', top: '24%' }, tam: 32, lado: 'bosque' },
];

/** De dónde viene el que ocupa este punto (fallback por anclaje). */
export const ladoDePunto = (punto) =>
  punto.lado || (punto.estilo?.right != null ? 'der' : 'izq');
