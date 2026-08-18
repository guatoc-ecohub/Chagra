// ═══════════════════════════════════════════════════════════════════════════
//  PÁRAMO VIVO — LECCIONES · ciencia, voces y gating causal
//  ---------------------------------------------------------------------------
//  Contrato (BUILD-PARAMO-VIVO.md): exporta `wireLecciones(scene, actores,
//  THREE, ctx)`. `paramo-vivo.js` (de Fable) IMPORTA este archivo con falla
//  suave y lo llama — NO tocamos `paramo-vivo.js` ni `paramo-vivo-arte-*.js`,
//  solo consumimos su API: `actores.{frailejon,quenua,chivito,compai}`,
//  `anclas.{ent,flor,quenua,compai,claro,curvaDescenso,miradasDescenso}`,
//  `actores.frailejon.reverdecerHacia(k)` (termómetro ecológico 0→1).
//
//  Ciencia: CIENCIA-PARAMO-ENT.md §6 (las 5 escenas del descenso) + §7
//  (FRACKING §7.2, ENDEMISMO §7.1, ya verificados dr-cross). Cada frase que
//  se narra en voz alta está respaldada ahí — ver LECCIONES[].fuente.
//
//  DOS personalidades con voz (speechSynthesis, piso — TTS local es follow-up):
//    · EL ENT (frailejón): místico, pausado, del páramo. pitch grave, rate lento.
//    · LA QUEÑUA: nudosa, de las alturas, más seca y directa. pitch más alto,
//      rate un poco más vivo — el contraste de carácter es el encanto.
//
//  Gating causal tipo Terra Nil (patrón de `leccion-agua.js`): estaciones en
//  chips, click = PIDE, un solo reloj de vuelo lerp/smootherstep conduce la
//  cámara sin corte; cada lección completada ACUMULA progreso → reverdecerHacia.
//  Compai anota cada lección en su libreta (fuerza su gesto "escribiendo" y
//  muestra el apunte en una hoja HTML) y se queda pensando.
// ═══════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════
//  LOS DATOS — 7 lecciones: las 5 escenas del descenso (§6) + endemismo (§7.1)
//  + fracking (§7.2). Orden pedagógico: identidad primero (quién es el Ent),
//  luego el descenso científico macro→micro, cierra con el dolor sereno del
//  fracking (después de haber entendido qué hay que perder).
// ═══════════════════════════════════════════════════════════════════════════
export const LECCIONES = [
  {
    id: 'endemismo',
    voz: 'ent',
    titulo: 'Solo aquí',
    ancla: 'ent',
    progreso: 0.14,
    habla: 'Míreme bien. No hay uno como yo en ningún otro lugar de la Tierra. '
      + 'Solo en estas tres tierras hermanas: Colombia, Venezuela, Ecuador. '
      + 'Lo que se pierda aquí, se pierde para siempre en todo el planeta.',
    libreta: 'El frailejón es ENDÉMICO: solo existe en los Andes del norte (Colombia ~90 '
      + 'especies, Venezuela ~68, Ecuador ~1). En ningún otro lugar del mundo.',
    fuente: 'CIENCIA-PARAMO-ENT §7.1 [dr-cross]',
  },
  {
    id: 'micorrizas',
    voz: 'ent',
    titulo: 'El trato firmado',
    ancla: 'micorrizas',
    progreso: 0.14,
    habla: 'Bajo tierra le doy mi azúcar a un hilo de hongo que no se ve, y él me trae '
      + 'agua y minerales de donde mi raíz sola no llega. Un trato firmado hace '
      + 'cuatrocientos millones de años. Compartimos un tejido — no nos hablamos, '
      + 'aunque a veces lo parezca.',
    libreta: 'Micorrizas arbusculares: intercambio bidireccional carbono↔agua+P+N. '
      + 'Colonización del 98% medida en frailejones de Anaime. Hifas amplían el '
      + 'alcance de la raíz ~100×. El "wood wide web" conecta, pero no "conversa".',
    fuente: 'CIENCIA-PARAMO-ENT §6.1, §1.2, §1.3.1, §1.4 [WebSearch/dr-cross]',
  },
  {
    id: 'suelo-vivo',
    voz: 'quenua',
    titulo: 'El suelo está vivo',
    ancla: 'suelo',
    progreso: 0.14,
    habla: 'Nada aquí está muerto, m\'ijo. Lo que se pudre alimenta lo que crece. '
      + 'Bacteria, protozoo, raíz — así se reparte lo poco que hay. Aquí el agua '
      + 'sobra, pero el nitrógeno es oro: se cuida, se recicla, no se regala.',
    libreta: 'Red trófica del suelo: bacteria → protozoo (la depreda) → excreta amonio → '
      + 'raíz lo absorbe. 37.6% de los linajes microbianos de Chingaza son NUEVOS '
      + 'para la ciencia. Fijación de N baja (sistema frío, recurso escaso).',
    fuente: 'CIENCIA-PARAMO-ENT §6.2, §2.1, §2.4, §2.3 [WebSearch]',
  },
  {
    id: 'niebla-agua',
    voz: 'ent',
    titulo: 'La niebla hecha agua',
    ancla: 'flor',
    progreso: 0.145,
    habla: 'Atrapo la niebla gota a gota en mis hojas peludas y la guardo. Escurre '
      + 'despacio por mi tallo hasta el suelo esponja. De aquí sale el agua que '
      + 'beben las ciudades, allá abajo, sin que ellas lo sepan.',
    libreta: 'Hojas pubescentes condensan niebla (stemflow). Suelo retiene >80% de su '
      + 'volumen en agua. El páramo abastece ~16 ciudades y 16.8 millones de '
      + 'personas — 35% de Colombia (cifra rigurosa Humboldt; "más del 70%" en '
      + 'fuentes oficiales de divulgación).',
    fuente: 'CIENCIA-PARAMO-ENT §6.3, §3.1, §3.2, §3.3 [WebSearch]',
  },
  {
    id: 'suelo-negro',
    voz: 'quenua',
    titulo: 'El suelo anciano',
    ancla: 'raiz',
    progreso: 0.145,
    habla: 'Este suelo negro es tan viejo como yo, o más. Aquí el frío no deja que '
      + 'nada se descomponga rápido — el carbono se apila, siglo tras siglo, y se '
      + 'queda. Si lo aran o lo drenan, esos miles de años de guardar se van, y no '
      + 'vuelven en su vida ni en la de sus nietos.',
    libreta: 'Andosol/histosol: 119–397 t de carbono orgánico/ha en los primeros 40 cm '
      + '(turberas hasta ~2000 t/ha). Turba de Chingaza fechada en 8410±160 años. '
      + 'Descomposición frenada por frío+acidez → el carbono se acumula, no se libera.',
    fuente: 'CIENCIA-PARAMO-ENT §6.4, §4.5, §4.6 [dr-cross/WebSearch]',
  },
  {
    id: 'nodriza',
    voz: 'ent',
    titulo: 'El anciano que abriga',
    ancla: 'ent',
    progreso: 0.145,
    habla: 'Mis hojas muertas no caen: se quedan pegadas a mi tallo como un abrigo. '
      + 'Bajo mi sombra germinan los que empiezan, protegidos de la helada de la '
      + 'noche. Crezco despacio — unos pocos centímetros al año, a veces más — y '
      + 'por eso el páramo entero se sostiene en la paciencia.',
    libreta: 'Efecto planta nodriza: necromasa marcescente aísla del frío y facilita '
      + 'germinación bajo la roseta. Crecimiento real 0.2–14.8 cm/año, típico '
      + '4–9 (NO el mito de 1cm fijo). Edad directa datada máx. 30 años; '
      + 'individuos grandes, 100+ años inferidos (sin anillos reales).',
    fuente: 'CIENCIA-PARAMO-ENT §6.5, §5.1, §5.3, §5.5 [dr-cross/codex]',
  },
  {
    id: 'fracking',
    voz: 'ent',
    titulo: 'Lo que envenena el agua',
    ancla: 'ent',
    progreso: 0.14,
    habla: 'Hay quien quiere quebrar la roca honda para sacar fuego, y en esa herida '
      + 'se cuela el veneno hasta el agua. Lo que enferma el agua de aquí arriba, '
      + 'baja a las casas de allá abajo. Yo guardé esta agua durante miles de años. '
      + 'El páramo no se defiende solo — por eso le cuento.',
    libreta: 'Fracking: consume 9–29 millones de litros de agua por pozo (~25% de sus '
      + 'químicos, cancerígenos), amenaza acuíferos, rompe el balance hídrico del '
      + 'páramo (degradación irreversible ~40%) y afecta directamente al 35% de '
      + 'los colombianos (16.8M, 16 ciudades) que dependen de esa agua.',
    fuente: 'CIENCIA-PARAMO-ENT §7.2 [dr-cross] — tono: dolor sereno, no panfleto',
    esHerida: true,   // esta lección NO reverdece de más: es el golpe emocional
  },
];

