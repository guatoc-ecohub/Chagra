/* ── marco.js — EL MARCO DE UN MUNDO ───────────────────────────────────────
 *
 * Cierra tres piezas del encargo de una vez, sin tocar el código de `chagra`:
 *
 *  5. **Cada mundo entra CON SU ENT.** «Ninguna lección construida por fuera.»
 *     El Ent del piso térmico del mundo aparece con su lección, tal cual la
 *     escribe `entsGradiente.geom.js` en `origin/dev`. Si el mundo no tiene
 *     Ent asignado, entra igual y el marco lo DICE (no lo esconde).
 *
 *  4. **El compAI en toda la app.** La guía elegida en el onboarding viaja en
 *     `?guia=` y se vuelve a montar aquí: el compañero CRUZA el salto 2D↔3D,
 *     no desaparece. Todos los avatares miden lo mismo (el oso es la
 *     referencia) porque el rig se encaja a una caja fija por `getBBox`.
 *
 *  7. **El salto 2D↔3D dentro del mundo.** Aquí sí van «las entradas 2D de SU
 *     mundo» (en el valle principal es UNA sola, al 2D global). La 2D abre
 *     como LUPA: incrustada, ampliable fuera del 3D, y siempre vuelve — el
 *     iframe del mundo nunca se desmonta, así que al cerrar todo sigue igual.
 *
 * Los datos los pone el `index.html` de cada mundo en `window.__MUNDO`.
 */
