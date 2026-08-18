// ── campesinosV.js — LA PAREJA DE SOMBRERO NEGRO, ELENCO DE LA FINCA ────────
//
// De dónde salen. En el mundo de la botica y la caña
// (`src/mockups/MundoBoticaCana3D.jsx`, `PaneleroSVG`) hay un panelero
// rubber-hose: sombrero aguadeño ENCALADO (`ROPA.sombrero = '#f0e7d0'`), bigote
// y sonrisa de quien conoce el punto. El operador lo miró y le vio otra cosa
// —le gustó el accidente— y pidió guardarlo aparte con el sombrero **negro** y
// la cara «un tris» más marcada. De ahí `campesinoV`. Y de ahí su pareja,
// `campesinaV`, que NO es él con falda: es la otra mitad del mismo trabajo.
//
// ⚠️ ESTE MÓDULO NO TOCA EL MUNDO DE LA CAÑA. El panelero sigue igual, con su
// sombrero claro, en su trapiche. Esto es elenco NUEVO: se guardó aparte, tal
// como se pidió, y de aquí lo toma el valle.
//
// ── QUÉ COMPARTEN Y QUÉ NO (que se lean PAREJA, no clones) ──────────────────
// COMPARTEN — y es lo único que comparten: el sombrero negro de ala ancha, la
//   ceja fina arqueada, los ojos redondos y la sonrisa ancha. Eso basta para
//   que a 40 px se lea «son los dos de la misma casa».
// NO COMPARTEN nada más:
//   · ÉL   — alto y recto, pantalón y botas planas, guantes claros, bigote fino
//            en punta y perilla, cinta de sombrero oscura, trabaja con UN brazo
//            que barre grande (el gesto del mecedor de la paila, heredado).
//   · ELLA — 5% más baja y de centro bajo, ruana corta de índigo con guarda de
//            maíz sobre falda de faena, pantaneras verdes, manos DESNUDAS,
//            trenza larga que late con el trabajo, cinta de cochinilla, arete y
//            lunar. Trabaja de rodilla flexionada: la faena le pasa por el
//            CUERPO (squash & stretch), no por el brazo.
// O sea: él balancea, ella se agacha. Se distinguen de espaldas.
//
// ── CÓMO SE DIBUJAN (framework-free a propósito) ────────────────────────────
// `svgCampesinoV(faena, u)` / `svgCampesinaV(faena, u)` devuelven una CADENA
// SVG y nada más — ni three, ni DOM, ni React. Así el mismo dibujo sirve en el
// valle vanilla (acá abajo, horneado a sprite) y en cualquier mockup R3F que lo
// quiera como billboard `Html`, sin duplicar arte. `u` es la fase del ciclo de
// trabajo (0..1); la faena decide qué hace el cuerpo en esa fase.
//
// ── CÓMO SE MUEVEN EN 3D ────────────────────────────────────────────────────
// `crearCampesinoV()` hornea las `CUADROS` fases de una faena en UN atlas
// horizontal (canvas 2D) y lo cuelga de un `THREE.Sprite` — billboard, 1 draw
// call por personaje, animado moviendo `offset.x` de la textura. Rubber-hose se
// anima a pocos cuadros por segundo: no es una limitación, es el vocabulario.
// El atlas se hornea PEREZOSO y se cachea por `personaje:faena`, así una sesión
// nunca paga más de un puñado de horneadas.
//
// GOTCHA que costó encontrar: el filtro lineal muerde el cuadro vecino en el
// borde del atlas. Por eso cada celda lleva `CANAL` px de gotera transparente y
// el `offset/repeat` se calcula sobre la celda, no sobre el cuadro.
// GOTCHA 2: el ala NEGRA sobre la línea de tinta (`#241a10`) desaparece — el
// contorno y el negro son casi el mismo valor. Por eso el sombrero lleva filo
// claro (`sombreroLuz`): sin él la silueta se come el ala contra la ladera.
import * as THREE from 'three';

// ── el lienzo ───────────────────────────────────────────────────────────────
const W = 128, H = 158;          // viewBox del dibujo (pies en y≈153)
const PISO = 153;                // la línea de suelo dentro del viewBox
export const CUADROS = 10;       // fases horneadas por faena
const RASTER = 1.5;              // px de textura por unidad de viewBox
const CANAL = 2;                 // gotera entre celdas del atlas

