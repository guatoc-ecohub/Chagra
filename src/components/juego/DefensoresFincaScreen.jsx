/*
 * i18n: este minijuego se sirve solo en español Colombia (tú/usted). El nombre
 * del juego "Defensores de la Finca" y los textos para niños conviven en el
 * componente; la migración a messages.js (ADR-050) está fuera de alcance de
 * esta PR. La regla chagra-i18n es soft (warn), aquí se desactiva por archivo.
 */
/* eslint-disable chagra-i18n/no-hardcoded-spanish */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScreenShell } from '../common/ScreenShell';
import { Bug, Shield, RotateCcw, Lock } from 'lucide-react';
import { fvhSkinClass } from '../../config/fvhSkin';
import './defensores-finca.css';

import {
  CULTIVOS,
  PARES_CONTROL,
  NIVELES,
  getNivel,
  nivelDesbloqueado,
  PROGRESO_KEY,
} from './defensoresFincaData';
import {
  MOVE_SPEED,
  clamp,
  aplicarBenefico,
  resolverColisionPlagas,
  recolectarCultivos,
  sumarPuntaje,
  avanzarFisicaTerreno,
  golpearJefe,
  intentarSalto,
  evaluarFinNivel,
  resumenObjetivos,
  factorPatrulla,
} from '../../services/defensoresGameEngine';
import { fincaVivaHomePerfilActivo } from '../../config/fincaVivaHomeFlag';
import { agentSounds, isSoundEnabled } from '../../services/agentSoundService';
import { recordGameStart, recordGameComplete } from '../../services/usageTelemetryService';
import { Crisopa } from '../../visual/creatures/Crisopa.jsx';
import { Trichogramma } from '../../visual/creatures/Trichogramma.jsx';
import { Sirfido } from '../../visual/creatures/Sirfido.jsx';

/**
 * Los aliados de control biológico que ya tienen su criatura rubber-hose fiel:
 * en el selector de benéficos se dibujan de verdad (protagonistas), en vez del
 * emoji genérico. Solo visual — el id y la mecánica del par no cambian.
 * El resto de benéficos conserva su emoji hasta que tengan su propio dibujo.
 */
const CRIATURA_BENEFICO = {
  crisopa: Crisopa,
  trichogramma: Trichogramma,
  sirfido: Sirfido,
};

// Dimensiones lógicas del LIENZO visible (la cámara recorta el mundo a esto).
const VIEW_W = 720;
const VIEW_H = 405;
const GROUND_Y = 340;
const PLAYER_W = 38;
const PLAYER_H = 54;

// ── Utilidades de dibujo (capa visual pura; nada de lógica de juego) ──

/** '#rrggbb' → rgba(r,g,b,a): velos, halos y sombras derivadas de la escena. */
function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

/** Aclara (f>0) u oscurece (f<0) un color hex; deriva tonos de la paleta del nivel. */
function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (c) => Math.max(0, Math.min(255, Math.round(f > 0 ? c + (255 - c) * f : c + c * f)));
  return `rgb(${ch((n >> 16) & 255)}, ${ch((n >> 8) & 255)}, ${ch(n & 255)})`;
}

/** Pseudo-azar determinista: el mismo paisaje en cada frame y cada partida. */
function hashN(i, salt) {
  const v = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return v - Math.floor(v);
}

/**
 * Vegetación procedural por piso térmico: posiciones deterministas de las
 * matas que visten cada nivel (huerta, ladera, cafetal, maizal). Solo visual;
 * evita los huecos para que nada "flote" sobre una zanja.
 */
function construirDecor(nivel) {
  const enHueco = (x) => nivel.huecos.some((h) => x > h.x - 24 && x < h.x + h.w + 24);
  const items = [];
  let x = 26;
  for (let i = 0; x < nivel.mundoAncho - 30; i += 1) {
    if (!enHueco(x)) items.push({ x, v: hashN(i, 2) });
    x += 74 + hashN(i, 1) * 70;
  }
  return items;
}

/**
 * Dibuja una mata según la escena del nivel: flores de huerta, arbusto de
 * ladera, mata de café con granos maduros o maíz con espiga. Capa visual.
 */