// ═══════════════════════════════════════════════════════════════════════════
//  LAS DOS VOCES — speechSynthesis, piso (TTS local es follow-up)
// ═══════════════════════════════════════════════════════════════════════════
const TONO = {
  // el Ent: místico, pausado, del páramo — grave y lento, con pausas largas
  ent: { pitch: 0.62, rate: 0.80, volume: 0.92, prefer: /male|hombre|es-CO|es-419|es-MX|es/i },
  // la queñua: nudosa, de las alturas — más aguda, seca, un poco más viva
  quenua: { pitch: 1.28, rate: 0.94, volume: 0.85, prefer: /female|mujer|es-CO|es-419|es-ES|es/i },
};

function elegirVoz(pref) {
  if (typeof speechSynthesis === 'undefined') return null;
  const voces = speechSynthesis.getVoices() || [];
  const es = voces.filter((v) => /^es/i.test(v.lang));
  const lista = es.length ? es : voces;
  return lista.find((v) => pref.test(v.name) || pref.test(v.lang)) || lista[0] || null;
}

export function crearNarrador() {
  const soportado = typeof speechSynthesis !== 'undefined' && typeof SpeechSynthesisUtterance !== 'undefined';
  let vocesListas = !soportado;
  if (soportado) {
    // en Chromium las voces cargan async; re-intentar cuando lleguen
    speechSynthesis.onvoiceschanged = () => { vocesListas = true; };
    setTimeout(() => { vocesListas = true; }, 300);
  }
  let actual = null;
  return {
    hablar(texto, quien) {
      if (!soportado) return;
      try { speechSynthesis.cancel(); } catch { /* noop */ }
      const t = TONO[quien] || TONO.ent;
      const u = new SpeechSynthesisUtterance(texto);
      u.lang = 'es-CO';
      u.pitch = t.pitch; u.rate = t.rate; u.volume = t.volume;
      const voz = elegirVoz(t.prefer);
      if (voz) u.voice = voz;
      actual = u;
      try { speechSynthesis.speak(u); } catch { /* falla suave: sin voz, solo texto */ }
    },
    callar() { if (soportado) { try { speechSynthesis.cancel(); } catch { /* noop */ } } actual = null; },
  };
}