// ── la paleta ───────────────────────────────────────────────────────────────
// Acentos textiles de la paleta madre del valle (cochinilla, índigo, maíz)
// sobre la tinta rubber-hose. Cero hex suelto fuera de esta tabla.
const T = {
  tinta: '#241a10',          // la línea de la casa
  piel: '#c98f62',
  pielElla: '#bb8256',
  // ⚠️ El ala va casi a NEGRO PURO y no a un «negro bonito» (#1d1a17, que era
  // lo primero que salió). Medido contra el gradeo del valle
  // (`lib3d/post/gradeoFinal.js`: gamma 0,62 + piso de negro 0,082): ese
  // #1d1a17 salía en pantalla a ~80/255 —GRIS RATÓN— y encima al mismo valor
  // que la línea de tinta, así que el sombrero se comía el contorno de la
  // cabeza. Con #0d0c0b sale a ~57/255, la tinta a ~88 y el filo a ~170: tres
  // escalones limpios. En el valle NADA es más negro que 21/255; el sombrero
  // tiene que pelear por ser lo más oscuro del cuadro.
  sombrero: '#0d0c0b',       // el ala ancha NEGRA
  sombreroLuz: '#6b6157',    // el filo que salva la silueta (ver GOTCHA 2)
  cinta: '#312b26',          // la cinta de él: oscura, apenas un escalón
  cintaElla: '#d1382b',      // cochinilla: la cinta es de ella
  camisa: '#f4ead2',
  pantalon: '#4a3a2c',
  falda: '#8a4a38',
  ruana: '#33305c',          // índigo
  guarda: '#f4c542',         // maíz
  guante: '#fdf6e3',
  bota: '#2b2620',
  botaElla: '#3f5c47',       // pantaneras
  madera: '#a5804e',
  maderaOsc: '#7a5a38',
  metal: '#8e939b',
  canasto: '#b98a4e',
  hoja: '#4f8f4a',
  hoja2: '#3f6d35',
  grano: '#e6c76a',
  agua: '#5aa0c4',
};

const TAU = Math.PI * 2;
const sen = (u, f = 0) => Math.sin(u * TAU + f);
const r2 = (n) => Math.round(n * 100) / 100;

// ═══════════════════════════════════════════════════════════════════════════
//  LAS FAENAS — el trabajo del mundo donde están
// ═══════════════════════════════════════════════════════════════════════════
// Cada faena declara CÓMO se mueve el cuerpo y QUÉ tiene en la mano. El valle
// le pide una faena por mundo (ver `elementos.js`): en el corral atiende, en la
// biofábrica revuelve, en los bancales recoge. El personaje no sabe dónde está
// —eso lo sabe el valle— pero sí sabe hacer el trabajo.
//
// Convención de ángulos: `rotate()` de SVG es HORARIO (y crece hacia abajo).
// Sobre el hombro, NEGATIVO levanta la herramienta y POSITIVO la baja al suelo.
export const FAENAS = {
  // revuelve la pila / la paila: el barrido grande del mecedor. Es el gesto
  // que el personaje trae puesto del trapiche — su faena madre.
  revolver: {
    nombre: 'revuelve', ciclo: 1.45, herramienta: 'mecedor',
    brazo: (u) => 2 + 19 * sen(u),
    lean: (u) => 4 + 4.6 * sen(u, -0.7),
    bob: (u) => 1.5 * Math.abs(sen(u)),
  },
  // atiende el corral: el balde de maíz, el brazo que reparte y el grano que cae.
  atender: {
    nombre: 'atiende', ciclo: 1.15, herramienta: 'balde',
    brazo: (u) => 2 + 11 * sen(u),
    lean: (u) => 2.6 + 2.2 * sen(u, 0.9),
    bob: (u) => 1.6 * Math.abs(sen(u, 0.4)),
  },
  // recoge en el surco: el cuerpo se dobla, la mano baja al pie de la mata y
  // sube al canasto. Acá la faena la hace el TRONCO, no el brazo.
  recoger: {
    nombre: 'recoge', ciclo: 1.9, herramienta: 'manojo', suelo: 'canasto',
    brazo: (u) => 16 + 20 * sen(u, -0.9),
    lean: (u) => 15 + 11 * sen(u, -0.5),
    bob: (u) => 2.2 * Math.abs(sen(u, -0.5)),
  },
  // azadonea: levantar despacio y clavar rápido. La asimetría ES el golpe —
  // con un seno puro parece que rema, no que trabaja.
  azadonear: {
    nombre: 'azadonea', ciclo: 1.6, herramienta: 'azadon',
    brazo: (u) => (u < 0.62
      ? lerp(24, -46, suave(u / 0.62))
      : lerp(-46, 24, golpe((u - 0.62) / 0.38))),
    lean: (u) => (u < 0.62 ? lerp(4, 13, suave(u / 0.62)) : lerp(13, 4, golpe((u - 0.62) / 0.38))),
    bob: (u) => (u < 0.62 ? 0 : 2.4 * golpe((u - 0.62) / 0.38)),
  },
  // acomoda: alza el canasto del suelo al hombro y lo vuelve a bajar.
  acomodar: {
    nombre: 'acomoda', ciclo: 2.1, herramienta: 'canastoAlzado',
    brazo: (u) => lerp(26, -34, vaiven(u)),
    lean: (u) => lerp(9, -3, vaiven(u)),
    bob: (u) => 1.8 * Math.sin(vaiven(u) * Math.PI),
  },
};
export const FAENA_POR_DEFECTO = 'revolver';

