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

// Dimensiones lógicas del LIENZO visible (la cámara recorta el mundo a esto).
const VIEW_W = 720;
const VIEW_H = 405;
const GROUND_Y = 340;
const PLAYER_W = 38;
const PLAYER_H = 54;

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

/**
 * Chispas decorativas (feedback visual de acierto/daño). Viven en `world.fx`
 * y SOLO se dibujan en el canvas: no tocan física, colisiones ni puntaje.
 */
function pushChispas(w, x, y, color, n = 8) {
  if (!w) return;
  if (!w.fx) w.fx = [];
  for (let i = 0; i < n; i += 1) {
    const ang = (i / n) * Math.PI * 2;
    const vel = 1.1 + (i % 3) * 0.6;
    w.fx.push({
      x,
      y,
      vx: Math.cos(ang) * vel,
      vy: Math.sin(ang) * vel - 1.2,
      vida: 24 + (i % 5) * 5,
      vidaMax: 30,
      r: 2.5 + (i % 2),
      color,
    });
  }
}

/** Hash determinista 0..1 por posición (decoración estable del terreno). */
function hashDeco(x) {
  const s = Math.sin(x * 12.9898) * 43758.5453;
  return s - Math.floor(s);
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
      fx: [], // chispas decorativas (solo dibujo, cero lógica)
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
    const vivasAntes = new Set(w.plagas.filter((p) => p.alive).map((p) => p.id));
    const { plagas, eliminadas } = aplicarBenefico(w.plagas, id);
    w.plagas = plagas;
    // Chispas verdes donde cayó cada plaga (feedback visual, no lógica).
    for (const p of plagas) {
      if (!p.alive && vivasAntes.has(p.id)) pushChispas(w, p.x + 17, p.y + 17, '#6ee7b7', 10);
    }

    let golpeoJefe = false;
    if (w.jefe && w.jefe.vivo) {
      const res = golpearJefe(w.jefe, id);
      w.jefe = res.jefe;
      golpeoJefe = res.golpeo;
      if (res.golpeo) {
        setJefeVida(w.jefe.vida);
        pushChispas(w, w.jefe.x + w.jefe.w / 2, w.jefe.y + 10, '#fbbf24', 12);
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
      const rec = recolectarCultivos(w.player, w.cultivos);
      if (rec.recogidos.length > 0) {
        // Chispas doradas donde estaba cada cultivo (feedback visual).
        for (const cid of rec.recogidos) {
          const c = w.cultivos.find((k) => k.id === cid);
          if (c) pushChispas(w, c.x + 15, c.y + 15, '#fde68a', 8);
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
          pushChispas(w, w.player.x + w.player.w / 2, w.player.y + 20, '#fca5a5', 7);
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

      // Cielo (paleta del nivel).
      const sky = ctx.createLinearGradient(0, 0, 0, VIEW_H);
      sky.addColorStop(0, esc.cieloTop);
      sky.addColorStop(1, esc.cieloBottom);
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, M, VIEW_H);

      // Estrellas tenues (atardecer).
      if (esc.estrellas) {
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        for (let i = 0; i < 40; i += 1) {
          ctx.fillRect((i * 137) % M, (i * 53) % 120, 2, 2);
        }
      }

      // Astro (sol/luna) con halo suave, anclado a la vista.
      const astroX = w.camX + VIEW_W - 70;
      const halo = ctx.createRadialGradient(astroX, 70, 8, astroX, 70, 95);
      halo.addColorStop(0, 'rgba(255,255,240,0.30)');
      halo.addColorStop(1, 'rgba(255,255,240,0)');
      ctx.fillStyle = halo;
      ctx.fillRect(astroX - 95, -25, 190, 190);
      ctx.fillStyle = esc.astro;
      ctx.beginPath();
      ctx.arc(astroX, 70, 34, 0, Math.PI * 2);
      ctx.fill();

      // Nubes suaves que derivan despacio (decoración, ancladas a la vista).
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      for (let i = 0; i < 4; i += 1) {
        const drift = ((i * 197 + w.t * (0.10 + i * 0.03)) % (VIEW_W + 180)) - 90;
        const cy = 42 + (i % 3) * 26;
        const cx = w.camX * 0.92 + drift;
        ctx.beginPath();
        ctx.ellipse(cx, cy, 34 + (i % 2) * 12, 10, 0, 0, Math.PI * 2);
        ctx.ellipse(cx + 22, cy - 6, 20, 9, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Cordillera LEJANA con parallax (se mueve más lento que la cámara =
      // profundidad). Solo decoración de fondo.
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = esc.montana;
      ctx.beginPath();
      ctx.moveTo(w.camX - 20, GROUND_Y);
      const parFar = (w.camX * 0.45) % 300;
      for (let sx = -parFar - 300; sx <= VIEW_W + 300; sx += 300) {
        ctx.lineTo(w.camX + sx + 140, 210);
        ctx.lineTo(w.camX + sx + 300, GROUND_Y);
      }
      ctx.lineTo(w.camX + VIEW_W + 20, GROUND_Y);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;

      // Montañas de fondo (repetidas a lo largo del mundo).
      ctx.fillStyle = esc.montana;
      ctx.beginPath();
      ctx.moveTo(0, GROUND_Y);
      for (let mx = 0; mx <= M; mx += 360) {
        ctx.lineTo(mx + 160, 180);
        ctx.lineTo(mx + 330, GROUND_Y);
      }
      ctx.lineTo(M, GROUND_Y);
      ctx.closePath();
      ctx.fill();

      // Suelo por tramos (deja vacíos en los huecos).
      const soil = ctx.createLinearGradient(0, GROUND_Y, 0, VIEW_H);
      soil.addColorStop(0, esc.sueloTop);
      soil.addColorStop(1, esc.sueloBottom);
      const huecos = [...w.huecos].sort((a, b) => a.x - b.x);
      let cursor = 0;
      for (const h of huecos) {
        if (h.x > cursor) {
          ctx.fillStyle = soil;
          ctx.fillRect(cursor, GROUND_Y, h.x - cursor, VIEW_H - GROUND_Y);
          ctx.fillStyle = esc.pasto;
          ctx.fillRect(cursor, GROUND_Y - 6, h.x - cursor, 10);
        }
        cursor = h.x + h.w;
      }
      if (cursor < M) {
        ctx.fillStyle = soil;
        ctx.fillRect(cursor, GROUND_Y, M - cursor, VIEW_H - GROUND_Y);
        ctx.fillStyle = esc.pasto;
        ctx.fillRect(cursor, GROUND_Y - 6, M - cursor, 10);
      }

      // Vegetación decorativa del terreno: maticas de pasto y florecitas
      // deterministas por posición (no cambian entre frames ni afectan nada).
      const gx0 = Math.floor(w.camX / 26) * 26;
      for (let gx = gx0 - 26; gx < w.camX + VIEW_W + 26; gx += 26) {
        const enHueco = huecos.some((h) => gx >= h.x - 8 && gx <= h.x + h.w + 2);
        if (enHueco || gx < 0 || gx > M) continue;
        const hsh = hashDeco(gx);
        const sway = Math.sin(w.t * 0.03 + gx * 0.5) * 1.6;
        if (hsh < 0.45) {
          // matica de pasto que se mece
          ctx.strokeStyle = esc.pasto;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(gx, GROUND_Y + 2);
          ctx.quadraticCurveTo(gx - 3, GROUND_Y - 6, gx - 4 + sway, GROUND_Y - 12);
          ctx.moveTo(gx + 3, GROUND_Y + 2);
          ctx.quadraticCurveTo(gx + 5, GROUND_Y - 5, gx + 6 + sway, GROUND_Y - 11);
          ctx.stroke();
        } else if (hsh > 0.88) {
          // florecita silvestre
          ctx.strokeStyle = esc.pasto;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(gx, GROUND_Y + 2);
          ctx.lineTo(gx + sway * 0.6, GROUND_Y - 10);
          ctx.stroke();
          ctx.fillStyle = hsh > 0.94 ? '#fda4af' : '#fde68a';
          ctx.beginPath();
          ctx.arc(gx + sway * 0.6, GROUND_Y - 12, 3.4, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(gx + sway * 0.6, GROUND_Y - 12, 1.3, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Plataformas (con borde inferior sombreado para dar volumen).
      for (const p of w.plataformas) {
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.fillRect(p.x + 2, p.y + p.h, p.w - 4, 3);
        ctx.fillStyle = esc.sueloTop;
        ctx.fillRect(p.x, p.y, p.w, p.h);
        ctx.fillStyle = esc.pasto;
        ctx.fillRect(p.x, p.y - 4, p.w, 6);
      }

      // Cultivos (puntos) — flotan suavecito con un brillo cálido debajo.
      for (const c of w.cultivos) {
        if (c.recogido) continue;
        const bob = Math.sin(w.t * 0.06 + c.x * 0.13) * 2.5;
        const gl = ctx.createRadialGradient(c.x + 15, c.y + 15 + bob, 2, c.x + 15, c.y + 15 + bob, 22);
        gl.addColorStop(0, 'rgba(253,230,138,0.35)');
        gl.addColorStop(1, 'rgba(253,230,138,0)');
        ctx.fillStyle = gl;
        ctx.fillRect(c.x - 8, c.y - 8 + bob, 46, 46);
        drawEmoji(c.emoji, c.x, c.y + bob, 30);
      }
      // Plagas vivas (sombra en el piso + leve vaivén al patrullar).
      for (const p of w.plagas) {
        if (!p.alive) continue;
        const bobP = Math.sin(w.t * 0.12 + p.baseX) * 1.5;
        ctx.fillStyle = 'rgba(0,0,0,0.16)';
        ctx.beginPath();
        ctx.ellipse(p.x + p.w / 2, p.y + p.h + 3, p.w * 0.42, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        drawEmoji(p.emoji, p.x, p.y + bobP, 32);
      }
      // Mini-jefe + sombra + barra de vida con marco.
      if (w.jefe && w.jefe.vivo) {
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.ellipse(w.jefe.x + w.jefe.w / 2, w.jefe.y + w.jefe.h + 2, w.jefe.w * 0.44, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        drawEmoji(w.jefe.emoji, w.jefe.x, w.jefe.y, 60);
        const bw = w.jefe.w;
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.fillRect(w.jefe.x - 1, w.jefe.y - 13, bw + 2, 9);
        ctx.fillStyle = '#7f1d1d';
        ctx.fillRect(w.jefe.x, w.jefe.y - 12, bw, 7);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(w.jefe.x, w.jefe.y - 12, (bw * w.jefe.vida) / w.jefe.vidaMax, 7);
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.fillRect(w.jefe.x, w.jefe.y - 12, (bw * w.jefe.vida) / w.jefe.vidaMax, 2);
      }

      // Jugador (campesino neutro dibujado a mano — sin nombre propio).
      // Sombra a los pies + rebote de caminado + piernas que alternan:
      // todo es DIBUJO (la caja de colisión no cambia).
      const px = w.player.x;
      const py = w.player.y;
      const blink = w.t < w.player.invulnUntil && Math.floor(w.t / 6) % 2 === 0;
      const caminando = (input.current.left || input.current.right) && w.player.onGround;
      const bobJ = caminando ? Math.abs(Math.sin(w.t * 0.22)) * 2 : 0;
      const paso = caminando ? Math.sin(w.t * 0.22) * 4 : 0;
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath();
      ctx.ellipse(px + w.player.w / 2, py + w.player.h + 2, w.player.w * 0.5, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();
      if (!blink) {
        const pyd = py - bobJ;
        // sombrero campesino (ala ancha + copa con cinta)
        ctx.fillStyle = '#a16207';
        ctx.fillRect(px - 4, pyd, w.player.w + 8, 8);
        ctx.fillRect(px + 6, pyd - 8, w.player.w - 12, 10);
        ctx.fillStyle = '#7c2d12';
        ctx.fillRect(px + 6, pyd - 1, w.player.w - 12, 3);
        // cara
        ctx.fillStyle = '#e8b98a';
        ctx.fillRect(px + 8, pyd + 8, w.player.w - 16, 16);
        // camisa
        ctx.fillStyle = '#15803d';
        ctx.fillRect(px + 6, pyd + 24, w.player.w - 12, 20);
        ctx.fillStyle = 'rgba(255,255,255,0.14)';
        ctx.fillRect(px + 6, pyd + 24, 4, 20);
        // piernas (alternan al caminar)
        ctx.fillStyle = '#1e3a5f';
        ctx.fillRect(px + 8 + paso, py + 42, 8, 12);
        ctx.fillRect(px + w.player.w - 16 - paso, py + 42, 8, 12);
        // ojos + sonrisa mirando hacia donde corre
        ctx.fillStyle = '#1c1917';
        const ex = w.player.face === 1 ? px + 16 : px + 12;
        ctx.fillRect(ex, pyd + 14, 3, 3);
        ctx.fillRect(ex + 8, pyd + 14, 3, 3);
        ctx.fillRect(ex + 3, pyd + 20, 6, 2);
      }

      // Chispas decorativas de feedback (se actualizan y pintan aquí; si el
      // juego está pausado en overlay simplemente terminan de desvanecerse).
      if (w.fx && w.fx.length > 0) {
        const vivos = [];
        for (const s of w.fx) {
          s.x += s.vx;
          s.y += s.vy;
          s.vy += 0.06;
          s.vida -= 1;
          if (s.vida > 0) vivos.push(s);
          ctx.globalAlpha = Math.max(0, s.vida / s.vidaMax);
          ctx.fillStyle = s.color;
          ctx.fillRect(s.x, s.y, s.r, s.r);
        }
        ctx.globalAlpha = 1;
        w.fx = vivos;
      }

      ctx.restore();
      raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
    };
  }, [estado, beep, nivel, onGanar]);

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
        <div className="df-hearts" aria-label={`Energía: ${energia} de ${energiaMax}`}>
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
          <div className="df-overlay" data-testid={`defensores-fin-${estado}`}>
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
              <span className="df-beneficio-emoji" aria-hidden="true">{b.emoji}</span>
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
  const nivel = useMemo(() => getNivel(nivelNum), [nivelNum]);

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
