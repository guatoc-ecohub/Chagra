// ── onboarding.js — ANTES de entrar al valle ────────────────────────────────
//
// Decisión del operador (2026-07-25 §3): «Primera visita a `3d.guatoc.co` →
// onboarding → elegir mascota → entra al valle CON ella visible. Quien ya
// eligió, entra directo.»
//
// Tres momentos, calcados de `BienvenidaFinca` (chagra `origin/dev`): dónde
// está parado · quién lo acompaña · entrar. El tercero es el que importa: el
// SELECTOR DE MASCOTA. La elección se guarda en `guatoc.guia` y de ahí la lee
// el valle (`portales.js`), el marco de cada mundo y el salto a la 2D — el
// compAI cruza con el usuario, no desaparece en el salto.
//
// ⚠️ TODOS LOS AVATARES DEL MISMO TAMAÑO. Las fichas del selector miden lo
// mismo y el rig se ajusta a su caja con el mismo encaje por `getBBox` que usa
// el billboard del valle, así que la luciérnaga ocupa lo mismo que el oso.
// (La luciérnaga «era invisible de tan pequeña» — palabras del operador.)
//
// 🔴 CORRECCIÓN DEL OPERADOR (2026-08-13, al aterrizar F24+F25): Dante y
// Oliver NO SON GUÍAS COMPAI — son NPCs vivos del valle (`perros-realistas.js`)
// y pilotos del Kart (ahí sí, F25 los dejó correctos). El roster-8 de
// 2026-08-12 los había colado como opción de guía por error de paridad con
// el Kart; se retiran de aquí (siguen vivos como NPC/piloto por sus propios
// caminos, sin rig de guía). `chivito-punk` es UN solo personaje — el pájaro
// del páramo, normal quieto y con cresta sólo cuando habla — así que su
// FICHA se etiqueta simplemente "Chivito" (el slug interno sigue siendo
// `chivito-punk`: es el que ya cablean `RIG_DE`/`portales.js`/`marco.js`/
// `idleMachine.js`, no se toca esa plomería). `guacamaya` vuelve al selector
// (tenía rig completo desde siempre, `GUIAS_ARTE.guacamaya`; sólo había
// salido por la paridad-8 con el Kart, que ya no aplica). Selector final:
// angelita, jaguar, oso, zarigüeya, luciérnaga, chivito, guacamaya — el
// mismo 7 aprobado antes del roster-8, con la piel nueva de F24 encima.
//
// 🔴 F24 — EL RIG VIVO PRIMERO, LA LÁMINA SÓLO PARA QUIEN NO TIENE RIG.
// El pase anterior montaba la lámina PNG de Gemini para los 8 y el rig
// vectorial quedó de "legado": los 7 esqueletos animables de GUIAS_ARTE
// (boca, patas, manos, alas) se mostraban como UNA FOTO que respira por
// escala. Palabra del operador: «una ficha que se estira… se supone que hay
// una fábrica 2D/2.5/3D». La regla de F24 es la del contrato de seres
// (CONTRATO-GENERADOR-SERES.md, regla 2): la apariencia nueva es PIEL sobre
// la MISMA anatomía — así que la piel del refresco 2026-08-12 vive ahora EN
// los rigs (`compai/rigs/*` → `assets/guias-arte.js`) y la lámina queda para
// los únicos slugs sin esqueleto: dante y oliver (marcador honesto).
import { escribirCompanero } from './compai/elenco.js';
import { montarLaminaValle } from './compai/laminaFallback.js';
import { idleDeCompai, semillaDe } from './compai/idleMachine.js';
export const LS_GUIA = 'guatoc.guia';
export const LS_VISTO = 'guatoc.onboarding.v1';

