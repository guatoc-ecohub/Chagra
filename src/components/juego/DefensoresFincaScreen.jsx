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
} from '../../services/defensoresGameEngine';
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
    const { plagas, eliminadas } = aplicarBenefico(w.plagas, id);
    w.plagas = plagas;

    let golpeoJefe = false;
    if (w.jefe && w.jefe.vivo) {
      const res = golpearJefe(w.jefe, id);
      w.jefe = res.jefe;
      golpeoJefe = res.golpeo;
      if (res.golpeo) setJefeVida(w.jefe.vida);
    }

    if (eliminadas > 0 || golpeoJefe) {
      w.puntaje = sumarPuntaje(w.puntaje, { plagas: eliminadas + (golpeoJefe ? 1 : 0) });
      setPuntaje(w.puntaje);
      setLeccion(leccionPorBenefico[id] || '');
      beep('good');
    } else {
      setLeccion('Ese benéfico controla otra plaga. Mira cuál bicho malo hay cerca.');
    }
  }, [estado, leccionPorBenefico, beep]);

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

      // Plagas patrullan (más rápido/amplio = más difícil).
      if (estado === 'jugando') {
        for (const p of w.plagas) {
          if (!p.alive) continue;
          p.x += p.dir * p.vel;
          if (Math.abs(p.x - p.baseX) > p.rango) p.dir *= -1;
        }
        if (w.jefe && w.jefe.vivo) {
          w.jefe.x += w.jefe.dir * 0.7;
          if (Math.abs(w.jefe.x - w.jefe.baseX) > 70) w.jefe.dir *= -1;
        }
      }

      // Recolección de cultivos.
      const rec = recolectarCultivos(w.player, w.cultivos);
      if (rec.recogidos.length > 0) {
        w.cultivos = rec.cultivos;
        w.cultivosRecogidos += rec.recogidos.length;
        w.puntaje = sumarPuntaje(w.puntaje, { cultivos: rec.recogidos.length });
        setPuntaje(w.puntaje);
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
      const plagasVivas = w.plagas.filter((p) => p.alive).length;
      const hayJefe = !!w.jefe;
      const jefeVivo = !!(w.jefe && w.jefe.vivo);
      const fin = evaluarFinNivel({
        energia: w.energia,
        cultivosRecogidos: w.cultivosRecogidos,
        metaCultivos: nivel.metaCultivos,
        plagasVivas,
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

      // Astro (sol/luna), anclado a la vista.
      ctx.fillStyle = esc.astro;
      ctx.beginPath();
      ctx.arc(w.camX + VIEW_W - 70, 70, 34, 0, Math.PI * 2);
      ctx.fill();

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

      // Plataformas.
      for (const p of w.plataformas) {
        ctx.fillStyle = esc.sueloTop;
        ctx.fillRect(p.x, p.y, p.w, p.h);
        ctx.fillStyle = esc.pasto;
        ctx.fillRect(p.x, p.y - 4, p.w, 6);
      }

      // Cultivos (puntos).
      for (const c of w.cultivos) {
        if (!c.recogido) drawEmoji(c.emoji, c.x, c.y, 30);
      }
      // Plagas vivas.
      for (const p of w.plagas) {
        if (p.alive) drawEmoji(p.emoji, p.x, p.y, 32);
      }
      // Mini-jefe + barra de vida.
      if (w.jefe && w.jefe.vivo) {
        drawEmoji(w.jefe.emoji, w.jefe.x, w.jefe.y, 60);
        const bw = w.jefe.w;
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(w.jefe.x, w.jefe.y - 12, bw, 7);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(w.jefe.x, w.jefe.y - 12, (bw * w.jefe.vida) / w.jefe.vidaMax, 7);
      }

      // Jugador (campesino neutro dibujado a mano — sin nombre propio).
      const px = w.player.x;
      const py = w.player.y;
      const blink = w.t < w.player.invulnUntil && Math.floor(w.t / 6) % 2 === 0;
      if (!blink) {
        ctx.fillStyle = '#a16207';
        ctx.fillRect(px - 4, py, w.player.w + 8, 8);
        ctx.fillRect(px + 6, py - 8, w.player.w - 12, 10);
        ctx.fillStyle = '#e8b98a';
        ctx.fillRect(px + 8, py + 8, w.player.w - 16, 16);
        ctx.fillStyle = '#15803d';
        ctx.fillRect(px + 6, py + 24, w.player.w - 12, 20);
        ctx.fillStyle = '#1e3a5f';
        ctx.fillRect(px + 8, py + 42, w.player.w - 16, 12);
        ctx.fillStyle = '#1c1917';
        const ex = w.player.face === 1 ? px + 16 : px + 12;
        ctx.fillRect(ex, py + 14, 3, 3);
        ctx.fillRect(ex + 8, py + 14, 3, 3);
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
  }, [crearMundo, nivel]);

  const energiaMax = nivel.energiaMax;
  const hayJefe = !!nivel.jefe;
  const siguienteAbierto = nivelDesbloqueado(nivel.numero + 1, superados);

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

      {/* Aviso de mini-jefe (solo niveles con jefe). */}
      {hayJefe && estado === 'jugando' && (
        <div className="df-jefe-aviso" data-testid="defensores-jefe">
          <span aria-hidden="true">{nivel.jefe.emoji}</span> Mini-jefe al final.
          Solo cae con su controlador real. Vida: {jefeVida}
        </div>
      )}

      {/* Escenario (canvas) */}
      <div className="df-stage">
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
      <div className="df-beneficios" role="group" aria-label="Elige el organismo benéfico">
        {beneficos.map((b) => (
          <button
            key={b.id}
            type="button"
            data-testid={`beneficio-${b.id}`}
            data-selected={beneficoSel === b.id}
            onClick={() => setBeneficoSel(b.id)}
            aria-pressed={beneficoSel === b.id}
            className="df-beneficio"
          >
            <span className="df-beneficio-emoji" aria-hidden="true">{b.emoji}</span>
            <span className="df-beneficio-nombre">{b.nombre}</span>
          </button>
        ))}
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
        className="flex flex-col gap-1 px-3 pt-2 pb-10 max-w-3xl mx-auto"
      >
        <p className="text-2xs font-black uppercase tracking-[0.2em] text-emerald-300/80">
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
