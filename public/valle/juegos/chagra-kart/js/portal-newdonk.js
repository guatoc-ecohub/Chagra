// ── portal-newdonk.js — el paso mágico de La Chorrera ───────────────────────
// El reinicio de vuelta del mundo chorrera es un cruce 2D→3D estilo túnel de
// New Donk (Mario Odyssey), el norte de Chagra. Anatomía (adaptada de
// src/visual/mundo3d/TransicionNewDonk.jsx + TunelOdyssey.jsx del PWA):
//
//   aplane (390 ms) — overlay transparente: el 3D A LA VISTA mientras la
//       cámara aplana el FOV hacia casi-ortográfico y una viñeta abraza los
//       bordes; el kart atraviesa el velo de agua del portal.
//   mural (720 ms) — pantalla cubierta por el MURAL 2D de la garganta: la
//       chiva en silueta plana corre por la franja pintada (el interludio 2D).
//       `alCubierto` dispara al INICIO de esta fase: el main teletransporta
//       el kart a la meseta DEBAJO del mural.
//   revela (620 ms) — iris circular (clip-path) abre desde la chiva y
//       devuelve el 3D en la cima. `alFin` desmonta.
//
// CONTRATO TEMPORAL (mismo que el PWA): los callbacks los disparan timers JS
// deterministas, NUNCA `animationend`. El CSS anima con las mismas duraciones
// pero es decorativo. Cada callback corre a lo sumo UNA vez por viaje.
// Overlay DOM puro (cero THREE en la transición); el arco 3D vive aparte.

export const ND_APLANE_MS = 390;
export const ND_MURAL_MS = 720;
export const ND_REVELA_MS = 620;
export const ND_REDUCIDA_MS = 240;

// ── EL ARCO DEL PORTAL (3D, en la boca del túnel) ──────────────────────────
export function crearPortalChorrera(THREE, pista) {
  const portal = pista.chorreraPortal ?? { f: 0.868, salidaF: 0.995 };
  const grupo = new THREE.Group();
  grupo.name = 'chorrera-portal-newdonk';

  const piedra = new THREE.MeshStandardMaterial({ color: 0x262e29, roughness: 0.98, flatShading: true });
  const musgo = new THREE.MeshStandardMaterial({ color: 0x2c4a28, roughness: 1, flatShading: true });
  const brillo = new THREE.MeshStandardMaterial({
    color: 0x72d7ff, emissive: 0x72d7ff, emissiveIntensity: 1.4, roughness: 0.4,
  });
  const boca = new THREE.MeshBasicMaterial({ color: 0x04120c });

  function armarBoca(f, alto, conAnillo) {
    const q = pista.puntoEn(f);
    const g = new THREE.Group();
    const span = q.w * 1.06;
    // jambas: megalitos de roca negra apilados, inclinados hacia la vía
    for (const lado of [-1, 1]) {
      let yAc = -0.6;
      for (let b = 0; b < 3; b++) {
        const hB = alto * (0.42 - b * 0.06);
        const rB = 2.4 - b * 0.55;
        const bloque = new THREE.Mesh(new THREE.DodecahedronGeometry(rB, 0), piedra);
        bloque.scale.set(1, hB / (rB * 1.6), 1.1);
        bloque.position.set(lado * (span + 0.4 - b * 0.5), yAc + hB / 2, (b % 2 ? 0.5 : -0.4));
        bloque.rotation.set(0.1 * b, b * 1.7, -lado * 0.10 * (b + 1));
        g.add(bloque);
        yAc += hB * 0.82;
      }
      const capa = new THREE.Mesh(new THREE.SphereGeometry(1.5, 7, 5), musgo);
      capa.position.set(lado * (span - 0.6), alto - 0.5, 0);
      capa.scale.set(1.25, 0.5, 1.2);
      g.add(capa);
    }
    // dintel: una LAJA de piedra caída de través, no una viga de puente
    const dintel = new THREE.Mesh(new THREE.BoxGeometry(span * 2 + 3.4, 2.1, 3.1), piedra);
    dintel.position.set(0, alto - 0.4, 0);
    dintel.rotation.z = 0.035;
    dintel.rotation.x = -0.06;
    g.add(dintel);
    const musgoDintel = new THREE.Mesh(new THREE.SphereGeometry(span, 9, 5), musgo);
    musgoDintel.position.set(0, alto + 0.7, 0);
    musgoDintel.scale.set(1.15, 0.16, 0.55);
    musgoDintel.rotation.z = 0.035;
    g.add(musgoDintel);
    // boca oscura (el hueco del túnel se LEE aunque la roca esté a 6 m)
    const hueco = new THREE.Mesh(new THREE.PlaneGeometry(span * 2 - 0.6, alto - 0.9), boca);
    hueco.position.set(0, (alto - 0.9) / 2, -1.6);
    g.add(hueco);
    if (conAnillo) {
      // el anillo mágico: media luna emisiva bajo el dintel (pulsa en tick)
      const anillo = new THREE.Mesh(new THREE.TorusGeometry(span * 0.86, 0.16, 6, 22, Math.PI), brillo);
      anillo.position.set(0, 0.5, 0.9);
      g.add(anillo);
    }
    // plantar en el mundo: centro de vía, mirando el sentido de marcha
    g.position.set(q.x, q.y - 0.1, q.z);
    g.rotation.y = -q.hdg + Math.PI / 2; // el plano del arco cruza la vía
    return g;
  }

  const entrada = armarBoca(portal.f, 7.2, true);
  entrada.name = 'portal-entrada';
  grupo.add(entrada);
  const salida = armarBoca(portal.salidaF, 6.4, false);
  salida.name = 'portal-salida';
  grupo.add(salida);

  function tick(t) {
    brillo.emissiveIntensity = 1.15 + Math.sin(t * 2.6) * 0.45;
  }
  return { grupo, tick, portal };
}

