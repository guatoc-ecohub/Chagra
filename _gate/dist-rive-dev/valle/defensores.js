// ── DEFENSORES / Bosque Vivo · run-and-gun del campo (estilo Metal Slug) ─────
// Modo `?juego=defensores`: Angelita la abeja recorre la finca andina y "combate"
// PLAGAS reales lanzando el CONTROL BIOLÓGICO correcto (Bt, mariquita, Beauveria,
// crisopa… — no venenos), libera fauna cazada (oso andino, estilo POW de Metal
// Slug) y aprende con fichas didácticas. Cero violencia, cero tóxico.
//
// NATIVO y AUTÓNOMO: DOM + SVG + CSS, sin React, sin three. Es un port de la
// lógica ya probada del repo (metalSlugCampoData / metalSlugCampoEngine /
// defensoresGameEngine, rama fable/metalslug-arte), traído al valle como una
// pantalla propia servida desde `?juego=defensores`. Este módulo monta su propio
// overlay a pantalla completa y suprime el canvas 3D del valle.
//
// GROUNDING (anti-invento): TODOS los pares plaga↔controlador salen del data
// agronómico real del repo (fuentes grafo / Cenicafé / ICA-CIAT / ecología /
// biopreparado). Nada de venenos: el "arma" siempre es un aliado biológico.

/* ═══════════════════════════════════════════════════════════════════════════
 * DATA — arsenal biológico, plagas, rehenes, niveles (port de metalSlugCampoData).
 * ═══════════════════════════════════════════════════════════════════════════ */

const ARMAS = [
  { id: 'bt', nombre: 'Bt (Bacillus thuringiensis)', tipo: 'microbiano', controla: ['cogollero', 'gusano_mazorca'],
    como: 'La oruga come la hoja con Bt; el cristal de la bacteria le rompe el intestino y deja de comer. No afecta abejas, gallinas ni gente.' },
  { id: 'beauveria', nombre: 'Beauveria bassiana', tipo: 'microbiano', controla: ['broca', 'moscablanca'],
    como: 'El hongo germina sobre el insecto, lo penetra y lo seca por dentro. Estándar de Cenicafé contra broca y mosca blanca.' },
  { id: 'trichogramma', nombre: 'Avispita Trichogramma', tipo: 'parasitoide', controla: ['cogollero'],
    como: 'Pone su huevo DENTRO del huevo de la polilla. La larva nunca nace: no hay gusano que coma el cultivo.' },
  { id: 'telenomus', nombre: 'Avispita Telenomus', tipo: 'parasitoide', controla: ['gusano_mazorca'],
    como: 'Pone su huevo dentro del huevo del elotero: el gusano no alcanza a nacer ni a entrar a la mazorca.' },
  { id: 'cotesia', nombre: 'Avispita Cotesia', tipo: 'parasitoide', controla: ['barrenador'],
    como: 'Rastrea la larva del barrenador dentro del tallo y la parasita en su propio túnel.' },
  { id: 'cephalonomia', nombre: 'Avispa Cephalonomia', tipo: 'parasitoide', controla: ['broca'],
    como: 'Entra al grano picado, parasita a la broca y corta su reproducción donde el veneno no llega.' },
  { id: 'closterocerus', nombre: 'Avispa Closterocerus', tipo: 'parasitoide', controla: ['minador'],
    como: 'Busca la larva del minador dentro de la galería de la hoja y la parasita.' },
  { id: 'catarina', nombre: 'Mariquita', tipo: 'depredador', controla: ['pulgon', 'afido'],
    como: 'La mariquita y sus larvas devoran colonias enteras de pulgones y áfidos, hasta decenas al día.' },
  { id: 'crisopa', nombre: 'Crisopa (león de áfidos)', tipo: 'depredador', controla: ['moscablanca', 'pulgon', 'afido', 'aranita'],
    como: 'La larva de crisopa chupa pulgones, huevos, mosca blanca y ácaros con sus mandíbulas curvas.' },
  { id: 'sirfido', nombre: 'Mosca de las flores (sírfido)', tipo: 'depredador', controla: ['afido'],
    como: 'Su larva se come los áfidos uno a uno; el adulto poliniza las flores del cultivo.' },
  { id: 'cryptolaemus', nombre: 'Escarabajo come-cochinillas', tipo: 'depredador', controla: ['cochinilla'],
    como: 'Este escarabajo y sus larvas devoran las motas blancas hasta limpiar la rama.' },
  { id: 'amblyseius', nombre: 'Ácaro Amblyseius', tipo: 'depredador', controla: ['trips'],
    como: 'Un ácaro bueno que se come a los trips chiquitos antes de que se vuelvan plaga.' },
  { id: 'phytoseiulus', nombre: 'Ácaro depredador', tipo: 'depredador', controla: ['aranita'],
    como: 'Un ácaro cazador que persigue y se come a la araña roja plaga, huevo por huevo.' },
  { id: 'mantis', nombre: 'Mantis religiosa', tipo: 'depredador', controla: ['saltamontes'],
    como: 'Cazadora general: atrapa al saltamontes con sus patas y se lo come.' },
  { id: 'doru', nombre: 'Tijereta', tipo: 'depredador', controla: ['chicharrita'],
    como: 'Patrulla el cogollo de noche y devora chicharritas y huevos de otras plagas.' },
  { id: 'purin_ortiga', nombre: 'Purín de ortiga', tipo: 'botanico', controla: ['pulgon', 'afido'],
    como: 'Fermentado de ortiga diluido al follaje: reprime pulgones y áfidos como repelente botánico, sin dañar a los controladores.' },
];