const ORDEN = ['angelita', 'jaguar', 'oso', 'zariguya', 'luciernaga', 'chivito-punk', 'guacamaya'];
const FICHA = {
  angelita:      { nombre: 'Angelita',     que: 'La abeja de la casa. Sabe qué está floreciendo y cuándo.' },
  jaguar:        { nombre: 'Jaguar',       que: 'El que aparece y desaparece. Conoce el monte de noche.' },
  oso:           { nombre: 'Oso andino',   que: 'El guardián del bosque alto. Camina despacio y sabe dónde está el agua.' },
  // Lo que hace, no lo que es: ronda de noche y se come la plaga. Y lleva a
  // las crías al lomo mientras trabaja — que es su firma y está dibujada en
  // el rig (`data-crias="3"`), no escrita en un rótulo.
  zariguya:      { nombre: 'Zarigüeya',    que: 'Ronda la huerta de noche y se come la plaga. Carga a sus crías al lomo mientras trabaja.' },
  luciernaga:    { nombre: 'Luciérnaga',   que: 'Se enciende cuando algo vale la pena mirar de cerca.' },
  // El slug sigue siendo `chivito-punk` (RIG_DE/portales.js/marco.js/
  // idleMachine.js ya cablean ese id); la etiqueta es sólo "Chivito" porque
  // el personaje anda normal y quieto la mayor parte del tiempo — la cresta
  // punk es su pose `hablar`, no su identidad completa.
  'chivito-punk': { nombre: 'Chivito',     que: 'El pájaro del páramo. Avisa antes de que cambie el tiempo — y cuando avisa, se le para la cresta.' },
  guacamaya:     { nombre: 'Guacamaya',    que: 'Vuela lejos y trae semillas de otras laderas.' },
};

// El rig SVG (cuando existe) esconde sus poses por CSS según `data-estado`:
// SIN el atributo no se dibuja nada y `getBBox()` devuelve 0×0. Los estados
// son los mismos que usa el billboard del valle.
const ESTADO = {
  oso: 'camina', jaguar: 'camina', guacamaya: 'dispersar',
  angelita: 'idle', chivito: 'idle', luciernaga: 'idle', zariguya: 'idle',
};
const NUCLEO = { guacamaya: 'guaca' };
// Slugs del roster que son OTRA CARA de un rig existente, no otro esqueleto.
// `chivito-punk` ES el chivito del páramo: mismo pájaro, y el punk es un
// ESTADO (la pose `hablar`), no un personaje aparte — decisión del operador:
// «normal quieto por defecto; la cresta punk sólo cuando habla (~30%)».
const RIG_DE = { 'chivito-punk': 'chivito' };
// El ciclo del habla del chivito: ventana determinista de 3,6 s cada 12 s
// (30% del tiempo, el número del operador). La fase sale de `semillaDe` para
// que no arranque pegado al borde del ciclo en t=0.
const HABLA_CICLO = { chivito: { periodo: 12, dur: 3.6, pose: 'hablar' } };

// Reloj compartido del idle de TODAS las fichas visibles: una sola llamada a
// `requestAnimationFrame` por cuadro, no una por bicho (8 fichas, 8 rAF
// sería 8× el trabajo por nada — la pose es una función pura del reloj).
const _fichasVivas = new Map();   // idleWrap → { slug, host, ciclo }
let _rafFichas = null;
function _tickFichas(tMs) {
  const t = tMs / 1000;
  for (const [wrap, f] of _fichasVivas) {
    if (!wrap.isConnected) { _fichasVivas.delete(wrap); continue; }
    const p = idleDeCompai(t, { perfil: f.slug });
    wrap.style.transform = `scale(${p.sx.toFixed(4)},${p.sy.toFixed(4)}) rotate(${p.rot.toFixed(2)}deg) translateY(${(p.dy * 100).toFixed(2)}%)`;
    // el ciclo del habla (hoy sólo chivito): la pose es función pura del
    // reloj — dentro de la ventana el rig pasa a `hablar` (el punk), fuera
    // vuelve a su reposo. Se escribe el atributo SÓLO al cambiar.
    if (f.ciclo && f.host) {
      const c = f.ciclo;
      const fase = ((semillaDe(f.slug) % 997) / 997) * c.periodo;
      const habla = ((t + fase) % c.periodo) >= (c.periodo - c.dur);
      const quiere = habla ? c.pose : f.reposo;
      if (f.host.getAttribute('data-estado') !== quiere) f.host.setAttribute('data-estado', quiere);
    }
  }
  _rafFichas = _fichasVivas.size ? requestAnimationFrame(_tickFichas) : null;
}
function _animarFicha(wrap, slug, host, rigId) {
  if (!wrap) return;
  const ciclo = rigId && HABLA_CICLO[rigId];
  _fichasVivas.set(wrap, {
    slug, host: host || null, ciclo: ciclo || null,
    reposo: host ? host.getAttribute('data-estado') : null,
  });
  if (!_rafFichas) _rafFichas = requestAnimationFrame(_tickFichas);
}
function _detenerFichas() {
  _fichasVivas.clear();
  if (_rafFichas) cancelAnimationFrame(_rafFichas);
  _rafFichas = null;
}