// ── LA TRANSICIÓN NEW DONK (overlay DOM puro) ──────────────────────────────
const CSS_ND = `
.ndk { position: fixed; inset: 0; z-index: 44; overflow: hidden; pointer-events: auto; }
.ndk__vineta {
  position: absolute; inset: 0; opacity: 0;
  background: radial-gradient(118% 90% at 50% 46%, rgba(0,0,0,0) 46%, #10230f 100%);
  animation: ndkVineta var(--ndk-aplane) linear both;
}
@keyframes ndkVineta { 0% { opacity: 0; } 60% { opacity: 0.55; } 100% { opacity: 1; } }
/* mural: dos muros verdes cierran desde arriba y abajo sobre la franja 2D */
.ndk__muro { position: absolute; left: 0; right: 0; height: 34.6vh;
  background: linear-gradient(#183a17, #245222 62%, #2e6127);
  box-shadow: 0 0 42px rgba(9, 26, 9, 0.8); }
.ndk__muro--arriba { top: -0.4vh; transform: translateY(-100%); }
.ndk__muro--abajo { bottom: -0.4vh; transform: translateY(100%); }
.ndk--mural .ndk__muro { transition: transform 200ms cubic-bezier(0.3, 0.7, 0.3, 1); transform: translateY(0); }
/* la franja del mural: garganta 2D pintada (bandas de monte + cascada) */
.ndk__franja {
  position: absolute; top: 33.8vh; bottom: 33.8vh; left: 0; right: 0; opacity: 0;
  background:
    /* bruma al pie de la caída pintada */
    radial-gradient(38% 34% at 62% 96%, rgba(238, 247, 238, 0.95) 0 42%, rgba(238, 247, 238, 0) 72%),
    radial-gradient(20% 26% at 51% 88%, rgba(222, 238, 226, 0.8) 0 40%, rgba(222, 238, 226, 0) 75%),
    /* la caída grande del mural: chorros desiguales, no cortina de baño */
    linear-gradient(178deg, #f2faf1 0 8%, #e4f1e6 8% 100%) ,
    /* colinas del fondo */
    linear-gradient(105deg, rgba(20, 46, 18, 0.95) 0 14%, rgba(38, 78, 30, 0.9) 14% 30%, rgba(20, 46, 18, 0) 30%),
    linear-gradient(75deg, rgba(24, 56, 22, 0.95) 70% , rgba(46, 97, 39, 0.92) 100%),
    linear-gradient(#2c5d28, #1c3f1a);
  background-size: 100% 100%, 100% 100%, 17% 100%, 100% 100%, 100% 100%, 100% 100%;
  background-position: 0 0, 0 0, 57% 0, 0 0, 0 0, 0 0;
  background-repeat: no-repeat;
}
.ndk__franja::before {
  /* chorros hermanos, más flacos, a los lados de la caída madre */
  content: ''; position: absolute; inset: 0;
  background:
    linear-gradient(179deg, rgba(240, 250, 240, 0.9), rgba(226, 240, 228, 0.85)),
    linear-gradient(177deg, rgba(240, 250, 240, 0.85), rgba(226, 240, 228, 0.8));
  background-size: 3.2% 100%, 2.1% 100%;
  background-position: 51.5% 0, 71% 12%;
  background-repeat: no-repeat;
}
.ndk--mural .ndk__franja { opacity: 1; transition: opacity 140ms linear; }
/* la chiva plana corre el interludio 2D */
.ndk__chiva { position: absolute; top: calc(50vh - 46px); left: -160px; width: 132px; height: 92px;
  filter: drop-shadow(0 6px 8px rgba(8, 20, 8, 0.55)); }
.ndk--mural .ndk__chiva { animation: ndkChivaCorre var(--ndk-mural) linear both; }
@keyframes ndkChivaCorre {
  0% { transform: translateX(0); }
  100% { transform: translateX(calc(100vw + 320px)); }
}
.ndk__rueda { transform-origin: center; transform-box: fill-box; }
.ndk--mural .ndk__rueda { animation: ndkRueda 340ms linear infinite; }
@keyframes ndkRueda { to { transform: rotate(360deg); } }
.ndk__txt { position: absolute; left: 0; right: 0; bottom: 12vh; margin: 0; text-align: center;
  color: #f4ffe6; font: 700 clamp(14px, 2.4vw, 19px) system-ui; letter-spacing: 0.03em;
  text-shadow: 0 2px 10px rgba(16, 35, 15, 0.7); opacity: 0; }
.ndk--mural .ndk__txt { opacity: 1; transition: opacity 180ms linear; }
/* revela: iris circular sobre TODO el conjunto */
.ndk--revela { animation: ndkIris var(--ndk-revela) cubic-bezier(0.3, 0.7, 0.4, 1) both; }
@keyframes ndkIris {
  from { clip-path: circle(141% at 50% 50%); }
  to { clip-path: circle(0% at 50% 50%); }
}
.ndk--corte { background: linear-gradient(160deg, #2e6127, #10230f 70%); animation: ndkCorte var(--ndk-corte) linear both; }
@keyframes ndkCorte { 0% { opacity: 1; } 60% { opacity: 1; } 100% { opacity: 0; } }
`;