const ENEMIGOS = [
  { id: 'cogollero', comun: 'Gusano cogollero', cientifico: 'Spodoptera frugiperda', cultivo: 'Maíz',
    dano: 'Se mete en el cogollo del maíz y se come el centro tierno.', controladores: ['bt', 'trichogramma'],
    ficha: 'El cogollero es una oruga: el Bt la detiene al primer bocado y la avispita Trichogramma ataca el huevo antes de que nazca.' },
  { id: 'gusano_mazorca', comun: 'Gusano de la mazorca', cientifico: 'Helicoverpa zea', cultivo: 'Maíz',
    dano: 'Entra por la punta de la mazorca y se come los granos tiernos.', controladores: ['bt', 'telenomus'],
    ficha: 'Al elotero lo controlan el Bt (al comer la hoja) y la avispita Telenomus (atacando el huevo).' },
  { id: 'barrenador', comun: 'Barrenador del tallo', cientifico: 'Diatraea saccharalis', cultivo: 'Maíz',
    dano: 'Hace túneles por dentro del tallo; la planta se debilita y se quiebra.', controladores: ['cotesia'],
    ficha: 'El barrenador vive dentro del tallo: solo la avispa Cotesia lo persigue por el túnel y lo parasita.' },
  { id: 'chicharrita', comun: 'Chicharrita del maíz', cientifico: 'Dalbulus maidis', cultivo: 'Maíz',
    dano: 'Chupa savia y le transmite al maíz el achaparramiento.', controladores: ['doru'],
    ficha: 'La tijereta Doru patrulla el cogollo y devora chicharritas mientras usted duerme.' },
  { id: 'moscablanca', comun: 'Mosca blanca', cientifico: 'Bemisia tabaci', cultivo: 'Frijol y hortalizas',
    dano: 'Chupa savia bajo la hoja y transmite virus que la enrollan.', controladores: ['beauveria', 'crisopa'],
    ficha: 'La mosca blanca es de cuerpo blando: el hongo Beauveria la seca por dentro y la larva de crisopa la caza.' },
  { id: 'pulgon', comun: 'Pulgón', cientifico: 'Aphididae', cultivo: 'Frijol, tomate y hortalizas',
    dano: 'Chupa la savia de los brotes; la hoja tierna se enrolla.', controladores: ['catarina', 'crisopa', 'purin_ortiga'],
    ficha: 'Para el pulgón, suelte mariquitas: se los comen vivos. Crisopa y purín de ortiga ayudan. Eso es control biológico, no veneno.' },
  { id: 'afido', comun: 'Áfido del frijol', cientifico: 'Aphis fabae', cultivo: 'Frijol',
    dano: 'Forma colonias pegajosas en los brotes y debilita la mata.', controladores: ['catarina', 'sirfido', 'crisopa', 'purin_ortiga'],
    ficha: 'Los áfidos los controlan mariquita, sírfido y crisopa; el purín de ortiga los reprime como repelente botánico.' },
  { id: 'aranita', comun: 'Araña roja (ácaro)', cientifico: 'Tetranychus urticae', cultivo: 'Mora, tomate y fresa',
    dano: 'Pica el envés de la hoja, la puntea y la seca.', controladores: ['crisopa', 'phytoseiulus'],
    ficha: 'La araña roja es un ácaro diminuto: la cazan la crisopa y el ácaro bueno Phytoseiulus.' },
  { id: 'trips', comun: 'Trips', cientifico: 'Thysanoptera', cultivo: 'Cebolla, tomate y hortalizas',
    dano: 'Raspa la hoja y la flor; deja manchas plateadas.', controladores: ['amblyseius'],
    ficha: 'Para los trips, suelte el ácaro bueno Amblyseius: caza los trips jóvenes sin un solo veneno.' },
  { id: 'saltamontes', comun: 'Saltamontes', cientifico: 'Caelifera', cultivo: 'Maíz y hortalizas',
    dano: 'Mastica hojas y brotes; en grupo deja la planta pelada.', controladores: ['mantis'],
    ficha: 'La mantis es cazadora general: atrapa al saltamontes con sus patas. Cuídela, ayuda a la finca.' },
  { id: 'broca', comun: 'Broca del café', cientifico: 'Hypothenemus hampei', cultivo: 'Café',
    dano: 'Perfora el grano de café por dentro y arruina la cosecha.', controladores: ['beauveria', 'cephalonomia'],
    ficha: 'La broca vive DENTRO del grano: el hongo Beauveria la seca y la avispa Cephalonomia la parasita. Estándar de Cenicafé.' },
  { id: 'minador', comun: 'Minador de la hoja', cientifico: 'Leucoptera coffeella', cultivo: 'Café',
    dano: 'Cava galerías por dentro de la hoja del café; la hoja se seca.', controladores: ['closterocerus'],
    ficha: 'Para el minador, la avispa Closterocerus encuentra la larva dentro de la galería y la parasita.' },
  { id: 'cochinilla', comun: 'Cochinilla harinosa', cientifico: 'Planococcus citri', cultivo: 'Café y frutales',
    dano: 'Forma motas blancas pegajosas, chupa savia y atrae hormigas.', controladores: ['cryptolaemus'],
    ficha: 'Para la cochinilla, el escarabajo Cryptolaemus se la come; le dicen "destructor de cochinillas".' },
];

const REHENES = [
  { id: 'oso_andino', nombre: 'Oso de anteojos (oso andino)', cientifico: 'Tremarctos ornatus',
    porque: 'Lo cazan por conflicto con cultivos y ganado, y por trofeo. Es el único oso de Suramérica y depende del bosque andino.',
    mensaje: 'El oso andino siembra el bosque: lleva semillas en el estiércol y abre claros que renuevan el monte. Sin oso, no hay bosque de niebla.',
    amenaza: 'Vulnerable (VU) — IUCN, pérdida de hábitat y cacería retaliativa.' },
];

const NIVEL = {
  numero: 1,
  nombre: 'La huerta de la ladera (templado)',
  enemigos: ['cogollero', 'pulgon', 'afido', 'moscablanca'],
  rehen: 'oso_andino',
  intro: 'Mañana en la ladera templada. Pulgones, áfidos y cogollero atacan la huerta. El oso andino está acorralado. Cuídela con control biológico, no con veneno.',
};

const _porId = (arr) => arr.reduce((m, x) => (m[x.id] = x, m), {});
const ARMAS_ID = _porId(ARMAS);
const ENEM_ID = _porId(ENEMIGOS);
const REHEN_ID = _porId(REHENES);
const getArma = (id) => ARMAS_ID[id];
const getEnemigo = (id) => ENEM_ID[id];
const getRehen = (id) => REHEN_ID[id];
const armaControlaEnemigo = (armaId, enemigoId) => {
  const a = ARMAS_ID[armaId];
  return !!a && a.controla.includes(enemigoId);
};
/** Arsenal REAL del nivel = unión de los controladores de sus plagas (data-driven). */
function armasDeNivel(nivel) {
  const vistas = new Set(); const orden = [];
  for (const eId of nivel.enemigos) {
    const e = ENEM_ID[eId]; if (!e) continue;
    for (const aId of e.controladores) if (!vistas.has(aId)) { vistas.add(aId); orden.push(aId); }
  }
  return orden;
}

/* ═══════════════════════════════════════════════════════════════════════════
 * ENGINE — física + colisiones + impacto (port de defensoresGameEngine + msc).
 * ═══════════════════════════════════════════════════════════════════════════ */

const GRAVITY = 0.9, JUMP_VELOCITY = -15, MOVE_SPEED = 4.2;
const PROYECTIL_VEL = 640, PROYECTIL_W = 26, PROYECTIL_H = 16;
const PUNTOS_PLAGA = 25, PUNTOS_REHEN = 100;