function lerp(a, b, t) { return a + (b - a) * t; }
function suave(k) { const t = Math.min(Math.max(k, 0), 1); return t * t * (3 - 2 * t); }
function golpe(k) { const t = Math.min(Math.max(k, 0), 1); return t * t; }      // acelera
function vaiven(u) { return 0.5 - 0.5 * Math.cos(u * TAU); }                    // sube y baja

// ═══════════════════════════════════════════════════════════════════════════
//  LA CARA — lo único que los dos comparten
// ═══════════════════════════════════════════════════════════════════════════
// Ceja fina arqueada, ojo redondo y la sonrisa ancha del que conoce el punto.
// Nada más: la boca y los ojos son los de siempre del rubber-hose de la casa.
// Todo va en FRACCIONES del radio para que la cara aguante cualquier alzada sin
// re-dibujarla — la primera pasada tenía las medidas clavadas en píxeles y al
// agrandar la cabeza los ojos se quedaron de niño.
function cara(cx, cy, r, piel) {
  const P = (fx, fy) => `${r2(cx + fx * r)} ${r2(cy + fy * r)}`;
  return `
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="${piel}" stroke="${T.tinta}" stroke-width="2.7"/>
    <path d="M${P(-0.64, -0.40)} Q${P(-0.36, -0.64)} ${P(-0.11, -0.46)}"
      stroke="${T.tinta}" stroke-width="1.9" fill="none" stroke-linecap="round"/>
    <path d="M${P(0.11, -0.46)} Q${P(0.36, -0.64)} ${P(0.64, -0.40)}"
      stroke="${T.tinta}" stroke-width="1.9" fill="none" stroke-linecap="round"/>
    <circle cx="${r2(cx - 0.35 * r)}" cy="${r2(cy - 0.10 * r)}" r="${r2(0.155 * r)}" fill="${T.tinta}"/>
    <circle cx="${r2(cx + 0.35 * r)}" cy="${r2(cy - 0.10 * r)}" r="${r2(0.155 * r)}" fill="${T.tinta}"/>
    <path d="M${P(-0.40, 0.44)} Q${P(0, 0.80)} ${P(0.40, 0.44)}"
      stroke="${T.tinta}" stroke-width="2.3" fill="none" stroke-linecap="round"/>`;
}

// El bigote fino en punta y la perilla: la marca de él, y de nadie más.
// Van CONTENIDOS dentro del círculo de la cara (0,58 r de vuelo) — un bigote que
// se sale de la cara ya no es de un campesino, es de otra cosa.
//
// ⚠️ Corregido tras mirar la hoja de contacto: en la primera pasada las puntas
// subían hasta el alto del ojo y el bigote quedaba pegado a la boca — las dos
// curvas se leían como DOS SONRISAS y la cara se volvía un garabato. Ahora el
// bigote se queda entre la nariz y el labio (0,04 a 0,26 r) y la boca bajó a
// 0,44 r: entre los dos queda aire, y cada trazo dice lo que es.
function bigoteYperilla(cx, cy, r) {
  const P = (fx, fy) => `${r2(cx + fx * r)} ${r2(cy + fy * r)}`;
  const ala = (s) => `<path d="M${P(0, 0.26)} C${P(s * 0.26, 0.31)} ${P(s * 0.48, 0.22)} ${P(s * 0.58, 0.04)}`
    + ` C${P(s * 0.44, 0.15)} ${P(s * 0.23, 0.19)} ${P(0, 0.15)} Z" fill="${T.tinta}"/>`;
  return `
    <path d="M${P(0, -0.02)} Q${P(0.20, 0.13)} ${P(-0.02, 0.19)}"
      stroke="${T.tinta}" stroke-width="1.6" fill="none" stroke-linecap="round"/>
    ${ala(-1)}${ala(1)}
    <path d="M${P(-0.23, 0.84)} Q${P(0, 0.94)} ${P(0.23, 0.84)} Q${P(0.10, 1.28)} ${P(0, 1.38)}
      Q${P(-0.10, 1.28)} ${P(-0.23, 0.84)} Z" fill="${T.tinta}"/>`;
}