// La chiva escalera en silueta 2D (SVG inline, sin assets externos).
const SVG_CHIVA = `
<svg viewBox="0 0 132 92" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <rect x="8" y="30" width="112" height="34" rx="6" fill="#c8442c"/>
  <rect x="8" y="38" width="112" height="7" fill="#e9b63b"/>
  <rect x="8" y="49" width="112" height="6" fill="#3a7ec2"/>
  <rect x="14" y="14" width="100" height="18" rx="4" fill="#f2e6c8"/>
  <rect x="20" y="18" width="14" height="10" rx="2" fill="#2c4a36"/>
  <rect x="42" y="18" width="14" height="10" rx="2" fill="#2c4a36"/>
  <rect x="64" y="18" width="14" height="10" rx="2" fill="#2c4a36"/>
  <rect x="86" y="18" width="14" height="10" rx="2" fill="#2c4a36"/>
  <rect x="12" y="8" width="104" height="8" rx="3" fill="#7a4a24"/>
  <circle cx="96" cy="47" r="7" fill="#f6d75a"/>
  <g class="ndk__rueda"><circle cx="34" cy="70" r="13" fill="#232323"/><circle cx="34" cy="70" r="6" fill="#d8cdb0"/>
    <rect x="32.6" y="59" width="2.8" height="22" fill="#8a8a8a"/><rect x="23" y="68.6" width="22" height="2.8" fill="#8a8a8a"/></g>
  <g class="ndk__rueda"><circle cx="98" cy="70" r="13" fill="#232323"/><circle cx="98" cy="70" r="6" fill="#d8cdb0"/>
    <rect x="96.6" y="59" width="2.8" height="22" fill="#8a8a8a"/><rect x="87" y="68.6" width="22" height="2.8" fill="#8a8a8a"/></g>
</svg>`;