function rectsOverlap(a, b) {
  if (!a || !b) return false;
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
function avanzarFisica(estado, groundY, altura) {
  let { y, vy } = estado; vy += GRAVITY; y += vy;
  const pisoY = groundY - altura; let onGround = false;
  if (y >= pisoY) { y = pisoY; vy = 0; onGround = true; }
  return { y, vy, onGround };
}
function patrullarPlaga(plaga, dt, xMin, xMax) {
  let dir = plaga.dir >= 0 ? 1 : -1;
  let x = plaga.x + dir * plaga.vel * dt;
  if (x <= xMin) { x = xMin; dir = 1; } else if (x >= xMax) { x = xMax; dir = -1; }
  return { x, dir };
}
let _proySeq = 0;
function crearProyectil({ x, y, dir, armaId }) {
  const d = dir >= 0 ? 1 : -1;
  return { id: _proySeq += 1, armaId, dir: d, x, y, w: PROYECTIL_W, h: PROYECTIL_H, vx: d * PROYECTIL_VEL };
}
function avanzarProyectil(p, dt, mundoW) {
  const x = p.x + p.vx * dt;
  if (x + p.w < 0 || x > mundoW) return null;
  p.x = x; return p;
}
/** EL CORAZÓN: el disparo solo controla la plaga si el arma es el aliado correcto. */
function resolverImpactoArma(proy, plagas) {
  for (const plaga of plagas) {
    if (!plaga.vivo) continue;
    if (!rectsOverlap(proy, plaga)) continue;
    const correcto = armaControlaEnemigo(proy.armaId, plaga.enemigoId);
    if (correcto) plaga.vivo = false;
    return { impacto: { enemigoId: plaga.enemigoId, correcto } };
  }
  return { impacto: null };
}
function alcanzaRehen(jug, rehen) {
  if (!rehen || rehen.liberado) return false;
  return rectsOverlap(jug, rehen);
}
function evaluarFinCampo({ energia, plagasVivas, rehenLiberado }) {
  if (energia <= 0) return { estado: 'perdio', razon: 'Se quedó sin energía. Vuelva a intentarlo, la finca lo espera.' };
  if (plagasVivas <= 0 && rehenLiberado) return { estado: 'gano', razon: 'Cuidó la huerta con control biológico y liberó al animal. Así se cuida el campo.' };
  return { estado: 'jugando', razon: '' };
}

/* ═══════════════════════════════════════════════════════════════════════════
 * PALETA — ladera templada golden hour, familia térmica del valle.
 * ═══════════════════════════════════════════════════════════════════════════ */

const PAL = { tinta: '#3a2a1a' };
const COLOR_TIPO = {
  microbiano: '#2bb3a3', // Bt / Beauveria
  depredador: '#d1443b', // mariquita / crisopa
  parasitoide: '#e0a021', // avispitas
  botanico: '#5aa03c',   // purín de ortiga
};

// Angelita — Tetragonisca angustula elevada a rubber-hose andino (abejaIdentidad).
const AB = { cuerpo: '#ffb54f', cabeza: '#ffd76a', chumbe: '#9c3b1e', alaTul: '#bfeaff', alaTulClara: '#eafff6', lengua: '#c9524e', tinta: '#3a2a1a' };
// Oso de anteojos — negro con anteojos y pecho crema.
const OSO = { pelo: '#2c2723', anteojos: '#efe3c6', hocico: '#6b5a48', tinta: '#211c17' };

/* ═══════════════════════════════════════════════════════════════════════════
 * SPRITES — SVG chunky bold-outline (Metal Slug + rubber-hose para los bichos).
 * ═══════════════════════════════════════════════════════════════════════════ */

function svgAngelita() {
  // héroe: cabeza clara + tronco ámbar con banda chumbe, alas de tul, antenita.
  return `<svg viewBox="0 0 72 86" width="100%" height="100%" class="d-heroe-svg" aria-hidden="true">
  <ellipse cx="36" cy="80" rx="20" ry="5" fill="rgba(0,0,0,.22)"/>
  <g class="d-ala">
    <ellipse cx="24" cy="32" rx="16" ry="9" fill="${AB.alaTul}" stroke="${AB.tinta}" stroke-width="2.4" opacity=".9" transform="rotate(-18 24 32)"/>
    <ellipse cx="48" cy="30" rx="13" ry="7.5" fill="${AB.alaTulClara}" stroke="${AB.tinta}" stroke-width="2.2" opacity=".92" transform="rotate(16 48 30)"/>
  </g>
  <ellipse cx="36" cy="52" rx="20" ry="22" fill="${AB.cuerpo}" stroke="${AB.tinta}" stroke-width="3"/>
  <path d="M18 48 q18 8 36 0 v9 q-18 8 -36 0 z" fill="${AB.chumbe}" opacity=".92"/>
  <path d="M18 48 q18 8 36 0" fill="none" stroke="${AB.tinta}" stroke-width="2.2"/>
  <path d="M18 57 q18 8 36 0" fill="none" stroke="${AB.tinta}" stroke-width="2.2"/>
  <circle cx="36" cy="26" r="15" fill="${AB.cabeza}" stroke="${AB.tinta}" stroke-width="3"/>
  <circle cx="30" cy="24" r="4.4" fill="#fff" stroke="${AB.tinta}" stroke-width="1.6"/>
  <circle cx="43" cy="24" r="4.4" fill="#fff" stroke="${AB.tinta}" stroke-width="1.6"/>
  <circle cx="31" cy="25" r="2.1" fill="${AB.tinta}"/>
  <circle cx="44" cy="25" r="2.1" fill="${AB.tinta}"/>
  <path d="M31 33 q5 4 10 0" fill="none" stroke="${AB.tinta}" stroke-width="2" stroke-linecap="round"/>
  <path d="M28 13 q-4 -8 -9 -9 M45 13 q4 -8 9 -9" fill="none" stroke="${AB.tinta}" stroke-width="2.2" stroke-linecap="round"/>
  <circle cx="19" cy="4" r="2.4" fill="${AB.tinta}"/><circle cx="53" cy="4" r="2.4" fill="${AB.tinta}"/>
  <path d="M22 70 l-6 10 M32 74 l-3 11 M42 74 l3 11 M50 70 l6 10" fill="none" stroke="${AB.tinta}" stroke-width="3" stroke-linecap="round"/>
  </svg>`;
}

function svgOso() {
  // rehén POW: oso de anteojos negro, anteojos y pecho crema, ojitos tristes.
  return `<svg viewBox="0 0 88 96" width="100%" height="100%" aria-hidden="true">
  <ellipse cx="44" cy="90" rx="26" ry="6" fill="rgba(0,0,0,.25)"/>
  <ellipse cx="44" cy="58" rx="30" ry="34" fill="${OSO.pelo}" stroke="${OSO.tinta}" stroke-width="3"/>
  <ellipse cx="44" cy="66" rx="15" ry="20" fill="${OSO.anteojos}" opacity=".55"/>
  <circle cx="20" cy="22" r="12" fill="${OSO.pelo}" stroke="${OSO.tinta}" stroke-width="3"/>
  <circle cx="68" cy="22" r="12" fill="${OSO.pelo}" stroke="${OSO.tinta}" stroke-width="3"/>
  <circle cx="44" cy="30" r="26" fill="${OSO.pelo}" stroke="${OSO.tinta}" stroke-width="3"/>
  <path d="M28 24 q-3 10 5 15 q6 4 8 -2 q-8 -3 -6 -14 q-4 -1 -7 1 z" fill="${OSO.anteojos}"/>
  <path d="M60 24 q3 10 -5 15 q-6 4 -8 -2 q8 -3 6 -14 q4 -1 7 1 z" fill="${OSO.anteojos}"/>
  <circle cx="34" cy="30" r="4" fill="#1a1512"/><circle cx="54" cy="30" r="4" fill="#1a1512"/>
  <circle cx="35" cy="29" r="1.3" fill="#fff"/><circle cx="55" cy="29" r="1.3" fill="#fff"/>
  <ellipse cx="44" cy="40" rx="10" ry="8" fill="${OSO.hocico}"/>
  <ellipse cx="44" cy="37" rx="4.5" ry="3.2" fill="#1a1512"/>
  <path d="M44 40 v5 M40 46 q4 3 8 0" fill="none" stroke="#1a1512" stroke-width="2" stroke-linecap="round"/>
  </svg>`;
}

// Plaga: sprite chunky con ojos saltones (humor), data-driven por enemigoId.
function svgPlaga(enemigoId) {
  if (enemigoId === 'moscablanca') {
    return `<svg viewBox="0 0 60 52" width="100%" height="100%" class="d-wobble" aria-hidden="true">
      <ellipse cx="20" cy="20" rx="16" ry="10" fill="#f4f4ee" stroke="${PAL.tinta}" stroke-width="2.2" opacity=".9"/>
      <ellipse cx="40" cy="20" rx="16" ry="10" fill="#eef0e6" stroke="${PAL.tinta}" stroke-width="2.2" opacity=".9"/>
      <ellipse cx="30" cy="34" rx="14" ry="12" fill="#e9e4cf" stroke="${PAL.tinta}" stroke-width="2.4"/>
      <circle cx="25" cy="32" r="4.4" fill="#fff" stroke="${PAL.tinta}" stroke-width="1.6"/>
      <circle cx="35" cy="32" r="4.4" fill="#fff" stroke="${PAL.tinta}" stroke-width="1.6"/>
      <circle cx="25.6" cy="33" r="1.9" fill="${PAL.tinta}"/><circle cx="35.6" cy="33" r="1.9" fill="${PAL.tinta}"/></svg>`;
  }
  if (enemigoId === 'pulgon' || enemigoId === 'afido') {
    const c = enemigoId === 'afido' ? '#7bbf4f' : '#9ccf5e';
    return `<svg viewBox="0 0 56 50" width="100%" height="100%" class="d-wobble" aria-hidden="true">
      <ellipse cx="20" cy="30" rx="13" ry="12" fill="${c}" stroke="${PAL.tinta}" stroke-width="2.4"/>
      <ellipse cx="36" cy="32" rx="11" ry="10" fill="${c}" stroke="${PAL.tinta}" stroke-width="2.2" opacity=".92"/>
      <circle cx="16" cy="27" r="3.6" fill="#fff" stroke="${PAL.tinta}" stroke-width="1.4"/>
      <circle cx="24" cy="27" r="3.6" fill="#fff" stroke="${PAL.tinta}" stroke-width="1.4"/>
      <circle cx="16.5" cy="28" r="1.6" fill="${PAL.tinta}"/><circle cx="24.5" cy="28" r="1.6" fill="${PAL.tinta}"/>
      <path d="M20 6 L20 18 M14 10 L20 18 L26 10" fill="none" stroke="${PAL.tinta}" stroke-width="1.8" stroke-linecap="round"/></svg>`;
  }
  // cogollero (oruga verde por segmentos)
  return `<svg viewBox="0 0 64 48" width="100%" height="100%" class="d-wobble" aria-hidden="true">
    ${[12, 24, 36, 48].map((cx, i) => `<circle cx="${cx}" cy="${30 - (i % 2) * 2}" r="11" fill="${i === 3 ? '#a7d06a' : '#8fbf55'}" stroke="${PAL.tinta}" stroke-width="2.4"/>`).join('')}
    <circle cx="52" cy="24" r="3.4" fill="#fff" stroke="${PAL.tinta}" stroke-width="1.4"/>
    <circle cx="52.8" cy="24.6" r="1.6" fill="${PAL.tinta}"/>
    <path d="M50 32 q4 3 8 0" fill="none" stroke="${PAL.tinta}" stroke-width="1.8" stroke-linecap="round"/></svg>`;
}

/* ═══════════════════════════════════════════════════════════════════════════
 * GEOMETRÍA DEL MUNDO (coords diseño; x→derecha, y→abajo).
 * ═══════════════════════════════════════════════════════════════════════════ */

const ALTO_2D = 520, SUELO_Y = 432, MUNDO_W = 2720;
const STEP = 1 / 60, MAX_DT = 0.05;
const JUG_W = 48, JUG_H = 66;
const ENERGIA_INICIAL = 3, INVULN_MS = 1200, DISPARO_CD = 260, FICHA_MS = 3400;

const ARSENAL = ['bt', 'catarina', 'beauveria', 'crisopa'].filter((id) => armasDeNivel(NIVEL).includes(id));

const SIEMBRA = [
  { e: 'cogollero', x: 560, vuela: false }, { e: 'pulgon', x: 900, vuela: false },
  { e: 'moscablanca', x: 1240, vuela: true }, { e: 'afido', x: 1560, vuela: false },
  { e: 'cogollero', x: 1900, vuela: false }, { e: 'moscablanca', x: 2180, vuela: true },
];

const DECOR = [
  { x: 360, h: 96, t: 'maiz' }, { x: 720, h: 70, t: 'frijol' }, { x: 1080, h: 96, t: 'maiz' },
  { x: 1420, h: 66, t: 'frijol' }, { x: 1760, h: 96, t: 'maiz' }, { x: 2040, h: 70, t: 'frijol' },
  { x: 2340, h: 96, t: 'maiz' },
];

function crearMundo() {
  const enemigos = SIEMBRA.map((s, i) => {
    const eh = s.vuela ? 40 : 46, ew = s.vuela ? 46 : 52;
    const baseY = s.vuela ? SUELO_Y - 150 : SUELO_Y - eh;
    return {
      id: `${s.e}#${i}`, enemigoId: s.e, x: s.x, y: baseY, w: ew, h: eh, vivo: true, vuela: s.vuela,
      dir: i % 2 === 0 ? -1 : 1, vel: s.vuela ? 46 : 34, xMin: s.x - 90, xMax: s.x + 90, fase: i * 0.7,
    };
  });
  return {
    jugador: { x: 120, y: SUELO_Y - JUG_H, vy: 0, onGround: true, mira: 1, w: JUG_W, h: JUG_H, energia: ENERGIA_INICIAL, invulnHasta: 0 },
    enemigos, proyectiles: [],
    rehen: { x: 2500, y: SUELO_Y - 88, w: 80, h: 88, liberado: false },
    cam: 0, puntaje: 0, armaIdx: 0, ultimoDisparo: 0, shakeHasta: 0, shakeMag: 0, reloj: 0,
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
 * MOUNT — overlay + loop. initDefensores() lo arranca y suprime el valle.
 * ═══════════════════════════════════════════════════════════════════════════ */

export function initDefensores() {
  // suprimir el valle 3D: ocultar canvas + loader del hero shot.
  const c = document.getElementById('c'); if (c) c.style.display = 'none';
  const load = document.getElementById('load'); if (load) load.remove();
  const hud0 = document.getElementById('hud'); if (hud0) hud0.style.display = 'none';

  // el onboarding del valle (`#onb`, z-index 60) no aplica dentro del juego: es
  // otra pantalla. Se quita al montar y se vigila un instante por si aparece
  // tarde (su módulo carga antes que main.js, pero crea el nodo en una promesa).
  const quitarOnb = () => { const o = document.getElementById('onb'); if (o) o.remove(); };
  quitarOnb();
  const obs = new MutationObserver(quitarOnb);
  obs.observe(document.body, { childList: true });
  setTimeout(() => obs.disconnect(), 4000);

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const root = document.createElement('div');
  root.className = 'd-root';
  root.dataset.rm = reducedMotion ? '1' : '0';
  root.innerHTML = ESTILOS + PANTALLA_INTRO();
  document.body.appendChild(root);

  root.querySelector('.d-btn-jugar').addEventListener('click', () => arrancarJuego(root, reducedMotion));
}

function PANTALLA_INTRO() {
  const arsenalLis = ARSENAL.map((id) => {
    const a = getArma(id);
    return `<li><b style="color:${COLOR_TIPO[a.tipo]}">■</b> ${a.nombre}</li>`;
  }).join('');
  return `
  <button type="button" class="d-volver" onclick="location.href='./'">← Volver al valle</button>
  <div class="d-intro">
    <div class="d-intro-card">
      <p class="d-kicker">Defensores de la finca · Nivel ${NIVEL.numero}</p>
      <h1 class="d-titulo">${NIVEL.nombre}</h1>
      <p class="d-intro-texto">${NIVEL.intro}</p>
      <div class="d-arsenal">
        <span class="d-arsenal-rotulo">Su arsenal de control biológico:</span>
        <ul>${arsenalLis}</ul>
      </div>
      <p class="d-ayuda">Muévase con <kbd>←</kbd> <kbd>→</kbd>, salte con <kbd>espacio</kbd>, lance con <kbd>J</kbd> y cambie de aliado con <kbd>K</kbd>. En el celular, use los botones. Cada plaga se controla con su aliado correcto: si se equivoca, la plaga aguanta.</p>
      <button type="button" class="d-btn-jugar">¡A cuidar la finca!</button>
    </div>
  </div>`;
}

function PANTALLA_JUEGO() {
  return `
  <button type="button" class="d-volver" onclick="location.href='./'">← Volver al valle</button>
  <div class="d-juego">
    <div class="d-vista">
      <div class="d-cielo"></div>
      <div class="d-montes d-montes--lejos"></div>
      <div class="d-montes d-montes--medio"></div>
      <div class="d-loma d-loma--cerca"></div>
      <div class="d-marco">
        <div class="d-mundo" style="width:${MUNDO_W}px">
          <div class="d-suelo" style="width:${MUNDO_W}px;top:${SUELO_Y}px"></div>
          <div class="d-pasto" style="width:${MUNDO_W}px;top:${SUELO_Y - 8}px"></div>
          ${DECOR.map((d) => `<div class="d-mata d-mata--${d.t}" style="left:${d.x}px;top:${SUELO_Y - d.h}px;height:${d.h}px"></div>`).join('')}
          <div class="d-capa-plagas"></div>
          <div class="d-capa-proy"></div>
          <div class="d-rehen d-rehen--preso" style="left:2500px;top:${SUELO_Y - 88}px;width:80px;height:88px">
            <div class="d-jaula"></div>${svgOso()}<div class="d-sos">¡SOS!</div>
          </div>
          <div class="d-jugador" data-mira="1" data-inv="0" style="left:120px;top:${SUELO_Y - JUG_H}px;width:${JUG_W}px;height:${JUG_H}px">${svgAngelita()}</div>
        </div>
      </div>
      <div class="d-hud">
        <div class="d-hud-izq">
          <span class="d-energia"></span>
          <span class="d-puntaje">0 pts</span>
        </div>
        <div class="d-hud-der">
          <span class="d-plagas-cnt">Plagas: 0</span>
          <span class="d-rehen-cnt">Oso: rescátelo</span>
        </div>
        <button type="button" class="d-arma-actual"><b>■</b><span>—</span><em>cambiar (K)</em></button>
      </div>
      <div class="d-overlays"></div>
      <div class="d-toast-slot"></div>
    </div>
    <div class="d-controles">
      <div class="d-mov">
        <button type="button" class="d-ctrl" data-k="izq" aria-label="Izquierda">◀</button>
        <button type="button" class="d-ctrl" data-k="der" aria-label="Derecha">▶</button>
      </div>
      <div class="d-acciones">
        <button type="button" class="d-ctrl d-ctrl--sec" data-act="arma" aria-label="Cambiar aliado">⟳</button>
        <button type="button" class="d-ctrl d-ctrl--fire" data-act="disparo" aria-label="Lanzar aliado">✷</button>
        <button type="button" class="d-ctrl d-ctrl--jump" data-k="salto" aria-label="Saltar">⤒</button>
      </div>
    </div>
  </div>`;
}

function arrancarJuego(root, reducedMotion) {
  root.innerHTML = ESTILOS + PANTALLA_JUEGO();

  const vista = root.querySelector('.d-vista');
  const marco = root.querySelector('.d-marco');
  const mundoEl = root.querySelector('.d-mundo');
  const capaPlagas = root.querySelector('.d-capa-plagas');
  const capaProy = root.querySelector('.d-capa-proy');
  const rehenEl = root.querySelector('.d-rehen');
  const jugadorEl = root.querySelector('.d-jugador');
  const energiaEl = root.querySelector('.d-energia');
  const puntajeEl = root.querySelector('.d-puntaje');
  const plagasCntEl = root.querySelector('.d-plagas-cnt');
  const rehenCntEl = root.querySelector('.d-rehen-cnt');
  const armaBtn = root.querySelector('.d-arma-actual');
  const overlays = root.querySelector('.d-overlays');
  const toastSlot = root.querySelector('.d-toast-slot');
  const montesLejos = root.querySelector('.d-montes--lejos');
  const montesMedio = root.querySelector('.d-montes--medio');
  const lomaCerca = root.querySelector('.d-loma--cerca');

  let W = crearMundo();
  const teclas = { izq: false, der: false, salto: false };
  let pausa = false, fin = null;
  const plagaNodos = new Map();

  // ── sembrar nodos de plaga (persistentes) ──
  for (const e of W.enemigos) {
    const el = document.createElement('div');
    el.className = 'd-plaga';
    el.dataset.dir = e.dir;
    el.style.cssText = `left:${e.x}px;top:${e.y}px;width:${e.w}px;height:${e.h}px`;
    el.innerHTML = svgPlaga(e.enemigoId);
    capaPlagas.appendChild(el);
    plagaNodos.set(e.id, el);
  }

  // ── HUD estático de energía ──
  const pintarEnergia = () => {
    let s = '';
    for (let i = 0; i < ENERGIA_INICIAL; i++) s += `<b class="${i < W.jugador.energia ? 'on' : 'off'}">♥</b>`;
    energiaEl.innerHTML = s;
  };
  const pintarArma = () => {
    const a = getArma(ARSENAL[W.armaIdx % ARSENAL.length]);
    armaBtn.querySelector('b').style.color = COLOR_TIPO[a.tipo];
    armaBtn.querySelector('span').textContent = a.nombre;
  };
  pintarEnergia(); pintarArma();

  // ── overlays didácticos ──
  function mostrarFicha(enemigoId) {
    const e = getEnemigo(enemigoId); if (!e) return;
    pausa = true;
    overlays.innerHTML = `
      <div class="d-overlay d-overlay--ficha" role="dialog">
        <div class="d-ficha">
          <span class="d-ficha-tag">¡Plaga controlada!</span>
          <h3>${e.comun} <i>(${e.cientifico})</i></h3>
          <p class="d-ficha-cultivo"><b>Ataca:</b> ${e.cultivo}</p>
          <p>${e.ficha}</p>
          <button type="button" class="d-ficha-ok">Seguir (Enter)</button>
        </div>
      </div>`;
    const ok = overlays.querySelector('.d-ficha-ok');
    ok.addEventListener('click', cerrarOverlay);
    const t = setTimeout(() => { if (overlays.querySelector('.d-overlay--ficha')) cerrarOverlay(); }, FICHA_MS);
    overlays._timer = t;
  }
  function mostrarRehen(rehen) {
    pausa = true;
    overlays.innerHTML = `
      <div class="d-overlay d-overlay--rehen" role="dialog">
        <div class="d-aviso">
          <span class="d-aviso-tag">¡Liberado!</span>
          <h3>${rehen.nombre}</h3>
          <p class="d-aviso-porque"><b>Por qué lo cazan:</b> ${rehen.porque}</p>
          <p>${rehen.mensaje}</p>
          <p class="d-aviso-iucn">${rehen.amenaza}</p>
          <button type="button" class="d-ficha-ok">Seguir (Enter)</button>
        </div>
      </div>`;
    overlays.querySelector('.d-ficha-ok').addEventListener('click', cerrarOverlay);
  }
  function cerrarOverlay() {
    if (overlays._timer) { clearTimeout(overlays._timer); overlays._timer = null; }
    overlays.innerHTML = '';
    if (!fin) pausa = false;
  }
  function mostrarToast(msg) {
    toastSlot.innerHTML = `<div class="d-toast" role="status">${msg}</div>`;
    clearTimeout(toastSlot._timer);
    toastSlot._timer = setTimeout(() => { toastSlot.innerHTML = ''; }, 1800);
  }
  function mostrarFin(res) {
    fin = res; pausa = true;
    const gano = res.estado === 'gano';
    overlays.innerHTML = `
      <div class="d-overlay d-overlay--fin" role="dialog">
        <div class="d-fin ${gano ? 'd-fin--gano' : 'd-fin--perdio'}">
          <h2>${gano ? '¡Finca cuidada!' : 'Se acabó la energía'}</h2>
          <p>${res.razon}</p>
          <p class="d-fin-puntaje">${W.puntaje} puntos</p>
          <button type="button" class="d-btn-jugar d-reintentar">${gano ? 'Jugar de nuevo' : 'Reintentar'}</button>
          <button type="button" class="d-fin-salir" onclick="location.href='./'">Volver al valle</button>
        </div>
      </div>`;
    overlays.querySelector('.d-reintentar').addEventListener('click', reiniciar);
  }
  function reiniciar() {
    cerrarOverlay(); fin = null; pausa = false;
    teclas.izq = teclas.der = teclas.salto = false;
    W = crearMundo();
    // recrear nodos de plaga (algunos murieron)
    capaPlagas.innerHTML = ''; plagaNodos.clear();
    for (const e of W.enemigos) {
      const el = document.createElement('div');
      el.className = 'd-plaga'; el.dataset.dir = e.dir;
      el.style.cssText = `left:${e.x}px;top:${e.y}px;width:${e.w}px;height:${e.h}px`;
      el.innerHTML = svgPlaga(e.enemigoId);
      capaPlagas.appendChild(el); plagaNodos.set(e.id, el);
    }
    rehenEl.classList.remove('d-rehen--libre'); rehenEl.classList.add('d-rehen--preso');
    pintarEnergia(); pintarArma();
  }

  // ── input ──
  function disparar() {
    if (pausa || fin) return;
    const ahora = performance.now();
    if (ahora - W.ultimoDisparo < DISPARO_CD) return;
    W.ultimoDisparo = ahora;
    const j = W.jugador;
    const px = j.mira > 0 ? j.x + j.w : j.x - 26;
    W.proyectiles.push(crearProyectil({ x: px, y: j.y + 22, dir: j.mira, armaId: ARSENAL[W.armaIdx % ARSENAL.length] }));
  }
  function cambiarArma() { W.armaIdx = (W.armaIdx + 1) % ARSENAL.length; pintarArma(); }

  const onDown = (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') { teclas.izq = true; e.preventDefault(); }
    else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') { teclas.der = true; e.preventDefault(); }
    else if (e.key === 'ArrowUp' || e.key === ' ' || e.key === 'w' || e.key === 'W') { teclas.salto = true; e.preventDefault(); }
    else if ((e.key === 'j' || e.key === 'J' || e.key === 'f' || e.key === 'F') && !e.repeat) disparar();
    else if ((e.key === 'k' || e.key === 'K') && !e.repeat) cambiarArma();
    else if ((e.key === 'Enter' || e.key === 'e') && !e.repeat) { if (overlays.querySelector('.d-overlay:not(.d-overlay--fin)')) cerrarOverlay(); }
  };
  const onUp = (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') teclas.izq = false;
    else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') teclas.der = false;
    else if (e.key === 'ArrowUp' || e.key === ' ' || e.key === 'w' || e.key === 'W') teclas.salto = false;
  };
  window.addEventListener('keydown', onDown);
  window.addEventListener('keyup', onUp);

  // controles táctiles
  root.querySelectorAll('.d-ctrl[data-k]').forEach((btn) => {
    const k = btn.dataset.k;
    const set = (v) => (teclas[k] = v);
    btn.addEventListener('pointerdown', (e) => { e.preventDefault(); set(true); });
    btn.addEventListener('pointerup', () => set(false));
    btn.addEventListener('pointerleave', () => set(false));
    btn.addEventListener('pointercancel', () => set(false));
  });
  root.querySelector('.d-ctrl[data-act="disparo"]').addEventListener('click', disparar);
  root.querySelector('.d-ctrl[data-act="arma"]').addEventListener('click', cambiarArma);
  armaBtn.addEventListener('click', cambiarArma);

  // ── medir ancho visible en unidades de diseño (cámara) ──
  let anchoVista = 760, escala = 1;
  const medir = () => {
    const r = vista.getBoundingClientRect();
    escala = Math.max(0.3, r.height / ALTO_2D);
    anchoVista = r.width / escala;
    marco.style.transform = `scale(${escala})`;
  };
  medir();
  const ro = new ResizeObserver(medir); ro.observe(vista);

  // ── un tick de simulación (paso fijo) ──
  function tick(ahora) {
    const j = W.jugador;
    W.reloj += STEP;
    const dir = (teclas.der ? 1 : 0) - (teclas.izq ? 1 : 0);
    if (dir !== 0) j.mira = dir;
    j.x = Math.max(30, Math.min(MUNDO_W - j.w - 10, j.x + dir * MOVE_SPEED));

    if (teclas.salto && j.onGround) { j.vy = JUMP_VELOCITY; j.onGround = false; }
    const fis = avanzarFisica({ y: j.y, vy: j.vy, onGround: j.onGround }, SUELO_Y, j.h);
    j.y = fis.y; j.vy = fis.vy; j.onGround = fis.onGround;

    for (const e of W.enemigos) {
      if (!e.vivo) continue;
      const p = patrullarPlaga(e, STEP, e.xMin, e.xMax);
      e.x = p.x; e.dir = p.dir;
      if (e.vuela) e.y = (SUELO_Y - 150) + (reducedMotion ? 0 : Math.sin(W.reloj * 2.2 + e.fase) * 16);
    }

    const vivos = [];
    for (const proy of W.proyectiles) {
      const movido = avanzarProyectil(proy, STEP, MUNDO_W);
      if (!movido) continue;
      const { impacto } = resolverImpactoArma(movido, W.enemigos);
      if (impacto) {
        if (impacto.correcto) { W.puntaje += PUNTOS_PLAGA; W._ficha = impacto.enemigoId; W._shake = Math.max(W._shake || 0, reducedMotion ? 0 : 5); }
        else { W._errado = impacto.enemigoId; W._shake = Math.max(W._shake || 0, reducedMotion ? 0 : 3); }
      } else vivos.push(movido);
    }
    W.proyectiles = vivos;

    if (ahora >= j.invulnHasta) {
      for (const e of W.enemigos) {
        if (e.vivo && rectsOverlap(j, e)) {
          j.energia -= 1; j.invulnHasta = ahora + INVULN_MS;
          W._shake = Math.max(W._shake || 0, reducedMotion ? 0 : 8); W._golpe = true; break;
        }
      }
    }

    if (alcanzaRehen(j, W.rehen)) {
      W.rehen.liberado = true; W.puntaje += PUNTOS_REHEN; W._rehen = true; W._shake = Math.max(W._shake || 0, reducedMotion ? 0 : 6);
    }

    const plagasVivas = W.enemigos.filter((e) => e.vivo).length;
    const res = evaluarFinCampo({ energia: j.energia, plagasVivas, rehenLiberado: W.rehen.liberado });
    if (res.estado !== 'jugando') W._fin = res;
  }

  // ── despachar eventos discretos del tick ──
  function despachar() {
    if (W._shake && !reducedMotion) { W.shakeMag = W._shake; W.shakeHasta = performance.now() + 220; W._shake = 0; }
    if (W._ficha) { mostrarFicha(W._ficha); W._ficha = null; }
    if (W._errado) { const e = getEnemigo(W._errado); mostrarToast(`Ese aliado no le sirve a ${e ? e.comun : 'esa plaga'}. Pruebe con su controlador correcto.`); W._errado = null; }
    if (W._golpe) W._golpe = null;
    if (W._rehen) { mostrarRehen(getRehen(NIVEL.rehen)); W._rehen = null; }
    if (W._fin) { mostrarFin(W._fin); W._fin = null; }
  }

  // ── render de un frame ──
  const proyNodos = new Map();
  function render(ahora) {
    // plagas
    for (const e of W.enemigos) {
      const el = plagaNodos.get(e.id); if (!el) continue;
      if (!e.vivo) { if (el.style.display !== 'none') el.style.display = 'none'; continue; }
      el.style.left = e.x + 'px'; el.style.top = e.y + 'px'; el.dataset.dir = e.dir;
    }
    // proyectiles (diff)
    const vivosIds = new Set(W.proyectiles.map((p) => p.id));
    for (const [id, el] of proyNodos) if (!vivosIds.has(id)) { el.remove(); proyNodos.delete(id); }
    for (const p of W.proyectiles) {
      let el = proyNodos.get(p.id);
      if (!el) {
        el = document.createElement('div'); el.className = 'd-proyectil';
        const a = getArma(p.armaId);
        el.style.background = COLOR_TIPO[a ? a.tipo : ''] || '#fff';
        el.style.width = p.w + 'px'; el.style.height = p.h + 'px';
        capaProy.appendChild(el); proyNodos.set(p.id, el);
      }
      el.style.left = p.x + 'px'; el.style.top = p.y + 'px';
    }
    // jugador
    const j = W.jugador;
    jugadorEl.style.left = j.x + 'px'; jugadorEl.style.top = j.y + 'px';
    jugadorEl.dataset.mira = j.mira;
    jugadorEl.dataset.inv = ahora < j.invulnHasta ? '1' : '0';
    // rehén
    if (W.rehen.liberado && !rehenEl.classList.contains('d-rehen--libre')) {
      rehenEl.classList.remove('d-rehen--preso'); rehenEl.classList.add('d-rehen--libre');
    }
    // HUD dinámico
    pintarEnergia();
    puntajeEl.textContent = `${W.puntaje} pts`;
    plagasCntEl.textContent = `Plagas: ${W.enemigos.filter((e) => e.vivo).length}`;
    rehenCntEl.textContent = W.rehen.liberado ? 'Oso a salvo ✓' : 'Oso: rescátelo';
    // cámara + parallax + screenshake
    const objetivo = Math.max(0, Math.min(MUNDO_W - anchoVista, j.x - anchoVista * 0.4));
    W.cam += (objetivo - W.cam) * 0.14;
    mundoEl.style.transform = `translate3d(${-W.cam}px,0,0)`;
    montesLejos.style.transform = `translate3d(${-W.cam * 0.16}px,0,0)`;
    montesMedio.style.transform = `translate3d(${-W.cam * 0.34}px,0,0)`;
    lomaCerca.style.transform = `translate3d(${-W.cam * 0.6}px,0,0)`;
    const enShake = !reducedMotion && ahora < W.shakeHasta;
    const sx = enShake ? (Math.random() - 0.5) * W.shakeMag : 0;
    const sy = enShake ? (Math.random() - 0.5) * W.shakeMag : 0;
    marco.style.transform = `scale(${escala}) translate3d(${sx}px,${sy}px,0)`;
  }

  // ── EL LATIDO ──
  let raf = 0, prev = performance.now(), acc = 0;
  const paso = (ahora) => {
    const dt = Math.min(MAX_DT, (ahora - prev) / 1000); prev = ahora;
    if (!pausa && !fin) {
      acc += dt;
      while (acc >= STEP) { tick(ahora); acc -= STEP; }
      despachar();
    }
    render(ahora);
    raf = requestAnimationFrame(paso);
  };
  raf = requestAnimationFrame(paso);
}

/* ═══════════════════════════════════════════════════════════════════════════
 * ESTILOS — self-contained, prefijo d-, offline-safe. Metal Slug + Ghibli ladera.
 * ═══════════════════════════════════════════════════════════════════════════ */

const ESTILOS = `<style>
.d-root{position:fixed;inset:0;z-index:70;overflow:hidden;background:#12100c;font-family:'Baloo 2',system-ui,sans-serif;color:#3a2a1a;user-select:none;-webkit-user-select:none;touch-action:none}
.d-volver{position:absolute;top:10px;left:10px;z-index:40;background:rgba(0,0,0,.42);color:#fff;border:2px solid rgba(255,255,255,.5);border-radius:11px;padding:7px 13px;font-weight:800;font-size:15px;cursor:pointer}
.d-volver:hover{background:rgba(0,0,0,.6)}

/* intro */
.d-intro{position:absolute;inset:0;display:grid;place-items:center;padding:18px;background:linear-gradient(160deg,#2a3a24,#463a1e 70%)}
.d-intro-card{max-width:560px;width:100%;background:#f4ecd6;border:4px solid #3a2a1a;border-radius:22px;box-shadow:0 14px 0 rgba(0,0,0,.35);padding:22px 24px}
.d-kicker{margin:0 0 4px;font-weight:900;letter-spacing:.03em;color:#b5632a;text-transform:uppercase;font-size:13px}
.d-titulo{margin:0 0 8px;font-size:30px;line-height:1.05;font-weight:900;color:#3a2a1a}
.d-intro-texto{margin:0 0 14px;font-size:16px;line-height:1.35}
.d-arsenal{background:#fff8e6;border:2px dashed #caa25a;border-radius:13px;padding:10px 14px;margin-bottom:12px}
.d-arsenal-rotulo{font-weight:800;font-size:14px}
.d-arsenal ul{margin:6px 0 0;padding-left:2px;list-style:none;display:grid;gap:3px;font-size:14.5px}
.d-arsenal b{margin-right:6px;font-size:15px}
.d-ayuda{font-size:13.5px;line-height:1.4;color:#5c4a35;margin:0 0 16px}
.d-ayuda kbd{background:#fff;border:1.5px solid #3a2a1a;border-bottom-width:3px;border-radius:6px;padding:1px 6px;font-weight:800;font-size:12.5px}
.d-btn-jugar{display:block;width:100%;background:#e0532b;color:#fff;border:3px solid #3a2a1a;border-bottom-width:6px;border-radius:15px;padding:13px;font-size:19px;font-weight:900;cursor:pointer;transition:transform .08s}
.d-btn-jugar:active{transform:translateY(3px);border-bottom-width:3px}

/* juego */
.d-juego{position:absolute;inset:0;display:flex;flex-direction:column}
.d-vista{position:relative;flex:1;overflow:hidden;background:#bfe3ef}
.d-cielo{position:absolute;inset:0;background:linear-gradient(#bfe3ef 0%,#e6f0d6 58%,#f3eccf 100%)}
/* montañas Humboldt — silueta escalonada al fondo */
.d-montes{position:absolute;left:-14%;right:-14%;bottom:26%;height:230px;will-change:transform}
.d-montes--lejos{bottom:30%;height:270px;background:
  radial-gradient(90% 100% at 22% 100%,#a7b8c4 0 62%,transparent 63%),
  radial-gradient(80% 100% at 60% 100%,#b3c2cc 0 60%,transparent 61%),
  radial-gradient(70% 100% at 88% 100%,#9fb2c0 0 60%,transparent 61%);opacity:.75}
.d-montes--medio{bottom:24%;height:250px;background:
  radial-gradient(80% 100% at 34% 100%,#8ba888 0 60%,transparent 61%),
  radial-gradient(90% 100% at 72% 100%,#7fa079 0 60%,transparent 61%);opacity:.9}
.d-loma{position:absolute;left:-12%;right:-12%;bottom:12%;height:220px;will-change:transform}
.d-loma--cerca{background:radial-gradient(120% 100% at 40% 100%,#6f9e63 0 58%,transparent 59%)}
.d-marco{position:absolute;top:0;left:0;transform-origin:top left;will-change:transform}
.d-mundo{position:absolute;top:0;left:0;height:${ALTO_2D}px;will-change:transform}
.d-suelo{position:absolute;left:0;height:${ALTO_2D}px;background:linear-gradient(#8a6a44 0 12px,#a8814f 12px 100%)}
.d-pasto{position:absolute;left:0;height:14px;background:repeating-linear-gradient(90deg,#6fa650 0 8px,#5f9345 8px 16px);border-radius:6px 6px 0 0}
.d-mata{position:absolute;width:26px;border-radius:8px 8px 0 0}
.d-mata--maiz{background:linear-gradient(#8bbf4a,#6d9c37);box-shadow:inset -4px 0 0 rgba(0,0,0,.12)}
.d-mata--maiz::after{content:"";position:absolute;top:6px;left:50%;width:12px;height:26px;background:#e6c34a;border-radius:6px;transform:translateX(-50%)}
.d-mata--frijol{background:linear-gradient(#7bab54,#557f36);border-radius:12px 12px 0 0;box-shadow:inset -3px 0 0 rgba(0,0,0,.12)}
.d-capa-plagas,.d-capa-proy{position:absolute;inset:0}
.d-plaga{position:absolute;will-change:transform}
.d-plaga[data-dir="1"]{transform:scaleX(-1)}
.d-proyectil{position:absolute;border-radius:50%;box-shadow:0 0 8px rgba(255,255,255,.6),inset 0 0 4px rgba(255,255,255,.7);border:2px solid rgba(0,0,0,.35);will-change:transform}
.d-jugador{position:absolute;display:grid;place-items:center;will-change:transform}
.d-jugador[data-mira="-1"]{transform:scaleX(-1)}
.d-jugador[data-inv="1"]{animation:d-parpadeo .18s steps(2,end) infinite}
.d-heroe-svg{filter:drop-shadow(0 3px 0 rgba(0,0,0,.18))}
.d-rehen{position:absolute;display:grid;place-items:end center}
.d-jaula{position:absolute;inset:-6px -4px 0;border:3px solid #6b6b6b;border-radius:8px;background:repeating-linear-gradient(90deg,transparent 0 10px,rgba(80,80,80,.55) 10px 13px);pointer-events:none}
.d-rehen--libre .d-jaula{display:none}
.d-sos{position:absolute;top:-20px;left:50%;transform:translateX(-50%);background:#e0532b;color:#fff;font-weight:900;font-size:12px;padding:1px 7px;border-radius:8px;border:2px solid #3a2a1a}
.d-rehen--libre .d-sos{display:none}
.d-rehen--libre{animation:d-brinco .5s ease}

/* HUD */
.d-hud{position:absolute;top:8px;left:0;right:0;z-index:20;display:flex;align-items:flex-start;justify-content:space-between;gap:8px;padding:0 12px 0 150px;pointer-events:none}
.d-hud-izq,.d-hud-der{display:flex;flex-direction:column;gap:3px;background:rgba(0,0,0,.34);border-radius:12px;padding:6px 11px;color:#fff;font-weight:800}
.d-hud-der{text-align:right;font-size:13.5px}
.d-energia b{font-size:19px;color:#ff5a4d}
.d-energia b.off{color:rgba(255,255,255,.28)}
.d-puntaje{font-size:17px;color:#ffd66b}
.d-arma-actual{pointer-events:auto;display:flex;align-items:center;gap:7px;background:rgba(0,0,0,.42);border:2px solid rgba(255,255,255,.5);border-radius:12px;padding:6px 11px;color:#fff;font-weight:800;font-size:14px;cursor:pointer;position:absolute;right:12px;top:64px;max-width:60%}
.d-arma-actual b{font-size:16px}
.d-arma-actual em{font-style:normal;opacity:.7;font-size:11.5px;font-weight:700}

/* overlays */
.d-overlay{position:absolute;inset:0;z-index:30;display:grid;place-items:center;background:rgba(20,15,8,.5);padding:18px;animation:d-aparece .18s ease}
.d-ficha,.d-aviso,.d-fin{max-width:440px;width:100%;background:#f7efda;border:4px solid #3a2a1a;border-radius:20px;box-shadow:0 12px 0 rgba(0,0,0,.32);padding:18px 20px}
.d-ficha-tag,.d-aviso-tag{display:inline-block;background:#4d9e4a;color:#fff;font-weight:900;font-size:12.5px;padding:3px 10px;border-radius:9px;margin-bottom:6px}
.d-aviso-tag{background:#3f8fd0}
.d-ficha h3,.d-aviso h3{margin:2px 0 8px;font-size:20px;color:#3a2a1a}
.d-ficha h3 i,.d-aviso h3 i{font-weight:600;font-size:15px;color:#7a6a52}
.d-ficha p,.d-aviso p{margin:0 0 7px;font-size:15px;line-height:1.35}
.d-ficha-cultivo b,.d-aviso-porque b{color:#b5632a}
.d-aviso-iucn{font-size:12.5px;color:#7a6a52;font-style:italic}
.d-ficha-ok{margin-top:6px;background:#3a2a1a;color:#fff;border:none;border-radius:11px;padding:9px 16px;font-weight:800;font-size:15px;cursor:pointer}
.d-fin{text-align:center}
.d-fin h2{margin:0 0 8px;font-size:26px}
.d-fin--gano h2{color:#3d8b3a}
.d-fin--perdio h2{color:#c14a2c}
.d-fin-puntaje{font-size:22px;font-weight:900;color:#b5632a;margin:8px 0 14px}
.d-fin-salir{margin-top:9px;background:none;border:none;color:#7a6a52;font-weight:800;font-size:14px;text-decoration:underline;cursor:pointer}
.d-toast{position:absolute;bottom:120px;left:50%;transform:translateX(-50%);z-index:25;background:rgba(180,60,30,.94);color:#fff;font-weight:800;font-size:14px;padding:9px 16px;border-radius:13px;max-width:80%;text-align:center;box-shadow:0 5px 0 rgba(0,0,0,.3);animation:d-aparece .16s ease}

/* controles táctiles */
.d-controles{position:relative;z-index:22;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 16px 16px;background:linear-gradient(rgba(0,0,0,0),rgba(0,0,0,.28))}
.d-mov,.d-acciones{display:flex;gap:10px}
.d-ctrl{width:60px;height:60px;border-radius:50%;border:3px solid rgba(255,255,255,.65);background:rgba(0,0,0,.4);color:#fff;font-size:24px;font-weight:900;cursor:pointer;display:grid;place-items:center;touch-action:none}
.d-ctrl:active{transform:scale(.92);background:rgba(0,0,0,.6)}
.d-ctrl--fire{width:74px;height:74px;background:rgba(224,83,43,.85);border-color:#fff;font-size:30px}
.d-ctrl--jump{background:rgba(60,140,90,.82)}
.d-ctrl--sec{width:52px;height:52px;font-size:20px}

/* animaciones */
@keyframes d-wobble{0%,100%{transform:rotate(-4deg)}50%{transform:rotate(4deg)}}
.d-wobble{animation:d-wobble 1.1s ease-in-out infinite;transform-origin:50% 70%}
@keyframes d-parpadeo{0%{opacity:1}50%{opacity:.35}100%{opacity:1}}
@keyframes d-brinco{0%{transform:translateY(0)}40%{transform:translateY(-22px)}100%{transform:translateY(0)}}
@keyframes d-aparece{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
.d-root[data-rm="1"] .d-wobble{animation:none}
.d-root[data-rm="1"] .d-jugador[data-inv="1"]{animation:none;opacity:.6}
.d-root[data-rm="1"] .d-rehen--libre{animation:none}
.d-root[data-rm="1"] .d-overlay,.d-root[data-rm="1"] .d-toast{animation:none}
@media (max-width:700px){.d-hud{padding-left:120px}.d-titulo{font-size:24px}}
@media (prefers-reduced-motion:reduce){.d-wobble{animation:none}.d-jugador[data-inv="1"]{animation:none;opacity:.6}}
</style>`;