// El sombrero negro de ala ancha. `cinta` es de cada quien.
// El filo claro NO es adorno: sin él el ala se funde con la línea de tinta y
// con la ladera, y la silueta —que es todo lo que se lee a 40 px— se pierde.
function sombrero(cx, cyAla, rxAla, ryAla, altoCopa, cinta) {
  const cy0 = cyAla - altoCopa;
  const ax = rxAla * 0.52;
  return `
    <path d="M${cx - ax} ${cyAla} Q${cx - ax - 1} ${cy0} ${cx} ${cy0} Q${cx + ax + 1} ${cy0} ${cx + ax} ${cyAla} Z"
      fill="${T.sombrero}" stroke="${T.sombreroLuz}" stroke-width="1.7"/>
    <ellipse cx="${cx}" cy="${cyAla}" rx="${rxAla}" ry="${ryAla}"
      fill="${T.sombrero}" stroke="${T.sombreroLuz}" stroke-width="1.7"/>
    <rect x="${cx - ax}" y="${cyAla - altoCopa * 0.36}" width="${ax * 2}" height="${altoCopa * 0.27}" fill="${cinta}"/>
    <path d="M${cx - ax * 0.74} ${cyAla - altoCopa * 0.52} Q${cx - ax * 0.66} ${cy0 + altoCopa * 0.22} ${cx - ax * 0.24} ${cy0 + 2.4}"
      stroke="${T.sombreroLuz}" stroke-width="1.4" fill="none" opacity="0.38" stroke-linecap="round"/>`;
}