// ═══════════════════════════════════════════════════════════════════════════
//  LA UI — chips de lección (patrón leccion-agua.js) + la hoja de la libreta
//  de Compai + el termómetro de reverdecer (sutil, sin HUD invasivo)
// ═══════════════════════════════════════════════════════════════════════════
const CSS = `
#pvLec { position: fixed; left: 50%; bottom: 14px; transform: translateX(-50%);
  z-index: 40; display: flex; flex-direction: column; align-items: center; gap: 8px;
  width: min(94vw, 760px); font-family: system-ui, -apple-system, sans-serif; }
#pvLec .pvFrase { margin: 0; text-align: center; color: #f2f4e8;
  background: rgba(16, 22, 14, 0.66); backdrop-filter: blur(3px);
  border-radius: 10px; padding: 9px 16px; font-size: 0.9rem; line-height: 1.45;
  text-shadow: 0 1px 3px rgba(0,0,0,0.6); font-style: italic; }
#pvLec .pvFase { margin: 0; text-align: center; color: #ffe8a7;
  font: 700 0.68rem/1 system-ui, sans-serif; letter-spacing: 0.13em;
  text-transform: uppercase; }
#pvLec .pvChips { display: flex; flex-wrap: wrap; justify-content: center; gap: 5px;
  list-style: none; margin: 0; padding: 0; }
#pvLec .pvChips button { border: 0; border-radius: 999px; cursor: pointer;
  padding: 6px 12px; font: 600 0.72rem/1 system-ui, sans-serif;
  color: #e8f0e4; background: rgba(16, 22, 14, 0.55); transition: background 0.2s; }
#pvLec .pvChips button[aria-pressed="true"] { background: rgba(224, 194, 74, 0.88); color: #201808; }
#pvLec .pvChips button[data-visto="1"]:not([aria-pressed="true"]) { background: rgba(90, 130, 70, 0.5); }
#pvLibreta { position: fixed; right: 18px; bottom: 18px; z-index: 40;
  width: min(78vw, 260px); background: #f3ecd6; color: #241d16;
  border-radius: 4px 14px 14px 4px; padding: 12px 14px 14px 16px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(0,0,0,0.08);
  font-family: 'Georgia', serif; font-size: 0.76rem; line-height: 1.4;
  transform: translateY(16px) rotate(1.2deg); opacity: 0; pointer-events: none;
  transition: transform 0.5s cubic-bezier(.2,.8,.2,1), opacity 0.5s; }
#pvLibreta.mostrar { transform: translateY(0) rotate(-0.6deg); opacity: 1; }
#pvLibreta .pvLibTit { font-weight: 700; font-size: 0.72rem; text-transform: uppercase;
  letter-spacing: 0.04em; color: #6b4a2a; margin: 0 0 4px; }
#pvLibreta .pvLibTxt { margin: 0; }
#pvLibreta .pvLibPie { margin-top: 6px; font-size: 0.62rem; color: #8a7a5a; font-style: italic; }
@media (max-width: 700px) { #pvLec .pvFrase { font-size: 0.8rem; } #pvLibreta { display: none; } }
body.paramo-vivo #capaLugares, body.paramo-vivo #guiaSel { display: none !important; }
`;

