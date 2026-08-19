// ── minimapa.js — LA LÁMINA DE BOLSILLO DEL VALLE (F9 · fase 1 de navegación)
//
// «Dónde estoy + los mundos cercanos, chiquito, no invasivo.»
//
// QUÉ ES: un minimapa en la esquina superior derecha (la inferior derecha ya
// la ocupa #guiaSel y la inferior izquierda el #hud). No es un radar de
// videojuego genérico: es una LÁMINA — el valle dibujado como plancha de
// Humboldt, con tintas hipsométricas por piso, curvas de nivel cada 100 m,
// la quebrada, brújula y escala. El norte visual de los MUNDOS/paisajes es
// Humboldt/Ghibli (el rubber-hose es solo para personajes), y un mapa es el
// objeto Humboldt por excelencia.
//
// DE DÓNDE SALE CADA TRAZO (nada inventado, todo del mismo dato que el valle):
//   · el relieve     → `height(x,z)` de terrain.js: el MISMO DEM del terreno.
//     Si mañana cambia el terreno, la lámina se redibuja distinta sola.
//   · los mundos     → `MUNDOS` de catalogo.js (la fuente única de los nueve)
//     + la clave `guatoc.lugares.v1` de localStorage: si el usuario MOVIÓ un
//     mojón con «Mover lo mío», el minimapa lo muestra donde él lo puso.
//     El mundo que habita la pared (el tiempo) se resuelve con `pathX`/
//     `facePos` de cliff.js — la MISMA piel que lo cuelga en 3D.
//   · la quebrada    → descenso de gradiente SOBRE el DEM desde el páramo
//     (-40,-1160): el agua baja sola por el labio, el salto y el cauce hasta
//     la salida. El eje páramo → Chorrera → quebrada → salida queda dibujado
//     porque el terreno lo dibuja, no porque se haya calcado.
//   · la brújula     → `BRG` de terrain.js (311,91°): arriba en el mapa es
//     −Z (La Chorrera), así que el norte cae 48° a la derecha. Un mapa con el
//     norte de mentira no es un mapa.
//   · la escala      → `K` (0,6 u/m): la barra dice 500 m y MIDE 500 m.
//
// AUTOCONTENIDO A PROPÓSITO (anti-tangle): main.js solo lo importa y le pasa
// {camera, controls}. Dibuja en su propio canvas 2D y corre su propio rAF —
// no toca el loop del valle, ni sus capas, ni su composer. El costo por
// frame es un drawImage + ~15 trazos, a 30 fps: invisible para la GPU.
//
// INTERACCIÓN (fase 1, mínima):
//   · pasar por encima de un punto → el nombre del mundo.
//   · tocar un punto → la cámara MIRA ese mundo (el mismo gesto que la
//     flecha de borde de mundos.js: mover el target, no teleportar).
//   · el pie de la lámina dice cuál es el mundo más cercano y a cuántos
//     METROS reales está (u / K) — «dónde estoy», dicho en campesino.
//   · botón ▾ para plegarla a una sola barrita. `?minimapa=0` la apaga.

import { MUNDOS } from './catalogo.js';
import { height, K, elevOf, BRG, SITE_X, SITE_Z, clamp, channelAxis } from './terrain.js';
import { pathX, facePos } from './cliff.js';

// ── EL ENCUADRE DE LA LÁMINA ────────────────────────────────────────────────
// Los mismos límites del pan de main.js (x ±850, z −1150..330), con el techo
// corrido a −1210 porque el páramo vive en z=−1160 y un minimapa que corta el
// páramo corta la lección (de ahí arriba baja el agua).
const X0 = -850, X1 = 850;
const Z0 = -1210, Z1 = 330;
const W = 168;                                        // px lógicos de la lámina
const H = Math.round(W * (Z1 - Z0) / (X1 - X0));      // 152 — misma proporción
const S = 2;                                          // supersampleo (nitidez)
const LS_POS = 'guatoc.lugares.v1';                   // la MISMA clave de mundos.js
const LS_PLEGADO = 'guatoc.minimapa.v1';

const px = (x) => (x - X0) / (X1 - X0) * W;
const pz = (z) => (z - Z0) / (Z1 - Z0) * H;