(function () {
  const M = window.__MUNDO || {};
  const qs = new URLSearchParams(location.search);

  // ── el compAI que viene con el usuario ──
  const LS_GUIA = 'guatoc.guia';
  let guia = qs.get('guia');
  if (!guia) { try { guia = localStorage.getItem(LS_GUIA); } catch (e) { guia = null; } }
  if (guia) { try { localStorage.setItem(LS_GUIA, guia); } catch (e) { /* privado */ } }
  const NOMBRE_GUIA = {
    oso: 'el oso andino', jaguar: 'el jaguar', guacamaya: 'la guacamaya',
    angelita: 'Angelita', chivito: 'Chivito', luciernaga: 'la luciérnaga',
    // roster de 8 (compai/vivo-valle, 2026-08-12) — ver compai/elenco.js
    'chivito-punk': 'Chivito Punk', dante: 'Dante', oliver: 'Oliver',
  };

  function encuadrar(root, nucleoId, m, intento) {
    let b = null;
    try {
      const n = root.getElementById(nucleoId) || root.querySelector('svg > g');
      b = n && n.getBBox();
    } catch (e) { b = null; }
    if (b && b.width > 1 && b.height > 1) {
      root.querySelector('svg').setAttribute('viewBox',
        `${(b.x - m).toFixed(0)} ${(b.y - m).toFixed(0)} ${(b.width + 2 * m).toFixed(0)} ${(b.height + 2 * m).toFixed(0)}`);
      return;
    }
    if ((intento || 0) < 20) setTimeout(() => encuadrar(root, nucleoId, m, (intento || 0) + 1), 60);
  }

  const $ = (s, r) => (r || document).querySelector(s);
  const el = (t, c, h) => { const n = document.createElement(t); if (c) n.className = c; if (h != null) n.innerHTML = h; return n; };

  document.title = M.nombre + ' — Valle de Guatoc';

  // ── armazón ──
  const raiz = el('div', 'mkRaiz');
  // Sin escena propia (mundo roto o sin ruta) NO se monta un iframe vacío: el
  // `index.html` ya trae el bloque `.mkVacio` con el aviso y lo que sí sirve.
  raiz.innerHTML = `
    ${M.escena ? `<iframe class="mkEscena" title="${M.nombre}" src="${M.escena}"></iframe>` : ''}
    <header class="mkBarra">
      <a class="mkBt mkVolver" href="/">↩ el valle</a>
      <span class="mkNombre">${M.emoji || ''} ${M.nombre}</span>
      <span class="mkSep"></span>
      <button class="mkBt mkRot" type="button" title="Los rótulos que flotan sobre la escena">🔤 rótulos</button>
      <button class="mkBt mkEnt" type="button">🌳 el Ent</button>
      <button class="mkBt mkDosD" type="button">🖼️ mundo 2D</button>
    </header>
    <aside class="mkCarta mkCartaEnt"></aside>
    <aside class="mkCarta mkCarta2D"></aside>
    <div class="mkCompai" title="Su compañero"></div>
    <div class="mkLupa">
      <div class="mkLpFondo"></div>
      <div class="mkLpMarco">
        <div class="mkLpBarra">
          <span class="mkLpTit"></span>
          <button class="mkBt mkLpAncha" type="button">⤢ ampliar fuera del 3D</button>
          <button class="mkBt mkLpVolver" type="button">↩ volver al mundo</button>
        </div>
        <iframe class="mkLpFrame" title="pantalla 2D"></iframe>
      </div>
    </div>`;
  raiz.style.pointerEvents = M.escena ? '' : 'none';   // deja tocar el bloque .mkVacio
  document.body.appendChild(raiz);
  if (!M.escena) ['.mkBarra', '.mkCarta', '.mkLupa'].forEach((s) => {
    raiz.querySelectorAll(s).forEach((n) => { n.style.pointerEvents = 'auto'; });
  });

  // ── 🔴 TODO LO QUE SE ABRE, SE CIERRA ───────────────────────────────────
  // Bug marcado por el operador (2026-07-26): «hay textos enormes… y NO tienen
  // forma de cerrarse». Las dos cartas del marco (el Ent y el mundo 2D) se
  // abrían —la del Ent SOLA, a los 1,4 s— y sólo se podían cerrar con Escape,
  // que en un teléfono no existe. Ahora las tres salidas: la ✕, tocar fuera y
  // Escape.
  const X = '<button class="mkX" type="button" aria-label="Cerrar">✕</button>';

  // ── la carta del Ent ────────────────────────────────────────────────────
  const cEnt = $('.mkCartaEnt', raiz);
  if (M.ent) {
    cEnt.innerHTML = X +
      `<h3>${M.ent.titulo}</h3>` +
      `<p class="mkArbol"><em>${M.ent.arbol}</em><span>${M.ent.piso}</span></p>` +
      `<p class="mkTexto">${M.ent.texto}</p>` +
      '<p class="mkPie">El Ent manda en su mundo; su compañero acompaña con respeto.</p>';
  } else {
    // ⚠️ ANOTADO, no escondido: el encargo pide entrar igual y decirlo.
    cEnt.innerHTML = X +
      '<h3>Este mundo todavía no tiene Ent</h3>' +
      '<p class="mkTexto">Los cuatro Ents tallados son la ceiba (tierra caliente), el roble ' +
      '(templado), el aliso (frío) y la queñua (páramo). A este mundo no le corresponde ' +
      'ninguno de forma directa, así que entra sin Ent y queda anotado — agregar uno es ' +
      'una línea de datos, no código.</p>' +
      '<p class="mkPie"><a href="/app/#/mockups/tres-ents-gradiente">ver los cuatro Ents del gradiente →</a></p>';
  }

  // ── las pantallas 2D DE ESTE MUNDO ──────────────────────────────────────
  const c2D = $('.mkCarta2D', raiz);
  const conGuia = (u) => {
    if (!guia) return u;
    const [r, h] = u.split('#');
    return r + (r.includes('?') ? '&' : '?') + 'guia=' + encodeURIComponent(guia) + (h ? '#' + h : '');
  };
  // ── «pantallas 2D» → «MUNDO 2D» (orden del operador 2026-07-26) ──────────
  // Y las que salen en el marco son las de ESTE mundo: el valle tiene UNA sola
  // puerta al 2D global, cada mundo tiene las suyas. Se abren dentro del
  // MURAL estilo New Donk (la lupa enmarcada), no en otra pestaña.
  c2D.innerHTML = X +
    '<h3>🖼️ El mundo 2D de ' + (M.nombre || '').toLowerCase() + '</h3>' +
    '<p class="mkTexto">Se abren en el mural, encima del mundo. Puede ampliarlas fuera del 3D ' +
    'y siempre vuelve aquí, al mismo punto.</p>' +
    ((M.dosD || []).length
      ? '<ul class="mkLista">' +
        (M.dosD || []).map((d, i) => `<li><button type="button" data-i="${i}">${d.t}</button></li>`).join('') +
        '</ul>'
      : '<p class="mkTexto">Este mundo todavía no tiene pantallas 2D propias que se abran ' +
        'sin cuenta de la finca. Cuando las tenga, salen aquí — es una línea de datos.</p>') +
    '<p class="mkPie">Todas se abren sin cuenta: las que necesitaban sesión salieron, porque ' +
    'sin cuenta la app las llevaba al valle viejo.</p>';

  // ── la lupa ──
  const lupa = $('.mkLupa', raiz), lpFrame = $('.mkLpFrame', raiz);
  const lpTit = $('.mkLpTit', raiz), btAncha = $('.mkLpAncha', raiz);
  function abrirLupa(url, titulo) {
    lpTit.textContent = titulo;
    if (lpFrame.dataset.url !== url) { lpFrame.src = url; lpFrame.dataset.url = url; }
    lupa.classList.add('on');
  }
  function cerrarLupa() { lupa.classList.remove('on', 'ancha'); btAncha.textContent = '⤢ ampliar fuera del 3D'; }
  $('.mkLpVolver', raiz).addEventListener('click', cerrarLupa);
  $('.mkLpFondo', raiz).addEventListener('click', cerrarLupa);
  btAncha.addEventListener('click', () => {
    const a = lupa.classList.toggle('ancha');
    btAncha.textContent = a ? '⤡ volver al mundo' : '⤢ ampliar fuera del 3D';
  });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') { cerrarLupa(); cerrarCartas(); } });

  c2D.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-i]'); if (!b) return;
    const d = (M.dosD || [])[+b.dataset.i]; if (!d) return;
    abrirLupa(conGuia(d.u), d.t);
  });

  // ── las cartas laterales: se abren y SE CIERRAN ─────────────────────────
  function cerrarCartas() { cEnt.classList.remove('on'); c2D.classList.remove('on'); }
  $('.mkEnt', raiz).addEventListener('click', () => { c2D.classList.remove('on'); cEnt.classList.toggle('on'); });
  $('.mkDosD', raiz).addEventListener('click', () => { cEnt.classList.remove('on'); c2D.classList.toggle('on'); });
  // la ✕ de cada carta
  raiz.querySelectorAll('.mkX').forEach((b) => b.addEventListener('click', (e) => {
    e.stopPropagation(); b.closest('.mkCarta').classList.remove('on');
  }));
  // tocar FUERA de la carta también cierra (en un teléfono no hay Escape)
  addEventListener('pointerdown', (e) => {
    if (!cEnt.classList.contains('on') && !c2D.classList.contains('on')) return;
    if (e.target.closest('.mkCarta') || e.target.closest('.mkBarra')) return;
    cerrarCartas();
  }, true);
  // el Ent se presenta solo la PRIMERA VEZ que se entra a su mundo — y no
  // vuelve a saltar: antes reaparecía en cada visita y tapaba el cuadro.
  const LS_ENT = 'guatoc.ent.visto.' + (M.id || '');
  let entVisto = false;
  try { entVisto = !!localStorage.getItem(LS_ENT); } catch (e) { entVisto = false; }
  if (M.ent && !entVisto) {
    setTimeout(() => cEnt.classList.add('on'), 1400);
    try { localStorage.setItem(LS_ENT, '1'); } catch (e) { /* privado */ }
  }

  // ── 🔴 LOS RÓTULOS GIGANTES DE LA ESCENA ────────────────────────────────
  // Medido hoy dentro del iframe (`dom5.mjs`): en `/abono/` el rótulo «Los
  // descomponedores» ocupa 408 px de ancho — el 28 % del cuadro — y «La vida
  // que hace el humus» se sale por el borde derecho; en `/vender/` el titular
  // editorial mide 90 px de alto y empuja el 3D debajo del pliegue. Ninguno se
  // puede cerrar. Esos rótulos viven en la escena, que es otro repo (`/app/`),
  // así que NO se toca su código: como el iframe es del MISMO ORIGEN, el marco
  // le inyecta su propia hoja de estilo. Dos cosas:
  //   · TOPE de tamaño, siempre puesto (rótulo legible, no cartel).
  //   · un interruptor «🔤 rótulos» en la barra que los apaga del todo —
  //     que es el «cierre» que el operador pidió.
  const CSS_TOPE = `
  /* tope de los rótulos flotantes de la escena */
  [class*="-pin"],[class*="pin__"],[class*="hotspot"],[class*="rotulo"],
  [class*="etiqueta"],[class*="-label"],[class*="label-"],[class*="lupa"],
  [class*="callout"],[class*="tooltip"],[class*="globo"],[class*="burbuja"],[class*="chip"]{
    font-size:13px!important;line-height:1.28!important;max-width:190px!important}
  [class*="-pin"] *,[class*="hotspot"] *,[class*="rotulo"] *,[class*="etiqueta"] *{
    font-size:1em!important;line-height:1.28!important}
  [class*="-pin"] small,[class*="hotspot"] small,[class*="etiqueta"] small{font-size:.82em!important}
  /* el titular de la escena NO manda dentro del marco: manda el mundo */
  h1{font-size:clamp(1rem,2.1vw,1.5rem)!important;line-height:1.18!important;margin:.2em 0!important}
  h2{font-size:clamp(.95rem,1.8vw,1.22rem)!important;line-height:1.2!important}
  /* el propio botón «Volver/Salir» de la escena estorba al del marco */
  html.mkSinRotulos [class*="-pin"],html.mkSinRotulos [class*="hotspot"],
  html.mkSinRotulos [class*="rotulo"],html.mkSinRotulos [class*="etiqueta"],
  html.mkSinRotulos [class*="lupa"],html.mkSinRotulos [class*="callout"],
  html.mkSinRotulos [class*="tooltip"],html.mkSinRotulos [class*="globo"]{display:none!important}
  `;
  const btRot = $('.mkRot', raiz);
  let sinRotulos = false;
  function docEscena() {
    const f = $('.mkEscena', raiz);
    try { return f && f.contentDocument; } catch (e) { return null; }   // otro origen: no se toca
  }
  function aplicarTope() {
    const d = docEscena(); if (!d || !d.head) return false;
    let st = d.getElementById('mkTope');
    if (!st) { st = d.createElement('style'); st.id = 'mkTope'; d.head.appendChild(st); }
    st.textContent = CSS_TOPE;
    d.documentElement.classList.toggle('mkSinRotulos', sinRotulos);
    return true;
  }
  // ── el tope de CSS NO ALCANZA, y esto está MEDIDO ────────────────────────
  // Con la hoja puesta, el rótulo seguía saliendo el doble de grande. Sonda
  // `pin.mjs` dentro del iframe: `.compost-pin` YA tiene `font-size:13px`, pero
  // cuelga de un envoltorio con `transform: translate3d(...) scale(K)` inline
  // —K = 1,16 · 1,19 · 2,2…— que la escena recalcula por distancia de cámara.
  // Un `font-size` en CSS no puede ganarle a una escala del ancestro.
  // Así que se acota por ESCALA REAL: `rect.height / offsetHeight` da K exacto
  // (el rect va escalado, el offset no), y se pone `font-size = 13/K`. El
  // resultado es que el glifo mide 13 px EN PANTALLA, esté cerca o lejos.
  // Coste: ~8 nodos a 6 Hz, y sólo mientras la pestaña está a la vista.
  // La lista sale de MEDIR, no de adivinar: `.compost-pin` la cazó el primer
  // barrido; `.compost-lupa` («La vida que hace el humus», 335 px y cortado por
  // el borde derecho) se le escapaba y se agregó tras verlo en la captura.
  const SEL_ROT = '[class*="-pin"],[class*="pin__"],[class*="hotspot"],[class*="rotulo"],[class*="etiqueta"],[class*="-label"],[class*="label-"],[class*="lupa"],[class*="callout"],[class*="tooltip"],[class*="globo"],[class*="burbuja"],[class*="chip"]';
  const PX_ROT = 13, ANCHO_ROT = 190;
  function acotarPorEscala() {
    const d = docEscena(); if (!d) return;
    d.querySelectorAll(SEL_ROT).forEach((e) => {
      const alto = e.offsetHeight; if (!alto) return;
      const k = e.getBoundingClientRect().height / alto;
      if (!isFinite(k) || k <= 0) return;
      if (k > 1.04) {
        e.style.setProperty('font-size', (PX_ROT / k).toFixed(2) + 'px', 'important');
        e.style.setProperty('max-width', Math.round(ANCHO_ROT / k) + 'px', 'important');
      } else {
        e.style.removeProperty('font-size');
        e.style.removeProperty('max-width');
      }
    });
  }
  if ($('.mkEscena', raiz)) {
    const f = $('.mkEscena', raiz);
    f.addEventListener('load', () => { aplicarTope(); setTimeout(aplicarTope, 1200); });
    // la escena es una SPA: re-pinta y puede tirar la hoja. Se vuelve a poner
    // unas cuantas veces y se acabó (nada de intervalos eternos).
    [600, 1800, 3500, 6000, 9000].forEach((ms) => setTimeout(aplicarTope, ms));
    setInterval(() => { if (!document.hidden && !sinRotulos) acotarPorEscala(); }, 160);
    btRot.addEventListener('click', () => {
      sinRotulos = !sinRotulos;
      btRot.classList.toggle('mkOff', sinRotulos);
      btRot.textContent = sinRotulos ? '🔤 rótulos: ocultos' : '🔤 rótulos';
      if (!aplicarTope()) btRot.title = 'La escena no deja tocar sus rótulos';
    });
  } else {
    btRot.style.display = 'none';        // sin escena no hay rótulos que acotar
  }

  // ── el compAI: DEJA DE SER UN ACCESORIO ─────────────────────────────────
  //
  // Hasta hoy este bloque montaba un SVG en una esquina con un `data-estado`
  // FIJO: no tenía idle, no hablaba, no reaccionaba, y `pointer-events:none`
  // le impedía hasta ser tocado. Era, literalmente, el accesorio que el SPEC
  // del operador prohíbe: «NO ES UN ACCESORIO».
  //
  // Ahora respira, comenta el mundo donde está, se le puede tocar y se le
  // puede pedir que se calle — y lo hace con EL MISMO CÓDIGO que el compAI de
  // la PWA, no con una copia paralela. El núcleo (`./compai/`, ESM puro sin
  // dependencias) lo sincroniza `chagra/scripts/sync-compai-nucleo.mjs`; este
  // valle NUNCA es la fuente de verdad. Ver `compai/MANIFIESTO.md`.
  //
  // POSES LEÍDAS DEL RIG, NO ADIVINADAS. La tabla vieja mandaba `'idle'` a
  // cualquier guía sin entrada propia, y `angelita` y `chivito` NO DECLARAN
  // esa pose en su CSS.
  // ⚠️ CORRECCIÓN (verificada con captura, 2026-07-26): yo había escrito que
  // por eso «se dibujaban vacíos». **Es falso** — se probó forzando
  // `data-estado='idle'` y los dos siguen dibujándose (25 de 28 grupos
  // visibles en angelita, 34 de 36 en chivito). Lo que sí es cierto y es la
  // razón del cambio: se les pedía una pose que no existe, así que quedaban
  // en un estado sin sentido en vez de en la suya (angelita `forrajear`,
  // chivito `senalar`), y ninguna tabla escrita a mano sobrevive a que el
  // arte cambie. Leerlas del propio rig lo resuelve para siempre.
  const box = $('.mkCompai', raiz);
  const burbuja = el('div', 'mkCompaiDice');
  const btMudo = el('button', 'mkCompaiMudo', '🔔');
  btMudo.type = 'button';
  raiz.appendChild(burbuja);
  raiz.appendChild(btMudo);

  /* Poses de narrativa: sirven a una escena, no al reposo. Un jaguar en
     `amenaza` esperando en la esquina no acompaña — asusta. */
  const POSES_NARRATIVAS = new Set([
    'amenaza', 'acecho', 'invocacion', 'degradado', 'niebla', 'pacto', 'hablar',
  ]);

  /** Las poses que el rig DE VERDAD tiene, leídas de su propio CSS. */
  function posesDelRig(arte) {
    const vistas = new Set();
    const re = /data-estado=["']([a-z]+)["']/g;
    let m;
    while ((m = re.exec(arte.css || '')) !== null) vistas.add(m[1]);
    return [...vistas];
  }

  /* De qué mundo del compAI habla ESTE marco: el id del lugar del valle se
     traduce al vocabulario del núcleo, el mismo que usa la PWA. */
  const LUGAR_A_MUNDO = {
    plantas: 'mis_matas', animales: 'mis_animales', agua: 'clima',
    tiempo: 'clima', vender: 'vender', bosque: 'bosque', abono: 'bosque',
    paramo: 'paramo', finca: 'finca',
  };

  const LS_MUDO = 'compai:silencio';
  let mudo = false;
  try { mudo = localStorage.getItem(LS_MUDO) === '1'; } catch (e) { mudo = false; }

  function pintarMudo() {
    btMudo.textContent = mudo ? '🔕' : '🔔';
    btMudo.classList.toggle('on', mudo);
    btMudo.title = mudo
      ? 'Volver a oír a su compañero'
      : 'Que su compañero se quede callado';
    btMudo.setAttribute('aria-label', btMudo.title);
    btMudo.setAttribute('aria-pressed', String(mudo));
    box.classList.toggle('mudo', mudo);
    if (mudo) burbuja.classList.remove('on');
  }

  let ocultarBurbuja = null;
  function decir(texto) {
    if (!texto || mudo) return;
    burbuja.textContent = texto;
    burbuja.classList.add('on');
    if (ocultarBurbuja) clearTimeout(ocultarBurbuja);
    /* Dura LO QUE CUESTA LEERLO (misma regla que el valle de la PWA: ~70 ms
       por letra ≈ 170 palabras/minuto, ritmo cómodo para quien lee despacio),
       con piso de 7 s y techo de 16 s. */
    const n = texto.length;
    const dura = Math.min(16000, Math.max(7000, Math.round(n * 86 + 1200)));
    ocultarBurbuja = setTimeout(() => burbuja.classList.remove('on'), dura);
  }

  // ── LA MÁQUINA IDLE — respira + mira + rasca + gestos, CONTINUO ──────────
  // Puerto de `A/src/visual/creatures/creatureIdle.js` (ver
  // `compai/idleMachine.js` para el porqué de los ajustes). Hasta hoy el
  // compAI de esta esquina SÓLO saltaba entre dibujos estáticos (`respirar()`
  // arriba, que sigue intacta: es el "gesto" del rig cuando lo tiene). Entre
  // un salto y el siguiente no pasaba NADA — ni un pixel se movía. Esto le
  // pone el pulso continuo encima, en un `.idleWrap` propio para no pelear
  // con el `transform` de `:hover`/`:active` del propio `.mkCompai` (CSS,
  // sobre el host) — el idle anima el HIJO, nunca el host.
  function iniciarIdleContinuo(root, slug) {
    const wrap = root.querySelector('.idleWrap');
    if (!wrap) return;
    import('./compai/idleMachine.js').then(({ idleDeCompai }) => {
      // `marco.js` monta la guía UNA sola vez (a diferencia de `portales.js`,
      // que la cambia en caliente): basta `wrap.isConnected` como guarda —
      // si algún día este `box` se remonta, el wrap viejo deja de estar en
      // el DOM y el rAF se apaga solo, sin bandera aparte que mantener.
      const cuadro = (tMs) => {
        if (!wrap.isConnected) return;
        if (!document.hidden) {
          const p = idleDeCompai(tMs / 1000, { perfil: slug });
          wrap.style.transform =
            `scale(${p.sx.toFixed(4)},${p.sy.toFixed(4)}) rotate(${p.rot.toFixed(2)}deg) `
            + `translateY(${(p.dy * 100).toFixed(2)}%)`;
        }
        requestAnimationFrame(cuadro);
      };
      requestAnimationFrame(cuadro);
    }).catch(() => { /* sin la máquina: queda con lo que ya tenía (pose/lámina fija) */ });
  }

  function trasMontaje(root, { repertorio, poseHabla, slug }) {
    // el encaje por `getBBox` sólo aplica al rig vectorial (tiene `<svg>`);
    // la lámina ya llena su caja por `object-fit:contain` (laminaFallback.js).
    // el id del núcleo es el del RIG, no el del slug (guacamaya→guaca,
    // chivito-punk→chivito): con un id inexistente `encuadrar` cae al grupo
    // entero y la ficha pierde el encaje.
    const NUCLEO_RIG = { guacamaya: 'guaca', 'chivito-punk': 'chivito' };
    if (root.querySelector('svg')) encuadrar(root, NUCLEO_RIG[slug] || slug, 45);
    box.title = 'Le acompaña ' + (NOMBRE_GUIA[slug] || slug) + ' — tóquelo para que le cuente';
    pintarMudo();
    iniciarIdleContinuo(root, slug);

    /* EL NÚCLEO COMPARTIDO. Carga aparte (dynamic import desde un script
       clásico): si no llegara, el compAI se queda quieto pero VISIBLE y
       tocable — degrada, no revienta. Sin repertorio de poses (caso lámina:
       una sola imagen) no hay coreografía discreta que hacer — el pulso
       continuo de arriba ya lo mantiene vivo. */
    if (repertorio.length >= 2) {
      import('./compai/gestos.js').then(({ elegirSinRepetir }) => {
        let previa = repertorio[0];
        const respirar = () => {
          if (document.hidden) { setTimeout(respirar, 4000); return; }
          previa = elegirSinRepetir(repertorio, previa) || previa;
          box.setAttribute('data-estado', previa);
          setTimeout(respirar, 4200 + Math.random() * 5200);
        };
        setTimeout(respirar, 2600 + Math.random() * 2400);
      }).catch(() => { /* sin núcleo: queda quieto, pero está y se puede tocar */ });
    }

    /* LO QUE DICE, del MISMO comentarista que la PWA. Aquí no hay IndexedDB
       de la finca (otro origen), así que el comentarista cae a su rama
       honesta — que es exactamente lo correcto: no se inventa un inventario
       que este lado no puede ver. */
    Promise.all([
      import('./compai/comentarista.js'),
      import('./compai/datosFinca.js'),
    ]).then(([{ comentarioDeMundo }, { datosDeMundo }]) => {
      const mundo = LUGAR_A_MUNDO[M.id];
      const decirDelMundo = () => {
        const texto = mundo ? comentarioDeMundo(mundo, datosDeMundo(mundo, null)) : null;
        decir(texto || ('Está en ' + M.nombre + '. Mire con calma, que aquí no hay afán.'));
        if (poseHabla) {
          const antes = box.getAttribute('data-estado');
          box.setAttribute('data-estado', poseHabla);
          setTimeout(() => box.setAttribute('data-estado', antes), 2600);
        }
      };
      // Se presenta al entrar al mundo, después del Ent (que sale a 1,4 s):
      // dos cosas hablando al tiempo es ruido, no compañía.
      setTimeout(decirDelMundo, 3200);
      box.addEventListener('click', decirDelMundo);
    }).catch(() => {
      box.addEventListener('click', () => decir('Está en ' + M.nombre + '.'));
    });
  }

  function montarGuia() {
    // `chivito-punk` ES el chivito del páramo: mismo esqueleto, y el punk es
    // la pose `hablar` de su piel (F24) — el slug conserva su identidad
    // (nombre, voz, perfil idle), sólo el ARTE se resuelve al rig real.
    const RIG_DE = { 'chivito-punk': 'chivito' };
    const arte = window.GUIAS_ARTE && guia && (window.GUIAS_ARTE[guia] || window.GUIAS_ARTE[RIG_DE[guia]]);

    if (arte) {
      const disponibles = posesDelRig(arte);
      const reposo = disponibles.filter((p) => !POSES_NARRATIVAS.has(p));
      /* Si el rig SÓLO tiene poses narrativas (caso `angelita`: forrajear +
         hablar), se usa lo que haya: una pose fea es mejor que un SVG vacío. */
      const repertorio = reposo.length ? reposo : disponibles;
      const poseHabla = disponibles.includes('hablar') ? 'hablar' : repertorio[0];

      box.setAttribute('data-estado', repertorio[0] || 'idle');
      const root = box.shadowRoot || box.attachShadow({ mode: 'open' });
      root.innerHTML =
        '<style>' + arte.css + ':host{display:block;overflow:hidden}'
        + '.idleWrap{width:100%;height:100%;transform-origin:50% 92%;will-change:transform}'
        + 'svg{width:100%!important;height:100%!important;max-width:none!important;'
        + 'max-height:none!important;display:block;overflow:hidden}</style>' +
        '<div class="idleWrap"><svg viewBox="0 0 900 1150" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">' +
        arte.defs + arte.svg + '</svg></div>';
      // ⚠️ con reintento: en el primer frame tras el `innerHTML` el shadow no
      // está maquetado y `getBBox()` devuelve 0×0 (medido en el navegador).
      trasMontaje(root, { repertorio, poseHabla, slug: guia });
      return;
    }

    // ── SIN RIG VECTORIAL: los 3 del roster de 8 que sólo tienen lámina
    // (`chivito-punk`, y `dante`/`oliver` con marcador honesto — ver
    // `compai/laminaFallback.js`). Import perezoso: si el módulo no llegara,
    // el compAI desaparece de esta esquina en vez de romper el marco, que es
    // la MISMA degradación que ya tenía el camino del rig.
    if (!guia) { box.style.display = 'none'; btMudo.style.display = 'none'; return; }
    import('./compai/laminaFallback.js').then(({ montarLaminaValle }) => {
      const lam = montarLaminaValle(box, guia);
      if (!lam) { box.style.display = 'none'; btMudo.style.display = 'none'; return; }
      trasMontaje(lam.root, { repertorio: [], poseHabla: null, slug: guia });
    }).catch(() => { box.style.display = 'none'; btMudo.style.display = 'none'; });
  }

  btMudo.addEventListener('click', () => {
    mudo = !mudo;
    try { localStorage.setItem(LS_MUDO, mudo ? '1' : '0'); } catch (e) { /* privado */ }
    pintarMudo();
  });

  if (window.GUIAS_ARTE) montarGuia();
  else addEventListener('load', montarGuia);
})();