function montarUI() {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  const ui = document.createElement('div');
  ui.id = 'pvLec';
  ui.innerHTML = '<ul class="pvChips"></ul><p class="pvFase"></p><p class="pvFrase"></p>';
  document.body.appendChild(ui);

  const libreta = document.createElement('div');
  libreta.id = 'pvLibreta';
  libreta.innerHTML = '<p class="pvLibTit">Libreta de Compai</p>'
    + '<p class="pvLibTxt"></p><p class="pvLibPie"></p>';
  document.body.appendChild(libreta);

  return { ui, libreta };
}

// ═══════════════════════════════════════════════════════════════════════════
//  EL PUENTE AL ROMPECABEZAS DE LA CÉLULA (celula-3d) — el zoom MÁS profundo.
//  Dos puertas (patrón del proyecto): la célula YA vive dentro de este mundo
//  (paramo-vivo-arte-descenso.js, capa 4 del descenso, `?pv=celula`) como
//  destino visual del recorrido; celula-3d/rompecabezas3d.js es la puerta
//  standalone donde se arma con las manos — la ofrecemos como cartel al
//  llegar al fondo del descenso, sin romper el mundo si no está disponible.
// ═══════════════════════════════════════════════════════════════════════════
function montarPuertaCelula() {
  const CSS_PUERTA = `
  #pvPuertaCelula { position: fixed; top: 18px; left: 50%; transform: translateX(-50%) translateY(-8px);
    z-index: 40; opacity: 0; pointer-events: none; transition: opacity 0.6s, transform 0.6s;
    background: rgba(20, 30, 24, 0.72); backdrop-filter: blur(4px); border-radius: 10px;
    padding: 8px 16px; color: #eaf3d8; font-family: system-ui, sans-serif; font-size: 0.8rem;
    display: flex; align-items: center; gap: 10px; box-shadow: 0 4px 18px rgba(0,0,0,0.35); }
  #pvPuertaCelula.mostrar { opacity: 1; pointer-events: auto; transform: translateX(-50%) translateY(0); }
  #pvPuertaCelula button { border: 0; border-radius: 999px; cursor: pointer; padding: 5px 12px;
    font: 700 0.72rem/1 system-ui, sans-serif; color: #1c2414; background: #cfe0a0; }
  `;
  const style = document.createElement('style');
  style.textContent = CSS_PUERTA;
  document.head.appendChild(style);
  const el = document.createElement('div');
  el.id = 'pvPuertaCelula';
  el.innerHTML = '<span>Está en el fondo de todo: la célula.</span>'
    + '<button type="button">Armarla con las manos</button>';
  document.body.appendChild(el);
  el.querySelector('button').addEventListener('click', () => {
    // celula-3d es standalone (rompecabezas3d.js interactivo); puerta aparte,
    // NO navegación forzada — si el puerto local no responde, el link igual
    // no rompe nada (se abre en pestaña nueva, este mundo sigue vivo).
    window.open('http://localhost:8790/', '_blank', 'noopener');
  });
  return {
    mostrar() { el.classList.add('mostrar'); },
    ocultar() { el.classList.remove('mostrar'); },
  };
}