// ── LAS TINTAS DE LA LÁMINA (pisos por msnm, medidos en el propio valle) ────
// La salida del valle mide 2318 (vender), la casa 2503, el labio del páramo
// 3089. Verde de potrero abajo → monte → el verde se seca a pajonal → la
// niebla pálida del páramo. Son las tintas planas de una plancha, no fotos —
// frescas (Ghibli), no camufladas: el valle es un lugar vivo, no un teatro
// de operaciones. Encima va PERSPECTIVA AÉREA: lo alto se va a niebla, que
// es exactamente lo que hace la lámina del Chimborazo (y lo que hace el
// valle real visto desde la casa).
const PISOS = [
  [2320, [0xac, 0xc4, 0x76]],   // potrero del fondo del valle
  [2460, [0x93, 0xb8, 0x68]],
  [2600, [0x74, 0xa8, 0x5b]],   // monte de ladera
  [2760, [0x5e, 0x97, 0x53]],   // bosque alto
  [2880, [0x93, 0xa2, 0x62]],   // subpáramo: se seca
  [2990, [0xb8, 0xb6, 0x7d]],   // pajonal
  [3080, [0xba, 0xd2, 0xc4]],   // páramo: niebla
  [3220, [0xb2, 0xd8, 0xd0]],
];
const ROCA = [0x92, 0x86, 0x74];                      // el farallón desnudo
const NIEBLA = [0xd2, 0xe0, 0xe2];                    // adonde se van los altos
function tinta(e) {
  if (e <= PISOS[0][0]) return PISOS[0][1];
  for (let i = 1; i < PISOS.length; i++) {
    if (e <= PISOS[i][0]) {
      const [e0, c0] = PISOS[i - 1], [e1, c1] = PISOS[i];
      const t = (e - e0) / (e1 - e0);
      return [c0[0] + (c1[0] - c0[0]) * t, c0[1] + (c1[1] - c0[1]) * t, c0[2] + (c1[2] - c0[2]) * t];
    }
  }
  return PISOS[PISOS.length - 1][1];
}