function montarRig(host, id) {
  // 1) EL RIG VIVO — huesos reales, piel dibujada (F24). Cualquier slug con
  //    esqueleto en GUIAS_ARTE sale articulado; la PNG nunca le gana al rig.
  const rigId = RIG_DE[id] || id;
  const arte = window.GUIAS_ARTE && window.GUIAS_ARTE[rigId];
  if (!arte) {
    // 2) lámina/marcador — SÓLO para los slugs sin rig (dante, oliver).
    const lam = montarLaminaValle(host, id);
    if (lam) { _animarFicha(lam.idleWrap, id); return; }
    host.textContent = '·'; return;
  }
  host.setAttribute('data-estado', ESTADO[id] || ESTADO[rigId] || 'idle');
  const root = host.shadowRoot || host.attachShadow({ mode: 'open' });
  root.innerHTML =
    // ⚠️ `overflow:hidden` (el billboard del valle usa `visible` para sus
    // filtros): sin recortar, los rigs se salen de la ficha y el oso y el
    // jaguar tapan media pantalla — se veía en la captura 04.
    // ⚠️ Mis reglas van DESPUÉS de `arte.css`, y con `!important`: el CSS de
    // cada rig trae sus propios tamaños y, puesto antes, los pisaba — en la
    // captura 07 las fichas mostraban el torso del bicho, no el bicho.
    '<style>' + arte.css + ':host{display:block;overflow:hidden}'
    + '.idleWrap{width:100%;height:100%;transform-origin:50% 92%;will-change:transform}'
    + 'svg{width:100%!important;height:100%!important;max-width:none!important;'
    + 'max-height:none!important;display:block;overflow:hidden}</style>' +
    '<div class="idleWrap"><svg viewBox="0 0 900 1150" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">' +
    arte.defs + arte.svg + '</svg></div>';
  // Mismo encaje que el billboard del valle: la caja del núcleo manda, así que
  // los seis rigs terminan ocupando la misma altura de ficha.
  // ⚠️ CON REINTENTO, y esto no es paranoia: MEDIDO en el navegador, en el
  // primer `requestAnimationFrame` tras el `innerHTML` el shadow todavía no
  // está maquetado y `getBBox()` devuelve 0×0 — por eso las fichas salían
  // recortadas primero y diminutas después. Se reintenta hasta que la caja es
  // real (o se rinde y deja el viewBox de origen, que al menos dibuja algo).
  encuadrar(root, NUCLEO[rigId] || rigId, 40);
  _animarFicha(root.querySelector('.idleWrap'), id, host, rigId);
}

function encuadrar(root, nucleoId, M, intento = 0) {
  let b = null;
  try {
    const n = root.getElementById(nucleoId) || root.querySelector('svg > g');
    b = n && n.getBBox();
  } catch (e) { b = null; }
  if (b && b.width > 1 && b.height > 1) {
    root.querySelector('svg').setAttribute('viewBox',
      `${(b.x - M).toFixed(0)} ${(b.y - M).toFixed(0)} ${(b.width + 2 * M).toFixed(0)} ${(b.height + 2 * M).toFixed(0)}`);
    return;
  }
  // ⚠️ Hasta 6 s: las fichas nacen dentro de `.paso` con `display:none` (el
  // paso 2 del onboarding), y **un subárbol `display:none` no tiene caja**:
  // `getBBox()` devuelve 0×0 mientras el usuario no llegue a ese paso. Además
  // se vuelve a encuadrar al mostrar el paso (ver `reencuadrar`), que es el
  // camino determinista; esto es sólo la red.
  if (intento < 100) setTimeout(() => encuadrar(root, nucleoId, M, intento + 1), 60);
}