// ═══════════════════════════════════════════════════════════════════════════
//  LAS HERRAMIENTAS — se dibujan colgando de la mano, en reposo
// ═══════════════════════════════════════════════════════════════════════════
// Todas viven DENTRO del grupo del brazo, así que giran con él sobre el hombro.
// La mano está en (93,80) para él y en (90,83) para ella; el resto se acomoda.
// Los largos están medidos para que en el extremo del giro la punta siga dentro
// del viewBox: una herramienta que se sale se recorta y el cuadro parpadea.
function herramienta(id, hx, hy, mano) {
  const garra = mano === 'guante'
    ? `<circle cx="${hx}" cy="${hy + 2}" r="6.6" fill="${T.guante}" stroke="${T.tinta}" stroke-width="2.2"/>`
    : `<circle cx="${hx}" cy="${hy + 2}" r="6.2" fill="${T.pielElla}" stroke="${T.tinta}" stroke-width="2.2"/>`;
  switch (id) {
    case 'mecedor':      // el palo largo con su paleta: el gesto de la paila
      return `
        <line x1="${hx + 2}" y1="${hy - 4}" x2="${hx - 47}" y2="${hy + 50}" stroke="${T.tinta}" stroke-width="7.5" stroke-linecap="round"/>
        <line x1="${hx + 2}" y1="${hy - 4}" x2="${hx - 47}" y2="${hy + 50}" stroke="${T.madera}" stroke-width="4.2" stroke-linecap="round"/>
        <ellipse cx="${hx - 50}" cy="${hy + 54}" rx="11.5" ry="6.8" transform="rotate(-47 ${hx - 50} ${hy + 54})"
          fill="${T.madera}" stroke="${T.tinta}" stroke-width="1.8"/>
        ${garra}`;
    case 'balde':        // el balde de maíz y el grano cayendo
      return `
        <line x1="${hx}" y1="${hy - 2}" x2="${hx + 4}" y2="${hy + 11}" stroke="${T.tinta}" stroke-width="2.6" stroke-linecap="round"/>
        <path d="M${hx - 6} ${hy + 11} L${hx + 15} ${hy + 11} L${hx + 12} ${hy + 29} L${hx - 3} ${hy + 29} Z"
          fill="${T.metal}" stroke="${T.tinta}" stroke-width="2.1"/>
        <path d="M${hx - 7} ${hy + 11} L${hx + 16} ${hy + 11}" stroke="${T.tinta}" stroke-width="2.6" stroke-linecap="round"/>
        <circle cx="${hx + 3}" cy="${hy + 35}" r="1.8" fill="${T.grano}"/>
        <circle cx="${hx + 9}" cy="${hy + 42}" r="1.5" fill="${T.grano}"/>
        <circle cx="${hx - 1}" cy="${hy + 48}" r="1.6" fill="${T.grano}"/>
        <circle cx="${hx + 7}" cy="${hy + 55}" r="1.4" fill="${T.grano}"/>
        <circle cx="${hx + 1}" cy="${hy + 62}" r="1.5" fill="${T.grano}"/>
        <circle cx="${hx + 8}" cy="${hy + 68}" r="1.3" fill="${T.grano}"/>
        ${garra}`;
    case 'manojo':       // el puño de hojas recién arrancado
      return `
        ${garra}
        <path d="M${hx + 1} ${hy + 8} Q${hx - 4} ${hy + 18} ${hx - 2} ${hy + 27}" stroke="${T.hoja}" stroke-width="2.8" fill="none" stroke-linecap="round"/>
        <path d="M${hx + 4} ${hy + 8} Q${hx + 6} ${hy + 19} ${hx + 3} ${hy + 29}" stroke="${T.hoja2}" stroke-width="2.8" fill="none" stroke-linecap="round"/>
        <path d="M${hx + 6} ${hy + 7} Q${hx + 13} ${hy + 15} ${hx + 12} ${hy + 24}" stroke="${T.hoja}" stroke-width="2.6" fill="none" stroke-linecap="round"/>
        <circle cx="${hx - 2}" cy="${hy + 29}" r="2.6" fill="${T.grano}"/>`;
    case 'azadon':       // el azadón: cabo y pala, para clavar
      return `
        <line x1="${hx + 3}" y1="${hy - 6}" x2="${hx - 40}" y2="${hy + 42}" stroke="${T.tinta}" stroke-width="7" stroke-linecap="round"/>
        <line x1="${hx + 3}" y1="${hy - 6}" x2="${hx - 40}" y2="${hy + 42}" stroke="${T.maderaOsc}" stroke-width="4" stroke-linecap="round"/>
        <path d="M${hx - 36} ${hy + 44} L${hx - 50} ${hy + 40} L${hx - 55} ${hy + 52} L${hx - 40} ${hy + 55} Z"
          fill="${T.metal}" stroke="${T.tinta}" stroke-width="2"/>
        ${garra}`;
    case 'canastoAlzado': // el canasto que sube al hombro, con su carga
      return `
        <path d="M${hx - 15} ${hy + 6} Q${hx} ${hy + 1} ${hx + 15} ${hy + 6} L${hx + 11} ${hy + 25} Q${hx} ${hy + 30} ${hx - 11} ${hy + 25} Z"
          fill="${T.canasto}" stroke="${T.tinta}" stroke-width="2.2"/>
        <path d="M${hx - 13} ${hy + 14} Q${hx} ${hy + 19} ${hx + 13} ${hy + 14}" stroke="${T.tinta}" stroke-width="1.5" fill="none"/>
        <circle cx="${hx - 6}" cy="${hy + 3}" r="3.6" fill="${T.hoja}"/>
        <circle cx="${hx + 1}" cy="${hy + 1}" r="3.9" fill="${T.grano}"/>
        <circle cx="${hx + 8}" cy="${hy + 3.5}" r="3.4" fill="${T.hoja2}"/>
        <path d="M${hx - 15} ${hy + 6} Q${hx - 20} ${hy - 2} ${hx - 13} ${hy - 6}" stroke="${T.tinta}" stroke-width="2.4" fill="none"/>
        ${garra}`;
    default:
      return garra;
  }
}

// Lo que queda EN EL SUELO cuando la faena lo pide (canasto de la cosecha).
// Va detrás de todo y no se mueve: es utilería, no personaje.
function utileriaSuelo(id, x) {
  if (id !== 'canasto') return '';
  return `
    <path d="M${x - 17} ${PISO - 26} Q${x} ${PISO - 32} ${x + 17} ${PISO - 26} L${x + 13} ${PISO - 3} Q${x} ${PISO + 3} ${x - 13} ${PISO - 3} Z"
      fill="${T.canasto}" stroke="${T.tinta}" stroke-width="2.3"/>
    <path d="M${x - 15} ${PISO - 15} Q${x} ${PISO - 9} ${x + 15} ${PISO - 15}" stroke="${T.tinta}" stroke-width="1.6" fill="none"/>
    <circle cx="${x - 7}" cy="${PISO - 28}" r="4.2" fill="${T.hoja}"/>
    <circle cx="${x + 1}" cy="${PISO - 31}" r="4.6" fill="${T.grano}"/>
    <circle cx="${x + 9}" cy="${PISO - 28}" r="4.0" fill="${T.hoja2}"/>`;
}

