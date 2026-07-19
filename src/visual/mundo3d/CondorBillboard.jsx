/*
 * CondorBillboard — EL CÓNDOR VIVO EN CUALQUIER CIELO 3D.
 *
 * El emblema del páramo como billboard <Html> del SVG rubber-hose de la casa
 * (Condor.jsx — el SVG le gana a cualquier low-poly, decisión del operador).
 * REUTILIZABLE: cualquier escena con <Canvas> lo monta — el bosque, el valle,
 * la sierra.
 *
 * REDISEÑO ANTI-COMETA (2026-07, veredicto del operador: "parece más una
 * cometa que un cóndor"). Dos culpas y dos curas:
 *
 *  1. FORMA — el SVG era un rombo (alas-vela + cola-abanico) SIEMPRE de
 *     frente y SIEMPRE con la cabeza hacia arriba de la pantalla: colgaba
 *     como cometa. Ahora:
 *       · el SVG tiene ala-tabla con 6 primarias-dedo y cola cuadrada
 *         (Condor.jsx), y además
 *       · el billboard tiene PERFIL CAMBIANTE: la CABEZA APUNTA AL RUMBO
 *         (rotate según la velocidad proyectada a pantalla — vuela de cabeza,
 *         no cuelga), BANQUEA de verdad (rotateY = roll alrededor del eje del
 *         cuerpo, proporcional al giro observado) y se ENCARA según la cámara
 *         (rotateX por el ángulo de elevación: visto casi encima es el ave
 *         ventral plena; cerca del horizonte se escora hacia la línea con la
 *         V del diedro). Todo CSS transform 3D por ref: cero re-renders.
 *
 *  2. COMPORTAMIENTO — era decorado en órbita eterna. Ahora tiene ESTADOS
 *     propios (el espíritu de Angelita: calma/husmea/aviso/celebra → aquí
 *     posado/térmica/planeo/pasada), con la biología del Vultur gryphus:
 *     CASI NO ALETEA — planea. Máquina de fases O(1)/frame:
 *       · 'termica'   — círculos pacientes SUBIENDO (gira sin batir; sube más
 *                       rápido a mediodía, cuando el sol hace térmicas).
 *       · 'planeo'    — sale de la térmica en línea recta, largo, perdiendo
 *                       altura despacio, y re-engancha otra térmica.
 *       · 'pasada'    — RARA (cooldown de minutos): baja y cruza cerca del
 *                       centro del valle — el momento en que se ve grande.
 *                       Sale remontando con ALETAZOS pesados.
 *       · 'posado'    — en la percha (prop), alas PLEGADAS (CSS), oteando a
 *                       ratos como vigía. Al atardecer/noche se queda posado.
 *       · 'despegue'/'aterrizaje' — transiciones con aletazos de peso (los
 *                       únicos ratos en que bate: la verdad del cóndor).
 *     REACCIONA AL MUNDO: lee la franja del día (useCicloDia — three-free) y
 *     el clima por prop: con NIEBLA no está (se desvanece); de noche sin
 *     percha tampoco (duerme). Sombra opcional que corre por el terreno
 *     (prop `suelo`), +1 draw call documentado.
 *
 * Las fases se escriben como data-attrs en el WRAPPER (data-condor-fase /
 * -aleteo / -otea, mutación por ref) y el CSS de creatures.css hace el resto:
 * primarias que se abren en térmica y se planchan en planeo, alas plegadas
 * posado, aletazos pesados.
 *
 * Tier-safe / reduced-motion: sin animación queda FIJO en un punto alto del
 * cielo en la plancha ventral, digno (animated=false también congela el SVG
 * y apaga la máquina y la sombra). Android barato: un solo <Html>, matemática
 * O(1) por frame; tier 'bajo' además omite la pasada y la sombra.
 *
 * Modo legado 'cruce' (mockups): atraviesa el cielo y se pierde — intacto.
 *
 * Importa three/@react-three → montar SOLO dentro de un <Canvas>.
 */
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Vector3 } from 'three';
import { Condor } from '../creatures/index.js';
import useCicloDia from './useCicloDia.js';

const azar = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
/* Bézier cuadrática escalar (las trayectorias de pasada/despegue/aterrizaje). */
const bez = (a, b, c, p) => { const q = 1 - p; return q * q * a + 2 * q * p * b + p * p * c; };
const DEG = 180 / Math.PI;