export function crearTransicionNewDonk() {
  let raiz = null;
  let fase = 'inactiva';
  let timers = [];
  let k = 0; // factor de aplane 0→1 para que el main doble el FOV
  const reduced = typeof matchMedia !== 'undefined'
    && matchMedia('(prefers-reduced-motion: reduce)').matches;

  function limpiar() {
    for (const t of timers) clearTimeout(t);
    timers = [];
    if (raiz) { raiz.remove(); raiz = null; }
    fase = 'inactiva';
    k = 0;
  }

  function iniciar({ alCubierto, alFin, titulo = 'La Chorrera' } = {}) {
    if (fase !== 'inactiva') return false;
    let hechoCubierto = false;
    let hechoFin = false;
    raiz = document.createElement('div');
    raiz.className = 'ndk';
    raiz.setAttribute('role', 'status');
    raiz.setAttribute('data-testid', 'ndk');
    raiz.style.setProperty('--ndk-aplane', `${ND_APLANE_MS}ms`);
    raiz.style.setProperty('--ndk-mural', `${ND_MURAL_MS}ms`);
    raiz.style.setProperty('--ndk-revela', `${ND_REVELA_MS}ms`);
    raiz.style.setProperty('--ndk-corte', `${ND_REDUCIDA_MS}ms`);
    if (reduced) {
      raiz.classList.add('ndk--corte');
      raiz.innerHTML = `<style>${CSS_ND}</style><p class="ndk__txt" style="opacity:1">${titulo}</p>`;
      document.body.appendChild(raiz);
      fase = 'mural';
      timers.push(setTimeout(() => {
        if (!hechoCubierto) { hechoCubierto = true; alCubierto?.(); }
      }, 60));
      timers.push(setTimeout(() => {
        if (!hechoFin) { hechoFin = true; limpiar(); alFin?.(); }
      }, ND_REDUCIDA_MS));
      return true;
    }
    raiz.innerHTML = `<style>${CSS_ND}</style>
      <div class="ndk__vineta" aria-hidden="true"></div>
      <div class="ndk__muro ndk__muro--arriba" aria-hidden="true"></div>
      <div class="ndk__muro ndk__muro--abajo" aria-hidden="true"></div>
      <div class="ndk__franja" aria-hidden="true"></div>
      <div class="ndk__chiva" aria-hidden="true">${SVG_CHIVA}</div>
      <p class="ndk__txt">${titulo}</p>`;
    document.body.appendChild(raiz);
    fase = 'aplane';
    // timers DETERMINISTAS (contrato del PWA): nunca animationend
    timers.push(setTimeout(() => {
      fase = 'mural';
      raiz?.classList.add('ndk--mural');
      if (!hechoCubierto) { hechoCubierto = true; alCubierto?.(); }
    }, ND_APLANE_MS));
    timers.push(setTimeout(() => {
      fase = 'revela';
      raiz?.classList.add('ndk--revela');
    }, ND_APLANE_MS + ND_MURAL_MS));
    timers.push(setTimeout(() => {
      if (!hechoFin) { hechoFin = true; limpiar(); alFin?.(); }
    }, ND_APLANE_MS + ND_MURAL_MS + ND_REVELA_MS));
    return true;
  }

  function tick(dt) {
    if (fase === 'aplane') k = Math.min(1, k + dt / (ND_APLANE_MS / 1000));
    else if (fase === 'revela') k = Math.max(0, k - dt / (ND_REVELA_MS / 1000));
    else if (fase === 'mural') k = 1;
  }

  return {
    get activa() { return fase !== 'inactiva'; },
    get fase() { return fase; },
    get aplaneK() { return k; },
    iniciar,
    tick,
    destruir: limpiar,
  };
}

// ── el salto físico por el portal ──────────────────────────────────────────
// Deja al kart en la boca de salida con su velocidad; el conteo de vueltas lo
// hace la física sola: wrapFrac(salidaF − portalF) suma el progreso del túnel
// y `acum` llega a 1 justo al pasar por la meseta de la carpa.
export function saltarPortal(fisica, pista) {
  const portal = pista.chorreraPortal ?? { f: 0.868, salidaF: 0.995 };
  const q = pista.puntoEn(portal.salidaF);
  fisica.x = q.x;
  fisica.z = q.z;
  fisica.y = pista.alturaMundo(q.x, q.z) + 0.25;
  fisica.hdg = q.hdg;
  fisica.velHdg = q.hdg;
  fisica.vy = 0;
  fisica.onGround = true;
  fisica.vel = Math.max(fisica.vel, 9); // sale con impulso: nada de arrancar muerto
  // checkpoint a la salida: si algo sale mal justo después, Lakitu trae acá
  fisica.fCheck = portal.salidaF;
  fisica.chkX = q.x; fisica.chkZ = q.z; fisica.chkHdg = q.hdg;
}