export function makeMinimapa({ camera, controls } = {}) {
  const qs = new URLSearchParams(location.search);
  if (qs.get('minimapa') === '0') {
    return { listo: () => false, puestos: () => [], el: null };
  }

  // ── el mueble ─────────────────────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
  #mmapa{position:fixed;top:calc(12px + env(safe-area-inset-top,0px));right:12px;z-index:7;
    width:182px;background:linear-gradient(160deg,#f2e9d2,#e6dabb);
    border:1px solid #b9a77c;border-radius:8px;
    box-shadow:0 3px 14px rgba(0,0,0,.38),inset 0 0 0 1px rgba(255,255,255,.35);
    font-family:Georgia,'Times New Roman',serif;color:#57452a;
    user-select:none;-webkit-user-select:none}
  #mmapa .mmTit{display:flex;align-items:center;gap:6px;padding:3px 6px 2px;
    font-size:.55rem;letter-spacing:.13em;font-variant:small-caps;white-space:nowrap}
  #mmapa .mmRaya{flex:1;height:1px;background:rgba(107,90,58,.45)}
  #mmapa .mmBtn{border:0;background:none;color:#57452a;font:inherit;font-size:.62rem;
    cursor:pointer;padding:0 2px;opacity:.75;line-height:1}
  #mmapa .mmBtn:hover{opacity:1}
  #mmC{display:block;width:168px;height:152px;margin:0 auto;border-radius:3px}
  #mmCerca{font-size:.56rem;font-style:italic;text-align:center;padding:1px 6px 4px;
    opacity:.85;min-height:1em;font-variant:normal;letter-spacing:.02em}
  #mmTip{position:absolute;pointer-events:none;display:none;white-space:nowrap;
    background:rgba(28,24,14,.88);color:#f3ecd8;font-size:.6rem;padding:2px 7px;
    border-radius:4px;transform:translate(-50%,-130%);
    font-family:system-ui,sans-serif;z-index:2}
  @media (max-width:700px){
    #mmapa{width:140px;top:calc(10px + env(safe-area-inset-top,0px));right:10px}
    #mmC{width:126px;height:114px}
  }`;
  document.head.appendChild(style);

  const cont = document.createElement('div');
  cont.id = 'mmapa';
  cont.innerHTML =
    `<div class="mmTit"><span class="mmRaya"></span><span>Valle de Guatoc</span>` +
    `<span class="mmRaya"></span><button class="mmBtn mmExp" title="Ver todo por pisos térmicos (vista global)">⤢</button><button class="mmBtn" title="Plegar el mapa">▾</button></div>` +
    `<div id="mmCuerpo"><canvas id="mmC" width="${W * S}" height="${H * S}"></canvas>` +
    `<div id="mmCerca"></div></div><div id="mmTip"></div>`;
  document.body.appendChild(cont);

  const canvas = cont.querySelector('#mmC');
  const ctx = canvas.getContext('2d');
  const cuerpo = cont.querySelector('#mmCuerpo');
  const cercaEl = cont.querySelector('#mmCerca');
  const tip = cont.querySelector('#mmTip');
  const btn = cont.querySelector('.mmBtn');

  // plegado persistente: quien lo cierra una vez lo encuentra cerrado
  let plegado = false;
  try { plegado = localStorage.getItem(LS_PLEGADO) === '0'; } catch (e) { /* privado */ }
  function aplicarPliegue() {
    cuerpo.style.display = plegado ? 'none' : '';
    btn.textContent = plegado ? '▸' : '▾';
    btn.title = plegado ? 'Abrir el mapa' : 'Plegar el mapa';
  }
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    plegado = !plegado;
    try { localStorage.setItem(LS_PLEGADO, plegado ? '0' : '1'); } catch (e2) { /* privado */ }
    aplicarPliegue();
  });

  // ⤢ el zoom-out del minimapa: abre la VISTA GLOBAL por pisos térmicos (nav de 3 zooms)
  const expBtn = cont.querySelector('.mmExp');
  if (expBtn) expBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    location.search = '?vista=global';
  });
  aplicarPliegue();

  // ── LA PLANCHA DE FONDO (se graba UNA vez, por tandas para no trabar) ─────
  // 336×304 muestras de `height()` son ~102k llamadas: de un solo golpe son
  // ~200 ms de tirón en plena entrada cinematográfica. Se muestrea por tandas
  // de ≤8 ms por frame — la lámina «se revela» en el primer segundo, como un
  // grabado que emerge, y el vuelo no pierde un frame.
  const gw = W * S, gh = H * S;
  const bg = document.createElement('canvas'); bg.width = gw; bg.height = gh;
  const bgx = bg.getContext('2d');
  const elev = new Float32Array(gw * gh);
  const celdaM = ((X1 - X0) / gw) / K;      // metros reales por celda (~8,4 m)
  let fila = 0, bgListo = false;

  function muestrear() {
    const t0 = performance.now();
    while (fila < gh && performance.now() - t0 < 8) {
      const z = Z0 + (fila + 0.5) / gh * (Z1 - Z0);
      for (let i = 0; i < gw; i++) {
        const x = X0 + (i + 0.5) / gw * (X1 - X0);
        elev[fila * gw + i] = elevOf(height(x, z));
      }
      fila++;
    }
    if (fila < gh) { requestAnimationFrame(muestrear); return; }
    grabarPlancha();
    bgListo = true;
  }
  requestAnimationFrame(muestrear);

  function grabarPlancha() {
    const img = bgx.createImageData(gw, gh);
    const d = img.data;
    for (let j = 0; j < gh; j++) {
      const jm = Math.max(j - 1, 0) * gw, jp = Math.min(j + 1, gh - 1) * gw, j0 = j * gw;
      for (let i = 0; i < gw; i++) {
        const im = Math.max(i - 1, 0), ip = Math.min(i + 1, gw - 1);
        const e = elev[j0 + i];
        const dhdx = (elev[j0 + ip] - elev[j0 + im]) / (2 * celdaM);
        const dhdz = (elev[jp + i] - elev[jm + i]) / (2 * celdaM);
        let c = tinta(e);
        // el farallón: donde la pendiente pasa de ~50° la tinta cede a la roca
        const ang = Math.atan(Math.hypot(dhdx, dhdz));
        const rk = clamp((ang - 0.87) / 0.5, 0, 1);
        // sombreado de plancha: luz del NO (arriba-izquierda), como en las
        // láminas — las laderas que miran al NO se aclaran, las otras se hunden
        const br = clamp(1 + (dhdx + dhdz) * 0.55, 0.74, 1.2);
        let r = (c[0] + (ROCA[0] - c[0]) * rk) * br;
        let g = (c[1] + (ROCA[1] - c[1]) * rk) * br;
        let b = (c[2] + (ROCA[2] - c[2]) * rk) * br;
        // curva de nivel cada 100 m: cambia la banda contra el vecino → línea.
        // Suave en el llano, marcada en la roca — en el escarpe se apilan
        // solas, el grabado denso de una pared real. Una curva pareja en todo
        // el mapa era RUIDO (medido en la primera plancha): la línea tiene que
        // susurrar donde el terreno susurra.
        const bd = Math.floor(e / 100);
        if (bd !== Math.floor(elev[j0 + ip] / 100) || bd !== Math.floor(elev[jp + i] / 100)) {
          const ck = 0.16 + 0.3 * rk;
          r = r * (1 - ck) + 70 * ck; g = g * (1 - ck) + 64 * ck; b = b * (1 - ck) + 44 * ck;
        }
        // perspectiva aérea: por encima del monte, la tinta cede a la niebla.
        // Bajo=el aquí cálido y nítido, alto=el allá pálido — el mapa se LEE
        // en profundidad de un vistazo, como el valle desde el domo.
        const nb = clamp((e - 2620) / 620, 0, 1) * 0.42;
        r += (NIEBLA[0] - r) * nb; g += (NIEBLA[1] - g) * nb; b += (NIEBLA[2] - b) * nb;
        const o = (j0 + i) * 4;
        d[o] = r; d[o + 1] = g; d[o + 2] = b; d[o + 3] = 255;
      }
    }
    bgx.putImageData(img, 0, 0);

    // ── los adornos de la plancha (vector, encima del grabado) ──
    bgx.setTransform(S, 0, 0, S, 0, 0);

    // LA QUEBRADA, por descenso de gradiente sobre el DEM. Paso 9 u, 16 rumbos.
    function bajar(x, z, tope) {
      const pts = [];
      let quieto = 0;
      for (let n = 0; n < tope; n++) {
        pts.push([x, z]);
        let bx2 = x, bz2 = z, bh = height(x, z);
        for (let k = 0; k < 16; k++) {
          const a = (k / 16) * Math.PI * 2;
          const nx = x + Math.cos(a) * 9, nz = z + Math.sin(a) * 9;
          if (nx < X0 + 8 || nx > X1 - 8 || nz < Z0 + 8 || nz > Z1 - 8) continue;
          const h = height(nx, nz);
          if (h < bh) { bh = h; bx2 = nx; bz2 = nz; }
        }
        if (bx2 === x && bz2 === z) break;               // fondo: no hay a dónde bajar
        if (height(x, z) - bh < 0.02) { quieto++; if (quieto > 8) break; } else quieto = 0;
        x = bx2; z = bz2;
      }
      return pts;
    }
    // tres tramos. El descenso ciego desde el páramo se SONDEÓ y no sirve:
    // se va al oeste del canal y muere en una hoya del DEM a z=−837 (medido
    // con la sonda, no supuesto). El cauce de la meseta no hay que buscarlo:
    // es `channelAxis(z)` — la MISMA función que lo TALLA en el terreno
    // (terrain.js). Aguas abajo del pie sí manda el descenso, retomado desde
    // el fondo de cauce MEDIDO del catálogo: pie (0,−680) → (20,−620) →
    // (70,−560), porque la poza del pie es un mínimo local que lo ahoga.
    const meseta = [];
    for (let mz = -1150; mz <= -700; mz += 12) meseta.push([channelAxis(mz), mz]);
    meseta.push([channelAxis(-700), -700]);
    const tramos = [
      meseta,                                            // páramo → el labio, por el canal tallado
      [[0, -680], [20, -620], ...bajar(70, -560, 200)],  // la poza rebosa → aguas abajo
    ];
    for (const [ancho, colr] of [[2.1, 'rgba(36,86,118,.45)'], [1.1, 'rgba(88,164,208,.95)']]) {
      for (const agua of tramos) {
        if (agua.length < 3) continue;
        bgx.beginPath();
        bgx.moveTo(px(agua[0][0]), pz(agua[0][1]));
        for (let n = 1; n < agua.length; n++) bgx.lineTo(px(agua[n][0]), pz(agua[n][1]));
        bgx.lineWidth = ancho; bgx.strokeStyle = colr;
        bgx.lineJoin = 'round'; bgx.lineCap = 'round';
        bgx.stroke();
      }
    }
    // LA CASCADA EN BLANCO — el landmark. En un mapa de Nintendo el hito
    // mayor no es un punto más: se VE. En PLANTA una caída casi vertical es
    // una muesca corta (la pared se echa atrás ~18 u en 590 m — cliff.js),
    // así que la verdad a esta escala es un destello blanco del labio
    // (channelAxis en −700) al pie medido (0,−680): La Chorrera brilla en
    // la lámina igual que brilla en el valle, y mide lo que mide.
    for (const [ancho, colr] of [[3.6, 'rgba(255,255,255,.35)'], [2, 'rgba(250,253,255,.97)']]) {
      bgx.beginPath();
      bgx.moveTo(px(channelAxis(-700)), pz(-700));
      bgx.lineTo(px(0), pz(-678));
      bgx.lineWidth = ancho; bgx.strokeStyle = colr; bgx.lineCap = 'round';
      bgx.stroke();
    }

    // el pie de La Chorrera (0,−680, medido en catalogo.js) con su rótulo de
    // lámina: blanco del agua + letra italica chiquita con halo de papel
    const cwx = px(0), cwy = pz(-680);
    bgx.fillStyle = 'rgba(240,250,255,.95)';
    bgx.beginPath(); bgx.arc(cwx, cwy, 1.6, 0, Math.PI * 2); bgx.fill();
    bgx.font = 'italic 6.5px Georgia,serif';
    bgx.textAlign = 'left'; bgx.textBaseline = 'middle';
    bgx.lineWidth = 2; bgx.strokeStyle = 'rgba(240,232,210,.65)';
    bgx.strokeText('La Chorrera', cwx + 5, cwy - 2);
    bgx.fillStyle = 'rgba(50,40,25,.9)';
    bgx.fillText('La Chorrera', cwx + 5, cwy - 2);

    // LA BRÚJULA: arriba es −Z (rumbo ${BRG}° = La Chorrera), así que el norte
    // cae 48,09° a la derecha. Se dibuja donde cae de verdad — el detalle que
    // separa una lámina de un adorno.
    const rot = (360 - BRG) * Math.PI / 180;             // horario desde «arriba»
    const nx2 = Math.sin(rot), ny2 = -Math.cos(rot);
    const bxc = 14, byc = 15, br2 = 7;
    bgx.beginPath(); bgx.arc(bxc, byc, br2, 0, Math.PI * 2);
    bgx.fillStyle = 'rgba(242,233,210,.55)'; bgx.fill();
    bgx.lineWidth = .7; bgx.strokeStyle = 'rgba(90,74,48,.75)'; bgx.stroke();
    bgx.beginPath();
    bgx.moveTo(bxc - nx2 * br2 * .7, byc - ny2 * br2 * .7);
    bgx.lineTo(bxc + nx2 * br2 * .7, byc + ny2 * br2 * .7);
    bgx.strokeStyle = 'rgba(140,60,40,.9)'; bgx.lineWidth = 1; bgx.stroke();
    bgx.font = 'bold 5.5px Georgia,serif'; bgx.textAlign = 'center'; bgx.textBaseline = 'middle';
    bgx.fillStyle = 'rgba(90,30,20,.95)';
    bgx.fillText('N', bxc + nx2 * (br2 + 3.6), byc + ny2 * (br2 + 3.6));

    // LA ESCALA: 500 m reales = 500·K u = ese ancho en px. Mide lo que dice.
    const barra = 500 * K * (W / (X1 - X0));
    const sx = 8, sy = H - 7;
    bgx.lineWidth = 1; bgx.strokeStyle = 'rgba(60,48,30,.85)';
    bgx.beginPath();
    bgx.moveTo(sx, sy - 2); bgx.lineTo(sx, sy);
    bgx.lineTo(sx + barra, sy); bgx.lineTo(sx + barra, sy - 2);
    bgx.stroke();
    bgx.font = '6px Georgia,serif'; bgx.textAlign = 'center'; bgx.textBaseline = 'bottom';
    bgx.fillStyle = 'rgba(60,48,30,.9)';
    bgx.fillText('500 m', sx + barra / 2, sy - 1.5);

    // niebla de cima: un velo que baja del borde alto de la lámina — el
    // páramo del mapa se pierde en nube como el de verdad (y como el fondo
    // de una pantalla de BOTW: profundidad, no decoración)
    const velo = bgx.createLinearGradient(0, 0, 0, H * 0.3);
    velo.addColorStop(0, 'rgba(222,232,235,.4)');
    velo.addColorStop(1, 'rgba(222,232,235,0)');
    bgx.fillStyle = velo; bgx.fillRect(0, 0, W, H * 0.3);

    // viñeta: una sombra apenas en los bordes ASIENTA el grabado en el papel
    // (sin ella el mapa «flota» sobre el mueble — regla dura: nada suelto)
    const vin = bgx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.44, W / 2, H / 2, Math.max(W, H) * 0.72);
    vin.addColorStop(0, 'rgba(70,55,30,0)');
    vin.addColorStop(1, 'rgba(70,55,30,.2)');
    bgx.fillStyle = vin; bgx.fillRect(0, 0, W, H);

    // marco fino interior + esquinas de plancha, como el filete de un grabado
    bgx.lineWidth = .75; bgx.strokeStyle = 'rgba(90,74,48,.55)';
    bgx.strokeRect(.6, .6, W - 1.2, H - 1.2);
    bgx.lineWidth = 1.1; bgx.strokeStyle = 'rgba(90,74,48,.85)';
    for (const [ex2, ey2, sx2, sy2] of [[2, 2, 1, 1], [W - 2, 2, -1, 1], [2, H - 2, 1, -1], [W - 2, H - 2, -1, -1]]) {
      bgx.beginPath();
      bgx.moveTo(ex2 + sx2 * 5, ey2); bgx.lineTo(ex2, ey2); bgx.lineTo(ex2, ey2 + sy2 * 5);
      bgx.stroke();
    }
    bgx.setTransform(1, 0, 0, 1, 0, 0);
  }

  // ── LOS PUESTOS DE LOS NUEVE (los mismos datos que el valle) ──────────────
  function leerGuardado() {
    try { return JSON.parse(localStorage.getItem(LS_POS) || '{}'); } catch (e) { return {}; }
  }
  function calcularPuestos() {
    const g = leerGuardado();
    return MUNDOS.map((M) => {
      let x, y, z;
      if (M.soporte && M.soporte.tipo === 'pared') {
        // el mundo que habita la pared: mismo punto que cuelga mundos.js
        x = pathX(M.soporte.t) + (M.soporte.dx || 0);
        const f = facePos(x, M.soporte.t);
        y = f.y; z = f.z;
      } else {
        const p = g[M.id] ? { x: g[M.id][0], z: g[M.id][1] } : { x: M.x, z: M.z };
        x = p.x; z = p.z; y = height(x, z) + 8;
      }
      return { M, x, y, z };
    });
  }
  let puestos = calcularPuestos();
  // si el usuario mueve un mojón («Mover lo mío») el mapa lo alcanza en ≤3 s
  setInterval(() => { puestos = calcularPuestos(); }, 3000);

  // ── interacción: pasar → nombre · tocar → mirar ese mundo ────────────────
  let sobre = null;
  function puestoEn(ev) {
    const r = canvas.getBoundingClientRect();
    const mx = (ev.clientX - r.left) * (W / r.width);
    const my = (ev.clientY - r.top) * (H / r.height);
    let mejor = null, dm = 9;                            // radio de toque: 9 px
    for (const p of puestos) {
      const d = Math.hypot(px(p.x) - mx, pz(p.z) - my);
      if (d < dm) { dm = d; mejor = p; }
    }
    return mejor;
  }
  canvas.addEventListener('pointermove', (ev) => {
    sobre = puestoEn(ev);
    canvas.style.cursor = sobre ? 'pointer' : 'crosshair';
    if (sobre) {
      const r = canvas.getBoundingClientRect(), rc = cont.getBoundingClientRect();
      tip.textContent = `${sobre.M.emoji} ${sobre.M.nombre}`;
      tip.style.left = (r.left - rc.left + px(sobre.x) * (r.width / W)) + 'px';
      tip.style.top = (r.top - rc.top + pz(sobre.z) * (r.height / H)) + 'px';
      tip.style.display = 'block';
    } else tip.style.display = 'none';
  });
  canvas.addEventListener('pointerleave', () => { sobre = null; tip.style.display = 'none'; });
  canvas.addEventListener('click', (ev) => {
    const p = puestoEn(ev);
    // el MISMO gesto que la flecha de borde (main.js onMirar): girar la
    // mirada hacia el mundo, sin teleportar a nadie
    if (p && controls && controls.enabled) {
      controls.target.set(p.x, p.y, p.z);
      controls.update();
    }
  });

  // ── el pulso: 30 fps le sobran a un mapa ──────────────────────────────────
  // un Vector3 sin importar three: position ES un Vector3, su constructor sirve
  const _v = camera ? new (camera.position.constructor)() : null;
  let ultimo = 0, cercaTxt = '', cercaT = 0;

  function dibujar(ts) {
    requestAnimationFrame(dibujar);
    if (plegado || document.visibilityState !== 'visible') return;
    if (ts - ultimo < 33) return;
    ultimo = ts;

    ctx.setTransform(S, 0, 0, S, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (bgListo) ctx.drawImage(bg, 0, 0, W, H);
    else {
      // mientras la plancha se graba: papel y una línea de avance
      ctx.fillStyle = '#e9dfc4'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(107,90,58,.5)';
      ctx.fillRect(10, H / 2, (W - 20) * (fila / gh), 1.5);
    }

    // la casa (el sitio 0,0): el techito de donde todo se mide, con su halo —
    // el mismo lenguaje de silueta que los nueve puntos
    const hx = px(SITE_X), hy = pz(SITE_Z);
    ctx.beginPath(); ctx.arc(hx, hy, 4.6, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(250,247,238,.6)'; ctx.fill();
    ctx.fillStyle = '#fdf3da'; ctx.strokeStyle = 'rgba(60,45,25,.9)'; ctx.lineWidth = .9;
    ctx.beginPath();
    ctx.moveTo(hx - 2.6, hy + 2); ctx.lineTo(hx - 2.6, hy - .4); ctx.lineTo(hx, hy - 2.8);
    ctx.lineTo(hx + 2.6, hy - .4); ctx.lineTo(hx + 2.6, hy + 2); ctx.closePath();
    ctx.fill(); ctx.stroke();

    // los nueve: punto lleno = mundo con puerta, anillo = visible pero sin
    // ruta (la misma honestidad de los mojones apagados). Cada uno en SU color
    // de catálogo — a este tamaño llega la mancha de color, como a 1,4 km. El
    // halo blanco es la silueta: sin él, el punto se come con el monte.
    let orden = puestos;
    if (camera) {
      orden = [...puestos].sort((a, b) =>
        Math.hypot(a.x - camera.position.x, a.z - camera.position.z) -
        Math.hypot(b.x - camera.position.x, b.z - camera.position.z));
    }
    for (let i = orden.length - 1; i >= 0; i--) {
      const p = orden[i];
      const X = px(p.x), Y = pz(p.z);
      const activo = !!p.M.url;
      ctx.beginPath(); ctx.arc(X, Y, 3.9, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(250,247,238,.85)'; ctx.fill();
      ctx.beginPath(); ctx.arc(X, Y, 2.9, 0, Math.PI * 2);
      if (activo) {
        ctx.fillStyle = p.M.color; ctx.fill();
        ctx.strokeStyle = 'rgba(30,24,12,.8)'; ctx.lineWidth = .9; ctx.stroke();
      } else {
        ctx.fillStyle = 'rgba(244,236,214,.8)'; ctx.fill();
        ctx.strokeStyle = p.M.color; ctx.lineWidth = 1.4; ctx.stroke();
      }
    }
    // los TRES más cercanos llevan su seña en una placa CON TALLO — anclada
    // a su punto, no flotando (regla dura). Si dos placas se pisan (el
    // corrillo del corral y el abono), la segunda busca otro lado y si no
    // hay campo, cede: una seña ilegible es peor que ninguna.
    if (camera && bgListo) {
      const puestas = [];
      for (let i = 0; i < Math.min(3, orden.length); i++) {
        const p = orden[i];
        const X = px(p.x), Y = pz(p.z);
        let bX = null, bY = null;
        for (const [dx2, dy2] of [[0, -8.5], [0, 8.5], [9, -4.5], [-9, -4.5]]) {
          const tx2 = X + dx2, ty2 = Y + dy2;
          if (tx2 < 8 || tx2 > W - 8 || ty2 < 8 || ty2 > H - 8) continue;
          if (puestas.some(([qx, qy]) => Math.hypot(qx - tx2, qy - ty2) < 11.5)) continue;
          bX = tx2; bY = ty2; break;
        }
        if (bX === null) continue;
        puestas.push([bX, bY]);
        ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(bX, bY);
        ctx.strokeStyle = 'rgba(60,45,25,.5)'; ctx.lineWidth = .8; ctx.stroke();
        ctx.beginPath(); ctx.arc(bX, bY, 5.6, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(252,248,236,.92)'; ctx.fill();
        ctx.strokeStyle = 'rgba(107,90,58,.65)'; ctx.lineWidth = .7; ctx.stroke();
        ctx.font = '7.5px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = '#333';
        ctx.fillText(p.M.emoji, bX, bY + 0.5);
      }
    }
    // dónde estoy — ENCIMA de todo, como el jugador de BOTW: la cuña de
    // mirada + una FLECHA dorada con su aura. Se encuentra con el rabillo
    // del ojo, no buscándola. La cuña se desvanece con la distancia — es
    // mirada, no reflector. Fuera de límites (el vuelo de entrada) se
    // sujeta al borde: señala, no miente.
    if (camera) {
      camera.getWorldDirection(_v);
      const cx2 = clamp(px(camera.position.x), 4, W - 4);
      const cy2 = clamp(pz(camera.position.z), 4, H - 4);
      const ang = Math.atan2(_v.z, _v.x);
      const vf = camera.fov * Math.PI / 180;
      const half = clamp(Math.atan(Math.tan(vf / 2) * camera.aspect), 0.17, 0.62);
      const L = 21;
      const cono = ctx.createRadialGradient(cx2, cy2, 1.5, cx2, cy2, L);
      cono.addColorStop(0, 'rgba(255,214,120,.5)');
      cono.addColorStop(1, 'rgba(255,214,120,0)');
      ctx.beginPath();
      ctx.moveTo(cx2, cy2);
      ctx.arc(cx2, cy2, L, ang - half, ang + half);
      ctx.closePath();
      ctx.fillStyle = cono; ctx.fill();
      const aura = ctx.createRadialGradient(cx2, cy2, 1, cx2, cy2, 9);
      aura.addColorStop(0, 'rgba(255,222,140,.55)');
      aura.addColorStop(1, 'rgba(255,222,140,0)');
      ctx.beginPath(); ctx.arc(cx2, cy2, 9, 0, Math.PI * 2);
      ctx.fillStyle = aura; ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx2 + Math.cos(ang) * 6.4, cy2 + Math.sin(ang) * 6.4);
      ctx.lineTo(cx2 + Math.cos(ang + 2.55) * 4.6, cy2 + Math.sin(ang + 2.55) * 4.6);
      ctx.lineTo(cx2 + Math.cos(ang + Math.PI) * 1.8, cy2 + Math.sin(ang + Math.PI) * 1.8);
      ctx.lineTo(cx2 + Math.cos(ang - 2.55) * 4.6, cy2 + Math.sin(ang - 2.55) * 4.6);
      ctx.closePath();
      ctx.fillStyle = '#ffd873'; ctx.fill();
      ctx.strokeStyle = 'rgba(60,40,10,.9)'; ctx.lineWidth = 1; ctx.lineJoin = 'round'; ctx.stroke();
    }
    if (sobre) {
      ctx.beginPath(); ctx.arc(px(sobre.x), pz(sobre.z), 5.6, 0, Math.PI * 2);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.strokeStyle = 'rgba(40,30,10,.5)'; ctx.lineWidth = .6;
      ctx.beginPath(); ctx.arc(px(sobre.x), pz(sobre.z), 6.4, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // el pie: el mundo más cercano y a cuántos METROS reales (u / K)
    if (camera && ts - cercaT > 400 && orden.length) {
      cercaT = ts;
      const p = orden[0];
      const m = Math.round(Math.hypot(p.x - camera.position.x, p.z - camera.position.z) / K / 10) * 10;
      const t = `cerca: ${p.M.emoji} ${p.M.nombre} · ${m >= 1000 ? (m / 1000).toFixed(1) + ' km' : m + ' m'}`;
      if (t !== cercaTxt) { cercaTxt = t; cercaEl.textContent = t; }
    }
  }
  requestAnimationFrame(dibujar);

  return {
    listo: () => bgListo,
    puestos: () => puestos.map((p) => ({ id: p.M.id, x: p.x, z: p.z })),
    el: cont,
  };
}