function dibujarMata(ctx, esc, x, v) {
  const g = GROUND_Y;
  if (esc.id === 'maizal-atardecer') {
    const alto = 44 + v * 26;
    ctx.strokeStyle = shade(esc.pasto, -0.15);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, g);
    ctx.lineTo(x, g - alto);
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, g - alto * 0.45);
    ctx.quadraticCurveTo(x - 14, g - alto * 0.55, x - 18, g - alto * 0.35);
    ctx.moveTo(x, g - alto * 0.65);
    ctx.quadraticCurveTo(x + 14, g - alto * 0.75, x + 18, g - alto * 0.55);
    ctx.stroke();
    ctx.fillStyle = '#eab308';
    ctx.fillRect(x - 2, g - alto - 8, 4, 9);
  } else if (esc.id === 'cafetal-amanecer') {
    const alto = 26 + v * 14;
    ctx.fillStyle = shade(esc.montana, -0.2);
    ctx.fillRect(x - 1.5, g - alto * 0.5, 3, alto * 0.5);
    ctx.fillStyle = shade(esc.pasto, -0.25);
    ctx.beginPath();
    ctx.ellipse(x, g - alto * 0.62, 13 + v * 5, alto * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(x - 6, g - alto * 0.6, 2.5, 2.5);
    ctx.fillRect(x + 4, g - alto * 0.75, 2.5, 2.5);
    ctx.fillRect(x - 1, g - alto * 0.45, 2.5, 2.5);
  } else if (esc.id === 'atardecer') {
    ctx.fillStyle = shade(esc.pasto, -0.2);
    ctx.beginPath();
    ctx.arc(x - 6, g - 8, 8 + v * 3, 0, Math.PI * 2);
    ctx.arc(x + 6, g - 10, 9 + v * 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = shade(esc.pasto, 0.15);
    ctx.beginPath();
    ctx.arc(x + 2, g - 14, 5 + v * 2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = shade(esc.pasto, -0.1);
    ctx.beginPath();
    ctx.moveTo(x - 8, g);
    ctx.quadraticCurveTo(x - 6, g - 16 - v * 6, x, g - 4);
    ctx.quadraticCurveTo(x + 6, g - 18 - v * 6, x + 8, g);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = v > 0.5 ? '#f59e0b' : '#f43f5e';
    ctx.beginPath();
    ctx.arc(x, g - 18 - v * 6, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Partículas de confirmación (recoger, controlar, golpear jefe). Solo visual. */
function spawnFx(w, x, y, color, n) {
  if (!w) return;
  w.fx = w.fx || [];
  if (w.fx.length > 90) return;
  for (let i = 0; i < n; i += 1) {
    const a = (Math.PI * 2 * i) / n + hashN(i, 7);
    const v = 1 + (i % 3) * 0.7;
    w.fx.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1.4, vida: 24 + (i % 4) * 5, color });
  }
}

/** Lee del localStorage los niveles ya superados (offline-safe, tolera fallos). */
function leerSuperados() {
  try {
    const raw = localStorage.getItem(PROGRESO_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.superados) ? parsed.superados : [];
  } catch {
    return [];
  }
}

/** Marca un nivel como superado en localStorage y devuelve la lista resultante. */
function guardarSuperado(numero) {
  try {
    const superados = leerSuperados();
    if (!superados.includes(numero)) {
      const next = [...superados, numero];
      localStorage.setItem(PROGRESO_KEY, JSON.stringify({ superados: next }));
      return next;
    }
    return superados;
  } catch {
    return leerSuperados();
  }
}

/**
 * NivelJuego — un nivel jugable completo (canvas + HUD + controles). Se monta
 * con `key={nivel.numero}` desde el contenedor, de modo que CADA cambio de
 * nivel lo remonta limpio (sin setState dentro de efectos).
 *
 * @param {Object} props
 * @param {import('./defensoresFincaData').Nivel} props.nivel
 * @param {number[]} props.superados   niveles ya completados (desbloqueo).
 * @param {Function} props.onGanar     callback(numero) al completar el nivel.
 * @param {Function} props.onIrA       callback(numero) para saltar a otro nivel.
 */
function NivelJuego({ nivel, superados, onGanar, onIrA }) {
  const canvasRef = useRef(null);

  // Pares de control activos en este nivel (subconjunto curado).
  const pares = useMemo(
    () => PARES_CONTROL.filter((p) => nivel.paresIds.includes(p.id)),
    [nivel],
  );
  const beneficos = useMemo(() => pares.map((p) => p.benefico), [pares]);
  // Benéfico → su par completo, para decir QUÉ plaga controla cuando el jugador
  // suelta el aliado equivocado (microcopy didáctico, no solo "fallaste").
  const parPorBenefico = useMemo(
    () => Object.fromEntries(pares.map((p) => [p.benefico.id, p])),
    [pares],
  );
  const leccionPorBenefico = useMemo(
    () => Object.fromEntries(pares.map((p) => [p.benefico.id, p.leccion])),
    [pares],
  );

  // Estado visible en React (HUD). El estado "vivo" del loop vive en refs.
  const [energia, setEnergia] = useState(nivel.energiaInicial);
  const [puntaje, setPuntaje] = useState(0);
  const [estado, setEstado] = useState('jugando'); // 'jugando' | 'gano' | 'perdio'
  const [razon, setRazon] = useState('');
  const [leccion, setLeccion] = useState('');
  const [beneficoSel, setBeneficoSel] = useState(beneficos[0]?.id || null);
  const [jefeVida, setJefeVida] = useState(nivel.jefe ? nivel.jefe.vida : 0);
  // Progreso de objetivos para el HUD (cuántos cultivos van de la meta y cuántas
  // plagas quedan). Antes el objetivo quedaba implícito; ahora se ve.
  const [cultivosHechos, setCultivosHechos] = useState(0);
  const [plagasVivas, setPlagasVivas] = useState(pares.length);

  // FEEL gated (dev-only): con la flag ON la patrulla de plagas se afina por
  // nivel (curva de dificultad más amable en niveles altos); con OFF = 1 (hoy).
  // El factor es constante para el nivel; se guarda en ref para que el rAF lo
  // lea sin re-suscribirse. El valor inicial se calcula fuera del render (en el
  // efecto de abajo) para no leer refs durante el render.
  const patrullaFactor = useRef(1);
  useEffect(() => {
    patrullaFactor.current = fincaVivaHomePerfilActivo()
      ? factorPatrulla(nivel.numero)
      : 1;
  }, [nivel.numero]);

  // Refs del mundo (mutables, leídos por el loop a 60fps sin re-render).
  const world = useRef(null);
  const input = useRef({ left: false, right: false, jumpQueued: false });

  // prefers-reduced-motion vivo (apaga deriva de nubes/niebla, bamboleos y
  // reduce partículas; el juego en sí sigue igual). Capa visual pura.
  const reduceMotionRef = useRef(false);
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    reduceMotionRef.current = !!mq?.matches;
    if (!mq?.addEventListener) return undefined;
    const onChange = () => { reduceMotionRef.current = mq.matches; };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Vegetación procedural del nivel (determinista, solo visual).
  const decor = useMemo(() => construirDecor(nivel), [nivel]);
  const beneficoSelRef = useRef(beneficoSel);
  useEffect(() => {
    beneficoSelRef.current = beneficoSel;
  }, [beneficoSel]);

  /** Crea el mundo inicial del nivel: jugador, plagas, cultivos, plataformas,
   *  huecos y mini-jefe. */
  const crearMundo = useCallback(() => {
    const mundoAncho = nivel.mundoAncho;
    const sep = (mundoAncho - 260) / Math.max(1, pares.length);
    const plagas = pares.map((par, i) => {
      const baseX = 220 + i * sep;
      return {
        id: `plaga-${par.plaga.id}-${i}`,
        plagaId: par.plaga.id,
        emoji: par.plaga.emoji,
        x: baseX,
        y: GROUND_Y - 34,
        w: 34,
        h: 34,
        dir: i % 2 === 0 ? 1 : -1,
        baseX,
        rango: 46 + (i % 3) * 18, // patrulla más amplia en algunas (dificultad)
        vel: 0.9 + (i % 3) * 0.25,
        alive: true,
      };
    });

    const plats = nivel.plataformas.map((p) => ({
      x: p.x,
      y: GROUND_Y - p.y, // top absoluto de la plataforma en coords mundo
      w: p.w,
      h: 14,
    }));
    const cultivos = Array.from({ length: nivel.metaCultivos }).map((_, i) => {
      const c = CULTIVOS[i % CULTIVOS.length];
      const enPlat = plats.length > 0 && i % 3 === 0;
      const plat = enPlat ? plats[i % plats.length] : null;
      const x = plat
        ? plat.x + plat.w / 2 - 15
        : 150 + (i * (mundoAncho - 220)) / nivel.metaCultivos;
      const y = plat ? plat.y - 34 : (i % 2 === 0 ? GROUND_Y - 36 : GROUND_Y - 110);
      return {
        id: `cultivo-${c.id}-${i}`,
        emoji: c.emoji,
        x,
        y,
        w: 30,
        h: 30,
        recogido: false,
      };
    });

    const jefe = nivel.jefe
      ? {
          plagaId: nivel.jefe.plagaId,
          emoji: nivel.jefe.emoji,
          vida: nivel.jefe.vida,
          vidaMax: nivel.jefe.vida,
          vivo: true,
          x: mundoAncho - 130,
          y: GROUND_Y - 70,
          w: 64,
          h: 64,
          dir: -1,
          baseX: mundoAncho - 130,
        }
      : null;

    return {
      player: {
        x: 40,
        y: GROUND_Y - PLAYER_H,
        w: PLAYER_W,
        h: PLAYER_H,
        vy: 0,
        onGround: true,
        face: 1,
        invulnUntil: 0,
      },
      plagas,
      cultivos,
      plataformas: plats,
      huecos: nivel.huecos.map((h) => ({ x: h.x, w: h.w })),
      jefe,
      mundoAncho,
      camX: 0,
      cultivosRecogidos: 0,
      puntaje: 0,
      energia: nivel.energiaInicial,
      t: 0,
      fx: [], // partículas de feedback (capa visual pura)
    };
  }, [nivel, pares]);

  // Inicializa el mundo al montar (una vez por nivel; el remount con key reinicia
  // todo el estado React, así no hace falta setState en este efecto).
  useEffect(() => {
    if (!world.current) world.current = crearMundo();
  }, [crearMundo]);

  // ── Controles de teclado (desktop) ─────────────────────────────────
  useEffect(() => {
    const down = (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') input.current.left = true;
      else if (e.key === 'ArrowRight' || e.key === 'd') input.current.right = true;
      else if (e.key === 'ArrowUp' || e.key === ' ' || e.key === 'w') {
        input.current.jumpQueued = true;
        e.preventDefault();
      }
    };
    const up = (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') input.current.left = false;
      else if (e.key === 'ArrowRight' || e.key === 'd') input.current.right = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  const soundOn = useRef(isSoundEnabled());
  const beep = useCallback((kind) => {
    if (!soundOn.current) return;
    try {
      if (kind === 'good') agentSounds.chime?.();
      else if (kind === 'jump') agentSounds.start?.();
      else if (kind === 'hit') agentSounds.error?.();
    } catch { /* sonido opcional: el juego sigue */ }
  }, []);

  /** Invoca el benéfico seleccionado: limpia SOLO su plaga objetivo real y, si
   *  es el controlador del jefe, le quita vida. */
  const invocarBenefico = useCallback(() => {
    const w = world.current;
    if (!w || estado !== 'jugando') return;
    const id = beneficoSelRef.current;
    if (!id) return;
    // Posiciones de las plagas vivas ANTES de aplicar, para las partículas
    // de confirmación (visual; la eliminación la decide el motor).
    const vivasAntes = w.plagas
      .filter((p) => p.alive)
      .map((p) => ({ id: p.id, x: p.x + p.w / 2, y: p.y + p.h / 2 }));
    const { plagas, eliminadas } = aplicarBenefico(w.plagas, id);
    w.plagas = plagas;
    if (eliminadas > 0) {
      const vivasDespues = new Set(w.plagas.filter((p) => p.alive).map((p) => p.id));
      for (const v of vivasAntes) {
        if (!vivasDespues.has(v.id)) {
          spawnFx(w, v.x, v.y, '#6ee7b7', reduceMotionRef.current ? 4 : 12);
        }
      }
    }

    let golpeoJefe = false;
    if (w.jefe && w.jefe.vivo) {
      const res = golpearJefe(w.jefe, id);
      w.jefe = res.jefe;
      golpeoJefe = res.golpeo;
      if (res.golpeo) {
        setJefeVida(w.jefe.vida);
        spawnFx(w, w.jefe.x + w.jefe.w / 2, w.jefe.y + 20, '#fbbf24', reduceMotionRef.current ? 4 : 12);
      }
    }

    if (eliminadas > 0 || golpeoJefe) {
      w.puntaje = sumarPuntaje(w.puntaje, { plagas: eliminadas + (golpeoJefe ? 1 : 0) });
      setPuntaje(w.puntaje);
      setLeccion(leccionPorBenefico[id] || '');
      beep('good');
    } else {
      // No acertó: en vez de un "fallaste" seco, le enseñamos qué controla SÍ
      // el aliado que soltó, para que aprenda el emparejamiento correcto.
      const par = parPorBenefico[id];
      setLeccion(
        par
          ? `${par.benefico.nombre} controla al ${par.plaga.nombre.toLowerCase()}. Apunta a ese bicho o cambia de aliado.`
          : 'Ese aliado controla otra plaga. Mira cuál bicho malo tienes cerca.',
      );
    }
  }, [estado, leccionPorBenefico, parPorBenefico, beep]);

  // ── Bucle principal de juego (canvas 2D) ───────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;
    let raf = 0;
    let running = true;
    const esc = nivel.escena;

    const drawEmoji = (emoji, x, y, size) => {
      ctx.font = `${size}px serif`;
      ctx.textBaseline = 'top';
      ctx.fillText(emoji, x, y);
    };

    // Cordillera estilizada con parallax: se desplaza a una fracción `f` de la
    // cámara (más lejos = más lento). Picos alternos para variar la silueta.
    const dibujarCordillera = (camX, color, f, peakY, periodo) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      const off = (camX * f) % periodo;
      const x0 = camX - off - periodo;
      ctx.moveTo(x0, GROUND_Y);
      for (let mx = x0; mx <= camX + VIEW_W + periodo; mx += periodo) {
        const varPico = (Math.floor(mx / periodo) % 2) * 22;
        ctx.lineTo(mx + periodo * 0.5, peakY + varPico);
        ctx.lineTo(mx + periodo, GROUND_Y);
      }
      ctx.lineTo(camX + VIEW_W + periodo, GROUND_Y);
      ctx.closePath();
      ctx.fill();
    };

    // Nube de tres lóbulos (el fillStyle lo fija quien llama).
    const dibujarNube = (x, y, s) => {
      ctx.beginPath();
      ctx.arc(x, y, 12 * s, 0, Math.PI * 2);
      ctx.arc(x + 14 * s, y - 5 * s, 10 * s, 0, Math.PI * 2);
      ctx.arc(x + 28 * s, y, 11 * s, 0, Math.PI * 2);
      ctx.closePath();
      ctx.fill();
    };

    const step = () => {
      const w = world.current;
      if (!running || !w) return;
      w.t += 1;

      // Movimiento horizontal del jugador.
      if (input.current.left) {
        w.player.x -= MOVE_SPEED;
        w.player.face = -1;
      }
      if (input.current.right) {
        w.player.x += MOVE_SPEED;
        w.player.face = 1;
      }
      w.player.x = clamp(w.player.x, 0, w.mundoAncho - w.player.w);

      // Salto + gravedad sobre terreno con plataformas/huecos.
      if (input.current.jumpQueued) {
        const j = intentarSalto(w.player);
        w.player.vy = j.vy;
        w.player.onGround = j.onGround;
        if (j.salto) beep('jump');
        input.current.jumpQueued = false;
      }
      const fis = avanzarFisicaTerreno(w.player, GROUND_Y, w.plataformas, w.huecos, VIEW_H + 80);
      w.player.y = fis.y;
      w.player.vy = fis.vy;
      w.player.onGround = fis.onGround;

      // Caer por un hueco = daño + reposición sobre suelo firme.
      if (estado === 'jugando' && fis.caido && w.t >= w.player.invulnUntil) {
        w.energia -= 1;
        w.player.invulnUntil = w.t + 60;
        setEnergia(w.energia);
        beep('hit');
        w.player.x = clamp(w.player.x - 90, 0, w.mundoAncho - w.player.w);
        w.player.y = GROUND_Y - w.player.h;
        w.player.vy = 0;
        w.player.onGround = true;
      }

      // Cámara: sigue al jugador (centro), recortada al mundo.
      const objetivoCam = w.player.x + w.player.w / 2 - VIEW_W / 2;
      w.camX = clamp(objetivoCam, 0, Math.max(0, w.mundoAncho - VIEW_W));

      // Plagas patrullan (más rápido/amplio = más difícil). Con la flag de FEEL
      // ON, `patrullaFactor` afina el ritmo por nivel; con OFF es 1 (= hoy).
      if (estado === 'jugando') {
        const pf = patrullaFactor.current;
        for (const p of w.plagas) {
          if (!p.alive) continue;
          p.x += p.dir * p.vel * pf;
          if (Math.abs(p.x - p.baseX) > p.rango) p.dir *= -1;
        }
        if (w.jefe && w.jefe.vivo) {
          w.jefe.x += w.jefe.dir * 0.7 * pf;
          if (Math.abs(w.jefe.x - w.jefe.baseX) > 70) w.jefe.dir *= -1;
        }
      }

      // Recolección de cultivos.
      const cultivosAntes = w.cultivos;
      const rec = recolectarCultivos(w.player, w.cultivos);
      if (rec.recogidos.length > 0) {
        // Chispas doradas donde estaba cada cultivo recogido (solo visual).
        for (const idRec of rec.recogidos) {
          const c = cultivosAntes.find((cc) => cc.id === idRec);
          if (c) spawnFx(w, c.x + 15, c.y + 15, '#fde68a', reduceMotionRef.current ? 3 : 8);
        }
        w.cultivos = rec.cultivos;
        w.cultivosRecogidos += rec.recogidos.length;
        w.puntaje = sumarPuntaje(w.puntaje, { cultivos: rec.recogidos.length });
        setPuntaje(w.puntaje);
        setCultivosHechos(Math.min(w.cultivosRecogidos, nivel.metaCultivos));
        beep('good');
      }

      // Colisión con plagas y con el jefe (resta energía).
      if (estado === 'jugando') {
        const invuln = w.t < w.player.invulnUntil;
        const col = resolverColisionPlagas(w.player, w.plagas, invuln);
        let golpe = col.golpe;
        if (!golpe && !invuln && w.jefe && w.jefe.vivo) {
          const j = w.jefe;
          if (
            w.player.x < j.x + j.w &&
            w.player.x + w.player.w > j.x &&
            w.player.y < j.y + j.h &&
            w.player.y + w.player.h > j.y
          ) {
            golpe = true;
          }
        }
        if (golpe) {
          w.energia -= 1;
          w.player.invulnUntil = w.t + 60; // ~1s a 60fps
          setEnergia(w.energia);
          beep('hit');
        }
      }

      // Fin de nivel.
      const vivas = w.plagas.filter((p) => p.alive).length;
      const hayJefe = !!w.jefe;
      const jefeVivo = !!(w.jefe && w.jefe.vivo);
      setPlagasVivas((prev) => (prev !== vivas ? vivas : prev));
      const fin = evaluarFinNivel({
        energia: w.energia,
        cultivosRecogidos: w.cultivosRecogidos,
        metaCultivos: nivel.metaCultivos,
        plagasVivas: vivas,
        hayJefe,
        jefeVivo,
      });
      if (fin.estado !== 'jugando' && estado === 'jugando') {
        setEstado(fin.estado);
        setRazon(fin.razon);
        if (fin.estado === 'gano') {
          beep('good');
          onGanar(nivel.numero);
          // Telemetría de uso ANÓNIMA: completado de "defensores" (una vez por
          // nivel; el guard `estado === 'jugando'` evita repetir).
          recordGameComplete('defensores');
        }
      }

      // ── DIBUJO ──────────────────────────────────────────────────
      ctx.save();
      ctx.translate(-w.camX, 0); // la cámara desplaza el mundo.
      const M = w.mundoAncho;

      const reduce = reduceMotionRef.current;

      // Cielo (paleta del nivel).
      const sky = ctx.createLinearGradient(0, 0, 0, VIEW_H);
      sky.addColorStop(0, esc.cieloTop);
      sky.addColorStop(1, esc.cieloBottom);
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, M, VIEW_H);

      // Estrellas tenues (atardecer), con titileo suave.
      if (esc.estrellas) {
        for (let i = 0; i < 40; i += 1) {
          const alfa = reduce ? 0.55 : 0.3 + 0.35 * Math.abs(Math.sin(w.t * 0.03 + i));
          ctx.fillStyle = `rgba(255,255,255,${alfa.toFixed(2)})`;
          ctx.fillRect((i * 137) % M, (i * 53) % 120, 2, 2);
        }
      }

      // Astro (sol/luna) con halo cálido, anclado a la vista.
      const ax = w.camX + VIEW_W - 70;
      const ay = 70;
      const halo = ctx.createRadialGradient(ax, ay, 12, ax, ay, 92);
      halo.addColorStop(0, hexA(esc.astro, 0.8));
      halo.addColorStop(1, hexA(esc.astro, 0));
      ctx.fillStyle = halo;
      ctx.fillRect(ax - 92, ay - 92, 184, 184);
      ctx.fillStyle = esc.astro;
      ctx.beginPath();
      ctx.arc(ax, ay, 30, 0, Math.PI * 2);
      ctx.fill();

      // Nubes con deriva lenta y leve parallax (quietas con reduced-motion).
      const deriva = reduce ? 0 : w.t * 0.12;
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      const spanNube = VIEW_W + 260;
      for (let i = 0; i < 5; i += 1) {
        const nx = w.camX + ((((i * 173 + deriva + w.camX * 0.3) % spanNube) + spanNube) % spanNube) - 130;
        const ny = 34 + ((i * 37) % 70);
        dibujarNube(nx, ny, 1 + (i % 3) * 0.35);
      }

      // Cordillera doble con parallax: lejana (clara, lenta) y cercana.
      dibujarCordillera(w.camX, shade(esc.montana, 0.35), 0.55, 150, 300);
      dibujarCordillera(w.camX, esc.montana, 0.3, 185, 430);

      // Bruma al pie de la cordillera (funde montaña y suelo).
      const bruma = ctx.createLinearGradient(0, GROUND_Y - 110, 0, GROUND_Y);
      bruma.addColorStop(0, hexA(esc.cieloBottom, 0));
      bruma.addColorStop(1, hexA(esc.cieloBottom, 0.5));
      ctx.fillStyle = bruma;
      ctx.fillRect(w.camX, GROUND_Y - 110, VIEW_W, 110);

      // Suelo por tramos (deja vacíos en los huecos), con textura de tierra,
      // borde de pasto en dos tonos y matitas.
      const soil = ctx.createLinearGradient(0, GROUND_Y, 0, VIEW_H);
      soil.addColorStop(0, esc.sueloTop);
      soil.addColorStop(1, esc.sueloBottom);
      const pintarTramo = (x0, ancho) => {
        ctx.fillStyle = soil;
        ctx.fillRect(x0, GROUND_Y, ancho, VIEW_H - GROUND_Y);
        // Motas de tierra (deterministas, dan textura sin ruido).
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        for (let sx = Math.ceil(x0 / 46) * 46; sx < x0 + ancho - 5; sx += 46) {
          ctx.fillRect(sx, GROUND_Y + 14 + (sx % 3) * 9, 5, 3);
        }
        ctx.fillStyle = 'rgba(0,0,0,0.14)';
        for (let sx = Math.ceil(x0 / 61) * 61; sx < x0 + ancho - 6; sx += 61) {
          ctx.fillRect(sx, GROUND_Y + 26 + (sx % 5) * 6, 6, 3);
        }
        // Franja de pasto con luz arriba y sombra bajo el borde.
        ctx.fillStyle = esc.pasto;
        ctx.fillRect(x0, GROUND_Y - 6, ancho, 10);
        ctx.fillStyle = shade(esc.pasto, 0.25);
        ctx.fillRect(x0, GROUND_Y - 6, ancho, 2);
        ctx.fillStyle = shade(esc.pasto, -0.35);
        ctx.fillRect(x0, GROUND_Y + 3, ancho, 2);
        // Matitas de pasto sobre el borde.
        ctx.fillStyle = shade(esc.pasto, 0.2);
        for (let sx = Math.ceil(x0 / 34) * 34; sx < x0 + ancho - 6; sx += 34) {
          ctx.fillRect(sx, GROUND_Y - 11, 2, 6);
          ctx.fillRect(sx + 4, GROUND_Y - 9, 2, 4);
        }
      };
      const huecos = [...w.huecos].sort((a, b) => a.x - b.x);
      let cursor = 0;
      for (const h of huecos) {
        if (h.x > cursor) pintarTramo(cursor, h.x - cursor);
        cursor = h.x + h.w;
      }
      if (cursor < M) pintarTramo(cursor, M - cursor);

      // Zanjas: fondo oscuro con borde quebrado (se leen como peligro).
      for (const h of huecos) {
        const pozo = ctx.createLinearGradient(0, GROUND_Y, 0, VIEW_H);
        pozo.addColorStop(0, 'rgba(20,12,6,0.75)');
        pozo.addColorStop(1, 'rgba(5,3,2,0.95)');
        ctx.fillStyle = pozo;
        ctx.fillRect(h.x, GROUND_Y, h.w, VIEW_H - GROUND_Y);
        ctx.fillStyle = shade(esc.sueloTop, -0.4);
        ctx.fillRect(h.x - 3, GROUND_Y - 2, 3, 9);
        ctx.fillRect(h.x + h.w, GROUND_Y - 2, 3, 9);
      }

      // Vegetación del piso térmico (solo lo visible; determinista).
      for (const d of decor) {
        if (d.x < w.camX - 60 || d.x > w.camX + VIEW_W + 60) continue;
        dibujarMata(ctx, esc, d.x, d.v);
      }

      // Niebla del cafetal: jirones que derivan despacio (quietos con
      // reduced-motion). Detrás de los personajes para no tapar el juego.
      if (esc.id === 'cafetal-amanecer') {
        ctx.fillStyle = 'rgba(243,239,224,0.28)';
        const spanNiebla = VIEW_W + 300;
        for (let i = 0; i < 3; i += 1) {
          const nx = w.camX
            + ((((i * 210 + (reduce ? 0 : w.t * (0.25 + i * 0.1))) % spanNiebla) + spanNiebla) % spanNiebla)
            - 150;
          const ny = GROUND_Y - 60 - i * 46;
          ctx.beginPath();
          ctx.ellipse(nx, ny, 130, 16, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Plataformas como terrazas: sombra, cuerpo de tierra, borde oscuro,
      // raíces colgantes y ceja de pasto con luz.
      for (const p of w.plataformas) {
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.fillRect(p.x + 4, p.y + p.h, p.w - 8, 4);
        ctx.fillStyle = esc.sueloTop;
        ctx.fillRect(p.x, p.y, p.w, p.h);
        ctx.fillStyle = shade(esc.sueloTop, -0.35);
        ctx.fillRect(p.x, p.y + p.h - 3, p.w, 3);
        ctx.fillStyle = shade(esc.sueloTop, -0.2);
        ctx.fillRect(p.x + 10, p.y + p.h, 2, 5);
        ctx.fillRect(p.x + p.w - 14, p.y + p.h, 2, 4);
        ctx.fillStyle = esc.pasto;
        ctx.fillRect(p.x - 2, p.y - 4, p.w + 4, 7);
        ctx.fillStyle = shade(esc.pasto, 0.3);
        ctx.fillRect(p.x - 2, p.y - 4, p.w + 4, 2);
      }

      // Cultivos: halo cálido, sombra en el piso y flote suave (la colisión
      // usa c.y del motor; el bamboleo es solo del dibujo).
      w.cultivos.forEach((c, i) => {
        if (c.recogido) return;
        const flote = reduce ? 0 : Math.sin(w.t * 0.07 + i * 1.7) * 3;
        ctx.fillStyle = 'rgba(0,0,0,0.16)';
        ctx.beginPath();
        ctx.ellipse(c.x + 15, c.y + 32, 11, 3.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,241,178,0.16)';
        ctx.beginPath();
        ctx.arc(c.x + 15, c.y + 15 + flote, 21, 0, Math.PI * 2);
        ctx.fill();
        drawEmoji(c.emoji, c.x, c.y + flote, 30);
      });
      // Plagas vivas: sombra, brinquito y volteo según hacia dónde patrullan.
      for (const p of w.plagas) {
        if (!p.alive) continue;
        const brinco = reduce ? 0 : Math.abs(Math.sin(w.t * 0.12 + p.baseX * 0.05)) * 2.5;
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.beginPath();
        ctx.ellipse(p.x + p.w / 2, p.y + p.h - 2, p.w * 0.4, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.save();
        ctx.translate(p.x + p.w / 2, p.y - brinco);
        ctx.scale(p.dir < 0 ? -1 : 1, 1);
        drawEmoji(p.emoji, -p.w / 2 + 1, 0, 32);
        ctx.restore();
      }
      // Mini-jefe: sombra grande, respiración amenazante y barra de vida con
      // brillo y muescas por punto.
      if (w.jefe && w.jefe.vivo) {
        const j = w.jefe;
        const pulso = reduce ? 0 : Math.sin(w.t * 0.09) * 2;
        ctx.fillStyle = 'rgba(0,0,0,0.22)';
        ctx.beginPath();
        ctx.ellipse(j.x + j.w / 2, j.y + j.h - 2, j.w * 0.45, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.save();
        ctx.translate(j.x + j.w / 2, j.y + pulso);
        ctx.scale(j.dir < 0 ? -1 : 1, 1);
        drawEmoji(j.emoji, -j.w / 2 + 2, 0, 60);
        ctx.restore();
        const bw = j.w;
        ctx.fillStyle = 'rgba(10,10,10,0.55)';
        ctx.fillRect(j.x - 1, j.y - 14, bw + 2, 9);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(j.x, j.y - 13, (bw * j.vida) / j.vidaMax, 7);
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.fillRect(j.x, j.y - 13, (bw * j.vida) / j.vidaMax, 2);
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        for (let s = 1; s < j.vidaMax; s += 1) {
          ctx.fillRect(j.x + (bw * s) / j.vidaMax, j.y - 13, 1, 7);
        }
      }

      // Jugador (campesino neutro dibujado a mano — sin nombre propio):
      // sombrero aguadeño con cinta, ruana terracota con franja y paso animado.
      const px = w.player.x;
      const py = w.player.y;
      const pw = w.player.w;
      const blink = w.t < w.player.invulnUntil && Math.floor(w.t / 6) % 2 === 0;
      if (!blink) {
        const camina = (input.current.left || input.current.right) && w.player.onGround;
        const paso = camina && !reduce ? Math.sin(w.t * 0.35) * 4 : 0;
        // Sombra a los pies (solo apoyado; en el aire se lee el salto).
        if (w.player.onGround) {
          ctx.fillStyle = 'rgba(0,0,0,0.25)';
          ctx.beginPath();
          ctx.ellipse(px + pw / 2, py + w.player.h, pw * 0.55, 5, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        // Piernas con paso alterno + botas.
        ctx.fillStyle = '#1e3a5f';
        ctx.fillRect(px + 9 + paso, py + 40, 8, 12);
        ctx.fillRect(px + 21 - paso, py + 40, 8, 12);
        ctx.fillStyle = '#292524';
        ctx.fillRect(px + 8 + paso, py + 50, 10, 4);
        ctx.fillRect(px + 20 - paso, py + 50, 10, 4);
        // Ruana terracota con franja clara.
        ctx.fillStyle = '#a34d1f';
        ctx.beginPath();
        ctx.moveTo(px + 6, py + 22);
        ctx.lineTo(px + pw - 6, py + 22);
        ctx.lineTo(px + pw - 2, py + 41);
        ctx.lineTo(px + 2, py + 41);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#f2e8d5';
        ctx.fillRect(px + 3, py + 34, pw - 6, 3);
        // Cara con mirada hacia donde corre y sonrisa breve.
        ctx.fillStyle = '#e8b98a';
        ctx.fillRect(px + 9, py + 8, pw - 18, 15);
        ctx.fillStyle = '#1c1917';
        const ex = w.player.face === 1 ? px + 17 : px + 12;
        ctx.fillRect(ex, py + 13, 3, 3);
        ctx.fillRect(ex + 7, py + 13, 3, 3);
        ctx.fillRect(ex + 2, py + 19, 6, 2);
        // Sombrero aguadeño: ala ancha, copa clara y cinta oscura.
        ctx.fillStyle = '#f5efe0';
        ctx.fillRect(px - 5, py + 4, pw + 10, 5);
        ctx.fillRect(px + 8, py - 6, pw - 16, 11);
        ctx.fillStyle = '#292524';
        ctx.fillRect(px + 8, py + 1, pw - 16, 3);
        ctx.fillStyle = 'rgba(0,0,0,0.12)';
        ctx.fillRect(px - 5, py + 7, pw + 10, 2);
      }

      // Partículas de feedback (chispas al recoger/controlar/golpear jefe).
      if (w.fx && w.fx.length > 0) {
        const vivos = [];
        for (const f of w.fx) {
          f.x += f.vx;
          f.y += f.vy;
          f.vy += 0.06;
          f.vida -= 1;
          if (f.vida > 0) {
            ctx.globalAlpha = Math.min(1, f.vida / 18);
            ctx.fillStyle = f.color;
            ctx.fillRect(f.x, f.y, 4, 4);
            vivos.push(f);
          }
        }
        ctx.globalAlpha = 1;
        w.fx = vivos;
      }

      ctx.restore();

      // Velo rojo que se desvanece tras recibir daño (feedback inmediato).
      if (estado === 'jugando' && w.t < w.player.invulnUntil) {
        const k = (w.player.invulnUntil - w.t) / 60;
        ctx.fillStyle = `rgba(220,38,38,${(0.24 * k).toFixed(3)})`;
        ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      }

      raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
    };
  }, [estado, beep, nivel, onGanar, decor]);

  // Reinicia el nivel actual (event handler → setState seguro).
  const reiniciar = useCallback(() => {
    world.current = crearMundo();
    setEnergia(nivel.energiaInicial);
    setPuntaje(0);
    setRazon('');
    setLeccion('');
    setEstado('jugando');
    setJefeVida(nivel.jefe ? nivel.jefe.vida : 0);
    setCultivosHechos(0);
    setPlagasVivas(pares.length);
  }, [crearMundo, nivel, pares.length]);

  const energiaMax = nivel.energiaMax;
  const hayJefe = !!nivel.jefe;
  const siguienteAbierto = nivelDesbloqueado(nivel.numero + 1, superados);

  // Resumen de objetivos para el HUD (cultivos X/meta · plagas restantes).
  // Lógica pura del motor; aquí solo se pinta.
  const objetivos = resumenObjetivos({
    cultivosRecogidos: cultivosHechos,
    metaCultivos: nivel.metaCultivos,
    plagasVivas,
    hayJefe,
    jefeVivo: hayJefe && jefeVida > 0,
  });

  return (
    <>
      <p className="text-2xs text-emerald-200/70 leading-snug" data-testid="defensores-subtitulo">
        {nivel.subtitulo}
      </p>

      {/* HUD */}
      <div className="df-hud" data-testid="defensores-hud">
        <div
          className={`df-hearts${energia <= 1 ? ' df-hearts-low' : ''}`}
          aria-label={`Energía: ${energia} de ${energiaMax}`}
        >
          {Array.from({ length: energiaMax }).map((_, i) => (
            <span key={i} className={i < energia ? '' : 'df-heart-empty'} aria-hidden="true">
              💚
            </span>
          ))}
        </div>
        <div className="text-right">
          <span className="text-2xs font-black uppercase tracking-wide text-emerald-300/70 block">
            Puntos
          </span>
          <span data-testid="defensores-puntaje" className="text-2xl font-black text-white leading-none">
            {puntaje}
          </span>
        </div>
      </div>

      {/* Progreso de objetivos: lo que faltaba para que se vea QUÉ falta para
          ganar (antes solo había energía + puntos). Universal, bajo riesgo. */}
      <div className="df-objetivos" data-testid="defensores-objetivos" aria-label="Lo que te falta para ganar el nivel">
        <span
          className={`df-objetivo ${objetivos.cultivos.listo ? 'df-objetivo-listo' : ''}`}
          data-testid="defensores-objetivo-cultivos"
        >
          🌽 Cultivos {objetivos.cultivos.hechos}/{objetivos.cultivos.meta}
          {objetivos.cultivos.listo ? ' ✓' : ''}
        </span>
        <span
          className={`df-objetivo ${objetivos.plagas.listo ? 'df-objetivo-listo' : ''}`}
          data-testid="defensores-objetivo-plagas"
        >
          🐛 Plagas {objetivos.plagas.restantes}
          {objetivos.plagas.listo ? ' ✓' : ''}
        </span>
        {hayJefe && (
          <span
            className={`df-objetivo ${objetivos.jefe.listo ? 'df-objetivo-listo' : ''}`}
            data-testid="defensores-objetivo-jefe"
          >
            {nivel.jefe.emoji} Jefe{objetivos.jefe.listo ? ' ✓' : ''}
          </span>
        )}
      </div>

      {/* Aviso de mini-jefe (solo niveles con jefe). */}
      {hayJefe && estado === 'jugando' && (
        <div className="df-jefe-aviso" data-testid="defensores-jefe">
          <span aria-hidden="true">{nivel.jefe.emoji}</span> Mini-jefe al final.
          Solo cae con su controlador real. Vida: {jefeVida}
        </div>
      )}

      {/* Escenario (canvas) — con la flag ON, el lienzo adopta el cielo del
          tema activo (Fase 2 de temas); con OFF queda igual que hoy. */}
      <div className={fvhSkinClass('df-stage')}>
        <canvas
          ref={canvasRef}
          width={VIEW_W}
          height={VIEW_H}
          className="df-canvas"
          role="img"
          aria-label="Finca con un campesino que corre, cultivos para recoger y plagas para controlar"
        />
        {estado !== 'jugando' && (
          <div
            className={`df-overlay ${estado === 'gano' ? 'df-overlay-gano' : 'df-overlay-perdio'}`}
            data-testid={`defensores-fin-${estado}`}
          >
            <span className="df-overlay-emoji" aria-hidden="true">
              {estado === 'gano' ? '🌽🎉' : '🐛'}
            </span>
            <h3 className="text-2xl font-black text-white">
              {estado === 'gano' ? '¡Ganaste!' : 'Casi lo logras'}
            </h3>
            <p className="text-sm text-emerald-100/90 max-w-xs">{razon}</p>
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              <button
                type="button"
                onClick={reiniciar}
                className="min-h-[56px] px-5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 transition text-emerald-950 font-black text-lg flex items-center gap-2"
              >
                <RotateCcw size={22} aria-hidden="true" />
                Jugar otra vez
              </button>
              {estado === 'gano' && siguienteAbierto && (
                <button
                  type="button"
                  data-testid="defensores-siguiente-nivel"
                  onClick={() => onIrA(nivel.numero + 1)}
                  className="min-h-[56px] px-5 rounded-2xl bg-amber-400 hover:bg-amber-300 active:scale-95 transition text-amber-950 font-black text-lg"
                >
                  Nivel {nivel.numero + 1} →
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Lección de control biológico */}
      {leccion && (
        <div className="df-leccion" data-testid="defensores-leccion" role="status">
          <Bug size={16} className="inline-block mr-1 -mt-0.5" aria-hidden="true" />
          {leccion}
        </div>
      )}

      {/* Selector de benéficos (control biológico) */}
      <div className="df-beneficios" role="group" aria-label="Elige el aliado que controla cada plaga">
        {beneficos.map((b) => {
          const plagaQueControla = parPorBenefico[b.id]?.plaga?.nombre;
          const ayuda = plagaQueControla
            ? `${b.nombre}: controla al ${plagaQueControla.toLowerCase()}`
            : b.nombre;
          const Criatura = CRIATURA_BENEFICO[b.id];
          return (
            <button
              key={b.id}
              type="button"
              data-testid={`beneficio-${b.id}`}
              data-selected={beneficoSel === b.id}
              onClick={() => setBeneficoSel(b.id)}
              aria-pressed={beneficoSel === b.id}
              aria-label={ayuda}
              title={ayuda}
              className="df-beneficio"
            >
              <span className="df-beneficio-emoji" aria-hidden="true">
                {Criatura ? <Criatura size={38} title="" /> : b.emoji}
              </span>
              <span className="df-beneficio-nombre">{b.nombre}</span>
            </button>
          );
        })}
      </div>

      {/* Controles táctiles (mobile-first) + teclado en desktop */}
      <div className="df-controls">
        <div className="df-dpad">
          <button
            type="button"
            aria-label="Mover a la izquierda"
            className="df-btn"
            onPointerDown={(e) => { e.preventDefault(); input.current.left = true; }}
            onPointerUp={() => { input.current.left = false; }}
            onPointerLeave={() => { input.current.left = false; }}
            onPointerCancel={() => { input.current.left = false; }}
          >
            ◀
          </button>
          <button
            type="button"
            aria-label="Mover a la derecha"
            className="df-btn"
            onPointerDown={(e) => { e.preventDefault(); input.current.right = true; }}
            onPointerUp={() => { input.current.right = false; }}
            onPointerLeave={() => { input.current.right = false; }}
            onPointerCancel={() => { input.current.right = false; }}
          >
            ▶
          </button>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            aria-label="Soltar el bicho bueno"
            className="df-btn df-btn-action"
            onPointerDown={(e) => { e.preventDefault(); invocarBenefico(); }}
          >
            🐞
          </button>
          <button
            type="button"
            aria-label="Saltar"
            className="df-btn df-btn-jump"
            onPointerDown={(e) => { e.preventDefault(); input.current.jumpQueued = true; }}
          >
            ⤴
          </button>
        </div>
      </div>
    </>
  );
}

/**
 * DefensoresFincaScreen — minijuego PLATAFORMERO 2D lateral con cuatro niveles.
 *
 * Un campesino NEUTRO (sin nombre propio) corre y salta por la finca: recoge
 * cultivos (puntos), esquiva plagas reales (pierde energía al tocarlas) e invoca
 * organismos benéficos que ELIMINAN exactamente la plaga que de verdad controlan
 * (control biológico real = relación CONTROLS del grafo de Chagra).
 *
 * Nivel 1 (la huerta, mediodía): corto y plano, 4 pares.
 * Nivel 2 (la ladera al atardecer): más largo (mundo con cámara), otra paleta,
 * 7 pares, plataformas a distinta altura, huecos que hacen daño y un mini-jefe
 * (langosta) que solo cae con su controlador real (la mantis).
 * Nivel 3 (el cafetal en la niebla): todavía más largo, paleta de amanecer, 10
 * pares (incluye plagas del café: broca, minador y cochinilla con sus aliados
 * reales), más plataformas y huecos, y un mini-jefe broca que solo cae con la
 * avispa Cephalonomia.
 * Nivel 4 (el maizal al atardecer): el más grande, paleta de atardecer, 13 pares
 * (incluye plagas del maíz: chicharrita, gusano elotero y barrenador con sus
 * aliados reales), todavía más plataformas y huecos, y un mini-jefe cogollero
 * gigante que solo cae con la avispita Trichogramma. Cada nivel se desbloquea al
 * completar el anterior; el progreso se guarda offline en localStorage.
 *
 * Mobile-first: controles táctiles grandes + teclado en desktop. Offline-safe:
 * canvas 2D puro, datos locales, cero red. Estética Chagra.
 *
 * @param {Object} props
 * @param {Function} [props.onBack]
 * @param {Function} [props.onHome]
 */
export default function DefensoresFincaScreen({ onBack, onHome }) {
  // Telemetría de uso ANÓNIMA: inicio del juego al montar (una vez).
  useEffect(() => { recordGameStart('defensores'); }, []);
  const [superados, setSuperados] = useState(() => leerSuperados());
  const [nivelNum, setNivelNum] = useState(1);
  const nivel = /** @type {any} */ (useMemo(() => getNivel(nivelNum), [nivelNum]));

  const handleGanar = useCallback((numero) => {
    setSuperados(guardarSuperado(numero));
  }, []);

  const irANivel = useCallback((numero) => {
    setNivelNum(numero);
  }, []);

  return (
    <ScreenShell title="Defensores de la Finca" icon={Shield} onBack={onBack} onHome={onHome}>
      <div
        data-testid="defensores-finca-screen"
        className={fvhSkinClass('jp-ambiente flex flex-col gap-1 px-3 pt-2 pb-10 max-w-3xl mx-auto')}
      >
        <p className="jp-df-kicker text-2xs font-black uppercase tracking-[0.2em] text-emerald-300/80">
          Aprende a Cultivar Jugando
        </p>
        <h2 className="text-2xl font-black text-white leading-tight flex items-center gap-2">
          <span aria-hidden="true">🛡️</span> Defensores de la Finca
        </h2>
        <p className="text-sm text-emerald-100/80 leading-snug mb-1">
          Corre, salta y recoge cultivos. Para limpiar cada plaga, suelta el
          bicho bueno que de verdad la controla. ¡Así funciona el control
          biológico!
        </p>

        {/* Selector de nivel (1 / 2 / 3). Cada uno se desbloquea al ganar el anterior. */}
        <div
          className="df-niveles"
          role="group"
          aria-label="Elige el nivel"
          data-testid="defensores-niveles"
        >
          {NIVELES.map((n) => {
            const abierto = nivelDesbloqueado(n.numero, superados);
            const activo = n.numero === nivelNum;
            return (
              <button
                key={n.id}
                type="button"
                data-testid={`nivel-${n.numero}`}
                data-selected={activo}
                disabled={!abierto}
                aria-pressed={activo}
                onClick={() => abierto && setNivelNum(n.numero)}
                className="df-nivel"
              >
                <span className="df-nivel-num">
                  {abierto ? `Nivel ${n.numero}` : (
                    <>
                      <Lock size={13} aria-hidden="true" className="inline-block -mt-0.5 mr-1" />
                      Nivel {n.numero}
                    </>
                  )}
                </span>
                <span className="df-nivel-nombre">
                  {abierto ? n.nombre : 'Gana el nivel anterior'}
                </span>
              </button>
            );
          })}
        </div>

        {/* El nivel se remonta con key → estado limpio sin setState en efecto. */}
        <NivelJuego
          key={nivel.numero}
          nivel={nivel}
          superados={superados}
          onGanar={handleGanar}
          onIrA={irANivel}
        />

        <p className="text-2xs text-slate-400 text-center mt-2 leading-relaxed">
          En el computador: flechas ◀ ▶ para correr, ↑ o espacio para saltar.
          Cada bicho bueno solo elimina la plaga que controla en la vida real.
        </p>
      </div>
    </ScreenShell>
  );
}