// ═══════════════════════════════════════════════════════════════════════════
//  ADAPTADOR PÁRAMO NATIVO — las dos lecciones que viven en `paramo.js`.
//  Reusa las mismas piezas de arriba (voz, libreta, vuelo smootherstep) pero
//  agrega el patrón T04 completo: observar → hipótesis → comprobar. La escena
//  entrega los blancos de raycast; este módulo decide la secuencia causal.
// ═══════════════════════════════════════════════════════════════════════════
export function wireParamoLecciones({ scene, camera, controls, renderer, THREE, soil }) {
  if (!scene || !camera || !controls || !renderer || !soil) return null;
  document.body.classList.add('paramo-causal');

  const narrador = crearNarrador();
  const { ui, libreta } = montarUI();
  const lista = ui.querySelector('.pvChips');
  const faseEl = ui.querySelector('.pvFase');
  const fraseEl = ui.querySelector('.pvFrase');
  const libTxt = libreta.querySelector('.pvLibTxt');
  const libPie = libreta.querySelector('.pvLibPie');
  const LES = [
    {
      id: 'micorrizas', titulo: 'Micorrizas', voz: 'ent',
      observar: 'Mire estas dos raíces.',
      hipotesis: '¿Cuál cree que aguanta mejor cuando no llueve en meses: la que tiene esos hilos blancos, o la que no?',
      comprobar: 'Bajo tierra le doy mi azúcar a un hilo de hongo que no se ve, y él me trae agua y minerales de donde mi raíz sola no llega. Un trato firmado hace cuatrocientos millones de años. Compartimos un tejido — no nos hablamos, aunque a veces lo parezca.',
      libreta: 'Colonización micorrízica del 98% medida en frailejones del Páramo de Anaime (3.600 msnm). Las hifas amplían el alcance de la raíz ~100×. Intercambio bidireccional: carbono de la planta por agua, fósforo y nitrógeno.',
      fuente: 'Fuentes del spec: Estudio de la asociación micorriza-frailejón en tres páramos de la Cordillera Central, Universidad del Tolima; CIENCIA-PARAMO-ENT §1.1–1.5 [WebSearch].',
    },
    {
      id: 'suelo', titulo: 'Suelo', voz: 'quenua',
      observar: 'Mire estos dos suelos.',
      hipotesis: '¿Cuál de estos dos aguanta la sequía sin secarse del todo?',
      comprobar: 'Este suelo negro retiene más del 80% de su volumen en agua — es la esponja de la montaña. Si se compacta o se drena, esa esponja no vuelve a ser la misma en su vida — ni en la de sus nietos. De aquí bebe Bogotá el 80% de su agua — la misma esponja que pisa.',
      libreta: 'Andosol/histosol: porosidad 60–90%; capacidad de campo ~80% del peso seco; el agua puede ocupar hasta 61,7% del volumen en los primeros 30 cm. Carbono orgánico: 119–397 t C/ha en los primeros 40 cm; la variación depende del sitio y la profundidad.',
      fuente: 'Fuentes del spec: CIENCIA-PARAMO-ENT §3.1–3.3, §4.3–4.7 [dr-cross/WebSearch]; Castañeda-Martín & Montes-Pulido 2017; Buytaert et al. 2002; Poulenard et al. 2003.',
    },
  ];
  const botones = [];
  const vistas = new Set();
  const st = { id: null, fase: 'observar', vuelo: null, target: null, pulso: null, tPrev: 0 };
  let hypTimer = null;
  let down = null;
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const targets = [...(soil.rootTargets || []), ...(soil.soilTargets || [])];
  const objetosRaycast = targets.map((t) => t.object).filter(Boolean);

  function leccion(id) { return LES.find((l) => l.id === id) || LES[0]; }
  function setUI(fase, texto) {
    faseEl.textContent = fase;
    fraseEl.textContent = `«${texto}»`;
    botones.forEach((b) => b.setAttribute('aria-pressed', b.dataset.id === st.id ? 'true' : 'false'));
  }
  function anotar(lec) {
    libTxt.textContent = lec.libreta;
    libPie.textContent = lec.fuente;
    libreta.classList.add('mostrar');
    clearTimeout(anotar._t);
    anotar._t = setTimeout(() => libreta.classList.remove('mostrar'), 11000);
  }
  function punto(id) {
    return id === 'micorrizas' ? soil.micorrizaMira.clone() : soil.sueloMira.clone();
  }
  function camara(id, mira) {
    const d = id === 'micorrizas' ? 8.0 : 13.0;
    return new THREE.Vector3(mira.x + d * 0.68, mira.y + d * 0.38, mira.z + d * 0.92);
  }
  function smoother(k) { return k * k * k * (k * (k * 6 - 15) + 10); }
  function clearHypothesis() {
    if (hypTimer) { clearTimeout(hypTimer); hypTimer = null; }
  }
  function showHypothesis() {
    if (!st.id || st.vuelo || st.fase === 'comprobar') return;
    const lec = leccion(st.id);
    st.fase = 'hipotesis';
    setUI('HIPÓTESIS · toque una de las dos', lec.hipotesis);
    narrador.hablar(lec.hipotesis, lec.voz);
  }
  function activateObservation(id) {
    clearHypothesis();
    st.id = id; st.fase = 'observar'; st.target = null;
    const lec = leccion(id);
    setUI('OBSERVAR', lec.observar);
    narrador.hablar(lec.observar, lec.voz);
    hypTimer = setTimeout(showHypothesis, 1800);
  }
  function addPulse(point) {
    if (st.pulso) scene.remove(st.pulso.group);
    const group = new THREE.Group();
    const items = [];
    const mats = {
      sugar: new THREE.MeshBasicMaterial({ color: 0xd9a93b }),
      water: new THREE.MeshBasicMaterial({ color: 0xbad8e8 }),
    };
    for (let i = 0; i < 18; i++) {
      const tipo = i < 9 ? 'sugar' : 'water';
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.055, 5, 4), mats[tipo]);
      mesh.position.copy(point);
      const angle = (i % 9) * (Math.PI * 2 / 9) + 0.25;
      const dir = new THREE.Vector3(Math.cos(angle) * 0.12, tipo === 'sugar' ? -0.28 : 0.28, Math.sin(angle) * 0.12);
      group.add(mesh); items.push({ mesh, dir, delay: (i % 9) * 0.055 });
    }
    scene.add(group);
    st.pulso = { group, items, point: point.clone(), t0: st.tPrev };
  }
  function findTarget(object) {
    let o = object;
    while (o) {
      if (o.userData && o.userData.paramoLessonTarget) return o.userData.paramoLessonTarget;
      o = o.parent;
    }
    return null;
  }
  function comprobar(target) {
    if (st.fase !== 'hipotesis' || !st.id) return;
    clearHypothesis();
    st.target = target;
    st.fase = 'comprobar';
    const lec = leccion(st.id);
    const mira = punto(st.id);
    const p1 = new THREE.Vector3(mira.x + 2.8, mira.y + 1.2, mira.z + 3.2);
    st.vuelo = { p0: camera.position.clone(), p1, m0: camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(4).add(camera.position), m1: mira, t0: st.tPrev, dur: 2.8 };
    controls.enabled = false;
    setUI('COMPROBAR · observe el intercambio', target === 'raiz-sola' ? 'Ésa está sola — por eso le cuesta más. Mire la otra.' : lec.comprobar);
    narrador.hablar(target === 'raiz-sola' ? 'Ésa está sola — por eso le cuesta más. Mire la otra.' : lec.comprobar, lec.voz);
    if (st.id === 'micorrizas') {
      addPulse(soil.micorrizaPoint.clone());
      if (target === 'raiz-sola') {
        setTimeout(() => { if (st.id === 'micorrizas' && st.fase === 'comprobar') narrador.hablar(lec.comprobar, lec.voz); }, 950);
      }
    }
    if (!vistas.has(st.id)) { vistas.add(st.id); const bt = botones.find((b) => b.dataset.id === st.id); if (bt) bt.dataset.visto = '1'; }
    anotar(lec);
  }
  function onDown(ev) { down = { x: ev.clientX, y: ev.clientY }; }
  function onUp(ev) {
    if (!down || Math.hypot(ev.clientX - down.x, ev.clientY - down.y) > 6) { down = null; return; }
    const active = st.fase === 'hipotesis' && !st.vuelo;
    down = null;
    if (!active) return;
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.set(((ev.clientX - rect.left) / rect.width) * 2 - 1, -((ev.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(objetosRaycast, true);
    for (const hit of hits) {
      const target = findTarget(hit.object);
      if (target) { comprobar(target); return; }
    }
  }
  renderer.domElement.addEventListener('pointerdown', onDown);
  renderer.domElement.addEventListener('pointerup', onUp);

  LES.forEach((lec) => {
    const li = document.createElement('li');
    const bt = document.createElement('button');
    bt.type = 'button'; bt.textContent = lec.titulo; bt.dataset.id = lec.id;
    bt.addEventListener('click', () => {
      clearHypothesis();
      const mira = punto(lec.id);
      st.id = lec.id; st.fase = 'observar';
      st.vuelo = { p0: camera.position.clone(), p1: camara(lec.id, mira), m0: controls.target.clone(), m1: mira, t0: st.tPrev, dur: 3.0, after: () => activateObservation(lec.id) };
      controls.enabled = false;
    });
    li.appendChild(bt); lista.appendChild(li); botones.push(bt);
  });

  function arrancar() {
    const id = new URLSearchParams(location.search).get('est');
    const elegido = LES.some((l) => l.id === id) ? id : 'micorrizas';
    const mira = punto(elegido);
    st.id = elegido;
    camera.position.copy(camara(elegido, mira));
    camera.lookAt(mira); controls.target.copy(mira); controls.enabled = true;
    activateObservation(elegido);
  }
  function update(t) {
    st.tPrev = t;
    if (st.vuelo) {
      const k = Math.min((t - st.vuelo.t0) / st.vuelo.dur, 1);
      const e = smoother(k);
      camera.position.lerpVectors(st.vuelo.p0, st.vuelo.p1, e);
      const mira = new THREE.Vector3().lerpVectors(st.vuelo.m0, st.vuelo.m1, e);
      camera.lookAt(mira);
      if (k >= 1) {
        controls.target.copy(st.vuelo.m1); controls.enabled = st.fase !== 'comprobar';
        const after = st.vuelo.after; st.vuelo = null;
        if (after) after();
      }
    }
    if (st.pulso) {
      const elapsed = t - st.pulso.t0;
      for (const item of st.pulso.items) {
        const k = Math.max(0, Math.min(1, (elapsed - item.delay) / 2.4));
        item.mesh.position.copy(st.pulso.point).addScaledVector(item.dir, k * 4.0);
        item.mesh.scale.setScalar(1 - k * 0.55);
      }
      if (elapsed > 3.0) { scene.remove(st.pulso.group); st.pulso = null; }
    }
  }
  return { arrancar, update, detener() { clearHypothesis(); narrador.callar(); renderer.domElement.removeEventListener('pointerdown', onDown); renderer.domElement.removeEventListener('pointerup', onUp); } };
}

// ═══════════════════════════════════════════════════════════════════════════
//  wireLecciones — el contrato que `paramo-vivo.js` llama
// ═══════════════════════════════════════════════════════════════════════════
export function wireLecciones(scene, actores, THREE, ctx = {}) {
  const { camera, controls, anclas = {}, descenso } = ctx;
  const { frailejon, quenua, compai } = actores;
  if (!frailejon || !anclas) return; // falla suave: sin actores no hay lecciones

  const narrador = crearNarrador();
  const { ui, libreta } = montarUI();
  const puertaCelula = montarPuertaCelula();
  const lista = ui.querySelector('.pvChips');
  const fraseEl = ui.querySelector('.pvFrase');
  const libTxt = libreta.querySelector('.pvLibTxt');
  const libPie = libreta.querySelector('.pvLibPie');

  // ── progreso acumulado (gating causal tipo Terra Nil): cada lección VISTA
  //    suma a la salud del Ent; nunca baja sola (salvo la herida del fracking,
  //    que se cuenta pero no "cura de más" — es el golpe emocional del cierre).
  const vistas = new Set();
  const progresoBase = 0.28; // el Ent nace herido/apagado (coherente con paramo-vivo.js: setSalud(0.35))
  function progresoActual() {
    let k = progresoBase;
    for (const id of vistas) {
      const lec = LECCIONES.find((l) => l.id === id);
      if (lec) k += lec.progreso;
    }
    return THREE.MathUtils.clamp(k, 0, 1);
  }
  function aplicarProgreso() {
    if (typeof frailejon.reverdecerHacia === 'function') frailejon.reverdecerHacia(progresoActual());
  }

  // ── el vuelo de cámara: un solo reloj (patrón leccion-agua.js), sin corte ──
  const VUELO_S = 3.2;
  const st = { idx: -1, pedida: null, vuelo: null, mira: new THREE.Vector3() };
  const botones = [];

  function puntoAncla(id) {
    // ancla directa (ent, flor, quenua, compai, claro) o del descenso
    // (copa/pie/suelo/micorriza/arbusculo/celula, vía anclas.curvaDescenso).
    const MAPA = {
      ent: anclas.ent, flor: anclas.flor, quenua: anclas.quenua, compai: anclas.compai,
      micorrizas: anclas.micorriza, suelo: anclas.suelo, raiz: anclas.pie,
      celula: anclas.celula,
    };
    return MAPA[id] || anclas.claro || new THREE.Vector3();
  }
  function posCamaraPara(id, mira) {
    // arrimarse desde un costado, a media altura del punto mirado — genérico
    // y determinista (no depende de que exista un preset específico).
    const d = id === 'micorrizas' || id === 'raiz' || id === 'celula' ? 7 : 13;
    return new THREE.Vector3(mira.x + d * 0.7, mira.y + d * 0.35, mira.z + d * 0.85);
  }

  function frase(i) {
    const lec = LECCIONES[i];
    fraseEl.textContent = `«${lec.habla}»`;
    botones.forEach((b, j) => b.setAttribute('aria-pressed', j === i ? 'true' : 'false'));
  }

  function anotarLibreta(lec) {
    libTxt.textContent = lec.libreta;
    libPie.textContent = lec.fuente;
    libreta.classList.add('mostrar');
    clearTimeout(anotarLibreta._t);
    anotarLibreta._t = setTimeout(() => libreta.classList.remove('mostrar'), 9000);
  }

  function dispararGestoCompai(lec) {
    // Compai (paramo-vivo-arte-elenco.js, NO tocado) ya cicla su propio gesto
    // «escribe → se queda pensando» en un loop continuo de 7s dentro de su
    // update(t) — es su carácter, siempre presente, no algo que debamos
    // reiniciar desde afuera. Lo que SÍ cableamos aquí es LA LIBRETA visible
    // (el papel real: qué anotó) apareciendo con el mismo timing que su gesto
    // de escritura, para que la pedagogía de Compai ("anota y se queda
    // pensando") se lea también en la UI, no solo en su animación 3D.
    if (compai) compai.group.userData.ultimaAnotacion = lec.libreta;
  }

  LECCIONES.forEach((lec, i) => {
    const li = document.createElement('li');
    const bt = document.createElement('button');
    bt.type = 'button';
    bt.textContent = lec.titulo;
    bt.addEventListener('click', () => { st.pedida = i; });
    li.appendChild(bt);
    lista.appendChild(li);
    botones.push(bt);
  });

  function activarLeccion(i) {
    const lec = LECCIONES[i];
    st.idx = i;
    frase(i);
    narrador.hablar(lec.habla, lec.voz);
    anotarLibreta(lec);
    dispararGestoCompai(lec);
    if (!vistas.has(lec.id)) {
      vistas.add(lec.id);
      aplicarProgreso();
      const bt = botones[i]; if (bt) bt.dataset.visto = '1';
    }
    // al llegar al fondo (raíz/micorrizas/suelo), ofrecer la puerta a la célula
    if (lec.id === 'suelo-negro' || lec.id === 'micorrizas') puertaCelula.mostrar();
  }

  // ── arranque: planta el estado inicial sin vuelo (gate visual determinista)
  function arrancar() {
    const pedidaId = new URLSearchParams(location.search).get('lec');
    const i0 = Math.max(0, LECCIONES.findIndex((l) => l.id === pedidaId));
    aplicarProgreso();
    activarLeccion(i0);
    const mira = puntoAncla(LECCIONES[i0].ancla);
    st.mira.copy(mira);
    if (camera) {
      camera.position.copy(posCamaraPara(LECCIONES[i0].ancla, mira));
      camera.lookAt(mira);
    }
    if (controls) controls.target.copy(mira);
  }

  function update(t) {
    if (st.pedida !== null) {
      const i = st.pedida; st.pedida = null;
      if (controls && controls.enabled) st.mira.copy(controls.target);
      const mira = puntoAncla(LECCIONES[i].ancla);
      st.vuelo = {
        p0: camera ? camera.position.clone() : new THREE.Vector3(),
        p1: posCamaraPara(LECCIONES[i].ancla, mira),
        m0: st.mira.clone(),
        m1: mira.clone(),
        t0: t,
      };
      if (controls) controls.enabled = false;
      activarLeccion(i);
    }
    if (st.vuelo && camera) {
      const k = Math.min((t - st.vuelo.t0) / VUELO_S, 1);
      const e = k * k * k * (k * (k * 6 - 15) + 10); // smootherstep — el mismo ritmo de leccion-agua.js
      camera.position.lerpVectors(st.vuelo.p0, st.vuelo.p1, e);
      st.mira.lerpVectors(st.vuelo.m0, st.vuelo.m1, e);
      camera.lookAt(st.mira);
      if (k >= 1) {
        if (controls) { controls.target.copy(st.mira); controls.enabled = true; controls.update(); }
        st.vuelo = null;
      }
    }
  }

  // engancha al loop del mundo: si ctx trae un reloj propio, no lo pisamos —
  // exponemos update() y arrancar() por si el llamador quiere orquestar, y
  // además nos enganchamos solos a requestAnimationFrame como red de
  // seguridad (falla suave si paramo-vivo.js no nos llama explícitamente).
  let vivo = true;
  const reloj = { t0: performance.now() };
  function tick() {
    if (!vivo) return;
    update((performance.now() - reloj.t0) / 1000);
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
  setTimeout(arrancar, 60);

  return {
    LECCIONES,
    activarLeccion,
    progreso: progresoActual,
    detener() { vivo = false; narrador.callar(); },
  };
}