// vuelve a encuadrar TODAS las fichas ya visibles (se llama al cambiar de
// paso) — sólo aplica al camino del rig: la lámina/marcador no tiene
// `getBBox` que ajustar, ya llena su caja por `object-fit:contain`.
function reencuadrar(cont) {
  cont.querySelectorAll('.bicho').forEach((b) => {
    const h = b.querySelector('.rig');
    if (h && h.shadowRoot && h.shadowRoot.querySelector('svg')) {
      const rigId = RIG_DE[b.dataset.id] || b.dataset.id;
      encuadrar(h.shadowRoot, NUCLEO[rigId] || rigId, 40);
    }
  });
}

// ¿ya pasó por aquí? → entra directo
export function yaEligio() {
  try { return !!localStorage.getItem(LS_GUIA); } catch (e) { return false; }
}
export function guiaElegida() {
  try { return localStorage.getItem(LS_GUIA); } catch (e) { return null; }
}

export function esperarOnboarding() {
  const qs = new URLSearchParams(location.search);
  // los cuadros fijos del gate visual y `?onb=0` no ven el onboarding: son
  // capturas deterministas, no una visita.
  if (qs.get('cam') || qs.get('onb') === '0') return Promise.resolve(guiaElegida());
  if (qs.get('onb') !== '1' && yaEligio()) return Promise.resolve(guiaElegida());

  return new Promise((resolve) => {
    const css = document.createElement('style');
    css.textContent = `
    #onb{position:fixed;inset:0;z-index:60;display:flex;flex-direction:column;
      align-items:center;justify-content:center;gap:18px;padding:24px 16px;overflow:auto;
      background:radial-gradient(120% 90% at 50% 0%,rgba(23,51,62,.86),rgba(6,14,18,.97));
      backdrop-filter:blur(3px);color:#eaf4f1;font-family:system-ui,-apple-system,sans-serif;
      transition:opacity .6s ease}
    #onb.fuera{opacity:0;pointer-events:none}
    #onb h1{margin:0;font-size:clamp(1.35rem,4.4vw,2.1rem);font-weight:650;letter-spacing:.01em;text-align:center}
    #onb .sub{margin:0;max-width:640px;text-align:center;opacity:.74;line-height:1.55;
      font-size:clamp(.86rem,2.4vw,1rem)}
    #onb .paso{display:none;flex-direction:column;align-items:center;gap:16px;width:100%}
    #onb .paso.on{display:flex}
    #onb .rejilla{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));
      gap:12px;width:100%;max-width:760px}
    #onb .bicho{background:linear-gradient(180deg,rgba(23,51,62,.75),rgba(10,24,30,.75));
      border:1.5px solid rgba(169,213,203,.28);border-radius:16px;padding:10px 10px 12px;
      cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:6px;
      transition:border-color .18s,transform .18s,background .18s;color:inherit;font:inherit;text-align:center}
    #onb .bicho:hover{transform:translateY(-3px);border-color:rgba(255,196,106,.6)}
    #onb .bicho.sel{border-color:#ffc46a;background:linear-gradient(180deg,rgba(41,82,96,.9),rgba(16,38,47,.9));
      box-shadow:0 0 0 1px rgba(255,196,106,.35),0 12px 34px rgba(0,0,0,.5)}
    /* ⚠️ LA CAJA DEL RIG ES LA MISMA PARA LOS SEIS — el oso es la referencia */
    #onb .rig{width:100%;height:132px;display:block;overflow:hidden}
    #onb .bicho b{font-size:.9rem;font-weight:600}
    #onb .bicho span{font-size:.72rem;opacity:.66;line-height:1.35}
    #onb .botones{display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-top:4px}
    #onb button.cta{background:#ffc46a;color:#20140a;border:0;border-radius:999px;
      padding:11px 26px;font:650 .95rem system-ui,sans-serif;cursor:pointer;
      box-shadow:0 10px 30px rgba(255,196,106,.22)}
    #onb button.cta:disabled{opacity:.4;cursor:not-allowed;box-shadow:none}
    #onb button.suave{background:rgba(169,213,203,.12);border:1px solid rgba(169,213,203,.3);
      color:#eaf4f1;border-radius:999px;padding:11px 22px;font:500 .9rem system-ui,sans-serif;cursor:pointer}
    #onb .puntos{display:flex;gap:6px;margin-top:2px}
    #onb .puntos i{width:7px;height:7px;border-radius:50%;background:rgba(234,244,241,.24)}
    #onb .puntos i.on{background:#ffc46a}
    `;
    document.head.appendChild(css);

    const el = document.createElement('div');
    el.id = 'onb';
    el.innerHTML = `
      <div class="paso on" data-p="0">
        <h1>Bienvenido al valle</h1>
        <p class="sub">Esto es Guatoc: la casa, el domo, la quebrada y La Chorrera al fondo.
        El valle no es un menú — es el sitio. Cada mundo está en un lugar del paisaje,
        y el lugar cuenta para qué sirve.</p>
        <div class="botones"><button class="cta" data-ir="1">Seguir</button></div>
        <div class="puntos"><i class="on"></i><i></i></div>
      </div>
      <div class="paso" data-p="1">
        <h1>¿Quién lo acompaña?</h1>
        <p class="sub">Elija su compañero. Va con usted por todo el valle, entra a cada mundo
        y también cruza a las pantallas 2D. Puede cambiarlo cuando quiera.</p>
        <div class="rejilla"></div>
        <div class="botones">
          <button class="suave" data-ir="0">Atrás</button>
          <button class="cta entrar" disabled>Entrar al valle</button>
        </div>
        <div class="puntos"><i></i><i class="on"></i></div>
      </div>`;
    document.body.appendChild(el);
    document.body.classList.add('onbAbierto');

    const rej = el.querySelector('.rejilla');
    let elegida = guiaElegida();
    ORDEN.forEach((id) => {
      const f = FICHA[id];
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'bicho'; b.dataset.id = id;
      b.innerHTML = `<div class="rig"></div><b>${f.nombre}</b><span>${f.que}</span>`;
      rej.appendChild(b);
      montarRig(b.querySelector('.rig'), id);
    });

    const btEntrar = el.querySelector('.entrar');
    rej.addEventListener('click', (e) => {
      const b = e.target.closest('.bicho'); if (!b) return;
      elegida = b.dataset.id;
      rej.querySelectorAll('.bicho').forEach((x) => x.classList.toggle('sel', x.dataset.id === elegida));
      btEntrar.disabled = false;
      btEntrar.textContent = `Entrar al valle con ${FICHA[elegida].nombre}`;
    });

    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-ir]'); if (!b) return;
      const p = b.dataset.ir;
      el.querySelectorAll('.paso').forEach((x) => x.classList.toggle('on', x.dataset.p === p));
      if (p === '1') requestAnimationFrame(() => reencuadrar(el));
    });

    btEntrar.addEventListener('click', () => {
      if (!elegida) return;
      try {
        // ── LA ELECCIÓN SE ESCRIBE EN LA LLAVE CANÓNICA, NO SÓLO EN LA VIEJA ──
        // `compai/elenco.js` existe para cerrar la discontinuidad 3D↔PWA (el
        // usuario elegía el oso aquí, abría la PWA y lo recibía la abeja),
        // pero el onboarding sólo escribía `guatoc.guia`: la llave canónica
        // `compai:companero` quedaba VACÍA — verificado en el navegador,
        // `localStorage.getItem('compai:companero') === null` tras elegir.
        // El módulo estaba construido y no estaba cableado.
        escribirCompanero(elegida);          // canónica + las dos heredadas
        localStorage.setItem(LS_GUIA, elegida);
        localStorage.setItem(LS_VISTO, '1');
      } catch (e) { /* modo privado: entra igual, sin recordar */ }
      el.classList.add('fuera');
      document.body.classList.remove('onbAbierto');
      _detenerFichas();      // se acabaron las fichas: apaga el reloj compartido
      setTimeout(() => el.remove(), 700);
      resolve(elegida);
    });
  });
}

// Arranca APENAS se carga el módulo — antes de que termine de bajar el DEM
// (1 MB) y de que `terrain.js` resuelva su `await` de nivel superior. Así el
// usuario ve el onboarding MIENTRAS el valle se construye detrás, en vez de
// mirar "Cargando…" y recibir el selector después.
window.__onbListo = esperarOnboarding();
