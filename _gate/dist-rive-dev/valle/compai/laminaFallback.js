/**
 * laminaFallback — arte del compAI cuando NO hay rig vectorial.
 *
 * El PROBLEMA: `assets/guias-arte.js` (rigs multi-pose, generados por
 * `build-guias.mjs` desde los standalones `compai-*.html`) sólo tiene SEIS
 * personajes — angelita, chivito (la versión SIN punk), jaguar, oso,
 * guacamaya, zariguya. El roster canónico de 8 (Chagra Kart, `pilotos.js`)
 * es angelita/jaguar/oso/zariguya/dante/oliver/luciérnaga/chivito-punk, y
 * TRES de ellos no tienen rig: `chivito-punk` (existe como personaje pero su
 * rig vectorial es el del chivito SIN punk), `dante` y `oliver` (no existe
 * rig de ninguno de los dos).
 *
 * Lo que SÍ existe para chivito-punk es su lámina aprobada
 * (`compai/laminas/chivito-punk.png`, la misma que monta el Kart en el
 * asiento). Para dante y oliver **no existe lámina propia** — el Kart hoy le
 * presta a `dante` el PNG del chivito (`piloto-lamina.js`, comentario "sin
 * anatomía medida") y a `oliver` no le da nada. Este módulo NO REPITE ese
 * atajo: perpetuar «el mismo cuerpo recoloreado» es justo lo que el operador
 * pidió NO hacer. Dante y Oliver muestran un MARCADOR honesto — una insignia,
 * no un disfraz — hasta que exista su lámina.
 *
 * `montarLaminaValle` da el mismo contrato que `montarGuia`/`montarRig` del
 * resto de `compai/`: monta en un shadow DOM y deja un `.idleWrap` para que
 * `idleMachine.js` lo anime, así el llamador no necesita saber si lo que hay
 * detrás es una lámina real o un marcador.
 *
 * @module compai/laminaFallback
 */

const CARPETA = new URL('./laminas/', import.meta.url).href;

/**
 * El roster de 8 + legado. `redisenada:true` = lámina aprobada del refresco
 * de arte 2026-08-12 (commit `f6951b0` y siguientes). Sin entrada aquí para
 * los que YA tienen rig vectorial completo (angelita/jaguar/oso/zariguya/
 * guacamaya) — ESOS se resuelven con `GUIAS_ARTE`, no con este módulo; sólo
 * se listan aquí los que un consumidor pueda necesitar en modo "sólo lámina"
 * (p.ej. `onboarding.js`, que muestra el arte MÁS NUEVO del roster completo).
 */
export const LAMINAS_VALLE = {
  angelita: { archivo: 'angelita.png', ancho: 414, altoPx: 493, redisenada: true },
  jaguar: { archivo: 'jaguar-natural.png', ancho: 705, altoPx: 394, redisenada: true },
  oso: { archivo: 'oso.png', ancho: 611, altoPx: 629, redisenada: true },
  zariguya: { archivo: 'zariguya.png', ancho: 481, altoPx: 444, redisenada: true },
  luciernaga: { archivo: 'luciernaga.png', ancho: 367, altoPx: 507, redisenada: true },
  'chivito-punk': { archivo: 'chivito-punk.png', ancho: 397, altoPx: 654, redisenada: true },
  // Legado (no está en el roster de 8, pero si alguien lo tiene guardado en
  // `localStorage` de una visita vieja, sigue viendo su chivito, no un hueco).
  chivito: { archivo: 'chivito-normal.png', ancho: 387, altoPx: 652, redisenada: true },
  // ⚠️ SIN ARTE PROPIA — ver cabecera del módulo. `archivo:null` es la señal
  // explícita de "no inventar": `montarLaminaValle` cae al marcador.
  // `ancho`/`altoPx` van igual (proporción ~0,72, la misma familia que el
  // resto de bustos de cuerpo entero): así `portales.js` puede calcular el
  // aspecto del billboard SIN esperar a que exista una imagen real.
  dante: { archivo: null, ancho: 420, altoPx: 580, redisenada: false, especie: 'beagle', letra: 'D', tinte: '#caa064' },
  oliver: { archivo: null, ancho: 420, altoPx: 580, redisenada: false, especie: 'dálmata', letra: 'O', tinte: '#8d8a80' },
};

/** ¿Este slug tiene lámina (real o marcador) en este módulo? */
export function tieneLaminaValle(slug) {
  return !!LAMINAS_VALLE[slug];
}

/** ¿Tiene ARTE DE VERDAD (no marcador)? Lo usa el reporte del gate. */
export function laminaEsReal(slug) {
  return !!(LAMINAS_VALLE[slug] && LAMINAS_VALLE[slug].archivo);
}

const CSS_COMUN = `
  :host{display:block;overflow:hidden}
  .idleWrap{width:100%;height:100%;display:flex;align-items:center;justify-content:center;
    transform-origin:50% 92%;will-change:transform}
  img{max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain;display:block;
    filter:drop-shadow(0 6px 10px rgba(0,0,0,.38))}
  .marcador{width:78%;height:78%;border-radius:50%;display:flex;flex-direction:column;
    align-items:center;justify-content:center;gap:4px;
    background:radial-gradient(120% 120% at 50% 30%,var(--tinte,#5a6470) 0%,rgba(20,26,32,.9) 78%);
    border:2px dashed rgba(255,255,255,.4);color:#eef8f4;font-family:system-ui,sans-serif;
    box-shadow:0 8px 20px rgba(0,0,0,.4)}
  .marcador .letra{font-size:2.4rem;font-weight:700;line-height:1;opacity:.92}
  .marcador .pata{font-size:1.3rem;opacity:.85}
  .marcador .etq{font-size:.56rem;letter-spacing:.04em;text-transform:uppercase;opacity:.72;
    text-align:center;padding:0 6px}
`;

/**
 * Monta la lámina (o el marcador) de `slug` dentro de `host`, en un shadow
 * DOM propio. Devuelve `{ root, idleWrap }` — `idleWrap` es a quien
 * `idleMachine.js` le escribe el `transform` cada frame. `null` si el slug
 * no está ni siquiera en `LAMINAS_VALLE` (el llamador decide qué hacer).
 * @param {HTMLElement} host
 * @param {string} slug
 * @returns {{root:ShadowRoot,idleWrap:HTMLElement,real:boolean}|null}
 */
export function montarLaminaValle(host, slug) {
  const d = LAMINAS_VALLE[slug];
  if (!d) return null;
  const root = host.shadowRoot || host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = CSS_COMUN + (d.tinte ? `:host{--tinte:${d.tinte}}` : '');
  root.innerHTML = '';
  root.appendChild(style);
  const wrap = document.createElement('div');
  wrap.className = 'idleWrap';
  if (d.archivo) {
    const img = document.createElement('img');
    img.src = CARPETA + d.archivo;
    img.alt = slug;
    img.width = d.ancho; img.height = d.altoPx;
    img.decoding = 'async';
    wrap.appendChild(img);
  } else {
    // EL MARCADOR HONESTO — nunca el cuerpo de otro personaje recoloreado.
    const m = document.createElement('div');
    m.className = 'marcador';
    m.innerHTML =
      `<div class="letra">${d.letra || '?'}</div><div class="pata">🐾</div>`
      + `<div class="etq">sin lámina — ${d.especie || 'arte pendiente'}</div>`;
    wrap.appendChild(m);
  }
  root.appendChild(wrap);
  return { root, idleWrap: wrap, real: !!d.archivo };
}

export default { LAMINAS_VALLE, tieneLaminaValle, laminaEsReal, montarLaminaValle };