function envoltura(cuerpo, escala = 1) {
  const tr = escala === 1 ? '' : ` transform="translate(64 ${PISO}) scale(${escala}) translate(-64 ${-PISO})"`;
  // La sombra de contacto va DENTRO del dibujo, no en la escena: un billboard
  // sin sombra flota sobre el pasto por más que la posición sea exacta. Es el
  // truco viejo del 2D dentro del 3D y aguanta hasta que la cámara se pone a
  // plomo — que en este valle no pasa (el pivote está topado en 620).
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" fill="none">`
    + `<ellipse cx="61" cy="${PISO - 1}" rx="27" ry="5.2" fill="#12160e" opacity="0.26"/>`
    + `<g${tr}>${cuerpo}</g></svg>`;
}

// ═══════════════════════════════════════════════════════════════════════════
//  ÉL — alto, recto, el brazo que barre grande
// ═══════════════════════════════════════════════════════════════════════════
export function svgCampesinoV(faenaId = FAENA_POR_DEFECTO, u = 0) {
  const F = FAENAS[faenaId] || FAENAS[FAENA_POR_DEFECTO];
  const a = r2(F.brazo(u)), lean = r2(F.lean(u)), bob = r2(F.bob(u));
  const CX = 60, CY = 38, R = 15.2;               // la cabeza: 1/5 de la alzada
  const HOMBRO = [75, 60], MANO = [93, 80];       // pivote del brazo y la mano

  // Las piernas NO se doblan con el tronco: el que se dobla es él, desde la
  // cintura. Por eso van fuera del grupo que rota (pivote de cadera 60,100).
  const patas = `
    <line x1="53" y1="112" x2="49" y2="142" stroke="${T.pantalon}" stroke-width="11" stroke-linecap="round"/>
    <line x1="68" y1="112" x2="72" y2="142" stroke="${T.pantalon}" stroke-width="11" stroke-linecap="round"/>
    <ellipse cx="46" cy="${PISO - 5}" rx="10" ry="5.2" fill="${T.bota}"/>
    <ellipse cx="75" cy="${PISO - 5}" rx="10" ry="5.2" fill="${T.bota}"/>`;

  const brazo = `
    <g transform="rotate(${a} ${HOMBRO[0]} ${HOMBRO[1]})">
      <path d="M69 63 Q81 69 ${MANO[0] - 2} ${MANO[1] - 4}" stroke="${T.tinta}" stroke-width="7" fill="none" stroke-linecap="round"/>
      ${herramienta(F.herramienta, MANO[0], MANO[1], 'guante')}
    </g>`;

  const tronco = `
    ${brazo}
    <path d="M45 57 Q60 49 75 57 L77 92 Q60 98 43 92 Z" fill="${T.camisa}" stroke="${T.tinta}" stroke-width="2.7"/>
    <path d="M43 89 L77 89 L76 116 Q60 121 44 116 Z" fill="${T.pantalon}" stroke="${T.tinta}" stroke-width="2.4"/>
    <rect x="43" y="87" width="34" height="5.4" rx="1.6" fill="#3a2a1c"/>
    <rect x="57" y="86.6" width="6.6" height="6.2" rx="1.4" fill="${T.guarda}" stroke="${T.tinta}" stroke-width="1.2"/>
    <path d="M46 64 Q30 74 39 88" stroke="${T.tinta}" stroke-width="7" fill="none" stroke-linecap="round"/>
    <circle cx="40" cy="90" r="6.6" fill="${T.guante}" stroke="${T.tinta}" stroke-width="2.3"/>
    <path d="M${CX - 10.5} 57 Q${CX} 67 ${CX + 10.5} 57 Q${CX + 3.6} 53.6 ${CX} 53.6 Q${CX - 3.6} 53.6 ${CX - 10.5} 57 Z"
      fill="${T.cintaElla}" stroke="${T.tinta}" stroke-width="1.6"/>
    ${cara(CX, CY, R, T.piel)}
    ${bigoteYperilla(CX, CY, R)}
    ${sombrero(CX, 19.5, 31, 6.9, 16.5, T.cinta)}`;

  return envoltura(`
    ${utileriaSuelo(F.suelo, 100)}
    <g transform="translate(0 ${bob})">
      ${patas}
      <g transform="rotate(${lean} 60 100)">${tronco}</g>
    </g>`);
}

