/**
 * MetalSlugCampo — prototipo jugable del "Metal Slug del campo" (nivel 1).
 *
 * Run-and-gun agroecológico SIN violencia: Angelita la abeja recorre la huerta de
 * la ladera templada (NIVELES[0]), "combate" plagas reales lanzando el CONTROL
 * BIOLÓGICO correcto (Bt, mariquita, Beauveria, crisopa), libera al jaguar
 * cazado (rehén estilo POW) y aprende con fichas didácticas al vencer cada plaga.
 *
 * REÚSA (no reinventa motores):
 *   - Física de salto y colisiones → `defensoresGameEngine` vía `metalSlugCampoEngine`
 *     (`avanzarFisica`, `rectsOverlap`).
 *   - Lógica de disparo/par arma↔plaga/rescate → `metalSlugCampoEngine` (puro, testeado).
 *   - Data agronómica REAL → `../data/metalSlugCampoData` (enemigos, armas, rehenes, nivel).
 *   - Sprites rubber-hose canónicos → `../visual/creatures` (Abeja héroe, Jaguar rehén).
 *   - Tier + reduced-motion → `../visual/mundo3d/deviceTier` (mismo criterio que el Odyssey).
 *
 * Determinismo: la simulación corre a PASO FIJO (1/60 s) con acumulador, así el
 * salto/gravedad usan las constantes del engine base tal cual sus tests.
 * Offline-safe: cero red, es-CO en «usted». reduced-motion: sin screenshake ni
 * wobble decorativo (la locomoción esencial se mantiene).
 */
/* eslint-disable chagra-i18n/no-hardcoded-spanish -- Juego servido solo en es-CO
   (mismo criterio que metalSlugCampoData / defensoresFincaData): copy pedagógico
   campesino en «usted», no strings de UI transversal migrables a messages.js. */
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AbejaAngelita, Jaguar } from '../visual/creatures';
import { decidirTier } from '../visual/mundo3d/deviceTier.js';
import {
  NIVELES,
  getEnemigo,
  getArma,
  getRehen,
} from '../data/metalSlugCampoData';
import {
  armasDeNivel,
  crearProyectil,
  avanzarProyectil,
  resolverImpactoArma,
  alcanzaRehen,
  patrullarPlaga,
  evaluarFinCampo,
  PUNTOS_PLAGA,
  PUNTOS_REHEN,
} from '../services/metalSlugCampoEngine';
import {
  avanzarFisica,
  rectsOverlap,
  JUMP_VELOCITY,
  MOVE_SPEED,
} from '../services/defensoresGameEngine';
import PlagaSprite from './metalslug/PlagasSprites.jsx';
import EscenarioFondo, { paletaPiso } from './metalslug/EscenarioFondo.jsx';
import JefeSequia from './metalslug/JefeSequia.jsx';
import StyleJuice, {
  ProyectilBio,
  EfectoImpacto,
  BarraVida,
  IndicadorMunicion,
} from './metalslug/JuiceMetalSlug.jsx';

/* ── Geometría del mundo (coords diseño; x→derecha, y→abajo). ───────────────── */
const ALTO_2D = 520; // alto de diseño de la vista
const SUELO_Y = 432; // línea del piso (donde apoyan los pies)
const MUNDO_W = 2720; // ancho total del nivel
const STEP = 1 / 60; // paso fijo de simulación (s)
const MAX_DT = 0.05; // clamp anti-saltos (pestaña en segundo plano)
const JUGADOR_W = 48;
const JUGADOR_H = 66;
const ENERGIA_INICIAL = 3;
const INVULN_MS = 1200;
const DISPARO_COOLDOWN_MS = 260;
const FICHA_MS = 3200; // pausa breve de la ficha didáctica
const NIVEL = NIVELES[0];

/* Paleta del piso térmico del nivel (data-driven: templado/frío/cálido/páramo).
   El fondo lo pinta EscenarioFondo; aquí se usa para suelo, cultivos y tinta. */
const PAL = paletaPiso(NIVEL.piso_termico);

/* Color del proyectil según el ROL biológico real del arma (data-driven). */
const COLOR_POR_TIPO = Object.freeze({
  microbiano: '#2bb3a3', // Bt / Beauveria (hongo/bacteria)
  depredador: '#d1443b', // mariquita / crisopa
  parasitoide: '#e0a021', // avispitas
  botanico: '#5aa03c', // purín de ortiga
});

/* Arsenal CURADO del prototipo: intersección con el arsenal real del nivel (sin
   invento). Enseña los pares que de verdad se enfrentan en el nivel 1. */
const ARSENAL_CURADO = ['bt', 'catarina', 'beauveria', 'crisopa'];

/* Instancias de plaga sembradas por el nivel (grounding: todas son de NIVEL.enemigos). */
const SIEMBRA_PLAGAS = [
  { enemigoId: 'cogollero', x: 560, vuela: false },
  { enemigoId: 'pulgon', x: 900, vuela: false },
  { enemigoId: 'moscablanca', x: 1240, vuela: true },
  { enemigoId: 'afido', x: 1560, vuela: false },
  { enemigoId: 'cogollero', x: 1900, vuela: false },
  { enemigoId: 'moscablanca', x: 2180, vuela: true },
];

/* ── Estado inicial del mundo (puro, recomponible al reintentar). ───────────── */
function crearMundo() {
  const enemigos = SIEMBRA_PLAGAS.map((s, i) => {
    const eh = s.vuela ? 40 : 46;
    const ew = s.vuela ? 46 : 52;
    const baseY = s.vuela ? SUELO_Y - 150 : SUELO_Y - eh;
    return {
      id: `${s.enemigoId}#${i}`,
      enemigoId: s.enemigoId,
      x: s.x,
      y: baseY,
      w: ew,
      h: eh,
      vivo: true,
      vuela: s.vuela,
      dir: i % 2 === 0 ? -1 : 1,
      vel: s.vuela ? 46 : 34,
      xMin: s.x - 90,
      xMax: s.x + 90,
      fase: i * 0.7,
    };
  });
  return {
    jugador: {
      x: 120,
      y: SUELO_Y - JUGADOR_H,
      vy: 0,
      onGround: true,
      mira: 1,
      w: JUGADOR_W,
      h: JUGADOR_H,
      energia: ENERGIA_INICIAL,
      invulnHasta: 0,
    },
    enemigos,
    proyectiles: [],
    rehen: { x: 2500, y: SUELO_Y - 88, w: 80, h: 88, liberado: false },
    cam: 0,
    puntaje: 0,
    armaIdx: 0,
    ultimoDisparo: 0,
    shakeHasta: 0,
    shakeMag: 0,
    reloj: 0,
    efectos: [], // estallidos visuales efímeros (SOLO ARTE, no afectan la sim)
    _fxId: 0,
  };
}