/* Ritmo de subida en térmica por franja (m/s de mundo): el sol MANDA — el
   mediodía hierve de térmicas; al atardecer apenas sostienen. */
const SUBIDA_POR_FRANJA = {
  amanecer: 0.05, manana: 0.075, mediodia: 0.10, tarde: 0.07, atardecer: 0.04, noche: 0.04,
};

/* temporales reutilizados (cero alloc por frame) */
const _right = new Vector3();
const _up = new Vector3();

const ESTILO_CONDOR = {
  filter: 'drop-shadow(0 2px 3px rgba(25, 32, 28, 0.3))',
  pointerEvents: 'none',
  willChange: 'transform, opacity',
};

/**
 * @param {Object} props
 * @param {[number,number,number]} [props.centro=[0,11,0]] centro del vuelo (la térmica u
 *   origen del cruce). La Y es la altura de crucero.
 * @param {number} [props.radio=14]   radio de la órbita / media-luz del cruce.
 * @param {number} [props.velocidad=0.09] rad/s de la térmica (~70 s la vuelta).
 * @param {number} [props.px=64]      tamaño del SVG en px (nitidez del billboard).
 * @param {number} [props.factor=16]  distanceFactor del <Html> (escala en mundo).
 * @param {'orbita'|'cruce'} [props.modo='orbita'] 'orbita' = el cóndor VIVO
 *   (máquina de fases); 'cruce' = legado (cruza y se pierde).
 * @param {boolean} [props.animated=true] false = fijo y digno (tier bajo / RM).
 * @param {string}  [props.tier]      device-tier ('bajo' poda pasada + sombra).
 * @param {[number,number,number]|null} [props.percha=null] el filo donde se posa
 *   (opcional): habilita posado/despegue/aterrizaje y el dormidero nocturno.
 * @param {number|((x:number,z:number)=>number)|null} [props.suelo=null] Y del
 *   terreno (número o función x,z→y): habilita la SOMBRA que corre por el
 *   suelo (+1 draw call). Sin prop, sin sombra.
 * @param {string|Object|null} [props.clima=null] clima vivo de la escena
 *   (string tipo 'niebla' | objeto con .tipo/.id). Con niebla el cóndor NO
 *   está. Si es objeto se pasa también al SVG (clima→cuerpo, PERFIL_CONDOR).
 * @param {string|null} [props.franja=null] override de la franja del día
 *   (amanecer…noche). Sin prop, el cóndor lee el reloj él mismo (useCicloDia).
 */
