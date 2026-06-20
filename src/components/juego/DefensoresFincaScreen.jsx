/*
 * i18n: este minijuego se sirve solo en español Colombia (tú/usted). El nombre
 * del juego "Defensores de la Finca" y los textos para niños conviven en el
 * componente; la migración a messages.js (ADR-050) está fuera de alcance de
 * esta PR. La regla chagra-i18n es soft (warn), aquí se desactiva por archivo.
 */
/* eslint-disable chagra-i18n/no-hardcoded-spanish */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScreenShell } from '../common/ScreenShell';
import { Bug, Shield, RotateCcw } from 'lucide-react';
import './defensores-finca.css';

import { CULTIVOS, PARES_CONTROL, NIVEL_1 } from './defensoresFincaData';
import {
  MOVE_SPEED,
  clamp,
  aplicarBenefico,
  resolverColisionPlagas,
  recolectarCultivos,
  sumarPuntaje,
  avanzarFisica,
  intentarSalto,
  evaluarFinNivel,
} from '../../services/defensoresGameEngine';
import { agentSounds, isSoundEnabled } from '../../services/agentSoundService';

/**
 * DefensoresFincaScreen — minijuego PLATAFORMERO 2D lateral.
 *
 * Un campesino NEUTRO (sin nombre propio) corre y salta por la finca: recoge
 * cultivos (puntos), esquiva plagas reales (pierde energía al tocarlas) e invoca
 * organismos benéficos que ELIMINAN exactamente la plaga que de verdad controlan
 * (control biológico real = relación CONTROLS del grafo de Chagra).
 *
 * Mobile-first: controles táctiles grandes + teclado en desktop. Offline-safe:
 * canvas 2D puro, datos locales, cero red. Estética Chagra (emerald/amber/lime).
 * La lógica vive en defensoresGameEngine (pura, testeable); aquí solo se dibuja
 * y se orquesta el loop.
 *
 * @param {Object} props
 * @param {Function} [props.onBack]
 * @param {Function} [props.onHome]
 */