/* Empuja un estallido visual efímero (se autolimpia por edad en el tick). */
function sembrarEfecto(w, tipo, x, y) {
  w._fxId = (w._fxId || 0) + 1;
  w.efectos.push({ id: `fx${w._fxId}`, tipo, x, y, nace: w.reloj });
}
const FX_VIDA_S = 0.6; // duración visible del estallido (s)

/* ── SIMULACIÓN (scope de módulo: sin estado React, muta el mundo `w`). ──────── */

/**
 * Un tick de simulación de PASO FIJO (STEP s). Muta `w` en sitio y marca eventos
 * discretos (`w._evento*`) que `despacharEventos` traslada luego a React.
 * Reusa el motor puro para física, patrulla, disparo e impacto.
 *
 * @param {Object} w          mundo mutable.
 * @param {number} ahora      timestamp (performance.now) para invulnerabilidad.
 * @param {{izq:boolean,der:boolean,salto:boolean}} teclas  entrada actual.
 * @param {boolean} reducedMotion  gate de screenshake/flotar decorativo.
 */
function simularTick(w, ahora, teclas, reducedMotion) {
  const k = teclas;
  const j = w.jugador;
  w.reloj += STEP;

  /* andar */
  const dir = (k.der ? 1 : 0) - (k.izq ? 1 : 0);
  if (dir !== 0) j.mira = dir;
  j.x = Math.max(30, Math.min(MUNDO_W - j.w - 10, j.x + dir * MOVE_SPEED));

  /* salto + gravedad + suelo (reusa el engine base, paso por tick) */
  if (k.salto && j.onGround) {
    j.vy = JUMP_VELOCITY;
    j.onGround = false;
  }
  const fis = avanzarFisica({ y: j.y, vy: j.vy, onGround: j.onGround }, SUELO_Y, j.h);
  j.y = fis.y;
  j.vy = fis.vy;
  j.onGround = fis.onGround;

  /* patrulla de plagas (determinista) + leve flotar de las que vuelan */
  for (const e of w.enemigos) {
    if (!e.vivo) continue;
    const p = patrullarPlaga(e, STEP, e.xMin, e.xMax);
    e.x = p.x;
    e.dir = p.dir;
    if (e.vuela) {
      const base = SUELO_Y - 150;
      e.y = base + (reducedMotion ? 0 : Math.sin(w.reloj * 2.2 + e.fase) * 16);
    }
  }

  /* proyectiles: avanzar + resolver impacto (EL PAR arma↔plaga) */
  const vivos = [];
  for (const proy of w.proyectiles) {
    const movido = avanzarProyectil(proy, STEP, MUNDO_W);
    if (!movido) continue;
    const { plagas, impacto } = resolverImpactoArma(movido, w.enemigos);
    if (impacto) {
      w.enemigos = plagas;
      const ix = movido.x + (movido.w || 6) / 2;
      const iy = movido.y + (movido.h || 6) / 2;
      if (impacto.correcto) {
        w.puntaje += PUNTOS_PLAGA;
        w._eventoFicha = impacto.enemigoId;
        w._shake = Math.max(w._shake || 0, reducedMotion ? 0 : 5);
        sembrarEfecto(w, 'bio', ix, iy);
      } else {
        w._eventoErrado = impacto.enemigoId;
        w._shake = Math.max(w._shake || 0, reducedMotion ? 0 : 3);
        sembrarEfecto(w, 'errado', ix, iy);
      }
      // proyectil consumido: no se reencola
    } else {
      vivos.push(movido);
    }
  }
  w.proyectiles = vivos;

  /* contacto jugador↔plaga viva → pierde energía (con invulnerabilidad breve) */
  if (ahora >= j.invulnHasta) {
    for (const e of w.enemigos) {
      if (e.vivo && rectsOverlap(j, e)) {
        j.energia -= 1;
        j.invulnHasta = ahora + INVULN_MS;
        w._shake = Math.max(w._shake || 0, reducedMotion ? 0 : 8);
        w._eventoGolpe = true;
        sembrarEfecto(w, 'dano', j.x + j.w / 2, j.y + j.h / 2);
        break;
      }
    }
  }

  /* rescate del rehén (jaguar cazado) */
  if (alcanzaRehen(j, w.rehen)) {
    w.rehen.liberado = true;
    w.puntaje += PUNTOS_REHEN;
    w._eventoRehen = true;
    w._shake = Math.max(w._shake || 0, reducedMotion ? 0 : 6);
    sembrarEfecto(w, 'rescate', w.rehen.x + w.rehen.w / 2, w.rehen.y + w.rehen.h / 2);
  }

  /* envejecer estallidos visuales (solo arte) */
  if (w.efectos.length) {
    w.efectos = w.efectos.filter((f) => w.reloj - f.nace < FX_VIDA_S);
  }

  /* fin de nivel */
  const plagasVivas = w.enemigos.filter((e) => e.vivo).length;
  const res = evaluarFinCampo({
    energia: j.energia,
    plagasVivas,
    rehenLiberado: w.rehen.liberado,
  });
  if (res.estado !== 'jugando') {
    w._eventoFin = res;
  }
}

/**
 * Traslada a React los eventos discretos que el tick marcó en `w`.
 * @param {Object} w
 * @param {boolean} reducedMotion
 * @param {{setFicha:Function,setToast:Function,setAvisoRehen:Function,setFin:Function,setFlashDano:Function,finRef:Object}} d
 */