export default function CondorBillboard({
  centro = [0, 11, 0],
  radio = 14,
  velocidad = 0.09,
  px = 64,
  factor = 16,
  modo = 'orbita',
  animated = true,
  tier,
  percha = null,
  suelo = null,
  clima = null,
  franja = null,
}) {
  const grupo = useRef(/** @type {any} */ (null));
  const capa = useRef(/** @type {HTMLDivElement|null} */ (null));
  const sombra = useRef(/** @type {any} */ (null));
  const matSombra = useRef(/** @type {any} */ (null));

  /* El reloj del valle (three-free, se refresca solo). El prop `franja` manda
     si la escena ya tiene su hora (así el cielo y el cóndor nunca disienten). */
  const { franja: franjaReloj } = useCicloDia({ reducedMotion: !animated });
  const fr = franja || franjaReloj;
  const tipoClima = typeof clima === 'string' ? clima : (clima?.tipo || clima?.id || null);
  const climaCuerpo = clima && typeof clima === 'object' ? clima : null;
  const hayNiebla = typeof tipoClima === 'string' && /niebla|neblina/.test(tipoClima);

  const st = useRef(/** @type {any} */ (null));
  if (st.current === null) {
    const anochece = fr === 'atardecer' || fr === 'noche';
    // Sin animación (RM/tier) la fase inicial es SIEMPRE la plancha en vuelo:
    // el fotograma digno. El posado inicial es sólo del cóndor vivo.
    const faseInicial = animated && percha && anochece ? 'posado' : 'termica';
    const ang = azar(0, Math.PI * 2);
    const x0 = faseInicial === 'posado' ? percha[0] : centro[0] + Math.cos(ang) * radio;
    const y0 = faseInicial === 'posado' ? percha[1] : centro[1];
    const z0 = faseInicial === 'posado' ? percha[2] : centro[2] + Math.sin(ang) * radio;
    st.current = {
      fase: faseInicial,
      hasta: azar(24, 48),          // fin de la fase actual (s de clock)
      ang,                          // ángulo sobre la térmica
      dir: Math.random() < 0.5 ? -1 : 1,
      cx: centro[0], cz: centro[2], // centro de la térmica ACTUAL (deriva)
      rOff: 0,                      // corrección de radio al re-enganchar (continuidad)
      alt: azar(-0.5, 1),           // altura sobre la Y de crucero
      x: x0, y: y0, z: z0,          // posición viva
      px: x0, py: y0, pz: z0,       // posición del frame anterior (velocidad)
      rumbo: azar(0, Math.PI * 2),  // rumbo XZ del planeo
      b0: null, b1: null, b2: null, t0: 0, dur: 1, flare: false, // trayectos bézier
      rumboScr: 0, rx: 24, roll: 0, // pose en pantalla (suavizadas)
      op: 1, opT: 1,                // opacidad (niebla / noche)
      proxPasada: azar(80, 180),
      proxOtea: 0, oteaHasta: 0, aleteaHasta: 0,
      dataFase: '', dataAleteo: '', dataOtea: '', lastTf: '', lastOp: '',
      // legado 'cruce'
      cruceActivo: false, crucePprox: azar(3, 8), cruceT0: 0, cruceDur: 14, cruceDir: 1,
      init: false,
    };
  }

  /* Re-engancha una térmica EXACTAMENTE donde está (continuidad): el centro
     nuevo queda entre el cóndor y su querencia (prop centro) — la deriva
     siempre lo trae de vuelta al valle. */
  const engancharTermica = (s, t) => {
    const dx = s.x - centro[0]; const dz = s.z - centro[2];
    const d = Math.hypot(dx, dz) || 1;
    s.cx = s.x - (dx / d) * radio;
    s.cz = s.z - (dz / d) * radio;
    s.ang = Math.atan2(s.z - s.cz, s.x - s.cx);
    s.rOff = radio - radio * (0.94 + Math.sin(t * 0.05) * 0.12); // sin salto de radio
    s.dir = Math.random() < 0.5 ? -1 : 1;
    s.alt = clamp(s.y - centro[1], -2.5, 4.5);
    s.fase = 'termica';
    s.hasta = t + azar(26, 52);
  };

  useFrame(({ clock, camera }, delta) => {
    const g = grupo.current;
    if (!g || !animated) return;
    const t = clock.getElapsedTime();
    const dt = Math.min(delta || 0.016, 0.1);
    const s = st.current;

    /* ── modo legado 'cruce' (mockups): intacto ─────────────────────────── */
    if (modo === 'cruce') {
      if (!s.cruceActivo) {
        g.visible = false;
        if (t >= s.crucePprox) {
          s.cruceActivo = true; s.cruceT0 = t;
          s.cruceDir = Math.random() < 0.5 ? -1 : 1;
          s.cruceDur = azar(13, 18);
        }
        return;
      }
      const p = (t - s.cruceT0) / s.cruceDur;
      if (p >= 1) {
        s.cruceActivo = false; s.crucePprox = t + azar(30, 75);
        g.visible = false;
        return;
      }
      g.visible = true;
      g.position.set(
        centro[0] + (-radio + 2 * radio * p) * s.cruceDir,
        centro[1] + Math.sin(p * Math.PI) * 1.6 + Math.sin(t * 0.35) * 0.3,
        centro[2] + Math.sin(p * Math.PI * 2) * 1.2,
      );
      if (capa.current) {
        const banco = (6 + Math.sin(t * 0.5) * 3) * s.cruceDir;
        capa.current.style.transform = `rotate(${banco.toFixed(1)}deg)`;
      }
      return;
    }

    /* ── EL CÓNDOR VIVO: contexto del mundo ─────────────────────────────── */
    const anochece = fr === 'atardecer' || fr === 'noche';
    const volando = s.fase === 'termica' || s.fase === 'planeo' || s.fase === 'pasada';
    // Con niebla no está; de noche sin percha, duerme fuera de escena.
    s.opT = (hayNiebla || (fr === 'noche' && !percha)) ? 0 : 1;

    // Si anochece en pleno vuelo y hay percha, baja a dormir (sin esperar fase).
    if (percha && anochece && volando && s.fase !== 'aterrizaje') {
      s.b0 = [s.x, s.y, s.z];
      s.b2 = [percha[0], percha[1], percha[2]];
      s.b1 = [(s.x + percha[0]) / 2, Math.max(s.y, percha[1]) + 1.8, (s.z + percha[2]) / 2];
      s.t0 = t; s.dur = azar(4, 5.5); s.flare = false;
      s.fase = 'aterrizaje';
    }

    /* ── máquina de fases ───────────────────────────────────────────────── */
    if (s.fase === 'termica') {
      // LA TÉRMICA: gira sin batir y SUBE — más rápido cuando el sol aprieta.
      const ritmo = anochece ? 0.7 : 1;
      s.ang += velocidad * ritmo * dt * s.dir;
      s.rOff *= 1 - Math.min(1, dt * 0.25);
      const r = radio * (0.94 + Math.sin(t * 0.05) * 0.12) + s.rOff;
      s.alt = clamp(s.alt + (SUBIDA_POR_FRANJA[fr] ?? 0.07) * dt, -2.5, 4.5);
      s.x = s.cx + Math.cos(s.ang) * r;
      s.z = s.cz + Math.sin(s.ang) * r;
      s.y = centro[1] + s.alt + Math.sin(t * 0.23) * 0.25;
      if (t >= s.hasta) {
        const puedePasada = tier !== 'bajo' && !anochece && fr !== 'amanecer' && t >= s.proxPasada && s.opT > 0;
        if (puedePasada) {
          // LA PASADA: baja y cruza cerca — el momento que corta el aliento.
          s.b0 = [s.x, s.y, s.z];
          const yBajo = centro[1] - Math.min(4.5, centro[1] * 0.42);
          s.b1 = [centro[0] + azar(-2, 2), yBajo, centro[2] + azar(-2, 2)];
          const ex = centro[0] + (centro[0] - s.x) * 0.9;
          const ez = centro[2] + (centro[2] - s.z) * 0.9;
          s.b2 = [ex, centro[1] + azar(0.5, 1.5), ez];
          s.t0 = t; s.dur = azar(8, 12); s.flare = false;
          s.proxPasada = t + azar(160, 340);
          s.fase = 'pasada';
        } else {
          // EL PLANEO: sale recto de la térmica, largo y en descenso suave.
          const haciaCasa = Math.atan2(centro[2] - s.z, centro[0] - s.x);
          const lejos = Math.hypot(s.x - centro[0], s.z - centro[2]) > radio * 1.1;
          s.rumbo = lejos ? haciaCasa + azar(-0.5, 0.5) : azar(0, Math.PI * 2);
          s.hasta = t + azar(13, 24);
          s.fase = 'planeo';
        }
      }
    } else if (s.fase === 'planeo') {
      // EL PLANEO: línea larga, alas planchadas, pierde altura despacio.
      const vLin = Math.max(velocidad * radio * 1.35, 1.0);
      // deriva de rumbo mínima (el aire nunca es una regla)…
      s.rumbo += Math.sin(t * 0.17) * 0.06 * dt;
      // …y si se aleja de la querencia, vira de vuelta sin drama.
      if (Math.hypot(s.x - centro[0], s.z - centro[2]) > radio * 1.6) {
        const haciaCasa = Math.atan2(centro[2] - s.z, centro[0] - s.x);
        let d = haciaCasa - s.rumbo;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        s.rumbo += d * Math.min(1, dt * 0.6);
      }
      s.x += Math.cos(s.rumbo) * vLin * dt;
      s.z += Math.sin(s.rumbo) * vLin * dt;
      s.alt = Math.max(s.alt - 0.055 * dt, -2.5);
      s.y = centro[1] + s.alt + Math.sin(t * 0.31) * 0.2;
      if (t >= s.hasta) engancharTermica(s, t); // re-engancha otra térmica
    } else if (s.fase === 'pasada') {
      const p = clamp((t - s.t0) / s.dur, 0, 1);
      s.x = bez(s.b0[0], s.b1[0], s.b2[0], p);
      s.y = bez(s.b0[1], s.b1[1], s.b2[1], p);
      s.z = bez(s.b0[2], s.b1[2], s.b2[2], p);
      // remonta la salida con ALETAZOS pesados (la única deuda que paga batiendo)
      if (p > 0.72 && !s.flare) { s.aleteaHasta = t + 2.2; s.flare = true; }
      if (p >= 1) engancharTermica(s, t);
    } else if (s.fase === 'aterrizaje') {
      const p = clamp((t - s.t0) / s.dur, 0, 1);
      s.x = bez(s.b0[0], s.b1[0], s.b2[0], p);
      s.y = bez(s.b0[1], s.b1[1], s.b2[1], p);
      s.z = bez(s.b0[2], s.b1[2], s.b2[2], p);
      if (p > 0.68 && !s.flare) { s.aleteaHasta = t + s.dur * 0.32; s.flare = true; } // el flare
      if (p >= 1) {
        s.fase = 'posado';
        s.proxOtea = t + azar(2, 5);
        s.hasta = t + azar(16, 28); // sólo cuenta de día (de noche se queda)
      }
    } else if (s.fase === 'posado') {
      // POSADO en el filo: alas plegadas (CSS), respira, otea a ratos.
      s.x = percha ? percha[0] : s.x;
      s.y = percha ? percha[1] : s.y;
      s.z = percha ? percha[2] : s.z;
      if (t >= s.proxOtea) { s.oteaHasta = t + 3.6; s.proxOtea = t + azar(9, 17); }
      if (!anochece && t >= s.hasta && s.opT > 0) {
        // DESPEGUE: se deja caer del filo y remonta batiendo pesado.
        const a = Math.atan2(centro[2] - s.z, centro[0] - s.x);
        s.b0 = [s.x, s.y, s.z];
        s.b1 = [s.x + Math.cos(a) * 2.2, s.y - 0.6, s.z + Math.sin(a) * 2.2];
        s.b2 = [s.x + Math.cos(a) * 5.5, Math.max(s.y + 2.2, centro[1] * 0.8), s.z + Math.sin(a) * 5.5];
        s.t0 = t; s.dur = azar(3, 4.2);
        s.aleteaHasta = t + s.dur;
        s.fase = 'despegue';
      }
    } else if (s.fase === 'despegue') {
      const p = clamp((t - s.t0) / s.dur, 0, 1);
      s.x = bez(s.b0[0], s.b1[0], s.b2[0], p);
      s.y = bez(s.b0[1], s.b1[1], s.b2[1], p);
      s.z = bez(s.b0[2], s.b1[2], s.b2[2], p);
      if (p >= 1) engancharTermica(s, t);
    }

    g.position.set(s.x, s.y, s.z);

    /* ── PERFIL CAMBIANTE (la cura anti-cometa nº2) ─────────────────────────
       La cabeza apunta al RUMBO proyectado en pantalla; el roll (rotateY en el
       marco ya rumbado = alrededor del eje del cuerpo) sale del giro OBSERVADO
       (banquea al virar, se aplana en recta); el encaramiento (rotateX) sale
       del ángulo de elevación cóndor-cámara: encima = ave ventral plena,
       horizonte = casi la línea con la V del diedro. */
    const posadoQuieto = s.fase === 'posado' || s.fase === 'aterrizaje';
    let rollT = 0;
    if (!s.init) { s.px = s.x; s.py = s.y; s.pz = s.z; s.init = true; }
    const vx = (s.x - s.px) / dt; const vy = (s.y - s.py) / dt; const vz = (s.z - s.pz) / dt;
    s.px = s.x; s.py = s.y; s.pz = s.z;
    const rapidez = Math.hypot(vx, vy, vz);
    if (s.fase === 'posado') {
      // erguido y quieto en el filo
      let d = 0 - s.rumboScr;
      d = ((d + 540) % 360) - 180;
      s.rumboScr += d * Math.min(1, dt * 3);
      s.rx += (0 - s.rx) * Math.min(1, dt * 3);
    } else if (rapidez > 0.05) {
      _right.setFromMatrixColumn(camera.matrixWorld, 0);
      _up.setFromMatrixColumn(camera.matrixWorld, 1);
      const sx = vx * _right.x + vy * _right.y + vz * _right.z;
      const sy = vx * _up.x + vy * _up.y + vz * _up.z;
      const deg = Math.atan2(sx, sy) * DEG;
      let d = ((deg - s.rumboScr + 540) % 360) - 180;
      const giro = d * Math.min(1, dt * 5);
      s.rumboScr += giro;
      rollT = clamp((giro / dt) * 2.8, -26, 26); // banquea lo que de verdad vira
      // elevación cóndor→cámara: 0 rad = horizonte (escorado), ≥60° = ventral
      const dxz = Math.hypot(s.x - camera.position.x, s.z - camera.position.z);
      const elev = Math.atan2(s.y - camera.position.y, dxz);
      const rxT = 52 * (1 - clamp(elev / 1.05, 0, 1));
      s.rx += (rxT - s.rx) * Math.min(1, dt * 3);
    }
    s.roll += (rollT - s.roll) * Math.min(1, dt * (posadoQuieto ? 4 : 2.2));

    /* ── escrituras DOM (sólo si cambian) ───────────────────────────────── */
    const capaEl = capa.current;
    if (capaEl) {
      const tf = `perspective(300px) rotate(${s.rumboScr.toFixed(1)}deg) rotateX(${s.rx.toFixed(1)}deg) rotateY(${s.roll.toFixed(1)}deg)`;
      if (tf !== s.lastTf) { capaEl.style.transform = tf; s.lastTf = tf; }
      // fundido (niebla / dormidero): nunca un corte seco
      s.op += clamp(s.opT - s.op, -dt * 0.7, dt * 0.7);
      const opStr = s.op >= 0.99 ? '' : s.op.toFixed(2);
      if (opStr !== s.lastOp) { capaEl.style.opacity = opStr || '1'; s.lastOp = opStr; }
      // fases → data-attrs (el CSS de creatures.css hace el gesto)
      if (s.dataFase !== s.fase) { capaEl.dataset.condorFase = s.fase; s.dataFase = s.fase; }
      const aleteo = t < s.aleteaHasta ? '1' : '';
      if (s.dataAleteo !== aleteo) {
        if (aleteo) capaEl.dataset.condorAleteo = '1'; else delete capaEl.dataset.condorAleteo;
        s.dataAleteo = aleteo;
      }
      const otea = s.fase === 'posado' && t < s.oteaHasta ? '1' : '';
      if (s.dataOtea !== otea) {
        if (otea) capaEl.dataset.condorOtea = '1'; else delete capaEl.dataset.condorOtea;
        s.dataOtea = otea;
      }
    }
    g.visible = s.op > 0.02;

    /* ── LA SOMBRA que corre por el terreno (opcional, +1 draw call) ────── */
    if (sombra.current && matSombra.current) {
      const ySuelo = typeof suelo === 'function' ? suelo(s.x, s.z) : suelo;
      const alto = Math.max(0.5, s.y - ySuelo);
      const visSombra = s.op > 0.3 && s.fase !== 'posado' && Number.isFinite(ySuelo);
      sombra.current.visible = visSombra;
      if (visSombra) {
        sombra.current.position.set(s.x, ySuelo + 0.06, s.z);
        const esc = 0.8 + alto * 0.06;
        sombra.current.scale.set(esc * 1.3, esc * 0.85, 1);
        matSombra.current.opacity = clamp(0.3 - alto * 0.014, 0.05, 0.28) * s.op;
      }
    }
  });

  const s0 = st.current;
  const posInicial = /** @type {[number,number,number]} */ ([s0.x, s0.y, s0.z]);
  const conSombra = suelo != null && tier !== 'bajo' && animated && modo !== 'cruce';

  return (
    <>
      <group ref={grupo} position={posInicial} visible={modo !== 'cruce' || !animated}>
        <Html center distanceFactor={factor} zIndexRange={[6, 0]} pointerEvents="none">
          <div
            ref={capa}
            aria-hidden="true"
            data-vecino="condor"
            data-condor-fase={animated && modo !== 'cruce' ? s0.fase : undefined}
            style={ESTILO_CONDOR}
          >
            <Condor size={px} animated={animated} tier={tier} clima={climaCuerpo} />
          </div>
        </Html>
      </group>
      {conSombra && (
        <mesh ref={sombra} rotation-x={-Math.PI / 2} renderOrder={2} visible={false}>
          <circleGeometry args={[1, 20]} />
          <meshBasicMaterial
            ref={matSombra}
            color="#101613"
            transparent
            opacity={0.2}
            depthWrite={false}
            polygonOffset
            polygonOffsetFactor={-2}
          />
        </mesh>
      )}
    </>
  );
}