// ═══════════════════════════════════════════════════════════════════════════
//  ELLA — más baja y de centro bajo; la faena le pasa por el cuerpo
// ═══════════════════════════════════════════════════════════════════════════
// Su motor es otro: donde él balancea el brazo, ella FLEXIONA. El `squash` que
// sale del `bob` de la faena le baja el cuerpo entero (rodilla y cadera), y la
// trenza va con retardo — es lo que hace que se lea que empuja con el peso y no
// con el hombro. Mismo trabajo, otro oficio del cuerpo.
export function svgCampesinaV(faenaId = FAENA_POR_DEFECTO, u = 0) {
  const F = FAENAS[faenaId] || FAENAS[FAENA_POR_DEFECTO];
  const a = r2(F.brazo(u) * 0.72), lean = r2(F.lean(u) * 0.85);
  const flex = F.bob(u) / 2.4;                       // 0..1: cuánto se agacha
  const sy = r2(1 - 0.055 * flex), sx = r2(1 + 0.035 * flex);
  const trenza = r2(-5 - 14 * flex + a * 0.22);      // la trenza va con retardo
  const CX = 60, CY = 40, R = 14.4;
  const HOMBRO = [73, 62], MANO = [90, 83];

  const patas = `
    <line x1="54" y1="116" x2="51" y2="136" stroke="${T.pielElla}" stroke-width="9" stroke-linecap="round"/>
    <line x1="67" y1="116" x2="70" y2="136" stroke="${T.pielElla}" stroke-width="9" stroke-linecap="round"/>
    <path d="M45 130 L57 130 L56 ${PISO - 4} L46 ${PISO - 4} Z" fill="${T.botaElla}" stroke="${T.tinta}" stroke-width="2"/>
    <path d="M64 130 L76 130 L77 ${PISO - 4} L67 ${PISO - 4} Z" fill="${T.botaElla}" stroke="${T.tinta}" stroke-width="2"/>
    <ellipse cx="50" cy="${PISO - 4}" rx="8.6" ry="4.6" fill="${T.tinta}"/>
    <ellipse cx="73" cy="${PISO - 4}" rx="8.6" ry="4.6" fill="${T.tinta}"/>`;

  const brazo = `
    <g transform="rotate(${a} ${HOMBRO[0]} ${HOMBRO[1]})">
      <path d="M68 65 Q78 71 ${MANO[0] - 2} ${MANO[1] - 4}" stroke="${T.tinta}" stroke-width="6.4" fill="none" stroke-linecap="round"/>
      ${herramienta(F.herramienta, MANO[0], MANO[1], 'mano')}
    </g>`;

  const tronco = `
    <path d="M${CX - 12} ${CY + 3} Q${CX - 24} ${CY + 24} ${CX - 18} ${CY + 46}"
      stroke="${T.tinta}" stroke-width="6" fill="none" stroke-linecap="round"
      transform="rotate(${trenza} ${CX - 12} ${CY + 3})"/>
    ${brazo}
    <path d="M43 99 L77 99 L85 128 Q60 137 35 128 Z" fill="${T.falda}" stroke="${T.tinta}" stroke-width="2.5"/>
    <path d="M37 121 Q60 130 83 121" stroke="${T.guarda}" stroke-width="3.4" fill="none"/>
    <path d="M45 60 Q60 52 75 60 L81 101 Q60 110 39 101 Z" fill="${T.ruana}" stroke="${T.tinta}" stroke-width="2.7"/>
    <path d="M41 92 Q60 100 79 92" stroke="${T.guarda}" stroke-width="3.6" fill="none"/>
    <path d="M60 60 L60 78" stroke="${T.tinta}" stroke-width="2"/>
    <path d="M46 68 Q32 77 40 90" stroke="${T.tinta}" stroke-width="6.4" fill="none" stroke-linecap="round"/>
    <circle cx="41" cy="92" r="6.1" fill="${T.pielElla}" stroke="${T.tinta}" stroke-width="2.2"/>
    ${cara(CX, CY, R, T.pielElla)}
    <circle cx="${r2(CX - 0.92 * R)}" cy="${r2(CY + 0.32 * R)}" r="2" fill="${T.guarda}" stroke="${T.tinta}" stroke-width="1"/>
    <circle cx="${r2(CX + 0.92 * R)}" cy="${r2(CY + 0.32 * R)}" r="2" fill="${T.guarda}" stroke="${T.tinta}" stroke-width="1"/>
    <circle cx="${r2(CX + 0.62 * R)}" cy="${r2(CY + 0.17 * R)}" r="1.25" fill="${T.tinta}"/>
    ${sombrero(CX, 22, 29, 6.5, 15.5, T.cintaElla)}`;

  return envoltura(`
    ${utileriaSuelo(F.suelo, 98)}
    <g transform="translate(64 ${PISO}) scale(${sx} ${sy}) translate(-64 ${-PISO})">
      ${patas}
      <g transform="rotate(${lean} 60 104)">${tronco}</g>
    </g>`, 0.945);      // 5,5% más baja que él, medida desde la línea de suelo
}