export default function DefensoresFincaScreen({ onBack, onHome }) {
  const canvasRef = useRef(null);

  // Mundo en coordenadas de canvas (lógicas, escaladas al ancho real por CSS).
  const W = 720;
  const H = 405;
  const GROUND_Y = 340;
  const PLAYER_W = 38;
  const PLAYER_H = 54;

  // Pares de control activos en este nivel (subconjunto curado).
  const pares = useMemo(
    () => PARES_CONTROL.filter((p) => NIVEL_1.paresIds.includes(p.id)),
    [],
  );
  const beneficos = useMemo(() => pares.map((p) => p.benefico), [pares]);
  const leccionPorBenefico = useMemo(
    () => Object.fromEntries(pares.map((p) => [p.benefico.id, p.leccion])),
    [pares],
  );

  // Estado de juego visible en React (HUD). El estado "vivo" del loop vive en
  // refs para no re-renderizar a 60fps.
  const [energia, setEnergia] = useState(NIVEL_1.energiaInicial);
  const [puntaje, setPuntaje] = useState(0);
  const [estado, setEstado] = useState('jugando'); // 'jugando' | 'gano' | 'perdio'
  const [razon, setRazon] = useState('');
  const [leccion, setLeccion] = useState('');
  const [beneficoSel, setBeneficoSel] = useState(beneficos[0]?.id || null);

  // Refs del mundo (mutables, leídos por el loop a 60fps sin re-render).
  const world = useRef(null);
  const input = useRef({ left: false, right: false, jumpQueued: false });
  // Espejo del benéfico seleccionado para que la acción (puntero) lo lea sin
  // recrear el callback; se sincroniza en un efecto (no durante el render).
  const beneficoSelRef = useRef(beneficoSel);
  useEffect(() => {
    beneficoSelRef.current = beneficoSel;
  }, [beneficoSel]);

  /** Crea el mundo inicial: jugador, plagas espaciadas y cultivos. */
  const crearMundo = useCallback(() => {
    const plagas = pares.map((par, i) => ({
      id: `plaga-${par.plaga.id}-${i}`,
      plagaId: par.plaga.id,
      emoji: par.plaga.emoji,
      x: 220 + i * 150,
      y: GROUND_Y - 34,
      w: 34,
      h: 34,
      dir: i % 2 === 0 ? 1 : -1,
      baseX: 220 + i * 150,
      alive: true,
    }));
    const cultivos = Array.from({ length: NIVEL_1.metaCultivos }).map((_, i) => {
      const c = CULTIVOS[i % CULTIVOS.length];
      return {
        id: `cultivo-${c.id}-${i}`,
        emoji: c.emoji,
        x: 150 + i * 110,
        y: i % 2 === 0 ? GROUND_Y - 36 : GROUND_Y - 110,
        w: 30,
        h: 30,
        recogido: false,
      };
    });
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
      cultivosRecogidos: 0,
      puntaje: 0,
      energia: NIVEL_1.energiaInicial,
      t: 0,
    };
  }, [pares]);

  // Inicializa el mundo al montar (una vez). El reinicio se hace en el handler
  // `reiniciar` (evento), no en un efecto, para no disparar renders en cascada.
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

  /** Invoca el benéfico seleccionado: limpia SOLO su plaga objetivo real. */
  const invocarBenefico = useCallback(() => {
    const w = world.current;
    if (!w || estado !== 'jugando') return;
    const id = beneficoSelRef.current;
    if (!id) return;
    const { plagas, eliminadas } = aplicarBenefico(w.plagas, id);
    w.plagas = plagas;
    if (eliminadas > 0) {
      w.puntaje = sumarPuntaje(w.puntaje, { plagas: eliminadas });
      setPuntaje(w.puntaje);
      setLeccion(leccionPorBenefico[id] || '');
      beep('good');
    } else {
      // Benéfico correcto pero su plaga no está aquí (o ya controlada): pista.
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
      w.player.x = clamp(w.player.x, 0, W - w.player.w);

      // Salto + gravedad (física pura).
      if (input.current.jumpQueued) {
        const j = intentarSalto(w.player);
        w.player.vy = j.vy;
        w.player.onGround = j.onGround;
        if (j.salto) beep('jump');
        input.current.jumpQueued = false;
      }
      const fis = avanzarFisica(w.player, GROUND_Y, w.player.h);
      w.player.y = fis.y;
      w.player.vy = fis.vy;
      w.player.onGround = fis.onGround;

      // Plagas patrullan de lado a lado (movimiento simple, predecible).
      if (estado === 'jugando') {
        for (const p of w.plagas) {
          if (!p.alive) continue;
          p.x += p.dir * 0.9;
          if (Math.abs(p.x - p.baseX) > 46) p.dir *= -1;
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

      // Colisión con plagas (resta energía con invulnerabilidad breve).
      if (estado === 'jugando') {
        const invuln = w.t < w.player.invulnUntil;
        const col = resolverColisionPlagas(w.player, w.plagas, invuln);
        if (col.golpe) {
          w.energia -= 1;
          w.player.invulnUntil = w.t + 60; // ~1s a 60fps
          setEnergia(w.energia);
          beep('hit');
        }
      }

      // Fin de nivel.
      const plagasVivas = w.plagas.filter((p) => p.alive).length;
      const fin = evaluarFinNivel({
        energia: w.energia,
        cultivosRecogidos: w.cultivosRecogidos,
        metaCultivos: NIVEL_1.metaCultivos,
        plagasVivas,
      });
      if (fin.estado !== 'jugando' && estado === 'jugando') {
        setEstado(fin.estado);
        setRazon(fin.razon);
        if (fin.estado === 'gano') beep('good');
      }

      // ── DIBUJO ──────────────────────────────────────────────────
      // Cielo.
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#9fd6f2');
      sky.addColorStop(1, '#e8f7c8');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);
      // Sol.
      ctx.fillStyle = '#fde68a';
      ctx.beginPath();
      ctx.arc(W - 70, 70, 34, 0, Math.PI * 2);
      ctx.fill();
      // Montañas.
      ctx.fillStyle = '#86b96a';
      ctx.beginPath();
      ctx.moveTo(0, GROUND_Y);
      ctx.lineTo(160, 180);
      ctx.lineTo(330, GROUND_Y);
      ctx.lineTo(520, 150);
      ctx.lineTo(720, GROUND_Y);
      ctx.closePath();
      ctx.fill();
      // Suelo.
      const soil = ctx.createLinearGradient(0, GROUND_Y, 0, H);
      soil.addColorStop(0, '#8a5a32');
      soil.addColorStop(1, '#3f2d20');
      ctx.fillStyle = soil;
      ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
      ctx.fillStyle = '#6f8f32';
      ctx.fillRect(0, GROUND_Y - 6, W, 10);

      // Cultivos (puntos).
      for (const c of w.cultivos) {
        if (!c.recogido) drawEmoji(c.emoji, c.x, c.y, 30);
      }
      // Plagas vivas.
      for (const p of w.plagas) {
        if (p.alive) drawEmoji(p.emoji, p.x, p.y, 32);
      }
      // Jugador (campesino neutro dibujado a mano — sin nombre propio).
      const px = w.player.x;
      const py = w.player.y;
      const blink = w.t < w.player.invulnUntil && Math.floor(w.t / 6) % 2 === 0;
      if (!blink) {
        // sombrero
        ctx.fillStyle = '#a16207';
        ctx.fillRect(px - 4, py, w.player.w + 8, 8);
        ctx.fillRect(px + 6, py - 8, w.player.w - 12, 10);
        // cara
        ctx.fillStyle = '#e8b98a';
        ctx.fillRect(px + 8, py + 8, w.player.w - 16, 16);
        // cuerpo (camisa verde Chagra)
        ctx.fillStyle = '#15803d';
        ctx.fillRect(px + 6, py + 24, w.player.w - 12, 20);
        // pantalón
        ctx.fillStyle = '#1e3a5f';
        ctx.fillRect(px + 8, py + 42, w.player.w - 16, 12);
        // ojos (mirando hacia donde va)
        ctx.fillStyle = '#1c1917';
        const ex = w.player.face === 1 ? px + 16 : px + 12;
        ctx.fillRect(ex, py + 14, 3, 3);
        ctx.fillRect(ex + 8, py + 14, 3, 3);
      }

      raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
    };
  }, [estado, beep]);

  // Reinicia el nivel: reconstruye el mundo (ref) y restaura el HUD (estado).
  // Es un event handler, así que el setState es seguro (no es render ni efecto).
  const reiniciar = useCallback(() => {
    world.current = crearMundo();
    setEnergia(NIVEL_1.energiaInicial);
    setPuntaje(0);
    setRazon('');
    setLeccion('');
    setEstado('jugando');
  }, [crearMundo]);

  const energiaMax = NIVEL_1.energiaMax;

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

        {/* Escenario (canvas) */}
        <div className="df-stage">
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
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
              <button
                type="button"
                onClick={reiniciar}
                className="mt-2 min-h-[56px] px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 transition text-emerald-950 font-black text-lg flex items-center gap-2"
              >
                <RotateCcw size={22} aria-hidden="true" />
                Jugar otra vez
              </button>
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

        <p className="text-2xs text-slate-400 text-center mt-2 leading-relaxed">
          En el computador: flechas ◀ ▶ para correr, ↑ o espacio para saltar.
          Cada bicho bueno solo elimina la plaga que controla en la vida real.
        </p>
      </div>
    </ScreenShell>
  );
}