function despacharEventos(w, reducedMotion, d) {
  if (w._shake && !reducedMotion) {
    w.shakeMag = w._shake;
    w.shakeHasta = performance.now() + 220;
    w._shake = 0;
  }
  if (w._eventoFicha) {
    d.setFicha({ enemigoId: w._eventoFicha });
    w._eventoFicha = null;
  }
  if (w._eventoErrado) {
    const e = getEnemigo(w._eventoErrado);
    d.setToast(`Ese control no le sirve a ${e?.nombre_comun || 'esa plaga'}. Pruebe con su aliado correcto.`);
    w._eventoErrado = null;
  }
  if (w._eventoGolpe) {
    d.setFlashDano((n) => n + 1);
    w._eventoGolpe = null;
  }
  if (w._eventoRehen) {
    d.setAvisoRehen(getRehen(NIVEL.rehen));
    w._eventoRehen = null;
  }
  if (w._eventoFin) {
    d.finRef.current = w._eventoFin;
    d.setFin(w._eventoFin);
    d.setFicha(null);
    d.setAvisoRehen(null);
    w._eventoFin = null;
  }
}

/* ════════════════════════════════════════════════════════════════════════════
 * COMPONENTE
 * ════════════════════════════════════════════════════════════════════════════ */
export default function MetalSlugCampo({ onBack }) {
  const [{ tier, reducedMotion }] = useState(() => decidirTier());
  const [pantalla, setPantalla] = useState('intro'); // 'intro' | 'juego'

  const arsenal = useMemo(
    () => ARSENAL_CURADO.filter((id) => armasDeNivel(NIVEL.numero).includes(id)),
    [],
  );

  return (
    <div className="msc-root" data-tier={tier} data-rm={reducedMotion ? '1' : '0'}>
      <StyleMSC />
      <button type="button" className="msc-volver" onClick={onBack}>
        ← Volver
      </button>

      {pantalla === 'intro' ? (
        <Intro nivel={NIVEL} arsenal={arsenal} onJugar={() => setPantalla('juego')} />
      ) : (
        <Juego
          tier={tier}
          reducedMotion={reducedMotion}
          arsenal={arsenal}
          onSalirIntro={() => setPantalla('intro')}
        />
      )}
    </div>
  );
}