export const DIBUJOS = { campesinoV: svgCampesinoV, campesinaV: svgCampesinaV };

// ═══════════════════════════════════════════════════════════════════════════
//  EL HORNO — de cadena SVG a sprite animado
// ═══════════════════════════════════════════════════════════════════════════
const _cache = new Map();       // 'campesinoV:recoger' → THREE.CanvasTexture

function cargarSVG(svg, w, h) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.width = w; img.height = h;
    img.onload = () => res(img);
    img.onerror = () => rej(new Error('campesinosV: el SVG no rasterizó'));
    // `encodeURIComponent` es obligatorio: los `#` de los colores parten el
    // data-URI a la mitad y el navegador carga medio dibujo sin quejarse.
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  });
}

async function hornear(personaje, faenaId) {
  const clave = personaje + ':' + faenaId;
  if (_cache.has(clave)) return _cache.get(clave);
  const dibujo = DIBUJOS[personaje] || svgCampesinoV;
  const fw = Math.round(W * RASTER), fh = Math.round(H * RASTER);
  const celda = fw + CANAL * 2;
  const cv = document.createElement('canvas');
  cv.width = celda * CUADROS; cv.height = fh + CANAL * 2;
  const ctx = cv.getContext('2d');
  for (let i = 0; i < CUADROS; i++) {
    const img = await cargarSVG(dibujo(faenaId, i / CUADROS), fw, fh);
    ctx.drawImage(img, i * celda + CANAL, CANAL, fw, fh);
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  // el `repeat/offset` se calcula sobre la CELDA (cuadro + gotera), que es lo
  // que impide que el filtro lineal muerda el cuadro vecino.
  tex.repeat.set(fw / cv.width, fh / cv.height);
  tex.userData.celda = celda / cv.width;
  tex.userData.gotera = [CANAL / cv.width, CANAL / cv.height];
  _cache.set(clave, tex);
  return tex;
}

/**
 * Un personaje listo para colgar de cualquier escena three.
 * @param {'campesinoV'|'campesinaV'} personaje
 * @param {number} altoU  su alzada en unidades de mundo (los pies en position.y)
 */
export function crearCampesinoV(personaje = 'campesinoV', altoU = 1) {
  // `toneMapped:false` NO es un capricho: medido en el valle, el AgX del
  // renderer (exposición 1,55) le levantaba el negro del ala hasta dejarla
  // GRIS RATÓN. Un personaje rubber-hose es un DIBUJO, no una superficie
  // iluminada: sus tintas son las que son. La niebla sí lo alcanza (`fog:true`)
  // para que a distancia entre en la atmósfera con todo lo demás, y el gradeo
  // fílmico del composer lo cubre igual que al resto del cuadro.
  const mat = new THREE.SpriteMaterial({
    transparent: true, depthWrite: false, depthTest: true, fog: true,
    toneMapped: false, opacity: 0,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.name = personaje;
  sprite.center.set(0.5, 0);            // el ancla en los PIES, no en el ombligo
  sprite.visible = false;
  sprite.frustumCulled = false;
  const anchoU = altoU * (W / H);
  sprite.scale.set(anchoU, altoU, 1);

  let faena = null, tex = null, pidiendo = null, u = 0;

  function ponerFaena(id) {
    if (faena === id) return;
    faena = id;
    const mio = hornear(personaje, id);
    pidiendo = mio;
    mio.then((tx) => {
      if (pidiendo !== mio) return;      // llegó tarde: ya pidieron otra faena
      tex = tx; mat.map = tx; mat.needsUpdate = true;
    }).catch(() => { /* sin textura el sprite se queda invisible: no revienta */ });
  }

  function update(t) {
    if (!tex) return;
    const F = FAENAS[faena] || FAENAS[FAENA_POR_DEFECTO];
    u = (t / F.ciclo) % 1;
    const i = Math.floor(u * CUADROS) % CUADROS;
    tex.offset.set(i * tex.userData.celda + tex.userData.gotera[0], tex.userData.gotera[1]);
  }

  function escalar(k) {
    sprite.scale.set(anchoU * k, altoU * k, 1);
  }

  return {
    sprite, ponerFaena, update, escalar, altoU,
    // el ancla del sprite está en el BORDE de abordo, no en la suela: el dibujo
    // deja un margen bajo la bota. Sin restarlo, el personaje flota — y flota
    // MÁS cuanto más lo agranda el piso angular, que es cuando más se nota.
    padPies: (H - PISO + 0.2) / H,
    faena: () => faena,
    listo: () => !!tex,
    liberar: () => { mat.dispose(); },   // las texturas son de cache: no se tiran
  };
}