/* ── Pantalla de inicio: contexto del nivel + arsenal. ──────────────────────── */
function Intro({ nivel, arsenal, onJugar }) {
  return (
    <div className="msc-intro">
      <div className="msc-intro-card">
        <p className="msc-kicker">Metal Slug del campo · Nivel {nivel.numero}</p>
        <h1 className="msc-titulo">{nivel.nombre}</h1>
        <p className="msc-intro-texto">{nivel.intro}</p>
        <div className="msc-arsenal-intro">
          <span className="msc-arsenal-rotulo">Su arsenal de control biológico:</span>
          <ul>
            {arsenal.map((id) => {
              const a = getArma(id);
              return (
                <li key={id}>
                  <b style={{ color: COLOR_POR_TIPO[a?.tipo] || PAL.tinta }}>■</b> {a?.nombre}
                </li>
              );
            })}
          </ul>
        </div>
        <p className="msc-ayuda">
          Muévase con <kbd>←</kbd> <kbd>→</kbd>, salte con <kbd>espacio</kbd>, dispare con <kbd>J</kbd>{' '}
          y cambie de control biológico con <kbd>K</kbd>. En el celular, use los botones de abajo.
          Cada plaga se controla con su aliado correcto: si se equivoca, la plaga aguanta.
        </p>
        <button type="button" className="msc-btn-jugar" onClick={onJugar}>
          ¡A cuidar la finca!
        </button>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
 * JUEGO — RAF de paso fijo. Posiciones en worldRef; React re-renderiza por frame
 * (pocas entidades) y los sprites pesados van memoizados. Overlays pausan la sim.
 * ════════════════════════════════════════════════════════════════════════════ */
function Juego({ tier, reducedMotion, arsenal, onSalirIntro }) {
  const vistaRef = useRef(null);
  const teclasRef = useRef({ izq: false, der: false, salto: false });
  const anchoRef = useRef(760);
  const pausaRef = useRef(false);
  const finRef = useRef(null);

  // El mundo canónico y mutable vive en `worldRef`; `vista` es el snapshot que
  // se pinta cada frame (mismo objeto al montar, copias superficiales luego).
  const [vista, setVista] = useState(crearMundo);
  const worldRef = useRef(vista);
  const [ficha, setFicha] = useState(null); // { enemigoId } — pausa breve didáctica
  const [avisoRehen, setAvisoRehen] = useState(null); // mensaje de conservación
  const [toast, setToast] = useState(null); // feedback transitorio (arma equivocada)
  const [fin, setFin] = useState(null); // { estado, razon }
  const [flashDano, setFlashDano] = useState(0); // llave para reproducir la viñeta de golpe

  /* medir ancho visible en unidades de diseño (para la cámara) */
  useEffect(() => {
    const el = vistaRef.current;
    if (!el) return undefined;
    const medir = () => {
      const r = el.getBoundingClientRect();
      const escala = Math.max(0.3, r.height / ALTO_2D);
      anchoRef.current = r.width / escala;
    };
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* disparar: crea un proyectil desde el frente del jugador si pasó el cooldown */
  const disparar = useCallback(() => {
    const w = worldRef.current;
    if (pausaRef.current || finRef.current) return;
    const ahora = performance.now();
    if (ahora - w.ultimoDisparo < DISPARO_COOLDOWN_MS) return;
    w.ultimoDisparo = ahora;
    const j = w.jugador;
    const px = j.mira > 0 ? j.x + j.w : j.x - 26;
    const proy = crearProyectil({
      x: px,
      y: j.y + 22,
      dir: j.mira,
      armaId: arsenal[w.armaIdx % arsenal.length],
      id: `p${w._fxId || 0}`,
    });
    w.proyectiles.push(proy);
    sembrarEfecto(w, 'muzzle', px + j.mira * 6, j.y + 26); // fogonazo del lanzamiento
  }, [arsenal]);

  /* cambiar de arma (control biológico) */
  const cambiarArma = useCallback(() => {
    const w = worldRef.current;
    w.armaIdx = (w.armaIdx + 1) % arsenal.length;
    setVista({ ...w });
  }, [arsenal]);

  /* reiniciar el nivel EN SITIO (sin desmontar): mundo fresco + limpiar overlays */
  const reiniciar = useCallback(() => {
    worldRef.current = crearMundo();
    finRef.current = null;
    pausaRef.current = false;
    teclasRef.current = { izq: false, der: false, salto: false };
    setFin(null);
    setFicha(null);
    setAvisoRehen(null);
    setToast(null);
    setVista({ ...worldRef.current });
  }, []);

  /* teclado */
  useEffect(() => {
    const abajo = (e) => {
      const k = teclasRef.current;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        k.izq = true;
        e.preventDefault();
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        k.der = true;
        e.preventDefault();
      } else if (e.key === 'ArrowUp' || e.key === ' ' || e.key === 'w' || e.key === 'W') {
        k.salto = true;
        e.preventDefault();
      } else if ((e.key === 'j' || e.key === 'J' || e.key === 'f' || e.key === 'F') && !e.repeat) {
        disparar();
      } else if ((e.key === 'k' || e.key === 'K') && !e.repeat) {
        cambiarArma();
      } else if ((e.key === 'Enter' || e.key === 'e') && !e.repeat) {
        // cerrar overlays didácticos con Enter
        if (ficha) setFicha(null);
        if (avisoRehen) setAvisoRehen(null);
      }
    };
    const arriba = (e) => {
      const k = teclasRef.current;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') k.izq = false;
      else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') k.der = false;
      else if (e.key === 'ArrowUp' || e.key === ' ' || e.key === 'w' || e.key === 'W') k.salto = false;
    };
    window.addEventListener('keydown', abajo);
    window.addEventListener('keyup', arriba);
    return () => {
      window.removeEventListener('keydown', abajo);
      window.removeEventListener('keyup', arriba);
    };
  }, [disparar, cambiarArma, ficha, avisoRehen]);

  /* la ficha didáctica se despide sola (pausa breve, no rompe el ritmo) */
  useEffect(() => {
    if (!ficha) return undefined;
    pausaRef.current = true;
    const t = setTimeout(() => setFicha(null), FICHA_MS);
    return () => clearTimeout(t);
  }, [ficha]);
  useEffect(() => {
    // al cerrarse ficha y aviso, se reanuda (si no hay otro overlay abierto)
    if (!ficha && !avisoRehen) pausaRef.current = false;
    else pausaRef.current = true;
  }, [ficha, avisoRehen]);

  /* toast transitorio (arma equivocada) */
  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 1700);
    return () => clearTimeout(t);
  }, [toast]);

  /* ── EL LATIDO: un solo rAF, paso fijo, todo por el motor puro. ───────────── */
  useEffect(() => {
    const dispatch = { setFicha, setToast, setAvisoRehen, setFin, setFlashDano, finRef };
    let raf = 0;
    let prev = performance.now();
    let acc = 0;
    const paso = (ahora) => {
      const dt = Math.min(MAX_DT, (ahora - prev) / 1000);
      prev = ahora;
      const w = worldRef.current;

      if (!pausaRef.current && !finRef.current) {
        acc += dt;
        while (acc >= STEP) {
          simularTick(w, ahora, teclasRef.current, reducedMotion);
          acc -= STEP;
        }
        // efectos discretos acumulados en el tick se despachan abajo
        despacharEventos(w, reducedMotion, dispatch);
      }

      // cámara (suave, incluso en pausa para que no salte)
      const ancho = anchoRef.current;
      const objetivo = Math.max(0, Math.min(MUNDO_W - ancho, w.jugador.x - ancho * 0.4));
      w.cam += (objetivo - w.cam) * Math.min(1, dt * 6);

      // screenshake + parpadeo de invulnerabilidad: SE CALCULAN AQUÍ (zona impura
      // del rAF) y se guardan en el mundo, para que el render los lea puros.
      const enShake = !reducedMotion && ahora < w.shakeHasta;
      w.shakeX = enShake ? (Math.random() - 0.5) * w.shakeMag : 0;
      w.shakeY = enShake ? (Math.random() - 0.5) * w.shakeMag : 0;
      w.invulnVisible = ahora < w.jugador.invulnHasta;

      setVista({ ...w });
      raf = requestAnimationFrame(paso);
    };
    raf = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* controles táctiles */
  const tocar = useCallback((tecla, valor) => {
    teclasRef.current[tecla] = valor;
  }, []);

  /* ── Render ──────────────────────────────────────────────────────────────── */
  const w = vista;
  const escala = useEscala(vistaRef);
  const shake = { x: w.shakeX || 0, y: w.shakeY || 0 };
  const armaActual = getArma(arsenal[w.armaIdx % arsenal.length]);
  const plagasVivas = w.enemigos.filter((e) => e.vivo).length;
  const invuln = !!w.invulnVisible;

  return (
    <div className="msc-juego">
      <div ref={vistaRef} className="msc-vista">
        <StyleJuice />

        {/* fondo por piso térmico (cielo + lomas + ambiente) */}
        {/* eslint-disable-next-line react/no-unknown-property */}
        {/* @ts-ignore IntrinsicAttributes & object - component defined in metalslug/ */}
        <EscenarioFondo piso={NIVEL.piso_termico} cam={w.cam} reducedMotion={reducedMotion} />

        {/* jefe SEQUÍA acechando desde el cielo (solo niveles de sequía) */}
        {NIVEL.jefe === 'jefe_sequia' && (
          <div
            className="msc-jefe-cielo"
            aria-hidden="true"
            style={{ transform: `translate3d(${-w.cam * 0.12}px,0,0)` }}
          >
            {/* @ts-ignore IntrinsicAttributes & object - component defined in metalslug/ */}
            <JefeSequia size={220} reducedMotion={reducedMotion} />
          </div>
        )}

        <div
          className="msc-marco"
          style={{ transform: `scale(${escala}) translate3d(${shake.x}px,${shake.y}px,0)` }}
        >
          <div
            className="msc-mundo"
            style={{ width: MUNDO_W, transform: `translate3d(${-w.cam}px,0,0)` }}
          >
            {/* piso */}
            <div className="msc-suelo" style={{ width: MUNDO_W, top: SUELO_Y }} />
            <div className="msc-pasto" style={{ width: MUNDO_W, top: SUELO_Y - 8 }} />

            {/* cultivos decorativos (maíz + frijol) */}
            {DECOR.map((d) => (
              <div key={`d${d.x}`} className={`msc-mata msc-mata--${d.t}`} style={{ left: d.x, top: SUELO_Y - d.h, height: d.h }} />
            ))}

            {/* plagas */}
            {w.enemigos.map((e) =>
              e.vivo ? (
                <div
                  key={e.id}
                  className="msc-plaga"
                  data-dir={e.dir}
                  style={{ left: e.x, top: e.y, width: e.w, height: e.h }}
                >
                  {/* @ts-ignore IntrinsicAttributes & object - component defined in metalslug/ */}
                  <PlagaSprite enemigoId={e.enemigoId} reducedMotion={reducedMotion} />
                </div>
              ) : null,
            )}

            {/* proyectiles (biopreparados temáticos) */}
            {w.proyectiles.map((p) => {
              const a = getArma(p.armaId);
              const sz = Math.max(p.w, p.h) + 8;
              return (
                <div
                  key={p.id}
                  className="msc-proyectil"
                  style={{ left: p.x + p.w / 2 - sz / 2, top: p.y + p.h / 2 - sz / 2, width: sz, height: sz }}
                >
                  {/* @ts-ignore IntrinsicAttributes & object - component defined in metalslug/ */}
                  <ProyectilBio
                    color={COLOR_POR_TIPO[a?.tipo] || '#fff'}
                    tipo={a?.tipo}
                    reducedMotion={reducedMotion}
                  />
                </div>
              );
            })}

            {/* estallidos de impacto / fogonazos / rescate (SOLO ARTE) */}
            {w.efectos.map((f) =>
              f.tipo === 'muzzle' ? (
                <div key={f.id} className="msc-fx-muzzle" style={{ left: f.x, top: f.y }} />
              ) : (
                <div key={f.id} className="msc-fx-hold" style={{ left: f.x, top: f.y }}>
                  {/* @ts-ignore IntrinsicAttributes & object - component defined in metalslug/ */}
                  <EfectoImpacto tipo={f.tipo} reducedMotion={reducedMotion} />
                </div>
              ),
            )}

            {/* rehén (jaguar) */}
            <div
              className={`msc-rehen ${w.rehen.liberado ? 'msc-rehen--libre' : 'msc-rehen--preso'}`}
              style={{ left: w.rehen.x, top: w.rehen.y, width: w.rehen.w, height: w.rehen.h }}
            >
              {!w.rehen.liberado && <div className="msc-jaula" aria-hidden="true" />}
              {/* @ts-ignore IntrinsicAttributes & object - memo-wrapped component */}
              <SpriteRehen tier={tier} reducedMotion={reducedMotion} />
              {!w.rehen.liberado && <div className="msc-sos" aria-hidden="true">¡SOS!</div>}
            </div>

            {/* jugador (Angelita) */}
            <div
              className="msc-jugador"
              data-mira={w.jugador.mira}
              data-aire={w.jugador.onGround ? '0' : '1'}
              data-inv={invuln ? '1' : '0'}
              style={{ left: w.jugador.x, top: w.jugador.y, width: w.jugador.w, height: w.jugador.h }}
            >
              {/* @ts-ignore IntrinsicAttributes & object - memo-wrapped component */}
              <SpriteHeroe tier={tier} reducedMotion={reducedMotion} />
            </div>
          </div>
        </div>

        {/* destello de daño (viñeta roja al recibir golpe) */}
        {flashDano > 0 && <div key={flashDano} className="msc-fx-dano-flash" aria-hidden="true" />}

        {/* HUD */}
        <div className="msc-hud">
          <div className="msc-hud-izq">
            {/* @ts-ignore IntrinsicAttributes & object - component defined in metalslug/ */}
            <BarraVida energia={w.jugador.energia} max={ENERGIA_INICIAL} />
            <span className="msc-puntaje">{w.puntaje} pts</span>
          </div>
          <div className="msc-hud-der">
            <span className="msc-plagas-cnt">Plagas: {plagasVivas}</span>
            <span className="msc-rehen-cnt">{w.rehen.liberado ? 'Jaguar a salvo ✓' : 'Jaguar: rescátelo'}</span>
          </div>
          <div className="msc-hud-muni">
            {/* @ts-ignore IntrinsicAttributes & object - component defined in metalslug/ */}
            <IndicadorMunicion
              nombre={armaActual?.nombre}
              color={COLOR_POR_TIPO[armaActual?.tipo] || '#fff'}
              tipo={armaActual?.tipo}
              onClick={cambiarArma}
            />
          </div>
        </div>

        {/* ficha didáctica al controlar una plaga (pausa breve) */}
        {ficha && <FichaDidactica enemigoId={ficha.enemigoId} onCerrar={() => setFicha(null)} />}

        {/* aviso de conservación al liberar al rehén */}
        {avisoRehen && <AvisoConservacion rehen={avisoRehen} onCerrar={() => setAvisoRehen(null)} />}

        {/* toast de arma equivocada */}
        {toast && <div className="msc-toast" role="status">{toast}</div>}

        {/* fin de nivel */}
        {fin && (
          <FinNivel
            fin={fin}
            puntaje={w.puntaje}
            onReintentar={reiniciar}
            onSalir={onSalirIntro}
          />
        )}
      </div>

      {/* controles táctiles */}
      <div className="msc-controles" aria-hidden={false}>
        <div className="msc-mov">
          <button
            type="button"
            className="msc-ctrl"
            onPointerDown={() => tocar('izq', true)}
            onPointerUp={() => tocar('izq', false)}
            onPointerLeave={() => tocar('izq', false)}
            aria-label="Izquierda"
          >
            ◀
          </button>
          <button
            type="button"
            className="msc-ctrl"
            onPointerDown={() => tocar('der', true)}
            onPointerUp={() => tocar('der', false)}
            onPointerLeave={() => tocar('der', false)}
            aria-label="Derecha"
          >
            ▶
          </button>
        </div>
        <div className="msc-acciones">
          <button
            type="button"
            className="msc-ctrl msc-ctrl--sec"
            onClick={cambiarArma}
            aria-label="Cambiar control biológico"
          >
            ⟳
          </button>
          <button
            type="button"
            className="msc-ctrl msc-ctrl--fire"
            onClick={disparar}
            aria-label="Lanzar control biológico"
          >
            ✷
          </button>
          <button
            type="button"
            className="msc-ctrl msc-ctrl--jump"
            onPointerDown={() => tocar('salto', true)}
            onPointerUp={() => tocar('salto', false)}
            onPointerLeave={() => tocar('salto', false)}
            aria-label="Saltar"
          >
            ⤒
          </button>
        </div>
      </div>
    </div>
  );
}

/* Escala reactiva de la vista (para el marco). Se recalcula por resize. */
function useEscala(vistaRef) {
  const [escala, setEscala] = useState(1);
  useEffect(() => {
    const el = vistaRef.current;
    if (!el) return undefined;
    const medir = () => {
      const r = el.getBoundingClientRect();
      setEscala(Math.max(0.3, r.height / ALTO_2D));
    };
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, [vistaRef]);
  return escala;
}

/* ── Cultivos decorativos del piso. ─────────────────────────────────────────── */
const DECOR = [
  { x: 360, h: 96, t: 'maiz' }, { x: 720, h: 70, t: 'frijol' },
  { x: 1080, h: 96, t: 'maiz' }, { x: 1420, h: 66, t: 'frijol' },
  { x: 1760, h: 96, t: 'maiz' }, { x: 2040, h: 70, t: 'frijol' },
  { x: 2340, h: 96, t: 'maiz' },
];

/* ── Sprites (memoizados: no re-renderizan por frame). ──────────────────────── */
const SpriteHeroe = memo(function SpriteHeroe(/** @type {{ tier: any; reducedMotion: any }} */ { tier, reducedMotion }) {
  return <AbejaAngelita size={JUGADOR_H + 20} inline={false} animated={!reducedMotion} tier={tier} title="Angelita" />;
});

const SpriteRehen = memo(function SpriteRehen(/** @type {{ tier: any; reducedMotion: any }} */ { tier, reducedMotion }) {
  return <Jaguar size={92} inline={false} animated={!reducedMotion} tier={tier} title="Jaguar" />;
});

/* PlagaSprite ahora vive en ./metalslug/PlagasSprites.jsx (bestiario expresivo). */

/* ── Ficha didáctica al controlar una plaga. ────────────────────────────────── */
function FichaDidactica({ enemigoId, onCerrar }) {
  const e = getEnemigo(enemigoId);
  if (!e) return null;
  return (
    <div className="msc-overlay msc-overlay--ficha" role="dialog" aria-label={`Ficha de ${e.nombre_comun}`}>
      <div className="msc-ficha">
        <span className="msc-ficha-tag">¡Plaga controlada!</span>
        <h3>{e.nombre_comun} <i>({e.nombre_cientifico})</i></h3>
        <p className="msc-ficha-cultivo"><b>Ataca:</b> {e.cultivo_objetivo}</p>
        <p className="msc-ficha-ficha">{e.ficha}</p>
        <button type="button" className="msc-ficha-ok" onClick={onCerrar}>Seguir (Enter)</button>
      </div>
    </div>
  );
}

/* ── Aviso de conservación al liberar al rehén. ─────────────────────────────── */
function AvisoConservacion({ rehen, onCerrar }) {
  return (
    <div className="msc-overlay msc-overlay--rehen" role="dialog" aria-label={`Rescate de ${rehen.nombre}`}>
      <div className="msc-aviso">
        <span className="msc-aviso-tag">¡Liberado!</span>
        <h3>{rehen.nombre}</h3>
        <p className="msc-aviso-porque"><b>Por qué lo cazan:</b> {rehen.por_que_lo_cazan}</p>
        <p className="msc-aviso-msg">{rehen.mensaje_educativo}</p>
        <p className="msc-aviso-iucn">{rehen.amenaza}</p>
        <button type="button" className="msc-ficha-ok" onClick={onCerrar}>Seguir (Enter)</button>
      </div>
    </div>
  );
}

/* ── Fin de nivel. ──────────────────────────────────────────────────────────── */
function FinNivel({ fin, puntaje, onReintentar, onSalir }) {
  const gano = fin.estado === 'gano';
  return (
    <div className="msc-overlay msc-overlay--fin" role="dialog" aria-label="Fin del nivel">
      <div className={`msc-fin ${gano ? 'msc-fin--gano' : 'msc-fin--perdio'}`}>
        <h2>{gano ? '¡Finca cuidada!' : 'Se acabó la energía'}</h2>
        <p>{fin.razon}</p>
        <p className="msc-fin-puntaje">{puntaje} puntos</p>
        <button type="button" className="msc-btn-jugar" onClick={onReintentar}>
          {gano ? 'Jugar de nuevo' : 'Reintentar'}
        </button>
        <button type="button" className="msc-fin-salir" onClick={onSalir}>
          Volver al inicio
        </button>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
 * ESTILOS (embebidos, prefijo msc-, self-contained, offline-safe).
 * ════════════════════════════════════════════════════════════════════════════ */
function StyleMSC() {
  return (
    <style>{`
.msc-root{position:fixed;inset:0;overflow:hidden;background:#12100c;font-family:'Baloo 2',system-ui,sans-serif;color:${PAL.tinta};user-select:none;-webkit-user-select:none;touch-action:none;}
.msc-volver{position:absolute;top:10px;left:10px;z-index:40;background:rgba(0,0,0,.42);color:#fff;border:2px solid rgba(255,255,255,.5);border-radius:11px;padding:7px 13px;font-weight:800;font-size:15px;cursor:pointer;}
.msc-volver:hover{background:rgba(0,0,0,.6);}

/* intro */
.msc-intro{position:absolute;inset:0;display:grid;place-items:center;padding:18px;background:linear-gradient(160deg,#2a3a24,#463a1e 70%);}
.msc-intro-card{max-width:560px;width:100%;background:#f4ecd6;border:4px solid ${PAL.tinta};border-radius:22px;box-shadow:0 14px 0 rgba(0,0,0,.35);padding:22px 24px;}
.msc-kicker{margin:0 0 4px;font-weight:900;letter-spacing:.03em;color:#b5632a;text-transform:uppercase;font-size:13px;}
.msc-titulo{margin:0 0 8px;font-size:30px;line-height:1.05;font-weight:900;color:#3a2a1a;}
.msc-intro-texto{margin:0 0 14px;font-size:16px;line-height:1.35;}
.msc-arsenal-intro{background:#fff8e6;border:2px dashed #caa25a;border-radius:13px;padding:10px 14px;margin-bottom:12px;}
.msc-arsenal-rotulo{font-weight:800;font-size:14px;}
.msc-arsenal-intro ul{margin:6px 0 0;padding-left:2px;list-style:none;display:grid;gap:3px;font-size:14.5px;}
.msc-arsenal-intro b{margin-right:6px;font-size:15px;}
.msc-ayuda{font-size:13.5px;line-height:1.4;color:#5c4a35;margin:0 0 16px;}
.msc-ayuda kbd{background:#fff;border:1.5px solid ${PAL.tinta};border-bottom-width:3px;border-radius:6px;padding:1px 6px;font-weight:800;font-size:12.5px;}
.msc-btn-jugar{display:block;width:100%;background:#e0532b;color:#fff;border:3px solid ${PAL.tinta};border-bottom-width:6px;border-radius:15px;padding:13px;font-size:19px;font-weight:900;cursor:pointer;transition:transform .08s;}
.msc-btn-jugar:active{transform:translateY(3px);border-bottom-width:3px;}

/* juego */
.msc-juego{position:absolute;inset:0;display:flex;flex-direction:column;}
.msc-vista{position:relative;flex:1;overflow:hidden;background:${PAL.cielo};}
.msc-jefe-cielo{position:absolute;top:2%;right:4%;z-index:2;opacity:.92;filter:drop-shadow(0 6px 14px rgba(180,80,20,.35));will-change:transform;pointer-events:none;}
.msc-marco{position:absolute;top:0;left:0;transform-origin:top left;will-change:transform;z-index:3;}
.msc-mundo{position:absolute;top:0;left:0;height:${ALTO_2D}px;will-change:transform;}
.msc-suelo{position:absolute;left:0;height:${ALTO_2D}px;background:linear-gradient(${PAL.suelo} 0 12px,${PAL.sueloClaro} 12px 100%);}
.msc-pasto{position:absolute;left:0;height:14px;background:repeating-linear-gradient(90deg,${PAL.pasto} 0 8px,#5f9345 8px 16px);border-radius:6px 6px 0 0;}
.msc-mata{position:absolute;width:26px;border-radius:8px 8px 0 0;}
.msc-mata--maiz{background:linear-gradient(#8bbf4a,#6d9c37);box-shadow:inset -4px 0 0 rgba(0,0,0,.12);}
.msc-mata--maiz::after{content:"";position:absolute;top:6px;left:50%;width:12px;height:26px;background:#e6c34a;border-radius:6px;transform:translateX(-50%);}
.msc-mata--frijol{background:linear-gradient(#7bab54,#557f36);border-radius:12px 12px 0 0;box-shadow:inset -3px 0 0 rgba(0,0,0,.12);}
.msc-plaga{position:absolute;will-change:transform;filter:drop-shadow(0 3px 2px rgba(0,0,0,.18));}
.msc-plaga[data-dir="1"]{transform:scaleX(-1);}
.msc-proyectil{position:absolute;will-change:transform;pointer-events:none;}
.msc-fx-hold{position:absolute;width:0;height:0;pointer-events:none;}
.msc-jugador{position:absolute;display:grid;place-items:center;will-change:transform;}
.msc-jugador[data-mira="-1"]{transform:scaleX(-1);}
.msc-jugador[data-inv="1"]{animation:msc-parpadeo .18s steps(2,end) infinite;}
.msc-rehen{position:absolute;display:grid;place-items:end center;}
.msc-jaula{position:absolute;inset:-6px -4px 0;border:3px solid #6b6b6b;border-radius:8px;background:repeating-linear-gradient(90deg,transparent 0 10px,rgba(80,80,80,.55) 10px 13px);pointer-events:none;}
.msc-rehen--libre .msc-jaula{display:none;}
.msc-sos{position:absolute;top:-20px;left:50%;transform:translateX(-50%);background:#e0532b;color:#fff;font-weight:900;font-size:12px;padding:1px 7px;border-radius:8px;border:2px solid ${PAL.tinta};}
.msc-rehen--libre{animation:msc-brinco .5s ease;}

/* HUD */
.msc-hud{position:absolute;top:8px;left:0;right:0;z-index:20;display:flex;align-items:flex-start;justify-content:space-between;gap:8px;padding:0 12px 0 96px;pointer-events:none;}
.msc-hud-izq,.msc-hud-der{display:flex;flex-direction:column;gap:3px;background:rgba(0,0,0,.34);border-radius:12px;padding:6px 11px;color:#fff;font-weight:800;}
.msc-hud-der{text-align:right;font-size:13.5px;}
.msc-puntaje{font-size:17px;color:#ffd66b;margin-top:2px;}
.msc-hud-muni{position:absolute;right:12px;top:62px;pointer-events:auto;max-width:62%;}

/* overlays */
.msc-overlay{position:absolute;inset:0;z-index:30;display:grid;place-items:center;background:rgba(20,15,8,.5);padding:18px;animation:msc-aparece .18s ease;}
.msc-ficha,.msc-aviso,.msc-fin{max-width:440px;width:100%;background:#f7efda;border:4px solid ${PAL.tinta};border-radius:20px;box-shadow:0 12px 0 rgba(0,0,0,.32);padding:18px 20px;}
.msc-ficha-tag,.msc-aviso-tag{display:inline-block;background:#4d9e4a;color:#fff;font-weight:900;font-size:12.5px;padding:3px 10px;border-radius:9px;margin-bottom:6px;}
.msc-aviso-tag{background:#3f8fd0;}
.msc-ficha h3,.msc-aviso h3{margin:2px 0 8px;font-size:20px;color:#3a2a1a;}
.msc-ficha h3 i,.msc-aviso h3 i{font-weight:600;font-size:15px;color:#7a6a52;}
.msc-ficha p,.msc-aviso p{margin:0 0 7px;font-size:15px;line-height:1.35;}
.msc-ficha-cultivo b,.msc-aviso-porque b{color:#b5632a;}
.msc-aviso-iucn{font-size:12.5px;color:#7a6a52;font-style:italic;}
.msc-ficha-ok{margin-top:6px;background:#3a2a1a;color:#fff;border:none;border-radius:11px;padding:9px 16px;font-weight:800;font-size:15px;cursor:pointer;}
.msc-fin{text-align:center;}
.msc-fin h2{margin:0 0 8px;font-size:26px;}
.msc-fin--gano h2{color:#3d8b3a;}
.msc-fin--perdio h2{color:#c14a2c;}
.msc-fin-puntaje{font-size:22px;font-weight:900;color:#b5632a;margin:8px 0 14px;}
.msc-fin-salir{margin-top:9px;background:none;border:none;color:#7a6a52;font-weight:800;font-size:14px;text-decoration:underline;cursor:pointer;}
.msc-toast{position:absolute;bottom:120px;left:50%;transform:translateX(-50%);z-index:25;background:rgba(180,60,30,.94);color:#fff;font-weight:800;font-size:14px;padding:9px 16px;border-radius:13px;max-width:80%;text-align:center;box-shadow:0 5px 0 rgba(0,0,0,.3);animation:msc-aparece .16s ease;}

/* controles táctiles */
.msc-controles{position:relative;z-index:22;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 16px 16px;background:linear-gradient(rgba(0,0,0,0),rgba(0,0,0,.28));}
.msc-mov,.msc-acciones{display:flex;gap:10px;}
.msc-ctrl{width:60px;height:60px;border-radius:50%;border:3px solid rgba(255,255,255,.65);background:rgba(0,0,0,.4);color:#fff;font-size:24px;font-weight:900;cursor:pointer;display:grid;place-items:center;}
.msc-ctrl:active{transform:scale(.92);background:rgba(0,0,0,.6);}
.msc-ctrl--fire{width:74px;height:74px;background:rgba(224,83,43,.85);border-color:#fff;font-size:30px;}
.msc-ctrl--jump{background:rgba(60,140,90,.82);}
.msc-ctrl--sec{width:52px;height:52px;font-size:20px;}

/* animaciones (gated por reduced-motion vía data-rm) */
@keyframes msc-parpadeo{0%{opacity:1}50%{opacity:.35}100%{opacity:1}}
@keyframes msc-brinco{0%{transform:translateY(0)}40%{transform:translateY(-22px)}100%{transform:translateY(0)}}
@keyframes msc-aparece{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}

/* ── bestiario: secundarias por sprite (transform-box para origen local) ─── */
.msc-flutter,.msc-drill,.msc-curl,.msc-spring,.msc-legs8,.msc-morph,.msc-carga{transform-box:view-box;}
@keyframes msc-b-leg{0%,100%{transform:translateY(0)}50%{transform:translateY(1.6px)}}
.msc-leg{animation:msc-b-leg .5s ease-in-out infinite;}
.msc-leg--1{animation-delay:.16s;}
.msc-leg--2{animation-delay:.32s;}
@keyframes msc-b-flutter{0%,100%{transform:scaleY(1)}50%{transform:scaleY(.66)}}
.msc-flutter{animation:msc-b-flutter .26s ease-in-out infinite;}
@keyframes msc-b-drill{0%,100%{transform:translateX(0)}50%{transform:translateX(-3px)}}
.msc-drill{animation:msc-b-drill .16s ease-in-out infinite;}
@keyframes msc-b-curl{0%,100%{transform:scale(1) rotate(0)}50%{transform:scale(.94) rotate(-3deg)}}
.msc-curl{animation:msc-b-curl 1.5s ease-in-out infinite;}
@keyframes msc-b-spring{0%,100%{transform:rotate(0)}50%{transform:rotate(-9deg)}}
.msc-spring{animation:msc-b-spring .9s ease-in-out infinite;}
@keyframes msc-b-legs8{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}
.msc-legs8{animation:msc-b-legs8 .6s ease-in-out infinite;}
@keyframes msc-b-morph{0%,100%{transform:scale(1) skewX(0)}50%{transform:scale(1.05,.95) skewX(3deg)}}
.msc-morph{animation:msc-b-morph 2.1s ease-in-out infinite;}
@keyframes msc-b-carga{0%,100%{transform:rotate(-3deg)}50%{transform:rotate(3deg)}}
.msc-carga{animation:msc-b-carga 1.7s ease-in-out infinite;}
@keyframes msc-b-drip{0%{transform:translateY(0);opacity:.9}70%{opacity:.9}100%{transform:translateY(5px);opacity:0}}
.msc-drip{animation:msc-b-drip 1.6s ease-in infinite;}

/* ── jefe SEQUÍA ─────────────────────────────────────────────────────────── */
@keyframes msc-js-rayos{from{transform:rotate(0)}to{transform:rotate(360deg)}}
@keyframes msc-js-halo{0%,100%{transform:scale(1);opacity:.55}50%{transform:scale(1.08);opacity:.85}}
@keyframes msc-js-pulso{0%,100%{transform:scale(1)}50%{transform:scale(1.03)}}
@keyframes msc-js-ojos{0%,92%,100%{transform:scaleY(1)}96%{transform:scaleY(.15)}}
@keyframes msc-js-calor{0%{transform:translateY(0);opacity:.5}100%{transform:translateY(-8px);opacity:0}}
.msc-jefe-alive{animation:msc-js-pulso 3.2s ease-in-out infinite;transform-box:view-box;transform-origin:120px 118px;}
.msc-jefe-alive .msc-jefe-rayos{animation:msc-js-rayos 26s linear infinite;transform-box:view-box;transform-origin:120px 118px;}
.msc-jefe-alive .msc-jefe-halo{animation:msc-js-halo 3.2s ease-in-out infinite;transform-box:view-box;transform-origin:120px 118px;}
.msc-jefe-alive .msc-jefe-ojos{animation:msc-js-ojos 4s ease-in-out infinite;transform-box:view-box;transform-origin:120px 108px;}
.msc-jefe-alive .msc-jefe-calor{animation:msc-js-calor 1.8s ease-in infinite;transform-box:view-box;}

.msc-root[data-rm="1"] .msc-jugador[data-inv="1"]{animation:none;opacity:.6;}
.msc-root[data-rm="1"] .msc-rehen--libre{animation:none;}
.msc-root[data-rm="1"] .msc-overlay,.msc-root[data-rm="1"] .msc-toast{animation:none;}
.msc-root[data-rm="1"] .msc-leg,.msc-root[data-rm="1"] .msc-flutter,.msc-root[data-rm="1"] .msc-drill,.msc-root[data-rm="1"] .msc-curl,.msc-root[data-rm="1"] .msc-spring,.msc-root[data-rm="1"] .msc-legs8,.msc-root[data-rm="1"] .msc-morph,.msc-root[data-rm="1"] .msc-carga,.msc-root[data-rm="1"] .msc-drip{animation:none;}
@media (prefers-reduced-motion: reduce){
  .msc-jugador[data-inv="1"]{animation:none;opacity:.6;}
  .msc-leg,.msc-flutter,.msc-drill,.msc-curl,.msc-spring,.msc-legs8,.msc-morph,.msc-carga,.msc-drip{animation:none;}
  .msc-jefe-alive,.msc-jefe-alive *{animation:none;}
}
`}</style>
  );
}
